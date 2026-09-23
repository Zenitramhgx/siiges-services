const { models, queries } = require('@siiges-services/core');

const {
  createQuery,
  findOneQuery,
  updateAndFindQuery,
  findAllQuery,
  deleteAndFindQuery,
  startTransactionQuery,
} = queries;

const {
  Alumno,
  TituloElectronico,
  AlumnoTipoTramite,
  Persona,
  Asignatura,
  Calificacion,
  AlumnoGrupo,
  Grupo,
  File,
} = models;

module.exports = {
  findOneAlumnoQuery: findOneQuery(Alumno),
  findOneAlumnoTituloQuery: findOneQuery(TituloElectronico),
  findAllTitulosQuery: findAllQuery(TituloElectronico),
  findOneAlumnoTipoTramiteQuery: findOneQuery(AlumnoTipoTramite),
  createAlumnoQuery: createQuery(Alumno),
  createAlumnoGrupoQuery: createQuery(AlumnoGrupo),
  deleteAlumnoGrupoQuery: deleteAndFindQuery(AlumnoGrupo),
  findOneAlumnoGrupoQuery: findOneQuery(AlumnoGrupo),
  findAllAlumnoGrupoQuery: findAllQuery(AlumnoGrupo),
  createAlumnoTipoTramiteQuery: createQuery(AlumnoTipoTramite),
  updateAlumnoQuery: updateAndFindQuery(Alumno),
  updateAlumnoTipoTramiteQuery: updateAndFindQuery(AlumnoTipoTramite),
  updatePersonaQuery: updateAndFindQuery(Persona),
  deleteAlumnoQuery: deleteAndFindQuery(Alumno),
  deleteAlumnoTipoTramiteQuery: deleteAndFindQuery(AlumnoTipoTramite),
  deletePersonaQuery: deleteAndFindQuery(Persona),
  findAllAlumnosQuery: findAllQuery(Alumno),
  findOneAsignaturaQuery: findOneQuery(Asignatura),
  findOneCalificacionQuery: findOneQuery(Calificacion),
  createCalificacionQuery: createQuery(Calificacion),
  updateCalificacionQuery: updateAndFindQuery(Calificacion),
  findAllCalificacionesQuery: findAllQuery(Calificacion),
  deleteCalificacionQuery: deleteAndFindQuery(Calificacion),
  findAllCount: findAllQuery(Alumno),
  findAllGruposQuery: findAllQuery(Grupo),
  findAllAsignaturasQuery: findAllQuery(Asignatura),
  findAllFilesQuery: findAllQuery(File),
  startTransactionQuery: startTransactionQuery(Calificacion),
};
