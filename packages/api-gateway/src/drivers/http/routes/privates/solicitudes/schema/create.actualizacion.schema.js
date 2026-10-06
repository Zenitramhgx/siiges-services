const { solicitud } = require('./properties/solicitud');
const { programa } = require('./properties/programa');
const { programaTurnos } = require('./properties/programaTurnos');
const { responseProperties } = require('./properties/responseProperties');

const createActualizacionSchema = {
  tags: ['Solicitudes'],
  description: 'Given a solicitudId and the tipoSolicitudId, creates an exact copy of the original solicitud as an actualización.',
  params: {
    type: 'object',
    properties: {
      solicitudId: { type: 'integer' },
    },
  },
  body: {
    type: 'object',
    properties: {
      tipoSolicitudId: { type: 'integer', enum: [5] },
    },
    required: ['tipoSolicitudId'],
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            folio: { type: 'string' },
            ...solicitud,
            ...responseProperties,
            programa: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                ...programa,
                programaTurnos: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      ...programaTurnos,
                      ...responseProperties,
                    },
                  },
                },
                ...responseProperties,
              },
            },
          },
        },
      },
    },
  },
};

module.exports = createActualizacionSchema;
