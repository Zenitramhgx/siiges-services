const boom = require('@hapi/boom');
const { checkers, Logger } = require('@siiges-services/shared');
const {
  TIPO_ORDINARIO,
  TIPO_EXTRAORDINARIO,
  valorVacio,
  esLetraAcreditada,
  esAprobatoria,
  esReprobatoriaNumerica,
  agruparIntentos,
  agruparPorAsignatura,
  algunIntentoAprobado,
  clasificarIntentos,
} = require('./calificaciones-intentos.helpers');

const SITUACION_ALUMNO_ACTIVO = 1;
const SITUACIONES_VALIDACION = [1, 3];

// ─── Validaciones de alumno / grupo ──────────────────────────────────────────

const validateGrupo = async ({ findOneGrupoQuery, grupoId }) => {
  const grupo = await findOneGrupoQuery({ id: grupoId }, {
    include: [{ association: 'cicloEscolar' }],
    strict: false,
  });
  checkers.throwErrorIfDataIsFalsy(grupo, 'grupos', grupoId);
  return grupo.toJSON();
};

const validateAlumno = async ({
  findOneAlumnoQuery, findOneValidacionQuery, alumnoId, programaId,
}) => {
  const alumno = await findOneAlumnoQuery({ id: alumnoId, programaId });
  checkers.throwErrorIfDataIsFalsy(alumno, 'alumnos', alumnoId);

  if (Number(alumno.situacionId) !== SITUACION_ALUMNO_ACTIVO) {
    throw boom.conflict(`[calificaciones]: alumno with identifier ${alumnoId} is not active`);
  }

  const validacion = await findOneValidacionQuery({
    alumnoId,
    situacionValidacionId: SITUACIONES_VALIDACION,
  });
  if (!validacion) {
    throw boom.conflict(`[calificaciones]: alumno with identifier ${alumnoId} is not validated`);
  }

  return alumno;
};

// ─── Validaciones de cada renglón ────────────────────────────────────────────

const validarValorCalificacion = (valor, programa) => {
  if (valorVacio(valor)) return null;
  if (esLetraAcreditada(valor)) return null;

  const numero = Number(String(valor).trim());
  if (Number.isNaN(numero)) return `calificación "${valor}" no es válida`;

  const minima = Number(programa.calificacionMinima);
  const maxima = Number(programa.calificacionMaxima);
  if (!Number.isNaN(minima) && numero < minima) return `calificación ${numero} menor a la mínima (${minima})`;
  if (!Number.isNaN(maxima) && numero > maxima) return `calificación ${numero} mayor a la máxima (${maxima})`;

  if (!programa.calificacionDecimal && !Number.isInteger(numero)) {
    return `el programa no admite calificaciones decimales (${numero})`;
  }

  return null;
};

/**
 * Valor que tendrá el ordinario de este grupo después de guardar:
 * el que viene en el payload, o si no viene, el que ya está en BD.
 */
const ordinarioResultante = ({ payloadPorClave, asignaturaId, intentoActual }) => {
  const enPayload = payloadPorClave[`${asignaturaId}-${TIPO_ORDINARIO}`];
  if (enPayload) return enPayload.calificacion;
  return intentoActual?.ordinario?.calificacion ?? null;
};

const validarItem = ({
  item, asignatura, calificacionesAsignatura, grupo, programa, payloadPorClave,
}) => {
  if (!asignatura) {
    return [`Asignatura ${item.asignaturaId}: no pertenece al programa`];
  }

  const aprobatoria = Number(programa.calificacionAprobatoria) || 0;
  const tipo = Number(item.tipo);
  const {
    intentoActual, otrosIntentos, intentosAnteriores,
  } = clasificarIntentos(agruparIntentos(calificacionesAsignatura), grupo);

  const esDelGrado = Number(asignatura.gradoId) === Number(grupo.gradoId);
  const aprobadaEnOtroGrupo = algunIntentoAprobado(otrosIntentos, aprobatoria);
  const pendientePorRecursar = intentosAnteriores.length > 0
    && !algunIntentoAprobado(intentosAnteriores, aprobatoria);

  const errores = [];

  // Inscripción nueva en este grupo
  if (!intentoActual) {
    if (aprobadaEnOtroGrupo) {
      errores.push('ya está aprobada en otro ciclo escolar');
    } else if (!esDelGrado && !pendientePorRecursar) {
      errores.push('no es del grado del grupo ni está pendiente por recursar');
    }
  }

  const errorValor = validarValorCalificacion(item.calificacion, programa);
  if (errorValor) errores.push(errorValor);

  if (!valorVacio(item.calificacion) && valorVacio(item.fechaExamen)) {
    errores.push('la fecha de examen es obligatoria cuando hay calificación');
  }

  if (tipo === TIPO_EXTRAORDINARIO) {
    const ordinario = ordinarioResultante({
      payloadPorClave, asignaturaId: asignatura.id, intentoActual,
    });

    if (valorVacio(item.calificacion)) {
      errores.push('el extraordinario requiere calificación');
    }
    if (valorVacio(ordinario)) {
      errores.push('no puede tener extraordinario sin ordinario calificado en este grupo');
    } else if (!esReprobatoriaNumerica(ordinario, aprobatoria)) {
      errores.push('el ordinario no está reprobado, no aplica extraordinario');
    }
  }

  if (tipo === TIPO_ORDINARIO
    && esAprobatoria(item.calificacion, aprobatoria)
    && intentoActual?.extraordinario
    && !payloadPorClave[`${asignatura.id}-${TIPO_EXTRAORDINARIO}`]) {
    errores.push('el ordinario quedaría aprobado pero ya tiene extraordinario capturado');
  }

  return errores.map((error) => `${asignatura.clave} ${asignatura.nombre}: ${error}`);
};

const indexarPayload = (dataArray) => dataArray.reduce((acc, item) => {
  const clave = `${item.asignaturaId}-${Number(item.tipo)}`;
  if (acc.porClave[clave]) {
    acc.duplicados.push(clave);
  }
  acc.porClave[clave] = item;
  return acc;
}, { porClave: {}, duplicados: [] });

// ─── Persistencia (todo dentro de la misma transacción) ──────────────────────

const toDateOnly = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
};

const ensureAlumnoGrupo = async ({
  findOneAlumnoGrupoQuery, createAlumnoGrupoQuery, alumnoId, grupo, transaction,
}) => {
  const existente = await findOneAlumnoGrupoQuery(
    { alumnoId, grupoId: grupo.id },
    { transaction },
  );
  if (existente) return existente;

  const periodoFechaInicio = toDateOnly(grupo.generacionFechaInicio);
  const periodoFechaFin = toDateOnly(grupo.generacionFechaFin);

  return createAlumnoGrupoQuery({
    alumnoId,
    grupoId: grupo.id,
    ...(periodoFechaInicio ? { periodoFechaInicio } : {}),
    ...(periodoFechaFin ? { periodoFechaFin } : {}),
  }, undefined, { transaction });
};

const upsertCalificacion = async ({
  findOneCalificacionQuery,
  createCalificacionQuery,
  updateCalificacionQuery,
  alumnoId,
  grupoId,
  item,
  transaction,
}) => {
  const tipo = Number(item.tipo);
  const cambios = {
    calificacion: valorVacio(item.calificacion) ? null : String(item.calificacion).trim(),
    fechaExamen: valorVacio(item.fechaExamen) ? null : item.fechaExamen,
  };

  const existente = await findOneCalificacionQuery(
    {
      alumnoId, grupoId, asignaturaId: item.asignaturaId, tipo,
    },
    { transaction },
  );

  if (existente) {
    return updateCalificacionQuery({ id: existente.id }, cambios, { transaction });
  }

  // No existe → esta es la inscripción de la asignatura en el grupo
  return createCalificacionQuery({
    alumnoId,
    grupoId,
    asignaturaId: item.asignaturaId,
    tipo,
    ...cambios,
  }, undefined, { transaction });
};

// ─── Use-case ────────────────────────────────────────────────────────────────

/**
 * Inscribe y califica asignaturas de UN alumno en UN grupo.
 * Solo agrega o actualiza; nunca borra calificaciones.
 * Todo o nada: se valida todo antes de escribir y las escrituras van en una transacción.
 */
const updateAcreditacionAlumno = (
  startTransactionQuery,
  findOneGrupoQuery,
  findOneAlumnoQuery,
  findOneProgramaQuery,
  findOneValidacionQuery,
  findAllAsignaturasQuery,
  findAllCalificacionesQuery,
  findOneAlumnoGrupoQuery,
  createAlumnoGrupoQuery,
  findOneCalificacionQuery,
  createCalificacionQuery,
  updateCalificacionQuery,
) => async ({ alumnoId, grupoId }, dataArray) => {
  Logger.info('[calificaciones]: update acreditacion alumno');

  const grupo = await validateGrupo({ findOneGrupoQuery, grupoId });
  const { programaId } = grupo.cicloEscolar;

  const programa = await findOneProgramaQuery({ id: programaId });
  checkers.throwErrorIfDataIsFalsy(programa, 'programas', programaId);

  await validateAlumno({
    findOneAlumnoQuery, findOneValidacionQuery, alumnoId, programaId,
  });

  const { porClave: payloadPorClave, duplicados } = indexarPayload(dataArray);
  if (duplicados.length > 0) {
    throw boom.badRequest(`[calificaciones]: renglones duplicados (asignatura-tipo): ${duplicados.join(', ')}`);
  }

  const [asignaturas, calificaciones] = await Promise.all([
    findAllAsignaturasQuery({ programaId }),
    findAllCalificacionesQuery({ alumnoId }, {
      include: [{ association: 'grupo', include: [{ association: 'cicloEscolar' }] }],
      strict: false,
    }),
  ]);

  const asignaturasPorId = asignaturas.reduce((acc, asignatura) => {
    acc[asignatura.id] = asignatura;
    return acc;
  }, {});
  const calificacionesPorAsignatura = agruparPorAsignatura(
    calificaciones.map((calificacion) => calificacion.toJSON()),
  );

  // Se valida TODO antes de abrir la transacción y se reportan todos los errores juntos
  const errores = dataArray.flatMap((item) => validarItem({
    item,
    asignatura: asignaturasPorId[item.asignaturaId],
    calificacionesAsignatura: calificacionesPorAsignatura[item.asignaturaId] || [],
    grupo,
    programa,
    payloadPorClave,
  }));

  if (errores.length > 0) {
    throw boom.badRequest(errores.join(' | '));
  }

  // Ordinarios antes que extraordinarios, para que el extra encuentre su ordinario
  const itemsOrdenados = [...dataArray].sort((a, b) => Number(a.tipo) - Number(b.tipo));

  const transaction = await startTransactionQuery();
  try {
    await ensureAlumnoGrupo({
      findOneAlumnoGrupoQuery, createAlumnoGrupoQuery, alumnoId, grupo, transaction,
    });

    await itemsOrdenados.reduce((promesa, item) => promesa.then(() => upsertCalificacion({
      findOneCalificacionQuery,
      createCalificacionQuery,
      updateCalificacionQuery,
      alumnoId,
      grupoId,
      item,
      transaction,
    })), Promise.resolve());

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const actualizadas = await findAllCalificacionesQuery({ alumnoId, grupoId });
  return actualizadas.map((calificacion) => calificacion.toJSON());
};

module.exports = updateAcreditacionAlumno;
