// External dependencies
const { models, queries, drivers } = require('@siiges-services/core');

const { sequelize } = drivers;

const {
  Solicitud,
  Nivel,
  Usuario,
  UsuarioUsuario,
  ProgramaTurno,
  Programa,
  SolicitudSeccion,
  Trayectoria,
  Seccion,
  Plantel,
  Institucion,
  SolicitudRevEquiv,
  InstitucionProcedencia,
  InstitucionDestino,
  AsignaturaAntecedente,
  AsignaturaEquivalente,
  Domicilio,
  Persona,
  Interesado,
  EstatusSolicitud,
} = models;

const {
  findAllQuery,
  findOneQuery,
  createQuery,
  updateAndFindQuery,
  countQuery,
  deleteQuery,
} = queries;

module.exports = {
  createSolicitudProgramaQuery: createQuery(Solicitud),
  createSolicitudProgramaAtomicQuery: async (data) => sequelize.transaction(async (transaction) => {
    const { programa = {}, ...solicitudData } = data;
    const { programaTurnos = [], ...programaData } = programa;

    const newSolicitud = await Solicitud.create(
      {
        ...solicitudData,
        programa: programaData,
      },
      {
        include: [{ association: 'programa' }],
        transaction,
      },
    );

    if (programaTurnos.length) {
      await Promise.all(programaTurnos.map((turnoId) => ProgramaTurno.create(
        {
          turnoId,
          programaId: newSolicitud.programa.id,
        },
        { transaction },
      )));
    }

    await newSolicitud.reload({
      include: [
        {
          association: 'programa',
          include: [{ association: 'programaTurnos' }],
        },
      ],
      transaction,
    });

    return newSolicitud;
  }),
  updateAndFindSolicitudQuery: updateAndFindQuery(Solicitud),
  findOneSolicitudQuery: findOneQuery(Solicitud),
  findOneEstatusSolicitudQuery: findOneQuery(EstatusSolicitud),
  findOneNivelQuery: findOneQuery(Nivel),
  findOneUsuarioQuery: findOneQuery(Usuario),
  findOneUsuarioUsuarioQuery: findOneQuery(UsuarioUsuario),
  countSolicitudesQuery: countQuery(Solicitud),
  findAllSolicitudesProgramasQuery: findAllQuery(Solicitud),
  findOneSolicitudProgramaQuery: findOneQuery(Solicitud),
  findAllSolicitudesUsuarioQuery: findAllQuery(Solicitud),
  updateSolicitudQuery: updateAndFindQuery(Solicitud),
  findOneProgramaQuery: findOneQuery(Programa),
  updateProgramaQuery: updateAndFindQuery(Programa),
  createProgramaTurnoQuery: createQuery(ProgramaTurno),
  findOneProgramaTurnoQuery: findOneQuery(ProgramaTurno),
  deleteProgramaTurnoQuery: deleteQuery(ProgramaTurno),
  findOneSolicitudSeccionQuery: findOneQuery(SolicitudSeccion),
  createSolicitudSeccionQuery: createQuery(SolicitudSeccion),
  updateSolicitudSeccionQuery: updateAndFindQuery(SolicitudSeccion),
  findOneSeccionQuery: findOneQuery(Seccion),
  findOnePlantelQuery: findOneQuery(Plantel),
  createTrayectoriaQuery: createQuery(Trayectoria),
  findOneTrayectoriaQuery: findOneQuery(Trayectoria),
  updateTrayectoriaQuery: updateAndFindQuery(Trayectoria),
  findAllSolicitudSeccionQuery: findAllQuery(SolicitudSeccion),
  deleteSolicitudQuery: deleteQuery(Solicitud),
  // Create
  createEquivalenciaQuery: createQuery(SolicitudRevEquiv),
  createInstitucionProcedenciaQuery: createQuery(InstitucionProcedencia),
  createInstitucionDestinoQuery: createQuery(InstitucionDestino),
  createAsignaturaAntecedenteQuery: createQuery(AsignaturaAntecedente),
  createAsignaturaEquivalenteQuery: createQuery(AsignaturaEquivalente),
  createDomicilioEquivalenteQuery: createQuery(Domicilio),
  createPersonaEquivalenteQuery: createQuery(Persona),
  createInteresadoQuery: createQuery(Interesado),
  findOneEquivalenciaQuery: findOneQuery(SolicitudRevEquiv),
  findAllEquivalenciasQuery: findAllQuery(SolicitudRevEquiv),
  deleteEquivalenciaQuery: deleteQuery(SolicitudRevEquiv),
  updateEquivalenciaQuery: updateAndFindQuery(SolicitudRevEquiv),
  findProgramasBySolicitudIdQuery: (solicitudId) => Programa.findOne({
    where: {
      solicitud_id: solicitudId,
    },
    include: [
      {
        model: Plantel,
        as: 'plantel',
        required: true,
        include: [
          {
            model: Institucion,
            as: 'institucion',
            required: true,
            attributes: ['nombre'],
          },
        ],
        attributes: ['id'],
      },
    ],
    attributes: [],
  }),
};
