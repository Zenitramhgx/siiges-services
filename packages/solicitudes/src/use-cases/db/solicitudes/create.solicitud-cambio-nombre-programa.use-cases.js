const buildCloneSolicitudProgramaUseCase = require('./create.solicitud-clon-programa.use-cases');

const createCambioNombreSolicitudPrograma = buildCloneSolicitudProgramaUseCase({
  tipoSolicitudId: 6,
  mensajeError: '[Solicitudes]: El tipo de solicitud no es un cambio de nombre de institución',
});

module.exports = createCambioNombreSolicitudPrograma;
