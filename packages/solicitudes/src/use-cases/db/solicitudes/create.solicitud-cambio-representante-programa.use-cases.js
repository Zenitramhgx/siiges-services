const buildCloneSolicitudProgramaUseCase = require('./create.solicitud-clon-programa.use-cases');

const createCambioRepresentanteSolicitudPrograma = buildCloneSolicitudProgramaUseCase({
  tipoSolicitudId: 4,
  mensajeError: '[Solicitudes]: El tipo de solicitud no es un cambio de representante legal',
});

module.exports = createCambioRepresentanteSolicitudPrograma;
