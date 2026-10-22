const { alumnosAdapter } = require('../../../adapters');
const alumnosSchema = require('./schema');

async function asignaturaRouter(fastify, opts, next) {
  await fastify.post(
    '/',
    {
      schema: alumnosSchema.createAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.createAlumno,
  );

  await fastify.get(
    '/programas/:programaId',
    {
      schema: alumnosSchema.findProgramaAlumnosSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findGroupAlumnosPrograma,
  );

  await fastify.get(
    '/:alumnoId',
    {
      schema: alumnosSchema.findOneAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findOneAlumno,
  );

  await fastify.patch(
    '/activacion-masiva',
    {
      schema: alumnosSchema.updateAlumnosSituacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.updateAlumnosSituacion,
  );

  await fastify.patch(
    '/egreso-masivo',
    {
      schema: alumnosSchema.updateAlumnosEgresoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.updateAlumnosEgreso,
  );

  await fastify.patch(
    '/:alumnoId',
    {
      schema: alumnosSchema.updateAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.updateAlumno,
  );

  await fastify.delete(
    '/:alumnoId',
    {
      schema: alumnosSchema.deleteAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.deleteAlumno,
  );

  await fastify.post(
    '/grupos/:grupoId/inscripcion',
    {
      schema: alumnosSchema.alumnosInscripcionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.alumnosInscripcion,
  );

  await fastify.delete(
    '/:alumnoId/grupos/:grupoId/inscripcion',
    {
      schema: alumnosSchema.deleteAlumnoInscritoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.deleteAlumnoInscrito,
  );

  await fastify.get(
    '/grupos/:grupoId/inscripcion',
    {
      schema: alumnosSchema.findAlumnosInscritosSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosInscritos,
  );

  await fastify.post(
    '/:alumnoId/validaciones',
    {
      schema: alumnosSchema.createValidacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.createAlumnoValidacion,
  );

  await fastify.get(
    '/:alumnoId/validaciones',
    {
      schema: alumnosSchema.findOneValidacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findOneAlumnoValidacion,
  );

  await fastify.patch(
    '/:alumnoId/validaciones',
    {
      schema: alumnosSchema.updateValidacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.updateAlumnoValidacion,
  );

  await fastify.get(
    '/grupos/:grupoId/asignatura/:asignaturaId',
    {
      schema: alumnosSchema.findAlumnosGrupoSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosGrupo,
  );

  await fastify.get(
    '/programas/:programaId/acreditacion',
    {
      schema: alumnosSchema.findGroupAlumnosAcreditacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findGroupAlumnosAcreditacion,
  );

  await fastify.get(
    '/:alumnoId/acreditacion/grupos',
    {
      schema: alumnosSchema.findGruposAlumnoAcreditacionSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findGruposAlumnoAcreditacion,
  );

  await fastify.get(
    '/programas/:programaId/count',
    {
      schema: alumnosSchema.findAlumnosCountSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosCount,
  );

  await fastify.get(
    '/ciclos/:cicloEscolarId/extraordinarios',
    {
      schema: alumnosSchema.findAlumnosExtraSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosExtra,
  );
  await fastify.get(
    '/persona',
    {
      schema: alumnosSchema.findGroupAlumnosPersonaSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findOneAlumnoPersona,
  );
  await fastify.get(
    '/matricula-activa/count',
    {
      schema: alumnosSchema.findMatriculaActivaSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findMatriculaActiva,
  );
  await fastify.get(
    '/matricula-inactiva',
    {
      schema: alumnosSchema.findAlumnosInactivosSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosInactivos,
  );

  await fastify.get(
    '/matricula-inactiva/csv',
    {
      schema: alumnosSchema.findAlumnosInactivosCsvSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosInactivosCsv,
  );

  await fastify.get(
    '/matricula-inactiva/pdf',
    {
      schema: alumnosSchema.findAlumnosInactivosPdfSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosInactivosPdf,
  );

  await fastify.get(
    '/matricula-extraordinaria/pdf',
    {
      schema: alumnosSchema.findAlumnosExtraordinariosPdfSchema,
      onRequest: [fastify.authenticate],
    },
    alumnosAdapter.findAlumnosExtraordinariosPdf,
  );

  next();
}

module.exports = asignaturaRouter;
