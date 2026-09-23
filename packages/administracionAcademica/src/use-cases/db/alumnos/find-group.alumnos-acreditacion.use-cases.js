const { checkers, Logger } = require('@siiges-services/shared');
const {
  createAlumnoOrder,
  createAlumnoSearchQuery,
  normalizePagination,
  alumnoAttributes,
  personaAttributes,
  situacionAttributes,
} = require('./alumnos-acreditacion.helpers');

const findGroupAlumnosAcreditacion = (
  findOneProgramaQuery,
  findAllAlumnosQuery,
) => async ({ programaId }, params = {}) => {
  Logger.info('[alumnos]: find alumnos acreditacion paginado');

  const {
    page,
    limit,
    search = '',
    sortBy,
    sortOrder,
    situacionId,
  } = params;

  const programa = await findOneProgramaQuery({ id: programaId });
  checkers.throwErrorIfDataIsFalsy(programa, 'programas', programaId);

  const pagination = normalizePagination({
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const identifierObj = situacionId ? { programaId, situacionId } : { programaId };

  const result = await findAllAlumnosQuery(identifierObj, {
    attributes: alumnoAttributes,
    include: [
      { association: 'persona', attributes: personaAttributes },
      { association: 'situacion', attributes: situacionAttributes },
    ],
    query: createAlumnoSearchQuery(search),
    order: createAlumnoOrder(pagination),
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    },
  });

  return {
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.count,
      totalPages: Math.ceil(result.count / pagination.limit),
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
      search,
    },
  };
};

module.exports = findGroupAlumnosAcreditacion;
