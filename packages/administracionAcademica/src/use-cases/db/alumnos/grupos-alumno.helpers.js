const { compararCiclos } = require('./calificaciones-intentos.helpers');

/**
 * Regla de negocio: un alumno cursa UN grado por ciclo escolar, pero sí puede
 * recursar materias sueltas de grados anteriores en ese mismo ciclo.
 *
 * Para saber cuál de los dos grupos es el grado que cursa y cuál es el de
 * recursamientos no basta el número de grado: se mira lo capturado. Un grupo
 * donde TODAS las materias vienen de ciclos anteriores es un grupo de
 * recursamiento; si tiene aunque sea una materia nueva, ese es el grado que
 * cursa y en los demás grupos del ciclo solo caben recursamientos.
 *
 * Devuelve el otro grupo que el alumno cursa en este ciclo, o null.
 */
const buscarGradoEnCursoEnElCiclo = (alumnoGrupos, grupo, calificaciones = []) => {
  const otrosGrupos = (alumnoGrupos || [])
    .map((alumnoGrupo) => alumnoGrupo.grupo)
    .filter(Boolean)
    .filter((otroGrupo) => Number(otroGrupo.cicloEscolarId) === Number(grupo.cicloEscolarId)
      && Number(otroGrupo.id) !== Number(grupo.id)
      && Number(otroGrupo.gradoId) !== Number(grupo.gradoId));

  if (otrosGrupos.length === 0) return null;

  const cicloActual = grupo.cicloEscolar?.nombre || '';

  const vieneDeCicloAnterior = (asignaturaId) => calificaciones.some(
    (calificacion) => Number(calificacion.asignaturaId) === Number(asignaturaId)
      && compararCiclos(calificacion.grupo?.cicloEscolar?.nombre || '', cicloActual) < 0,
  );

  const esGrupoQueCursa = (otroGrupo) => calificaciones
    .filter((calificacion) => Number(calificacion.grupoId) === Number(otroGrupo.id))
    .some((calificacion) => !vieneDeCicloAnterior(calificacion.asignaturaId));

  const enCurso = otrosGrupos.find(esGrupoQueCursa);
  if (!enCurso) return null;

  return {
    grupoId: enCurso.id,
    descripcion: enCurso.descripcion,
    gradoId: enCurso.gradoId,
    grado: enCurso.grado?.nombre || `grado ${enCurso.gradoId}`,
    cicloEscolar: enCurso.cicloEscolar?.nombre || '',
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
  buscarGradoEnCursoEnElCiclo,
  mensajeConflictoDeGrado,
  avisoConflictoDeGrado,
  INCLUDE_ALUMNO_GRUPOS,
};
