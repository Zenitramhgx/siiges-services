const { Op, col } = require('sequelize');

// Mismo esquema de paginación que usuarios (SDT-1710): page base 0, límite máximo 100
const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const DEFAULT_SORT_BY = 'matricula';

const ALUMNO_SORT_COLUMNS = {
  id: col('Alumno.id'),
  matricula: col('Alumno.matricula'),
  nombre: col('persona.nombre'),
  apellidoPaterno: col('persona.apellido_paterno'),
  situacion: col('situacion.nombre'),
};

const normalizePagination = ({
  page,
  limit,
  sortBy,
  sortOrder,
}) => {
  const normalizedPage = Number.isInteger(page) && page >= 0 ? page : DEFAULT_PAGE;
  const normalizedLimit = Number.isInteger(limit) && limit > 0
    ? Math.min(limit, MAX_LIMIT)
    : DEFAULT_LIMIT;
  const normalizedSortBy = ALUMNO_SORT_COLUMNS[sortBy] ? sortBy : DEFAULT_SORT_BY;
  const normalizedSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: normalizedPage * normalizedLimit,
    sortBy: normalizedSortBy,
    sortOrder: normalizedSortOrder,
  };
};

const SEARCH_FIELDS = [
  'Alumno.matricula',
  'persona.nombre',
  'persona.apellido_paterno',
  'persona.apellido_materno',
];

/**
 * Busca palabra por palabra: cada palabra debe aparecer en la matrícula,
 * el nombre o alguno de los apellidos, sin importar el orden.
 * "JESUS SAAVEDRA" encuentra a JESUS URIEL SAAVEDRA FLORES, igual que
 * "SAAVEDRA JESUS", cosa que un LIKE sobre el nombre completo no logra.
 */
const createAlumnoSearchQuery = (search) => {
  const palabras = String(search || '').trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return undefined;

  return {
    [Op.and]: palabras.map((palabra) => ({
      [Op.or]: SEARCH_FIELDS.map((field) => ({
        [`$${field}$`]: { [Op.like]: `%${palabra}%` },
      })),
    })),
  };
};

const createAlumnoOrder = ({ sortBy, sortOrder }) => {
  const qualifiedColumn = ALUMNO_SORT_COLUMNS[sortBy] || ALUMNO_SORT_COLUMNS[DEFAULT_SORT_BY];
  return [[qualifiedColumn, sortOrder.toUpperCase()]];
};

const alumnoAttributes = ['id', 'matricula', 'situacionId'];
const personaAttributes = ['nombre', 'apellidoPaterno', 'apellidoMaterno'];
const situacionAttributes = ['id', 'nombre'];

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePagination,
  createAlumnoSearchQuery,
  createAlumnoOrder,
  alumnoAttributes,
  personaAttributes,
  situacionAttributes,
};
