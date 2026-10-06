const CALIFICACIONES_SIN_EXTRAORDINARIO = ['RC', 'NS', 'NC', 'NP', 'SD'];

const findAlumnosExtra = (
  findAllCalificacionesQuery,
  findAllGruposQuery,
) => async ({ cicloEscolarId }) => {
  const include = [
    {
      association: 'alumno',
      include: [
        { association: 'persona' },
      ],
    },
    {
      association: 'asignatura',
      include: [
        { association: 'grado' },
      ],
    },
  ];

  const grupos = await findAllGruposQuery({ cicloEscolarId });

  const grupoIds = grupos.map(({ id }) => id);

  if (grupoIds.length === 0) return [];

  const calificacionesGrupo = await findAllCalificacionesQuery(
    {
      tipo: 2,
      grupoId: grupoIds,
    },
    { include },
  );

  return calificacionesGrupo.filter(({ calificacion }) => {
    const valor = String(calificacion ?? '').trim().toUpperCase();
    return !CALIFICACIONES_SIN_EXTRAORDINARIO.includes(valor);
  });
};

module.exports = findAlumnosExtra;
