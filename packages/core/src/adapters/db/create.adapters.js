const createQuery = (model) => async (data, include = undefined, dbParams = {}) => {
  const { transaction = undefined } = dbParams;

  const newEntry = await model.create(data, {
    include,
    transaction,
  });
  return newEntry;
};

module.exports = createQuery;
