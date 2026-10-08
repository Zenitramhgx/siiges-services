const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function findGroupAlumnosAcreditacion(req, reply) {
  try {
    const { programaId } = req.params;

    Logger.info('[Alumnos]: Getting alumnos acreditacion');

    const alumnos = await this.administracionAcademicaServices.findGroupAlumnosAcreditacion(
      { programaId },
      req.query,
    );

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: alumnos });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = findGroupAlumnosAcreditacion;
