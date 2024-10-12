const { gradosAdapter } = require('../../../adapters');

const { findAllGradosSchema } = require('../../privates/grados/schema');

async function cicloEscolarRouter(fastify, opts, next) {
  await fastify.get(
    '/',
    {
      schema: findAllGradosSchema,
    },
    gradosAdapter.findAllGrados,
  );

  next();
}

module.exports = cicloEscolarRouter;
