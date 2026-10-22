const { calificacionesAdapter } = require('../../../adapters');
const schema = require('./schema');

async function calificacionRouter(fastify, opts, next) {
  await fastify.post(
    '/grupos/:grupoId/asignaturas/:asignaturaId',
    {
      schema: schema.updateCalificacionesSchema,
      onRequest: [fastify.authenticate],
    },
    calificacionesAdapter.updateCalificaciones,
  );

  await fastify.get(
    '/alumnos/:alumnoId',
    {
      schema: schema.findCalificacionesAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    calificacionesAdapter.findCalificacionesAlumno,
  );

  await fastify.get(
    '/alumnos/:alumnoId/grupos/:grupoId',
    {
      schema: schema.findAcreditacionAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    calificacionesAdapter.findAcreditacionAlumno,
  );

  await fastify.patch(
    '/alumnos/:alumnoId/grupos/:grupoId',
    {
      schema: schema.updateAcreditacionAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    calificacionesAdapter.updateAcreditacionAlumno,
  );

  await fastify.delete(
    '/alumnos/:alumnoId/grupos/:grupoId/asignaturas/:asignaturaId/tipos/:tipo',
    {
      schema: schema.deleteCalificacionAlumnoSchema,
      onRequest: [fastify.authenticate],
    },
    calificacionesAdapter.deleteCalificacionAlumno,
  );

  next();
}

module.exports = calificacionRouter;
