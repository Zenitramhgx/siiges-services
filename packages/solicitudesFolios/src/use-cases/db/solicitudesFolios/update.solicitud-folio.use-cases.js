const { checkers } = require('@siiges-services/shared');

const ESTATUS_FOLIOS_ASIGNADOS = 3;
const ESTATUS_ATENDER_OBSERVACIONES = 4;

const includeUsuario = [
  {
    association: 'programa',
    include: [
      {
        association: 'plantel',
        include: [
          {
            association: 'institucion',
            include: [{ association: 'usuario' }],
          },
        ],
      },
    ],
  },
];

const includeTipoSolicitud = [{ association: 'tipoSolicitudFolio' }];

const updateSolicitudFolio = (
  findOneSolicitudFolioQuery,
  updateSolicitudFolioQuery,
) => async (identifierObj, data) => {
  const solicitud = await findOneSolicitudFolioQuery(identifierObj);
  checkers.throwErrorIfDataIsFalsy(solicitud, 'solicitudes-folios', identifierObj.id);

  const updatedData = { ...data };
  let include = includeTipoSolicitud;

  if (data?.observaciones) {
    updatedData.estatusSolicitudFolioId = ESTATUS_ATENDER_OBSERVACIONES;
    include = [...includeUsuario, ...includeTipoSolicitud];
  }

  if (data?.estatusSolicitudFolioId === ESTATUS_FOLIOS_ASIGNADOS) {
    include = [...includeUsuario, ...includeTipoSolicitud];
  }

  const solicitudFolioUpdated = await updateSolicitudFolioQuery(
    identifierObj,
    updatedData,
    { include },
  );

  return solicitudFolioUpdated;
};

module.exports = updateSolicitudFolio;
