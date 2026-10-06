const {
  solicitudes,
} = require('../../../adapters/db');

const createNuevaSolicitudPrograma = require('./create.solicitud-programa.use-cases');
const createRefrendoSolicitudPrograma = require('./create.solicitud-refrendo-programa.use-cases');
const createCambioRepresentanteSolicitudPrograma = require('./create.solicitud-cambio-representante-programa.use-cases');
const createActualizacionSolicitudPrograma = require('./create.solicitud-actualizacion-programa.use-cases');
const createCambioNombreSolicitudPrograma = require('./create.solicitud-cambio-nombre-programa.use-cases');
const findAllSolicitudesProgramas = require('./find-all.solicitudes-programas.use-cases');
const findOneSolicitudPrograma = require('./find-one.solicitud-programa.use-cases');
const findOneSolicitudDetalle = require('./find-one.solicitud-detalle.use-cases');
const findSolicitudesUsuario = require('./find.solicitudes-usuario.use-cases');
const updateSolicitudPrograma = require('./update.solicitud-programa.use-cases');
const setSolicitudSeccion = require('./set.solicitud-seccion.use-cases');
const updateSolcitudSeccionObservacion = require('./update.seccion-observacion.use-cases');
const findOneSolicitudSeccion = require('./find-one.solicitud-seccion.use-cases');
const { createSendMailObservacion } = require('./create.send-mail-observaciones.use-cases');
const { createDomicilioSolicitudPrograma } = require('./create.solicitud-domicilio-programa.use-cases');
const { deleteSolicitud } = require('./delete.solicitud.use-cases');
const createEquivalencia = require('./create.equivalencias.use-cases');
const findOneEquivalencia = require('./find-one.equivalencia.use-cases');
const findAllEquivalencias = require('./find-all.equivalencias.use-cases');
const deleteEquivalencia = require('./delete.equivalencia.use-cases');
const updateEquivalencia = require('./update.equivalencia.use-cases');

module.exports = {
  createNuevaSolicitudPrograma: createNuevaSolicitudPrograma(
    solicitudes.findOneUsuarioQuery,
    solicitudes.findOnePlantelQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaAtomicQuery,
  ),
  createRefrendoSolicitudPrograma: createRefrendoSolicitudPrograma(
    solicitudes.findOneSolicitudProgramaQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaQuery,
  ),
  createCambioRepresentanteSolicitudPrograma: createCambioRepresentanteSolicitudPrograma(
    solicitudes.findOneSolicitudProgramaQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaQuery,
    solicitudes.findOneEstatusSolicitudQuery,
  ),
  createActualizacionSolicitudPrograma: createActualizacionSolicitudPrograma(
    solicitudes.findOneSolicitudProgramaQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaQuery,
    solicitudes.findOneEstatusSolicitudQuery,
  ),
  createCambioNombreSolicitudPrograma: createCambioNombreSolicitudPrograma(
    solicitudes.findOneSolicitudProgramaQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaQuery,
    solicitudes.findOneEstatusSolicitudQuery,
  ),
  findAllSolicitudesProgramas: findAllSolicitudesProgramas(
    solicitudes.findAllSolicitudesProgramasQuery,
    solicitudes.findOneUsuarioQuery,
    solicitudes.findOneUsuarioUsuarioQuery,
  ),
  findOneSolicitudPrograma: findOneSolicitudPrograma(
    solicitudes.findOneSolicitudProgramaQuery,
  ),
  findSolicitudesUsuario: findSolicitudesUsuario(
    solicitudes.findAllSolicitudesProgramasQuery,
    solicitudes.findOneUsuarioQuery,
    solicitudes.findOneUsuarioUsuarioQuery,
  ),
  updateSolicitudPrograma: updateSolicitudPrograma(
    solicitudes.findOneSolicitudQuery,
    solicitudes.findOneProgramaTurnoQuery,
    solicitudes.findOneProgramaQuery,
    solicitudes.updateSolicitudQuery,
    solicitudes.updateProgramaQuery,
    solicitudes.createProgramaTurnoQuery,
    solicitudes.deleteProgramaTurnoQuery,
  ),
  setSolicitudSeccion: setSolicitudSeccion(
    solicitudes.findOneSolicitudQuery,
    solicitudes.findOneSolicitudSeccionQuery,
    solicitudes.createSolicitudSeccionQuery,
    solicitudes.updateSolicitudSeccionQuery,
  ),
  findOneSolicitudSeccion: findOneSolicitudSeccion(
    solicitudes.findOneSolicitudQuery,
    solicitudes.findOneSolicitudSeccionQuery,
    solicitudes.findOneSeccionQuery,
  ),
  updateSolcitudSeccionObservacion: updateSolcitudSeccionObservacion(
    solicitudes.findOneSolicitudSeccionQuery,
    solicitudes.createSolicitudSeccionQuery,
    solicitudes.updateSolicitudSeccionQuery,
    solicitudes.findOneSeccionQuery,
    solicitudes.findOneSolicitudQuery,
  ),
  findOneSolicitudDetalle: findOneSolicitudDetalle(
    solicitudes.findOneSolicitudProgramaQuery,
  ),
  createSendMailObservacion: createSendMailObservacion(
    solicitudes.findAllSolicitudSeccionQuery,
    solicitudes.updateSolicitudQuery,
    solicitudes.findProgramasBySolicitudIdQuery,
  ),
  createDomicilioSolicitudPrograma: createDomicilioSolicitudPrograma(
    solicitudes.findOneSolicitudQuery,
    solicitudes.countSolicitudesQuery,
    solicitudes.createSolicitudProgramaQuery,
  ),
  deleteSolicitud: deleteSolicitud(
    solicitudes.findOneSolicitudQuery,
    solicitudes.deleteSolicitudQuery,
  ),
  createEquivalencia: createEquivalencia(
    solicitudes.createEquivalenciaQuery,
    solicitudes.createAsignaturaAntecedenteQuery,
    solicitudes.createAsignaturaEquivalenteQuery,
    solicitudes.createInstitucionDestinoQuery,
    solicitudes.createInstitucionProcedenciaQuery,
    solicitudes.createDomicilioEquivalenteQuery,
    solicitudes.createPersonaEquivalenteQuery,
    solicitudes.createInteresadoQuery,
  ),
  findOneEquivalencia: findOneEquivalencia(
    solicitudes.findOneEquivalenciaQuery,
  ),
  findAllEquivalencias: findAllEquivalencias(
    solicitudes.findAllEquivalenciasQuery,
  ),
  deleteEquivalencia: deleteEquivalencia(
    solicitudes.deleteEquivalenciaQuery,
  ),
  updateEquivalencia: updateEquivalencia(
    solicitudes.updateEquivalenciaQuery,
  ),
};
