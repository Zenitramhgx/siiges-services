const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function deleteCalificacionAlumno(req, reply) {
  try {
    const {
      alumnoId, grupoId, asignaturaId, tipo,
    } = req.params;

    Logger.info('[Calificaciones]: Deleting calificacion del alumno');

    const resultado = await this.administracionAcademicaServices.deleteCalificacionAlumno({
      alumnoId, grupoId, asignaturaId, tipo, alcance: req.query?.alcance,
    });

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: resultado });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = deleteCalificacionAlumno;
