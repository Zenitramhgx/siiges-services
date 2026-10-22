const boom = require('@hapi/boom');
const { checkers, Logger } = require('@siiges-services/shared');
const {
  TIPO_ORDINARIO,
  TIPO_EXTRAORDINARIO,
  valorVacio,
  esTextoNoNumerico,
  CLAVES_EXTRAORDINARIO,
  claveExtraordinario,
  normalizarCalificacion,
  esAprobatoria,
  esReprobatoriaNumerica,
  fechaISO,
  fechaDeHoy,
  esFechaFutura,
  agruparIntentos,
  agruparPorAsignatura,
  algunIntentoAprobado,
  clasificarIntentos,
} = require('./calificaciones-intentos.helpers');
const {
  buscarGradoEnCursoEnElCiclo,
  mensajeConflictoDeGrado,
  INCLUDE_ALUMNO_GRUPOS,
} = require('./grupos-alumno.helpers');
const {
  revisarGradoAnterior,
  mensajeGradoAnteriorIncompleto,
} = require('./curricula-grados.helpers');
const {
  indexarAsignaturasPorClave,
  revisarSeriacion,
  mensajeSeriacionPendiente,
} = require('./seriacion.helpers');

const SITUACION_ALUMNO_ACTIVO = 1;
const SITUACIONES_VALIDACION = [1, 3];

// ─── Validaciones de alumno / grupo ──────────────────────────────────────────

const validateGrupo = async ({ findOneGrupoQuery, grupoId }) => {
  const grupo = await findOneGrupoQuery({ id: grupoId }, {
    include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
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

/**
 * Las calificaciones son numéricas. Solo el extraordinario admite un texto, y
 * únicamente una de las cuatro claves del catálogo, que siempre significan
 * que no acreditó. Se guarda la clave de dos letras.
 */
const validarValorCalificacion = (valor, programa, tipo) => {
  if (valorVacio(valor)) return null;

  if (esTextoNoNumerico(valor)) {
    if (Number(tipo) !== TIPO_EXTRAORDINARIO) {
      return `la calificación del ordinario debe ser numérica, llegó "${valor}"`;
    }
    return claveExtraordinario(valor)
      ? null
      : `la calificación "${valor}" no es válida para extraordinario;`
        + ` solo se admite un número o ${CLAVES_EXTRAORDINARIO.join(', ')}`;
  }

  const numero = Number(String(valor).trim());

  const minima = Number(programa.calificacionMinima);
  const maxima = Number(programa.calificacionMaxima);
  if (!Number.isNaN(minima) && numero < minima) return `calificación ${numero} menor a la mínima (${minima})`;
  if (!Number.isNaN(maxima) && numero > maxima) return `calificación ${numero} mayor a la máxima (${maxima})`;

  if (!programa.calificacionDecimal && !Number.isInteger(numero)) {
    return `el programa no admite calificaciones decimales (${numero})`;
  }

  return null;
};

const validarFechaExamen = (valor) => {
  if (valorVacio(valor)) return null;
  if (fechaISO(valor) === null) return `la fecha de examen "${valor}" no es válida`;
  if (esFechaFutura(valor)) {
    return `la fecha de examen no puede ser posterior a hoy (${fechaDeHoy()})`;
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

const extraordinarioResultante = ({ payloadPorClave, asignaturaId, intentoActual }) => {
  const enPayload = payloadPorClave[`${asignaturaId}-${TIPO_EXTRAORDINARIO}`];
  if (enPayload) return enPayload.calificacion;
  return intentoActual?.extraordinario?.calificacion ?? null;
};

const validarItem = ({
  item,
  asignatura,
  calificacionesAsignatura,
  grupo,
  programa,
  payloadPorClave,
  conflictoDeGrado,
  gradoAnterior,
  asignaturasPorClave,
  calificacionesPorAsignatura,
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
    } else if (conflictoDeGrado && !pendientePorRecursar) {
      // Recursar materias sueltas sí se permite; cursar un segundo grado no
      errores.push(mensajeConflictoDeGrado(conflictoDeGrado));
    }
  }

  // Currícula rígida: este grado espera a que el anterior quede completo.
  // Los recursamientos de grados previos sí se permiten.
  if (gradoAnterior && esDelGrado) {
    errores.push(mensajeGradoAnteriorIncompleto(gradoAnterior));
  }

  // Currícula flexible: la seriación. Solo cuando la asignatura se cursaría
  // por primera vez en este grupo; corregir una captura que ya existe o
  // recursar no se bloquean.
  if (!intentoActual && intentosAnteriores.length === 0) {
    const seriacionPendiente = revisarSeriacion({
      asignatura,
      grupo,
      asignaturasPorClave,
      calificacionesPorAsignatura,
      calificacionAprobatoria: aprobatoria,
    });
    if (seriacionPendiente.length > 0) {
      errores.push(mensajeSeriacionPendiente(seriacionPendiente));
    }
  }

  const errorValor = validarValorCalificacion(item.calificacion, programa, tipo);
  if (errorValor) errores.push(errorValor);

  if (!valorVacio(item.calificacion) && valorVacio(item.fechaExamen)) {
    errores.push('la fecha de examen es obligatoria cuando hay calificación');
  }

  const errorFecha = validarFechaExamen(item.fechaExamen);
  if (errorFecha) errores.push(errorFecha);

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
    calificacion: normalizarCalificacion(item.calificacion, tipo),
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
 * Ninguna materia del grupo puede quedar con el intento abierto: si el
 * ordinario no acredita, tiene que haber extraordinario, aunque sea un RC o
 * un NS. Se revisan TODAS las materias con captura en este grupo, no solo
 * las que vienen en el envío, para no dejar pendientes a medias.
 */
const asignaturasConIntentoAbierto = ({
  asignaturasPorId,
  calificacionesPorAsignatura,
  calificacionesDelGrupo,
  payloadPorClave,
  grupo,
  aprobatoria,
}) => {
  const asignaturaIds = Array.from(new Set([
    ...calificacionesDelGrupo.map((calificacion) => calificacion.asignaturaId),
    ...Object.values(payloadPorClave).map((item) => item.asignaturaId),
  ]));

  return asignaturaIds
    .filter((asignaturaId) => {
      const { intentoActual } = clasificarIntentos(
        agruparIntentos(calificacionesPorAsignatura[asignaturaId] || []),
        grupo,
      );
      const ordinario = ordinarioResultante({ payloadPorClave, asignaturaId, intentoActual });
      const extraordinario = extraordinarioResultante({
        payloadPorClave, asignaturaId, intentoActual,
      });

      return esReprobatoriaNumerica(ordinario, aprobatoria) && valorVacio(extraordinario);
    })
    .map((asignaturaId) => {
      const asignatura = asignaturasPorId[asignaturaId];
      return asignatura ? `${asignatura.clave} ${asignatura.nombre}` : `asignatura ${asignaturaId}`;
    });
};

/**
 * Extraordinarios del grupo que siguen guardados con el texto largo
 * ("NS (No solicitó)") y que nadie tocó en este envío. Al guardar cualquier
 * cosa del grupo se dejan con la clave de dos letras, para que la base
 * termine con un solo formato.
 *
 * Solo se toca lo que sí es una de las cuatro claves: cualquier otro texto
 * viejo se queda como está, para no inventarle un valor.
 */
const normalizacionesPendientes = ({ calificacionesDelGrupo, payloadPorClave }) => (
  calificacionesDelGrupo
    .filter((calificacion) => Number(calificacion.tipo) === TIPO_EXTRAORDINARIO)
    .filter((calificacion) => !payloadPorClave[
      `${calificacion.asignaturaId}-${TIPO_EXTRAORDINARIO}`
    ])
    .map((calificacion) => ({
      id: calificacion.id,
      actual: String(calificacion.calificacion ?? '').trim(),
      clave: claveExtraordinario(calificacion.calificacion),
    }))
    .filter((pendiente) => pendiente.clave && pendiente.clave !== pendiente.actual)
);

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
  findAllAlumnoGrupoQuery,
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

  const [asignaturas, calificaciones, alumnoGrupos] = await Promise.all([
    findAllAsignaturasQuery({ programaId }, {
      include: [{ association: 'grado' }],
      strict: false,
    }),
    findAllCalificacionesQuery({ alumnoId }, {
      include: [{ association: 'grupo', include: [{ association: 'cicloEscolar' }] }],
      strict: false,
    }),
    findAllAlumnoGrupoQuery({ alumnoId }, { include: INCLUDE_ALUMNO_GRUPOS, strict: false }),
  ]);

  // Si ya cursa otro grado en este ciclo, aquí solo se permiten recursamientos
  const calificacionesJson = calificaciones.map((calificacion) => calificacion.toJSON());

  const conflictoDeGrado = buscarGradoEnCursoEnElCiclo(
    alumnoGrupos.map((alumnoGrupo) => alumnoGrupo.toJSON()),
    grupo,
    calificacionesJson,
  );

  const asignaturasPorId = asignaturas.reduce((acc, asignatura) => {
    acc[asignatura.id] = asignatura;
    return acc;
  }, {});
  const calificacionesPorAsignatura = agruparPorAsignatura(calificacionesJson);

  // Se valida TODO antes de abrir la transacción y se reportan todos los errores juntos
  const gradoAnterior = revisarGradoAnterior({
    asignaturas,
    grupo,
    calificacionesPorAsignatura,
  });

  const asignaturasPorClave = indexarAsignaturasPorClave(asignaturas);

  const errores = dataArray.flatMap((item) => validarItem({
    item,
    asignatura: asignaturasPorId[item.asignaturaId],
    calificacionesAsignatura: calificacionesPorAsignatura[item.asignaturaId] || [],
    grupo,
    programa,
    payloadPorClave,
    conflictoDeGrado,
    gradoAnterior,
    asignaturasPorClave,
    calificacionesPorAsignatura,
  }));

  if (errores.length > 0) {
    throw boom.badRequest(errores.join(' | '));
  }

  const calificacionesDelGrupo = calificacionesJson.filter(
    (calificacion) => Number(calificacion.grupoId) === Number(grupoId),
  );

  const abiertas = asignaturasConIntentoAbierto({
    asignaturasPorId,
    calificacionesPorAsignatura,
    calificacionesDelGrupo,
    payloadPorClave,
    grupo,
    aprobatoria: Number(programa.calificacionAprobatoria) || 0,
  });

  if (abiertas.length > 0) {
    throw boom.badRequest(
      '[calificaciones]: estas asignaturas quedarían con el ordinario reprobado y sin'
      + ` extraordinario: ${abiertas.join(', ')}.`
      + ` Captura el extraordinario (un número o una clave: ${CLAVES_EXTRAORDINARIO.join(', ')})`
      + ' o corrige el ordinario a una calificación aprobatoria.',
    );
  }

  // Ordinarios antes que extraordinarios, para que el extra encuentre su ordinario
  const itemsOrdenados = [...dataArray].sort((a, b) => Number(a.tipo) - Number(b.tipo));

  const porNormalizar = normalizacionesPendientes({ calificacionesDelGrupo, payloadPorClave });

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

    await porNormalizar.reduce(
      (promesa, pendiente) => promesa.then(() => updateCalificacionQuery(
        { id: pendiente.id },
        { calificacion: pendiente.clave },
        { transaction },
      )),
      Promise.resolve(),
    );

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const actualizadas = await findAllCalificacionesQuery({ alumnoId, grupoId });
  return actualizadas.map((calificacion) => calificacion.toJSON());
};

module.exports = updateAcreditacionAlumno;
