/**
 * Returns a function that opens a Sequelize transaction managed by the caller.
 * Uses the sequelize instance bound to the given model, keeping the same
 * (model) => fn pattern as the rest of the generic adapters.
 * @example
 * const startTransaction = startTransactionQuery(Calificacion);
 * const transaction = await startTransaction();
 * try { ...; await transaction.commit(); } catch (e) { await transaction.rollback(); throw e; }
 */
const startTransactionQuery = (model) => () => model.sequelize.transaction();

module.exports = startTransactionQuery;
