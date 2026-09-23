const { calificacion } = require('../../alumnos/schema/properties/calificacion');
const { responseProperties } = require('../../alumnos/schema/properties/responseProperties');

const updateAcreditacionAlumnoSchema = {
  tags: ['Calificaciones'],
  description: 'Given an alumno and grupo, inscribe (if needed) and grade asignaturas. Only creates or updates, never deletes. All or nothing.',
  params: {
    type: 'object',
    properties: {
      alumnoId: { type: 'integer' },
      grupoId: { type: 'integer' },
    },
    required: ['alumnoId', 'grupoId'],
  },
  body: {
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      properties: {
        asignaturaId: { type: 'integer' },
        tipo: { type: 'integer', enum: [1, 2] },
        calificacion: { type: 'string', nullable: true },
        fechaExamen: { type: 'string', format: 'date', nullable: true },
      },
      required: ['asignaturaId', 'tipo'],
      additionalProperties: false,
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
              ...calificacion,
              ...responseProperties,
            },
          },
        },
      },
    },
  },
};

module.exports = updateAcreditacionAlumnoSchema;
