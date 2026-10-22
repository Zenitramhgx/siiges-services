const {
  compararCiclos,
  agruparIntentos,
  algunIntentoAprobado,
} = require('./calificaciones-intentos.helpers');
const { esGradoFlexible } = require('./curricula-grados.helpers');

/**
 * Seriación: una asignatura seriada no se puede cursar hasta acreditar su
 * antecedente en un ciclo ANTERIOR. El campo `seriacion` de la asignatura
 * trae la clave de la antecedente.
 *
 * Solo aplica en currícula flexible: ahí el alumno avanza por asignatura y la
 * seriación es lo único que ordena el avance. En currícula rígida manda la
 * regla del grado anterior completo (curricula-grados.helpers.js).
 */

const VALORES_SIN_SERIACION = [
  'NINGUNA', 'NINGUNO', 'NA', 'N/A', 'NO APLICA', 'NO', 'SIN SERIACION', 'SIN SERIACIÓN', '-', '--', '0',
];

const SEPARADORES = /[,;/|]+/;

const MAX_ASIGNATURAS_EN_MENSAJE = 5;

const normalizarClave = (valor) => String(valor ?? '').trim().toUpperCase();

const esValorSinSeriacion = (texto) => texto === '' || VALORES_SIN_SERIACION.includes(texto);

/**
 * Claves de las antecedentes. El campo casi siempre trae una sola, pero si
 * trae varias separadas por coma, diagonal o punto y coma, se toman todas.
 */
const clavesAntecedentes = (seriacion) => {
  const texto = normalizarClave(seriacion);
  if (esValorSinSeriacion(texto)) return [];

  return texto
    .split(SEPARADORES)
    .map((parte) => parte.trim())
    .filter((parte) => !esValorSinSeriacion(parte));
};

const indexarAsignaturasPorClave = (asignaturas = []) => asignaturas
  .reduce((acc, asignatura) => {
    const clave = normalizarClave(asignatura.clave);
    if (clave !== '') acc[clave] = asignatura;
    return acc;
  }, {});

const tieneAnio = (ciclo) => /^\d{4}/.test(String(ciclo || '').trim());

/**
 * Los ciclos se comparan como texto, así que un nombre sin año (EQUIV) queda
 * después de cualquier año. Una equivalencia es estudio ya acreditado que
 * viene de antes, por eso aquí cuenta como ciclo anterior.
 */
const cicloEsAnterior = (cicloIntento, cicloGrupo) => {
  if (!tieneAnio(cicloIntento) && tieneAnio(cicloGrupo)) return true;
  return compararCiclos(cicloIntento, cicloGrupo) < 0;
};

const acreditadaEnCicloAnterior = ({ calificaciones, grupo, calificacionAprobatoria }) => {
  const cicloGrupo = grupo.cicloEscolar?.nombre || '';
  const intentosAnteriores = agruparIntentos(calificaciones)
    .filter((intento) => cicloEsAnterior(intento.ciclo, cicloGrupo));

  return algunIntentoAprobado(intentosAnteriores, calificacionAprobatoria);
};

/**
 * Antecedentes que le faltan por acreditar a una asignatura, descritas para
 * el mensaje. Devuelve [] cuando no hay nada que bloquear.
 *
 * Nunca bloquea por un dato que no se puede resolver: si la clave del campo
 * no corresponde a ninguna asignatura del programa, se ignora.
 */
const revisarSeriacion = ({
  asignatura,
  grupo,
  asignaturasPorClave,
  calificacionesPorAsignatura,
  calificacionAprobatoria,
}) => {
  if (!esGradoFlexible(grupo.gradoId, grupo.grado)) return [];

  return clavesAntecedentes(asignatura.seriacion)
    .map((clave) => asignaturasPorClave[clave])
    .filter(Boolean)
    .filter((antecedente) => Number(antecedente.id) !== Number(asignatura.id))
    .filter((antecedente) => !acreditadaEnCicloAnterior({
      calificaciones: calificacionesPorAsignatura[antecedente.id] || [],
      grupo,
      calificacionAprobatoria,
    }))
    .map((antecedente) => `${antecedente.clave} ${antecedente.nombre}`);
};

const listaCorta = (faltantes) => {
  const mostradas = faltantes.slice(0, MAX_ASIGNATURAS_EN_MENSAJE);
  const restantes = faltantes.length - mostradas.length;
  return restantes > 0 ? `${mostradas.join(', ')} y ${restantes} más` : mostradas.join(', ');
};

const mensajeSeriacionPendiente = (faltantes) => 'está seriada y primero hay que acreditar'
  + ` ${listaCorta(faltantes)} en un ciclo anterior`;

const avisoSeriacionPendiente = (faltantes) => 'Esta asignatura está seriada: primero hay que'
  + ` acreditar ${listaCorta(faltantes)} en un ciclo anterior.`;

const avisoSeriacionDelGrupo = (claves) => `${claves.length} `
  + `${claves.length === 1 ? 'asignatura está bloqueada' : 'asignaturas están bloqueadas'}`
  + ` por seriación: ${listaCorta(claves)}.`
  + ' Para capturarlas, su antecedente tiene que estar acreditada en un ciclo anterior.';

module.exports = {
  clavesAntecedentes,
  indexarAsignaturasPorClave,
  cicloEsAnterior,
  acreditadaEnCicloAnterior,
  revisarSeriacion,
  mensajeSeriacionPendiente,
  avisoSeriacionPendiente,
  avisoSeriacionDelGrupo,
};
