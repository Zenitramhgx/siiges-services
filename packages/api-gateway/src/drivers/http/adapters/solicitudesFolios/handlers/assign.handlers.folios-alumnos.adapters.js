const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

const FEATURE = {
  FOLIOS_ASIGNADOS: 3,
};

const TIPO_DOCUMENTO_POR_SOLICITUD = {
  1: 'FORMATO_ASIGNACION_FOLIOS_TIT',
  2: 'FORMATO_ASIGNACION_FOLIOS_CER',
};

const NOTIFICATION_MAPPING = {
  [FEATURE.FOLIOS_ASIGNADOS]: async (processor, solicitudFolio) => {
    const { folioSolicitud } = solicitudFolio;

    const usuarioInstitucion = solicitudFolio.programa?.plantel?.institucion?.usuario;

    if (!usuarioInstitucion) {
      throw new Error('Usuario de institución no encontrado');
    }
    await processor({
      usuarioId: usuarioInstitucion.id,
      email: usuarioInstitucion.correo,
      asunto: `SIGES: Folios asignados - Solicitud ${folioSolicitud}`,
      template: 'folioDocumentosAlumnos',
      params: {
        folioSolicitud,
        tipoSolicitud: solicitudFolio.tipoSolicitudFolio?.nombre,
        url: solicitudFolio.dataValues.url,
      },
    });
  },
};

/**
 * @param {Function} processor - Function to send notifications
 * @param {number} estatusSolicitudFolioId - ID of the status of the solicitud folio
 * @param {Object} solicitudFolio - The solicitud folio object
 */
async function sendNotificationReport(processor, estatusSolicitudFolioId, solicitudFolio) {
  const action = NOTIFICATION_MAPPING[estatusSolicitudFolioId];

  if (!action) {
    return;
  }
  await action(processor, solicitudFolio);
}

/**
 * Handler to assign folios to students and send notification
 * @param {Object} req - The request object
 * @param {Object} reply - The reply object
 */
async function asignacionFolioAlumno(req, reply) {
  try {
    const { solicitudFolioId } = req.params;

    Logger.info('[solicitudes-folios]: Assing folios Alumnos');
    await this.solicitudFolioServices.assignFoliosAlumnos(
      { id: solicitudFolioId },
    );

    Logger.info('[solicitudes]: Getting solicitud folio');
    const solicitudFolio = await this.solicitudFolioServices.findOneSolicitudFolio(
      { id: solicitudFolioId },
    );

    const tipoDocumento = TIPO_DOCUMENTO_POR_SOLICITUD[solicitudFolio.tipoDocumentoId];

    const valueData = {
      tipoEntidad: 'SOLICITUD_FOLIO',
      tipoDocumento,
      entidadId: solicitudFolioId,
    };

    const file = await this.filesServices.findOneFile(valueData);

    if (!file) {
      throw new Error('Archivo PDF no encontrado para la solicitud');
    }

    solicitudFolio.dataValues.url = file?.url;

    const processor = this.notificacionServices.sendNotificationEmail;
    await sendNotificationReport(processor, solicitudFolio.estatusSolicitudFolioId, solicitudFolio);

    return reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: solicitudFolio });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = { asignacionFolioAlumno };
