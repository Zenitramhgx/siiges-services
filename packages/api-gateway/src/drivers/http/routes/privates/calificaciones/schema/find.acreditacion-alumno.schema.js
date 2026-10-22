const calificacionDto = {
  type: 'object',
  nullable: true,
  properties: {
    id: { type: 'integer' },
    calificacion: { type: 'string', nullable: true },
    fechaExamen: { type: 'string', nullable: true },
  },
};

const findAcreditacionAlumnoSchema = {
  tags: ['Calificaciones'],
  description: 'Given an alumnoId and grupoId, return the asignaturas of the grupo grado (plus pending recursamientos) with their calificaciones.',
  params: {
    type: 'object',
    properties: {
      alumnoId: { type: 'integer' },
      grupoId: { type: 'integer' },
    },
    required: ['alumnoId', 'grupoId'],
  },
  response: {
    200: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            alumno: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                matricula: { type: 'string' },
                nombre: { type: 'string' },
                apellidoPaterno: { type: 'string' },
                apellidoMaterno: { type: 'string' },
                situacion: { type: 'string', nullable: true },
              },
            },
            grupo: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                descripcion: { type: 'string' },
                cicloEscolar: { type: 'string' },
                grado: { type: 'string' },
                gradoId: { type: 'integer' },
                turno: { type: 'string', nullable: true },
              },
            },
            inscritoEnGrupo: { type: 'boolean' },
            avisoOtroGrado: { type: 'string', nullable: true },
            avisoGradoAnterior: { type: 'string', nullable: true },
            avisoSeriacion: { type: 'string', nullable: true },
            avisoRevision: { type: 'string', nullable: true },
            avisoFaltaExtraordinario: { type: 'string', nullable: true },
            habilitadoParaCaptura: { type: 'boolean' },
            motivosNoHabilitado: { type: 'array', items: { type: 'string' } },
            limites: {
              type: 'object',
              properties: {
                calificacionMinima: { type: 'number', nullable: true },
                calificacionMaxima: { type: 'number', nullable: true },
                calificacionAprobatoria: { type: 'number', nullable: true },
                calificacionDecimal: { type: 'boolean' },
              },
            },
            asignaturas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  asignaturaId: { type: 'integer' },
                  clave: { type: 'string' },
                  nombre: { type: 'string' },
                  seriacion: { type: 'string', nullable: true },
                  creditos: { type: 'string', nullable: true },
                  consecutivo: { type: 'integer', nullable: true },
                  tipoAsignatura: { type: 'integer', nullable: true },
                  gradoId: { type: 'integer' },
                  seccion: { type: 'string', enum: ['grado', 'recursamiento'] },
                  inscrita: { type: 'boolean' },
                  ordinario: calificacionDto,
                  extraordinario: calificacionDto,
                  bloqueada: { type: 'boolean' },
                  motivoBloqueo: { type: 'string', nullable: true },
                  motivoBloqueoClave: { type: 'string', nullable: true },
                  requiereRevision: { type: 'boolean' },
                  faltaExtraordinario: { type: 'boolean' },
                  seriacionPendiente: { type: 'array', items: { type: 'string' } },
                  ubicaciones: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        grupoId: { type: 'integer' },
                        descripcion: { type: 'string', nullable: true },
                        cicloEscolarId: { type: 'integer', nullable: true },
                        ciclo: { type: 'string', nullable: true },
                        gradoId: { type: 'integer', nullable: true },
                        grado: { type: 'string', nullable: true },
                        esActual: { type: 'boolean' },
                        esVigente: { type: 'boolean' },
                      },
                    },
                  },
                  intentosPrevios: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        grupoId: { type: 'integer' },
                        ciclo: { type: 'string' },
                        ordinario: calificacionDto,
                        extraordinario: calificacionDto,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

module.exports = findAcreditacionAlumnoSchema;
