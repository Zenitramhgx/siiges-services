const deleteCalificacionAlumnoSchema = {
  params: {
    type: 'object',
    properties: {
      alumnoId: { type: 'integer' },
      grupoId: { type: 'integer' },
      asignaturaId: { type: 'integer' },
      tipo: { type: 'integer' },
    },
    required: ['alumnoId', 'grupoId', 'asignaturaId', 'tipo'],
  },
  querystring: {
    type: 'object',
    properties: {
      alcance: { type: 'string', enum: ['registro', 'posteriores', 'desde'], default: 'registro' },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            alcance: { type: 'string' },
            borradas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  asignaturaId: { type: 'integer' },
                  grupoId: { type: 'integer' },
                  tipo: { type: 'integer' },
                  calificacion: { type: 'string', nullable: true },
                  fechaExamen: { type: 'string', nullable: true },
                  ciclo: { type: 'string', nullable: true },
                  grado: { type: 'string', nullable: true },
                  descripcion: { type: 'string', nullable: true },
                },
              },
            },
            grupo: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                descripcion: { type: 'string', nullable: true },
                ciclo: { type: 'string', nullable: true },
                grado: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = deleteCalificacionAlumnoSchema;
