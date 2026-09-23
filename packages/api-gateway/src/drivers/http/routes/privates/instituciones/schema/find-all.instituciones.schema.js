const { institucion } = require('./properties/institucion');
const { ratificacionNombre } = require('./properties/ratificacionNombre');
const { responseProperties } = require('./properties/responseProperties');

const findAllInstitucionesSchema = {
  tags: ['Institucion'],
  description: 'Return a list of instituciones.',
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer',
        minimum: 0,
        default: 0,
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        default: 10,
      },
      search: {
        type: 'string',
        default: '',
      },
      sortBy: {
        type: 'string',
        enum: ['id', 'nombre', 'razonSocial', 'claveIes'],
        default: 'id',
      },
      sortOrder: {
        type: 'string',
        enum: ['asc', 'desc'],
        default: 'asc',
      },
      tipoInstitucionId: {
        type: 'array',
        items: {
          type: 'integer',
          enum: [1, 2],
        },
        description: 'Array of tipoInstitucionId values',
      },
      esNombreAutorizado: {
        type: 'boolean',
      },
      municipioId: {
        type: 'integer',
        description: 'Filter instituciones by municipio',
      },
    },
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
              usuarioId: { type: 'integer' },
              ...institucion,
              ...responseProperties,
              ratificacionesNombre: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    ...ratificacionNombre,
                    ...responseProperties,
                  },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
            sortBy: { type: 'string' },
            sortOrder: { type: 'string' },
            search: { type: 'string' },
          },
          required: ['page', 'limit', 'total', 'totalPages', 'sortBy', 'sortOrder', 'search'],
        },
      },
    },
  },
};

module.exports = findAllInstitucionesSchema;
