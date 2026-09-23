const findGroupAlumnosAcreditacionSchema = {
  tags: ['Alumnos'],
  description: 'Given a programaId, return a paginated list of alumnos for Acreditación, searchable by matricula, nombre or apellidos.',
  params: {
    type: 'object',
    properties: {
      programaId: { type: 'integer' },
    },
    required: ['programaId'],
  },
  querystring: {
    type: 'object',
    properties: {
      page: {
        type: 'integer', minimum: 0, default: 0,
      },
      limit: {
        type: 'integer', minimum: 1, maximum: 100, default: 10,
      },
      search: {
        type: 'string', default: '',
      },
      sortBy: {
        type: 'string',
        enum: ['id', 'matricula', 'nombre', 'apellidoPaterno', 'situacion'],
        default: 'matricula',
      },
      sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
      situacionId: { type: 'integer' },
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
              matricula: { type: 'string' },
              situacionId: { type: 'integer' },
              persona: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  apellidoPaterno: { type: 'string' },
                  apellidoMaterno: { type: 'string' },
                },
              },
              situacion: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  nombre: { type: 'string' },
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

module.exports = findGroupAlumnosAcreditacionSchema;
