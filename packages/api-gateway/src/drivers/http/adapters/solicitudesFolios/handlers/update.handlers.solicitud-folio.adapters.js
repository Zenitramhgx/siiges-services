const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

const FEATURE = {
  FOLIOS_ASIGNADOS: 3,
};
const TIPO_DOCUMENTO_POR_SOLICITUD = {
  1: 'FORMATO_ASIGNACION_FOLIOS_TIT', // Título
  2: 'FORMATO_ASIGNACION_FOLIOS_CER', // Certificado
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

async function sendNotificationReport(processor, estatusSolicitudFolioId, solicitudFolio) {
  const action = NOTIFICATION_MAPPING[estatusSolicitudFolioId];

  if (!action) {
    return;
  }
  await action(processor, solicitudFolio);
}

async function updateSolicitudFolio(req, reply) {
  try {
    const { ...data } = req.body;
    const { solicitudFolioId } = req.params;
    Logger.info('[solicitudes]: Creating solicitud');

    const solicitudFolio = await this.solicitudFolioServices.updateSolicitudFolio(
      { id: solicitudFolioId },
      data,
    );
    // generar archivo pdf a enviar
    const { estatusSolicitudFolioId } = data;
    if (estatusSolicitudFolioId === FEATURE.FOLIOS_ASIGNADOS) {
      const tipoDocumento = TIPO_DOCUMENTO_POR_SOLICITUD[solicitudFolio.tipoDocumentoId
      ];
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
    }
    const processor = this.notificacionServices.sendNotificationEmail;
    await sendNotificationReport(processor, estatusSolicitudFolioId, solicitudFolio);
    const responseData = {
      ...solicitudFolio.get({ plain: true }),
      url: solicitudFolio.dataValues.url,
    };
    return reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: responseData });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = { updateSolicitudFolio };
