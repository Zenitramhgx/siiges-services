const boom = require('@hapi/boom');
const { checkers, Logger } = require('@siiges-services/shared');
const {
  TIPO_ORDINARIO,
  TIPO_EXTRAORDINARIO,
  agruparIntentos,
} = require('./calificaciones-intentos.helpers');

const ALCANCE_REGISTRO = 'registro';
const ALCANCE_POSTERIORES = 'posteriores';
const ALCANCE_DESDE = 'desde';

const ALCANCES = [ALCANCE_REGISTRO, ALCANCE_POSTERIORES, ALCANCE_DESDE];

/**
 * Toda la historia de la asignatura en una sola lista ordenada: los intentos
 * van en orden cronológico y, dentro de cada uno, el ordinario antes que el
 * extraordinario. Sobre esa lista se define qué es "posterior".
 */
const registrosEnOrden = (intentos) => intentos.flatMap(
  (intento) => [intento.ordinario, intento.extraordinario].filter(Boolean),
);

const toBorrada = (calificacion) => ({
  id: calificacion.id,
  asignaturaId: calificacion.asignaturaId,
  grupoId: calificacion.grupoId,
  tipo: Number(calificacion.tipo),
  calificacion: calificacion.calificacion,
  fechaExamen: calificacion.fechaExamen,
  ciclo: calificacion.grupo?.cicloEscolar?.nombre || '',
  grado: calificacion.grupo?.grado?.nombre || '',
  descripcion: calificacion.grupo?.descripcion || '',
});

const elegirABorrar = (registros, indiceAncla, alcance) => {
  const ancla = registros[indiceAncla];
  const posteriores = registros.slice(indiceAncla + 1);

  if (alcance === ALCANCE_POSTERIORES) return posteriores;
  if (alcance === ALCANCE_DESDE) return [ancla, ...posteriores];

  // Un extraordinario sin su ordinario no es un estado válido, así que
  // borrar el ordinario se lleva el extraordinario de ese mismo grupo.
  const extraordinarioDelMismoGrupo = posteriores.find(
    (registro) => Number(registro.grupoId) === Number(ancla.grupoId)
      && Number(registro.tipo) === TIPO_EXTRAORDINARIO,
  );

  return Number(ancla.tipo) === TIPO_ORDINARIO && extraordinarioDelMismoGrupo
    ? [ancla, extraordinarioDelMismoGrupo]
    : [ancla];
};

/**
 * Borra calificaciones de UNA asignatura de un alumno. Es la única forma de
 * deshacer una captura equivocada, porque el guardado nunca borra.
 *
 * El alcance decide cuánto se va, tomando como ancla la calificación que se
 * señala: solo ese registro, ese registro y todo lo capturado después, o
 * únicamente lo posterior, conservando el ancla. Lo anterior nunca se toca.
 *
 * El borrado es suave (deletedAt) y todo va en una transacción.
 */
const deleteCalificacionAlumno = (
  startTransactionQuery,
  findOneGrupoQuery,
  findOneAlumnoQuery,
  findAllCalificacionesQuery,
  updateCalificacionQuery,
) => async ({
  alumnoId, grupoId, asignaturaId, tipo, alcance = ALCANCE_REGISTRO,
}) => {
  Logger.info(`[calificaciones]: delete calificacion alumno (alcance ${alcance})`);

  const tipoNumero = Number(tipo);
  if (![TIPO_ORDINARIO, TIPO_EXTRAORDINARIO].includes(tipoNumero)) {
    throw boom.badRequest(`[calificaciones]: tipo ${tipo} no es válido`);
  }
  if (!ALCANCES.includes(alcance)) {
    throw boom.badRequest(`[calificaciones]: alcance ${alcance} no es válido`);
  }

  const grupo = await findOneGrupoQuery({ id: grupoId }, {
    include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
    strict: false,
  });
  checkers.throwErrorIfDataIsFalsy(grupo, 'grupos', grupoId);

  const alumno = await findOneAlumnoQuery({ id: alumnoId });
  checkers.throwErrorIfDataIsFalsy(alumno, 'alumnos', alumnoId);

  const calificaciones = await findAllCalificacionesQuery({ alumnoId, asignaturaId }, {
    include: [{
      association: 'grupo',
      include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
    }],
    strict: false,
  });

  const intentos = agruparIntentos(calificaciones.map((fila) => fila.toJSON()));
  const registros = registrosEnOrden(intentos);

  const indiceAncla = registros.findIndex(
    (registro) => Number(registro.grupoId) === Number(grupoId)
      && Number(registro.tipo) === tipoNumero,
  );

  if (indiceAncla === -1) {
    throw boom.notFound(
      `[calificaciones]: el alumno ${alumnoId} no tiene calificación tipo ${tipoNumero}`
      + ` de la asignatura ${asignaturaId} en el grupo ${grupoId}`,
    );
  }

  const aBorrar = elegirABorrar(registros, indiceAncla, alcance);

  if (aBorrar.length === 0) {
    throw boom.badRequest('[calificaciones]: no hay calificaciones posteriores que borrar');
  }

  const deletedAt = new Date().toISOString();
  const transaction = await startTransactionQuery();

  try {
    await aBorrar.reduce(
      (promesa, calificacion) => promesa.then(() => updateCalificacionQuery(
        { id: calificacion.id },
        { deletedAt },
        { transaction },
      )),
      Promise.resolve(),
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const grupoJson = grupo.toJSON();

  return {
    alcance,
    borradas: aBorrar.map(toBorrada),
    grupo: {
      id: grupoJson.id,
      descripcion: grupoJson.descripcion,
      ciclo: grupoJson.cicloEscolar?.nombre || '',
      grado: grupoJson.grado?.nombre || '',
    },
  };
};

module.exports = deleteCalificacionAlumno;
