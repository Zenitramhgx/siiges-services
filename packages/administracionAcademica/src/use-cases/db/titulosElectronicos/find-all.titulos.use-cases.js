const boom = require('@hapi/boom');
const { Op } = require('sequelize');

const findAllTitulos = (
  findAllTitulosQuery,
) => async (query) => {
  const {
    institucionId,
    numeroRvoe,
    nombre,
    primerApellido,
    segundoApellido,
    curp,
  } = query;

  const numeroRvoeTrim = numeroRvoe?.trim();
  const nombreTrim = nombre?.trim();
  const primerApellidoTrim = primerApellido?.trim();
  const segundoApellidoTrim = segundoApellido?.trim();
  const curpTrim = curp?.trim();

  const tieneCriterioEspecifico = nombreTrim || primerApellidoTrim
    || segundoApellidoTrim || curpTrim;

  if (!numeroRvoeTrim && !tieneCriterioEspecifico) {
    throw boom.badRequest(
      'Debe proporcionar numeroRvoe o al menos un criterio específico (nombre, primerApellido, segundoApellido, curp)',
    );
  }

  const filters = { institucionId };

  if (numeroRvoeTrim) filters.numeroRvoe = { [Op.like]: `%${numeroRvoeTrim}%` };
  if (nombreTrim) filters.nombre = { [Op.like]: `%${nombreTrim}%` };
  if (primerApellidoTrim) filters.primerApellido = { [Op.like]: `%${primerApellidoTrim}%` };
  if (segundoApellidoTrim) filters.segundoApellido = { [Op.like]: `%${segundoApellidoTrim}%` };
  if (curpTrim) filters.curp = { [Op.like]: `%${curpTrim}%` };

  return findAllTitulosQuery(filters);
};

module.exports = { findAllTitulos };
