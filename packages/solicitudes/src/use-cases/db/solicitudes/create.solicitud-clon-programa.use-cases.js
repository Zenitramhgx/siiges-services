const { checkers } = require('@siiges-services/shared');
const boom = require('@hapi/boom');
const removeIds = require('../../../utils/remove-ids.utils');
const { createFolioSolicitud } = require('../../../utils/create-folio.utils');
const { ESTATUS_SOLICITUD_INICIAL_ID } = require('../../../utils/constants');

function buildCloneSolicitudProgramaUseCase({ tipoSolicitudId, mensajeError, keep = [] }) {
  return (
    findOneSolicitudQuery,
    countSolicitudesQuery,
    createSolicitudProgramaQuery,
    findOneEstatusSolicitudQuery,
  ) => async (identifierObj, data) => {
    const { solicitudId } = identifierObj;
    const { tipoSolicitudId: solicitudTipo } = data;

    if (solicitudTipo !== tipoSolicitudId) {
      throw boom.badRequest(mensajeError);
    }

    const estatusSolicitud = await findOneEstatusSolicitudQuery({
      id: ESTATUS_SOLICITUD_INICIAL_ID,
    });
    checkers.throwErrorIfDataIsFalsy(
      estatusSolicitud,
      'estatus_solicitudes',
      ESTATUS_SOLICITUD_INICIAL_ID,
    );

    const include = [{
      association: 'programa',
      include: [
        { association: 'programaTurnos' },
        { association: 'asignaturas' },
        { association: 'trayectoria' },
      ],
    }];

    const solicitud = await findOneSolicitudQuery({ id: solicitudId }, {
      undefined,
      include,
      strict: false,
    });
    checkers.throwErrorIfDataIsFalsy(solicitud, 'solicitudes', solicitudId);

    const solicitudData = solicitud.toJSON();

    const solicitudDataWithoutIds = removeIds(solicitudData, { keep });

    const totalSolicitudes = await countSolicitudesQuery();
    const folioSolcitud = createFolioSolicitud(totalSolicitudes, solicitudDataWithoutIds
      .programa.nivelId);

    const newData = {
      ...solicitudDataWithoutIds,
      folio: folioSolcitud,
      tipoSolicitudId,
      estatusSolicitudId: ESTATUS_SOLICITUD_INICIAL_ID,
      // El usuarioId proviene del JWT (handler createSolicitudPrograma hace
      // data.usuarioId = user.id); el body no puede traerlo porque el schema
      // de la ruta declara additionalProperties: false.
      usuarioId: data.usuarioId,
    };

    const newSolicitud = await createSolicitudProgramaQuery({
      ...newData,
    }, include);

    checkers.throwErrorIfDataIsFalsy(newSolicitud, 'solicitudes', newSolicitud.id);

    return newSolicitud;
  };
}

module.exports = buildCloneSolicitudProgramaUseCase;
