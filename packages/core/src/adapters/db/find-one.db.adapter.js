// Internal dependencies
const { createInclude, getWhere } = require('../utils');

/**
 * Returns an asynchronous function that performs a database query to find a
 * single record based on the provided identifier object.
 * @example
 * const User = require('./models/User');
 * const findOneUser = findOneQuery(User);
 *
 * const user = await findOneUser({ id: 1 }, { attributes: ['id', 'name'], include: 'profile' });
 * console.log(user);
 * @param {string} model - The model used for the database query.
 * @return {(identifierObj: {any: string|number},
 * dbParams?: {attributes:string[], include:string[], strict:boolean,
 * isDeleting:boolean, query:Object})
 * => Promise<Object|null>} identifierObj -
 * An asynchronous function that accepts an identifier object and optional
 * database parameters, and returns the result of the database query.
 *
 *
 * @param {Object} identifierObj - An object specifying the criteria to find the record.
 * @param {Object} [dbParams={}] - An object containing additional
 * parameters for customizing the query.
 * @param {Array} [dbParams.attributes] - The attributes to include in the result.
 * @param {Object|Array|string} [dbParams.include] - The associated models to include in the result.
 * @param {boolean} [dbParams.strict=true] - Whether to perform a strict query.
 * @param {boolean} [dbParams.isDeleting=false] - Whether the query is for deleting a record.
 * @param {Object} [dbParams.query] - Additional query parameters.
 * @param {Object} [dbParams.transaction] - Optional Sequelize transaction.
 * @returns {Promise<Object|null>} - The result of the database query, which could
 * be a single record or null if no record is found.
 */
const findOneQuery = (model) => async (identifierObj, dbParams = {}) => {
  const {
    attributes = undefined,
    include = undefined,
    strict = true,
    isDeleting = false,
    query = undefined,
    subQuery = undefined,
    transaction = undefined,
  } = dbParams;

  return model.findOne({
    attributes,
    where: getWhere(identifierObj, isDeleting, query),
    include: createInclude(include, strict),
    subQuery,
    transaction,
  });
};

module.exports = findOneQuery;
