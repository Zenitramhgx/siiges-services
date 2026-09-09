const { tituloElectronico } = require('./properties/tituloElectronico');
const { responseProperties } = require('./properties/responseProperties');

const findAllTitulos = {
  tags: ['Titulos Electronicos'],
  description: 'Get a list Titulos Electronicos',
  querystring: {
    type: 'object',
    properties: {
      institucionId: { type: 'integer' },
      numeroRvoe: { type: 'string' },
      nombre: { type: 'string' },
      primerApellido: { type: 'string' },
      segundoApellido: { type: 'string' },
      curp: { type: 'string' },
    },
    required: ['institucionId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              ...tituloElectronico,
              ...responseProperties,
            },
          },
        },
      },
    },
  },
};

module.exports = { findAllTitulos };
