const { solicitudesAdapter, representativeAdapter, diligenciasAdapter } = require('../../../adapters');
const { updateSchema, findSchema, deleteSchema } = require('./representantes/schemas');
const { findDiligenciasSolicitudSchema } = require('../diligencias/schema');
const solicitudesSchema = require('./schema');

async function solicitudRouter(fastify, opts, next) {
  await fastify.get(
    '/',
    {
      schema: solicitudesSchema.findAllSolicitudesProgramasSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.findAllSolicitudesProgramas,
  );

  await fastify.get(
    '/:solicitudId',
    {
      schema: solicitudesSchema.findOneSolicitudProgramaSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.findOneSolicitudPrograma,
  );

  await fastify.get(
    '/:solicitudId/detalles',
    {
      schema: solicitudesSchema.findOneSolicitudDetalleSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.findOneSolicitudDetalle,
  );

  await fastify.post(
    '/:solicitudId/refrendo',
    {
      // schema: solicitudesSchema.createSolicitudRefrendoSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.post(
    '/',
    {
      schema: solicitudesSchema.createSolicitudProgramaSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.post(
    '/:solicitudId/cambioDomicilio/:plantelId',
    {
      // schema: solicitudesSchema.createDomicilioSolicitudProgramaSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.post(
    '/:solicitudId/cambioRepresentanteLegal',
    {
      schema: solicitudesSchema.createCambioRepresentanteLegalSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.post(
    '/:solicitudId/actualizacion',
    {
      schema: solicitudesSchema.createActualizacionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.post(
    '/:solicitudId/cambioNombreInstitucion',
    {
      schema: solicitudesSchema.createCambioNombreInstitucionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSolicitudPrograma,
  );

  await fastify.patch(
    '/:solicitudId',
    {
      schema: solicitudesSchema.updateSolicitudProgramaSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.updateSolicitudPrograma,
  );
  await fastify.delete(
    '/:solicitudId',
    {
      schema: solicitudesSchema.deleteSolicitudSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.deleteSolicitud,
  );
  await fastify.get(
    '/:solicitudId/representantes/:usuarioId',
    {
      schema: findSchema,
      onRequest: [fastify.authenticate],
    },
    representativeAdapter.findOne,
  );

  await fastify.patch(
    '/:solicitudId/representantes/:usuarioId',
    {
      schema: updateSchema,
      onRequest: [fastify.authenticate],
    },
    representativeAdapter.update,
  );

  await fastify.post(
    '/:solicitudId/observaciones',
    {
      schema: solicitudesSchema.createSendMailObservacionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.createSendMailObservacion,
  );

  await fastify.delete(
    '/:solicitudId/representantes/:usuarioId',
    {
      schema: deleteSchema,
      onRequest: [fastify.authenticate],
    },
    representativeAdapter.deleteOne,
  );

  await fastify.get(
    '/:solicitudId/diligencias/',
    {
      schema: findDiligenciasSolicitudSchema,
      onRequest: [fastify.authenticate],
    },
    diligenciasAdapter.findDiligenciasBySolicitud,
  );

  await fastify.post(
    '/:solicitudId/secciones/:seccionId',
    {
      schema: solicitudesSchema.setSolicitudSeccionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.setSolicitudSeccion,
  );

  await fastify.post(
    '/:solicitudId/secciones/:seccionId/observaciones',
    {
      schema: solicitudesSchema.updateSolcitudSeccionObservacionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.updateSolcitudSeccionObservacion,
  );

  await fastify.get(
    '/:solicitudId/secciones/:seccionId',
    {
      schema: solicitudesSchema.findOneSolicitudSeccionSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.findOneSolicitudSeccion,
  );

  await fastify.get(
    '/usuarios/:usuarioId',
    {
      schema: solicitudesSchema.findAllSolicitudesUsuarioSchema,
      onRequest: [fastify.authenticate],
    },
    solicitudesAdapter.findSolicitudesUsuario,
  );

  next();
}

module.exports = solicitudRouter;
