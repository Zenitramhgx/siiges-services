// Internal dependencies
const findOneQuery = require('./find-one.db.adapter');
const { getWhere } = require('../utils');
const EXCLUDED_MODELS = require('../../drivers/db/hooks/audit-excluded-models'); // AJUSTAR ruta real

const updateQuery = (model) => async (identifierObj, changes, dbParams = {}) => {
  const { isDeleting = false, transaction = undefined } = dbParams;
  const updatedAt = new Date().toISOString();
  const entryChanges = { ...changes, updatedAt };

  const seDebeAuditar = !EXCLUDED_MODELS.includes(model.name);
  const { individualHooks = seDebeAuditar } = dbParams;

  await model.update(
    entryChanges,
    {
      where: getWhere(identifierObj, isDeleting),
      individualHooks,
      transaction,
    },
  );

  return updatedAt;
};

const updateAndFindQuery = (model) => async (identifierObj, changes, dbParams = {}) => {
  const update = updateQuery(model);
  const findOne = findOneQuery(model);

  await update(identifierObj, changes, dbParams);
  const entryUpdated = await findOne(identifierObj, dbParams);

  return entryUpdated;
};

module.exports = {
  updateQuery,
  updateAndFindQuery,
};
