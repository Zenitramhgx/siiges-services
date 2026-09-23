const createAlumnoSchema = require('./create.alumno.schema');
const findOneAlumnoSchema = require('./find-one.alumno.schema');
const updateAlumnoSchema = require('./update.alumno.schema');
const deleteAlumnoSchema = require('./delete.alumno.schema');
const findProgramaAlumnosSchema = require('./find.programa-alumnos.schema');
const alumnosInscripcionSchema = require('./alumnos-inscripcion.schema');
const { findAlumnosInscritosSchema } = require('./find-group.alumno-inscrito.schema');
const { createValidacionSchema } = require('./create.validacion.schema');
const { findOneValidacionSchema } = require('./find-one.validacion.schema');
const { updateValidacionSchema } = require('./update.validacion.schema');
const findAlumnosGrupoSchema = require('./find-group.alumnos-grupo.schema');
const { deleteAlumnoInscritoSchema } = require('./delete.alumno-inscrito.schema');
const findAlumnosCountSchema = require('./find-all.alumnos-count.schema');
const findAlumnosExtraSchema = require('./find-group.alumnos-extra.schema');
const findGroupAlumnosPersonaSchema = require('./find-group-alumnos-persona.schema');
const findMatriculaActivaSchema = require('./find-all.matricula-activa.schema');
const { findAlumnosInactivosSchema } = require('./find.alumnos-inactivos.schema');
const { findAlumnosInactivosCsvSchema } = require('./find.alumnos-inactivos-csv.schema');
const { findAlumnosInactivosPdfSchema } = require('./find.alumnos-inactivos-pdf.schema');
const { findAlumnosExtraordinariosPdfSchema } = require('./find.alumnos-extraordinarios-pdf.schema');
const { updateAlumnosSituacionSchema } = require('./update.alumnos-situacion.schema');
const { updateAlumnosEgresoSchema } = require('./update-alumnos-egreso.schema');
const findGroupAlumnosAcreditacionSchema = require('./find-group.alumnos-acreditacion.schema');

module.exports = {
  createAlumnoSchema,
  findOneAlumnoSchema,
  updateAlumnoSchema,
  deleteAlumnoSchema,
  findProgramaAlumnosSchema,
  createValidacionSchema,
  alumnosInscripcionSchema,
  findOneValidacionSchema,
  findAlumnosInscritosSchema,
  updateValidacionSchema,
  findAlumnosGrupoSchema,
  deleteAlumnoInscritoSchema,
  findAlumnosCountSchema,
  findAlumnosExtraSchema,
  findGroupAlumnosPersonaSchema,
  findMatriculaActivaSchema,
  findAlumnosInactivosSchema,
  findAlumnosInactivosCsvSchema,
  findAlumnosInactivosPdfSchema,
  findAlumnosExtraordinariosPdfSchema,
  updateAlumnosSituacionSchema,
  updateAlumnosEgresoSchema,
  findGroupAlumnosAcreditacionSchema,
};
