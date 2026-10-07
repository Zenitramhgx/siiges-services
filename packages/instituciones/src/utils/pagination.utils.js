const { Op } = require('sequelize');

const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const INSTITUCION_SORT_COLUMNS = {
  id: 'id',
  nombre: 'nombre',
  razonSocial: 'razonSocial',
  claveIes: 'claveIes',
};

const normalizePagination = ({
  page, limit, sortBy, sortOrder,
}) => {
  const normalizedPage = Number.isInteger(page) && page >= 0 ? page : DEFAULT_PAGE;
  const normalizedLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, MAX_LIMIT)
    : DEFAULT_LIMIT;
  const normalizedSortBy = INSTITUCION_SORT_COLUMNS[sortBy] ? sortBy : 'id';
  const normalizedSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: normalizedPage * normalizedLimit,
    sortBy: normalizedSortBy,
    sortOrder: normalizedSortOrder,
  };
};

const createSearchQuery = (search) => {
  if (!search) return undefined;

  const term = `%${search}%`;
  return {
    [Op.or]: [
      { nombre: { [Op.like]: term } },
      { razonSocial: { [Op.like]: term } },
      { claveIes: { [Op.like]: term } },
    ],
  };
};

const createInstitutionOrder = ({ sortBy, sortOrder }) => {
  const column = INSTITUCION_SORT_COLUMNS[sortBy] || INSTITUCION_SORT_COLUMNS.id;
  return [[column, sortOrder.toUpperCase()]];
};

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePagination,
  createSearchQuery,
  createInstitutionOrder,
};
