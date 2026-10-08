/**
 * Regla de negocio: un alumno no puede cursar DOS GRADOS COMPLETOS en el mismo
 * ciclo escolar, pero sí puede recursar materias sueltas de un grado anterior
 * mientras cursa el suyo (se capturan en un grupo del grado al que pertenecen).
 *
 * Devuelve el otro grupo del mismo ciclo con distinto grado, o null. Cuando
 * existe, en este grupo solo se permiten asignaturas por recursar.
 */
const buscarGrupoDeOtroGradoEnElCiclo = (alumnoGrupos, grupo) => {
  const inscripcion = (alumnoGrupos || [])
    .map((alumnoGrupo) => alumnoGrupo.grupo)
    .filter(Boolean)
    .find((otroGrupo) => Number(otroGrupo.cicloEscolarId) === Number(grupo.cicloEscolarId)
      && Number(otroGrupo.id) !== Number(grupo.id)
      && Number(otroGrupo.gradoId) !== Number(grupo.gradoId));

  if (!inscripcion) return null;

  return {
    grupoId: inscripcion.id,
    descripcion: inscripcion.descripcion,
    gradoId: inscripcion.gradoId,
    grado: inscripcion.grado?.nombre || `grado ${inscripcion.gradoId}`,
    cicloEscolar: inscripcion.cicloEscolar?.nombre || '',
  };
};

const mensajeConflictoDeGrado = (conflicto) => `el alumno ya cursa ${conflicto.grado}`
  + ` (grupo ${conflicto.descripcion}) en el ciclo ${conflicto.cicloEscolar},`
  + ' así que en este grupo solo puede recursar materias pendientes';

const avisoConflictoDeGrado = (conflicto) => `El alumno ya cursa ${conflicto.grado}`
  + ` (grupo ${conflicto.descripcion}) en el ciclo ${conflicto.cicloEscolar}.`
  + ' Aquí solo puede capturar materias por recursar.';

const INCLUDE_ALUMNO_GRUPOS = [{
  association: 'grupo',
  include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
}];

module.exports = {
  buscarGrupoDeOtroGradoEnElCiclo,
  mensajeConflictoDeGrado,
  avisoConflictoDeGrado,
  INCLUDE_ALUMNO_GRUPOS,
};
