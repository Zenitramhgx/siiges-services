const ubicacion = {
  type: 'object',
  properties: {
    grupoId: { type: 'integer' },
    descripcion: { type: 'string', nullable: true },
    cicloEscolarId: { type: 'integer' },
    ciclo: { type: 'string', nullable: true },
    gradoId: { type: 'integer' },
    grado: { type: 'string', nullable: true },
    numeroGrado: { type: 'integer' },
    inscrito: { type: 'boolean' },
    tieneCalificaciones: { type: 'boolean' },
  },
};

const findGruposAlumnoAcreditacionSchema = {
  params: {
    type: 'object',
    properties: {
      alumnoId: { type: 'integer' },
    },
    required: ['alumnoId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            grupos: { type: 'array', items: ubicacion },
            sugerido: { ...ubicacion, nullable: true },
          },
        },
      },
    },
  },
};

module.exports = findGruposAlumnoAcreditacionSchema;
