const buildCloneSolicitudProgramaUseCase = require('./create.solicitud-clon-programa.use-cases');

const createActualizacionSolicitudPrograma = buildCloneSolicitudProgramaUseCase({
  tipoSolicitudId: 5,
  mensajeError: '[Solicitudes]: El tipo de solicitud no es una actualización',
  keep: ['acuerdoRvoe', 'fechaSurteEfecto'],
});

module.exports = createActualizacionSolicitudPrograma;
