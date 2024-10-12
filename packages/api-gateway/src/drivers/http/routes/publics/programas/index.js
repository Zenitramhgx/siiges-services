const { programasAdapter } = require('../../../adapters');
const {
  findPlantelProgramasSchema,
  findAllProgramasSchema,
} = require('../../privates/programas/schema');

async function programasRouter(fastify, opts, next) {
  await fastify.get(
    '/',
    {
      schema: findAllProgramasSchema,
    },
    programasAdapter.findAllProgramas,
  );

  await fastify.get(
    '/planteles/:plantelId',
    {
      schema: findPlantelProgramasSchema,
    },
    programasAdapter.findPlantelProgramas,
  );

  next();
}

module.exports = programasRouter;
