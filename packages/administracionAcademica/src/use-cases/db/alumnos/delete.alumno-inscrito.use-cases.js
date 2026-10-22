const { checkers, Logger } = require('@siiges-services/shared');

const validateAlumnoGrupo = async ({ findOneAlumnoGrupoQuery, alumnoId, grupoId }) => {
  const alumnoGrupo = await findOneAlumnoGrupoQuery({ alumnoId, grupoId });
  checkers.throwErrorIfDataIsFalsy(alumnoGrupo, 'alumnos_grupo', { alumnoId, grupoId });
  return alumnoGrupo;
};

const deleteAlumnoGrupo = async ({ deleteAlumnoGrupoQuery, alumnoId, grupoId }) => {
  await deleteAlumnoGrupoQuery({ alumnoId, grupoId });
};

const deleteAlumnoAsignaturasRelations = async ({
  findAllCalificacionesQuery, deleteCalificacionQuery, alumnoId, grupoId,
}) => {
  const calificaciones = await findAllCalificacionesQuery({ alumnoId, grupoId });
  await Promise.all(calificaciones.map(({ id }) => deleteCalificacionQuery({ id })));
};

const deleteAlumnoInscrito = (
  findOneAlumnoGrupoQuery,
  deleteAlumnoGrupoQuery,
  findAllCalificacionesQuery,
  deleteCalificacionQuery,
  findOneAlumnoQuery,
) => async ({ alumnoId, grupoId }) => {
  Logger.info(`[alumnos]: Eliminando inscripción de alumno ${alumnoId} del grupo ${grupoId}`);

  const alumnoGrupo = await validateAlumnoGrupo({
    findOneAlumnoGrupoQuery,
    alumnoId,
    grupoId,
  });

  const alumno = await findOneAlumnoQuery({ id: alumnoId });

  await deleteAlumnoAsignaturasRelations({
    findAllCalificacionesQuery,
    deleteCalificacionQuery,
    alumnoId,
    grupoId,
  });

  await deleteAlumnoGrupo({
    deleteAlumnoGrupoQuery,
    alumnoId,
    grupoId,
  });

  return {
    data: {
      alumno,
      alumnoGrupo,
    },
  };
};

module.exports = deleteAlumnoInscrito;
