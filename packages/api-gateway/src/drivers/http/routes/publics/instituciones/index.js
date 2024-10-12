const { institucionesAdapter } = require('../../../adapters');

const {
  findAllInstitucionesSchema,
  findPlantelesInstitucionSchema,

} = require('../../privates/instituciones/schema');
const { findAllTipoInstitucionesSchema } = require('../../privates/instituciones/schema');

async function institucionRouter(fastify, opts, next) {
  await fastify.get(
    '/',
    {
      schema: findAllInstitucionesSchema,
    },
    institucionesAdapter.findAllInstituciones,
  );

  await fastify.get(
    '/:institucionId/planteles',
    {
      schema: findPlantelesInstitucionSchema,
    },
    institucionesAdapter.findPlantelesInstitucion,
  );

  await fastify.get(
    '/tipoInstituciones',
    {
      schema: findAllTipoInstitucionesSchema,
    },
    institucionesAdapter.findAllTipoInstituciones,
  );

  next();
}

module.exports = institucionRouter;
