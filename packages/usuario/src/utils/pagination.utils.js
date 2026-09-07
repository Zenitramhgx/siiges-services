const {
  Op,
  col,
  fn,
  where,
} = require('sequelize');

const DEFAULT_PAGE = 0;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

const USER_SORT_COLUMNS = {
  id: col('Usuario.id'),
  nombre: col('persona.nombre'),
  usuario: col('Usuario.usuario'),
  correo: col('Usuario.correo'),
  rol: col('rol.nombre'),
  estatus: col('Usuario.estatus'),
  fecha: col('Usuario.created_at'),
};

const USER_GROUP_SORT_COLUMNS = {
  id: col('secundario.id'),
  nombre: col('secundario.persona.nombre'),
  usuario: col('secundario.usuario'),
  correo: col('secundario.correo'),
  rol: col('secundario.rol.nombre'),
  estatus: col('secundario.estatus'),
  fecha: col('secundario.created_at'),
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
  const normalizedSortBy = USER_SORT_COLUMNS[sortBy] ? sortBy : 'id';
  const normalizedSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

  return {
    page: normalizedPage,
    limit: normalizedLimit,
    offset: normalizedPage * normalizedLimit,
    sortBy: normalizedSortBy,
    sortOrder: normalizedSortOrder,
  };
};

const createSearchQuery = (search, prefix = 'Usuario') => {
  if (!search) return undefined;

  const normalizedPrefix = prefix ? prefix.replace(/\.$/, '') : 'Usuario';
  const basePrefix = normalizedPrefix === 'Usuario' ? 'Usuario' : normalizedPrefix;
  const relationPrefix = normalizedPrefix === 'Usuario' ? '' : `${normalizedPrefix}.`;

  const fields = [
    `${basePrefix}.usuario`,
    `${basePrefix}.correo`,
    `${relationPrefix}persona.nombre`,
    `${relationPrefix}persona.apellido_paterno`,
    `${relationPrefix}persona.apellido_materno`,
    `${relationPrefix}rol.nombre`,
  ];
  const fullName = where(
    fn(
      'concat',
      col(`${relationPrefix}persona.nombre`),
      ' ',
      col(`${relationPrefix}persona.apellido_paterno`),
      ' ',
      col(`${relationPrefix}persona.apellido_materno`),
    ),
    { [Op.like]: `%${search}%` },
  );

  return {
    [Op.or]: [
      ...fields.map((field) => ({
        [`$${field}$`]: { [Op.like]: `%${search}%` },
      })),
      fullName,
    ],
  };
};

const createUserOrder = ({ sortBy, sortOrder }, prefix = 'Usuario') => {
  const columns = prefix === 'Usuario' ? USER_SORT_COLUMNS : USER_GROUP_SORT_COLUMNS;
  const qualifiedColumn = columns[sortBy] || columns.id;

  return [[qualifiedColumn, sortOrder.toUpperCase()]];
};

const userAttributes = ['id', 'usuario', 'correo', 'estatus', 'actualizado', 'createdAt'];
const personaAttributes = ['nombre', 'apellidoPaterno', 'apellidoMaterno', 'tituloCargo', 'rfc', 'curp', 'celular', 'telefono'];
const rolAttributes = ['id', 'nombre'];

module.exports = {
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  normalizePagination,
  createSearchQuery,
  createUserOrder,
  userAttributes,
  personaAttributes,
  rolAttributes,
};
