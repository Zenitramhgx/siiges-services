const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function updateAcreditacionAlumno(req, reply) {
  try {
    const { alumnoId, grupoId } = req.params;
    const data = req.body;

    Logger.info('[Calificaciones]: Updating acreditacion alumno');

    const calificaciones = await this.administracionAcademicaServices.updateAcreditacionAlumno(
      { alumnoId, grupoId },
      data,
    );

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: calificaciones });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = updateAcreditacionAlumno;
