const { valorVacio } = require('./calificaciones-intentos.helpers');

/**
 * Catálogo de grados: todos son de currícula RÍGIDA salvo los flexibles.
 * En currícula rígida el grado se califica al término del periodo, por eso
 * no se permite capturar un grado mientras el anterior siga incompleto.
 * En currícula flexible el alumno avanza por asignatura y no hay restricción.
 */
const GRADOS_FLEXIBLES_IDS = [23, 24];
const GRADO_OPTATIVA_ID = 25;

const TIPO_ASIGNATURA_OPTATIVA = 2;

const MAX_ASIGNATURAS_EN_MENSAJE = 5;

const nombreEnMayusculas = (grado) => String(grado?.nombre || '').toUpperCase();

const esGradoFlexible = (gradoId, grado) => GRADOS_FLEXIBLES_IDS.includes(Number(gradoId))
  || nombreEnMayusculas(grado).includes('FLEXIBLE');

const esGradoOptativo = (gradoId, grado) => Number(gradoId) === GRADO_OPTATIVA_ID
  || nombreEnMayusculas(grado).includes('OPTATIVA');

const numeroDeGrado = (asignatura) => Number(asignatura?.grado?.numeroGrado) || 0;

const esObligatoriaDeGradoRigido = (asignatura) => Number(asignatura.tipo)
  !== TIPO_ASIGNATURA_OPTATIVA
  && !esGradoFlexible(asignatura.gradoId, asignatura.grado)
  && !esGradoOptativo(asignatura.gradoId, asignatura.grado);

/**
 * Asignaturas del grado inmediatamente anterior al del grupo, dentro del mismo
 * programa. Devuelve [] si el grado del grupo es flexible u optativo, si no se
 * puede saber su número, o si es el primer grado del plan.
 */
const asignaturasDelGradoAnterior = (asignaturas, grupo) => {
  if (esGradoFlexible(grupo.gradoId, grupo.grado) || esGradoOptativo(grupo.gradoId, grupo.grado)) {
    return [];
  }

  const numeroActual = Number(grupo.grado?.numeroGrado) || 0;
  if (numeroActual === 0) return [];

  const obligatorias = asignaturas.filter(esObligatoriaDeGradoRigido);

  const numerosAnteriores = obligatorias
    .map(numeroDeGrado)
    .filter((numero) => numero > 0 && numero < numeroActual);

  if (numerosAnteriores.length === 0) return [];

  const numeroAnterior = Math.max(...numerosAnteriores);
  return obligatorias.filter((asignatura) => numeroDeGrado(asignatura) === numeroAnterior);
};

const tieneAlgunaCalificacion = (calificaciones = []) => calificaciones
  .some((calificacion) => !valorVacio(calificacion.calificacion));

/**
 * Si el grado anterior tiene asignaturas sin calificar, describe el pendiente;
 * si está completo (o no aplica la regla), devuelve null.
 */
const revisarGradoAnterior = ({ asignaturas, grupo, calificacionesPorAsignatura }) => {
  const asignaturasAnteriores = asignaturasDelGradoAnterior(asignaturas, grupo);
  if (asignaturasAnteriores.length === 0) return null;

  const faltantes = asignaturasAnteriores.filter(
    (asignatura) => !tieneAlgunaCalificacion(calificacionesPorAsignatura[asignatura.id]),
  );
  if (faltantes.length === 0) return null;

  const primera = asignaturasAnteriores[0];

  return {
    grado: primera.grado?.nombre || `grado ${primera.gradoId}`,
    total: asignaturasAnteriores.length,
    faltantes: faltantes.map((asignatura) => `${asignatura.clave} ${asignatura.nombre}`),
  };
};

const listaDeFaltantes = (pendiente) => {
  const mostradas = pendiente.faltantes.slice(0, MAX_ASIGNATURAS_EN_MENSAJE);
  const restantes = pendiente.faltantes.length - mostradas.length;
  return restantes > 0 ? `${mostradas.join(', ')} y ${restantes} más` : mostradas.join(', ');
};

const mensajeGradoAnteriorIncompleto = (pendiente) => `el plan es de currícula rígida y ${pendiente.grado}`
  + ` tiene ${pendiente.faltantes.length} de ${pendiente.total} asignaturas sin calificar`;

const avisoGradoAnteriorIncompleto = (pendiente) => 'El plan es de currícula rígida: no se pueden'
  + ` capturar calificaciones de este grado hasta terminar ${pendiente.grado},`
  + ` que tiene ${pendiente.faltantes.length} de ${pendiente.total} asignaturas sin calificar`
  + ` (${listaDeFaltantes(pendiente)}). Aquí solo puede capturar materias por recursar.`;

module.exports = {
  GRADOS_FLEXIBLES_IDS,
  GRADO_OPTATIVA_ID,
  esGradoFlexible,
  esGradoOptativo,
  asignaturasDelGradoAnterior,
  revisarGradoAnterior,
  mensajeGradoAnteriorIncompleto,
  avisoGradoAnteriorIncompleto,
};
