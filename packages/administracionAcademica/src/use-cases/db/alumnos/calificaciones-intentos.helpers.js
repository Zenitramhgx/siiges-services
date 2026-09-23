/**
 * Reglas compartidas para calificaciones con recursamientos.
 * Un "intento" = ordinario (tipo 1) + extraordinario (tipo 2) del mismo grupo.
 * La misma lógica vive en fhistorial.php y build.certificado.db.use-cases.js;
 * si cambia aquí, debe cambiar allá.
 */

const TIPO_ORDINARIO = 1;
const TIPO_EXTRAORDINARIO = 2;

// Valores no numéricos que cuentan como acreditados
const VALORES_LETRA_ACREDITADA = ['A'];

const valorVacio = (valor) => valor === null || valor === undefined || String(valor).trim() === '';

// Datos legados tipo "8 (OCHO)" → "8"
const procesarCalificacionCruda = (valor) => {
  if (typeof valor === 'string' && valor.includes('(')) {
    return valor.substring(0, valor.indexOf('(')).trim();
  }
  return valor;
};

const esLetraAcreditada = (valor) => !valorVacio(valor)
  && VALORES_LETRA_ACREDITADA.includes(String(valor).trim().toUpperCase());

const esAprobatoria = (valor, calificacionAprobatoria) => {
  if (valorVacio(valor)) return false;
  const procesada = String(procesarCalificacionCruda(valor)).trim();
  if (esLetraAcreditada(procesada)) return true;
  const numero = Number(procesada);
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
const resolverVigente = (intentos, calificacionAprobatoria) => {
  const aprobado = [...intentos].reverse()
    .find((intento) => intentoAprobado(intento, calificacionAprobatoria));

  if (aprobado) {
    return esAprobatoria(aprobado.extraordinario?.calificacion, calificacionAprobatoria)
      ? aprobado.extraordinario
      : aprobado.ordinario;
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

const agruparPorAsignatura = (calificaciones = []) => calificaciones.reduce((acc, calificacion) => {
  acc[calificacion.asignaturaId] = [...(acc[calificacion.asignaturaId] || []), calificacion];
  return acc;
}, {});

module.exports = {
  TIPO_ORDINARIO,
  TIPO_EXTRAORDINARIO,
  VALORES_LETRA_ACREDITADA,
  valorVacio,
  procesarCalificacionCruda,
  esLetraAcreditada,
  esAprobatoria,
  esReprobatoriaNumerica,
  compararCiclos,
  agruparIntentos,
  agruparPorAsignatura,
  intentoAprobado,
  algunIntentoAprobado,
  resolverVigente,
  clasificarIntentos,
};
