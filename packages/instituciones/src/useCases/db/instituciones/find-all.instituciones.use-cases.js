/* eslint-disable no-restricted-globals */
const {
  normalizePagination,
  createSearchQuery,
  createInstitutionOrder,
} = require('../../../utils/pagination.utils');

const findAllInstituciones = (
  findAllInstitucionesQuery,
  findPlantelesQuery,
) => async ({ queryParams }) => {
  const {
    esNombreAutorizado,
    tipoInstitucionId,
    municipioId,
    page = 0,
    limit = 10,
    search = '',
    sortBy = 'id',
    sortOrder = 'asc',
  } = queryParams;

  const pagination = normalizePagination({
    page,
    limit,
    sortBy,
    sortOrder,
  });

  const include = [{
    association: 'ratificacionesNombre',
    limit: 1,
    order: [['createdAt', 'DESC']],
    ...(esNombreAutorizado !== undefined ? { where: { esNombreAutorizado } } : {}),
  }];

  let where = null;

  if (tipoInstitucionId) {
    where = { tipoInstitucionId };
  }

  if (municipioId) {
    const planteles = await findPlantelesQuery(null, {
      attributes: ['institucionId'],
      include: [{ association: 'domicilio', where: { municipioId } }],
      subQuery: false,
    });

    const institucionIds = [...new Set(planteles.map((p) => p.institucionId).filter(Boolean))];
    where = { ...(where || {}), id: institucionIds };
  }

  const instituciones = await findAllInstitucionesQuery(where, {
    include,
    strict: true,
    query: createSearchQuery(search),
    order: createInstitutionOrder(pagination),
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      distinct: true,
    },
  });

  const rows = Array.isArray(instituciones) ? instituciones : instituciones?.rows || [];
  const total = Array.isArray(instituciones) ? instituciones.length : instituciones?.count || 0;

  return {
    data: rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pagination.limit),
      sortBy: pagination.sortBy,
      sortOrder: pagination.sortOrder,
      search,
    },
  };
};

module.exports = findAllInstituciones;
