const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function findAcreditacionAlumno(req, reply) {
  try {
    const { alumnoId, grupoId } = req.params;

    Logger.info('[Calificaciones]: Getting acreditacion alumno');

    const acreditacion = await this.administracionAcademicaServices.findAcreditacionAlumno({
      alumnoId,
      grupoId,
    });

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: acreditacion });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = findAcreditacionAlumno;
