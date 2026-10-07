const { Logger } = require('@siiges-services/shared');
const errorHandler = require('../../../utils/errorHandler');

async function findAllInstituciones(req, reply) {
  try {
    const queryParams = req.query;

    Logger.info('[instituciones]: Getting instituciones list');
    const result = await this.institucionServices.findAllInstituciones({ queryParams });

    return reply
      .code(200)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(result);
  } catch (error) {
    return errorHandler(error, reply);
  }
}

module.exports = findAllInstituciones;
