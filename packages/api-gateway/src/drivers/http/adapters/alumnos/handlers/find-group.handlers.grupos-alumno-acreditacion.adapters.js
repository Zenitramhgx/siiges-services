const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function findGruposAlumnoAcreditacion(req, reply) {
  try {
    const { alumnoId } = req.params;

    Logger.info('[Alumnos]: Getting grupos del alumno para acreditacion');

    const grupos = await this.administracionAcademicaServices.findGruposAlumnoAcreditacion(
      { alumnoId },
    );

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ data: grupos });
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = findGruposAlumnoAcreditacion;
