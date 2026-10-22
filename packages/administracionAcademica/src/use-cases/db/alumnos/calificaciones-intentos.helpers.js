/**
 * Reglas compartidas para calificaciones con recursamientos.
 * Un "intento" = ordinario (tipo 1) + extraordinario (tipo 2) del mismo grupo.
 * La misma lógica vive en fhistorial.php y build.certificado.db.use-cases.js;
 * si cambia aquí, debe cambiar allá.
 */

const TIPO_ORDINARIO = 1;
const TIPO_EXTRAORDINARIO = 2;

const valorVacio = (valor) => valor === null || valor === undefined || String(valor).trim() === '';

// Datos legados tipo "8 (OCHO)" → "8"
const procesarCalificacionCruda = (valor) => {
  if (typeof valor === 'string' && valor.includes('(')) {
    return valor.substring(0, valor.indexOf('(')).trim();
  }
  return valor;
};

/**
 * Las calificaciones son numéricas. Un texto solo aparece en extraordinario
 * (RC, NS, NP, SD...) y siempre significa que NO acreditó, así que nunca
 * puede ser aprobatorio.
 */
const esTextoNoNumerico = (valor) => !valorVacio(valor)
  && Number.isNaN(Number(String(procesarCalificacionCruda(valor)).trim()));

/**
 * Catálogo cerrado de claves de extraordinario. En la base solo se guardan
 * las dos letras; el texto largo existe nada más para la pantalla.
 */
const CODIGOS_EXTRAORDINARIO = {
  NS: 'No solicitó',
  NP: 'No presentó',
  RC: 'Recursar',
  SD: 'Sin derecho',
};

const CLAVES_EXTRAORDINARIO = Object.keys(CODIGOS_EXTRAORDINARIO);

const PATRON_CLAVE_EXTRAORDINARIO = new RegExp(`^(${CLAVES_EXTRAORDINARIO.join('|')})(\\s|\\(|$)`);

/**
 * Clave de dos letras de un valor de extraordinario. Acepta lo que ya está
 * capturado en texto largo ("NS (No solicitó)") y devuelve null si el valor
 * no es una de las cuatro claves.
 */
const claveExtraordinario = (valor) => {
  if (valorVacio(valor)) return null;
  const encontrado = String(valor).trim().toUpperCase().match(PATRON_CLAVE_EXTRAORDINARIO);
  return encontrado ? encontrado[1] : null;
};

const textoClaveExtraordinario = (clave) => CODIGOS_EXTRAORDINARIO[clave] || '';

/**
 * Valor con el que se guarda una calificación: el número tal cual, o la clave
 * de dos letras si es un texto del catálogo. Un texto que no está en el
 * catálogo se devuelve sin cambios para que la validación lo rechace.
 */
const normalizarCalificacion = (valor, tipo) => {
  if (valorVacio(valor)) return null;
  const texto = String(valor).trim();
  if (!esTextoNoNumerico(texto)) return String(procesarCalificacionCruda(texto)).trim();
  if (Number(tipo) !== TIPO_EXTRAORDINARIO) return texto;
  return claveExtraordinario(texto) || texto;
};

const esAprobatoria = (valor, calificacionAprobatoria) => {
  if (valorVacio(valor)) return false;
  const numero = Number(String(procesarCalificacionCruda(valor)).trim());
  return !Number.isNaN(numero) && numero >= calificacionAprobatoria;
};

const esReprobatoriaNumerica = (valor, calificacionAprobatoria) => {
  if (valorVacio(valor)) return false;
  const numero = Number(procesarCalificacionCruda(valor));
  return !Number.isNaN(numero) && numero < calificacionAprobatoria;
};

const esExtraordinario = (calificacion) => Number(calificacion.tipo) === TIPO_EXTRAORDINARIO;

const compararCiclos = (cicloA = '', cicloB = '') => {
  const anioCompare = cicloA.substring(0, 4).localeCompare(cicloB.substring(0, 4));
  if (anioCompare !== 0) return anioCompare;
  return cicloA.substring(4).localeCompare(cicloB.substring(4));
};

/**
 * Agrupa las calificaciones de UNA asignatura por grupo (intento),
 * ordenadas cronológicamente por ciclo escolar.
 * Requiere include grupo.cicloEscolar para ordenar.
 */
const fechaEnMs = (valor) => {
  const tiempo = new Date(valor).getTime();
  return Number.isNaN(tiempo) ? 0 : tiempo;
};

/**
 * Normaliza una fecha a YYYY-MM-DD. Devuelve null si no es una fecha válida.
 * Las fechas de examen se capturan por día, sin hora.
 */
const fechaISO = (valor) => {
  if (valorVacio(valor)) return null;

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor.toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
    const soloFecha = texto.slice(0, 10);
    return Number.isNaN(new Date(`${soloFecha}T00:00:00Z`).getTime()) ? null : soloFecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
};

const fechaDeHoy = () => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
};

const esFechaFutura = (valor) => {
  const fecha = fechaISO(valor);
  return fecha !== null && fecha > fechaDeHoy();
};

/**
 * Ordena por fecha de examen cuando ambos intentos la tienen; si a alguno le
 * falta (recursamiento recién inscrito), manda el ciclo escolar.
 */
const compararIntentos = (a, b) => {
  if (a.fecha > 0 && b.fecha > 0 && a.fecha !== b.fecha) return a.fecha - b.fecha;
  const cicloCompare = compararCiclos(a.ciclo, b.ciclo);
  if (cicloCompare !== 0) return cicloCompare;
  return a.fecha - b.fecha;
};

const agruparIntentos = (calificaciones = []) => {
  const intentosPorGrupo = calificaciones.reduce((acc, calificacion) => {
    const key = calificacion.grupoId;
    const intento = acc[key] || {
      grupoId: calificacion.grupoId,
      ciclo: calificacion.grupo?.cicloEscolar?.nombre || '',
      fecha: 0,
      ordinario: null,
      extraordinario: null,
    };

    if (esExtraordinario(calificacion)) {
      intento.extraordinario = calificacion;
    } else {
      intento.ordinario = calificacion;
    }
    intento.fecha = Math.max(intento.fecha, fechaEnMs(calificacion.fechaExamen));

    acc[key] = intento;
    return acc;
  }, {});

  return Object.values(intentosPorGrupo).sort(compararIntentos);
};

const intentoAprobado = (intento, calificacionAprobatoria) => (
  esAprobatoria(intento.ordinario?.calificacion, calificacionAprobatoria)
  || esAprobatoria(intento.extraordinario?.calificacion, calificacionAprobatoria)
);

const algunIntentoAprobado = (intentos, calificacionAprobatoria) => intentos
  .some((intento) => intentoAprobado(intento, calificacionAprobatoria));

/**
 * Calificación vigente: el intento aprobado MÁS RECIENTE; si ninguno aprobó,
 * el último intento con valor capturado (su extraordinario si lo tiene).
 * Misma regla que fhistorial.php y build.certificado.db.use-cases.js.
 */
/**
 * Gana la PRIMERA aprobatoria: en cuanto el alumno acredita, esa es la que
 * vale y lo que se haya capturado después no debió existir. Dentro de un
 * intento el ordinario va antes que el extraordinario.
 */
const resolverVigente = (intentos, calificacionAprobatoria) => {
  const aprobado = intentos
    .find((intento) => intentoAprobado(intento, calificacionAprobatoria));

  if (aprobado) {
    return esAprobatoria(aprobado.ordinario?.calificacion, calificacionAprobatoria)
      ? aprobado.ordinario
      : aprobado.extraordinario;
  }

  const conValor = [...intentos].reverse().find((intento) => !valorVacio(
    intento.extraordinario?.calificacion,
  ) || !valorVacio(intento.ordinario?.calificacion));

  if (!conValor) return null;
  return valorVacio(conValor.extraordinario?.calificacion)
    ? conValor.ordinario
    : conValor.extraordinario;
};

/**
 * Separa los intentos respecto a un grupo:
 * - intentoActual: el del grupo (o null)
 * - otrosIntentos: todos los demás (anteriores y posteriores)
 * - intentosAnteriores: solo los de ciclos ANTERIORES al del grupo
 *   (un recursamiento solo puede venir del pasado).
 */
const clasificarIntentos = (intentos, grupo) => {
  const intentoActual = intentos.find((i) => Number(i.grupoId) === Number(grupo.id)) || null;
  const otrosIntentos = intentos.filter((i) => i !== intentoActual);
  const cicloGrupo = grupo.cicloEscolar?.nombre || '';
  const intentosAnteriores = otrosIntentos.filter((i) => compararCiclos(i.ciclo, cicloGrupo) < 0);

  return { intentoActual, otrosIntentos, intentosAnteriores };
};

/**
 * El intento quedó abierto: el alumno reprobó el ordinario y no hay
 * extraordinario capturado. Es el mismo criterio con el que el historial
 * imprime la materia bajo ASIGNATURAS PENDIENTES.
 */
const requiereExtraordinario = (intentos, calificacionAprobatoria) => {
  if (intentos.length === 0) return false;
  if (algunIntentoAprobado(intentos, calificacionAprobatoria)) return false;

  const ultimo = intentos[intentos.length - 1];
  if (!valorVacio(ultimo.extraordinario?.calificacion)) return false;

  const valor = ultimo.ordinario?.calificacion;
  return !valorVacio(valor) && !Number.isNaN(Number(String(valor).trim()));
};

/**
 * Calificaciones aprobatorias de una misma asignatura. Más de una significa
 * que se capturó un extraordinario o un recursamiento que no debía existir.
 */
const calificacionesAprobatorias = (intentos, calificacionAprobatoria) => intentos
  .flatMap((intento) => [intento.ordinario, intento.extraordinario])
  .filter((calificacion) => calificacion
    && esAprobatoria(calificacion.calificacion, calificacionAprobatoria));

const agruparPorAsignatura = (calificaciones = []) => calificaciones.reduce((acc, calificacion) => {
  acc[calificacion.asignaturaId] = [...(acc[calificacion.asignaturaId] || []), calificacion];
  return acc;
}, {});

module.exports = {
  TIPO_ORDINARIO,
  TIPO_EXTRAORDINARIO,
  valorVacio,
  procesarCalificacionCruda,
  esTextoNoNumerico,
  CODIGOS_EXTRAORDINARIO,
  CLAVES_EXTRAORDINARIO,
  claveExtraordinario,
  textoClaveExtraordinario,
  normalizarCalificacion,
  esAprobatoria,
  esReprobatoriaNumerica,
  compararCiclos,
  fechaISO,
  fechaDeHoy,
  esFechaFutura,
  agruparIntentos,
  agruparPorAsignatura,
  intentoAprobado,
  algunIntentoAprobado,
  resolverVigente,
  requiereExtraordinario,
  calificacionesAprobatorias,
  clasificarIntentos,
};
