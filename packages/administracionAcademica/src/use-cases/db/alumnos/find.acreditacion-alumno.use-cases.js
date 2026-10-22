const boom = require('@hapi/boom');
const { checkers, Logger } = require('@siiges-services/shared');
const {
  agruparIntentos,
  agruparPorAsignatura,
  algunIntentoAprobado,
  calificacionesAprobatorias,
  clasificarIntentos,
  resolverVigente,
  requiereExtraordinario,
} = require('./calificaciones-intentos.helpers');
const {
  buscarGradoEnCursoEnElCiclo,
  avisoConflictoDeGrado,
  INCLUDE_ALUMNO_GRUPOS,
} = require('./grupos-alumno.helpers');
const {
  revisarGradoAnterior,
  avisoGradoAnteriorIncompleto,
} = require('./curricula-grados.helpers');
const {
  indexarAsignaturasPorClave,
  revisarSeriacion,
  avisoSeriacionPendiente,
  avisoSeriacionDelGrupo,
} = require('./seriacion.helpers');

const SITUACION_ALUMNO_ACTIVO = 1;
const SITUACIONES_VALIDACION = [1, 3];

const SECCION_GRADO = 'grado';
const SECCION_RECURSAMIENTO = 'recursamiento';

const toCalificacionDto = (calificacion) => (calificacion
  ? {
    id: calificacion.id,
    calificacion: calificacion.calificacion,
    fechaExamen: calificacion.fechaExamen,
  }
  : null);

const toIntentoDto = (intento) => ({
  grupoId: intento.grupoId,
  ciclo: intento.ciclo,
  ordinario: toCalificacionDto(intento.ordinario),
  extraordinario: toCalificacionDto(intento.extraordinario),
});

/**
 * Dónde vive cada intento de la asignatura, en orden cronológico, para que la
 * pantalla pueda saltar al ciclo y grupo donde está esa calificación.
 */
const toUbicacionDto = (intento, grupoActual, vigente) => {
  const registro = intento.ordinario || intento.extraordinario || {};
  const grupoDelIntento = registro.grupo || {};

  return {
    grupoId: intento.grupoId,
    descripcion: grupoDelIntento.descripcion || '',
    cicloEscolarId: grupoDelIntento.cicloEscolarId ?? null,
    ciclo: intento.ciclo,
    gradoId: grupoDelIntento.gradoId ?? null,
    grado: grupoDelIntento.grado?.nombre || '',
    esActual: Number(intento.grupoId) === Number(grupoActual.id),
    esVigente: Boolean(vigente) && Number(intento.grupoId) === Number(vigente.grupoId),
  };
};

const compararAsignaturas = (a, b) => {
  const consecutivoA = Number(a.consecutivo || 0);
  const consecutivoB = Number(b.consecutivo || 0);
  if (consecutivoA !== consecutivoB) return consecutivoA - consecutivoB;
  return String(a.clave || '').localeCompare(String(b.clave || ''), undefined, { numeric: true });
};

/**
 * Decide si una asignatura aparece en la pantalla para este grupo y cómo.
 * - Del grado del grupo: siempre aparece.
 * - De otro grado: solo si ya está inscrita en este grupo (recursamiento en curso)
 *   o si tiene intentos en ciclos ANTERIORES sin aprobar (pendiente por recursar).
 * - Si ya se aprobó en cualquier otro grupo y no tiene intento aquí, se muestra bloqueada.
 */
const buildFila = ({
  asignatura,
  calificaciones,
  grupo,
  calificacionAprobatoria,
  conflictoDeGrado,
  gradoAnterior,
  asignaturasPorClave,
  calificacionesPorAsignatura,
}) => {
  const intentos = agruparIntentos(calificaciones);
  const {
    intentoActual, otrosIntentos, intentosAnteriores,
  } = clasificarIntentos(intentos, grupo);

  // Una materia solo debió acreditarse una vez; más de una aprobatoria es
  // captura sobrante que hay que revisar.
  const aprobatorias = calificacionesAprobatorias(intentos, calificacionAprobatoria);
  const vigente = resolverVigente(intentos, calificacionAprobatoria);
  // Reprobó el ordinario y el intento quedó abierto, sin extraordinario
  const faltaExtraordinario = requiereExtraordinario(intentos, calificacionAprobatoria);

  const esDelGrado = Number(asignatura.gradoId) === Number(grupo.gradoId);
  // Es recursamiento si la materia ya se cursó en un ciclo anterior, sin
  // importar si pertenece al grado de este grupo.
  const esRecursamiento = intentosAnteriores.length > 0;
  const aprobadaEnOtroGrupo = algunIntentoAprobado(otrosIntentos, calificacionAprobatoria);
  const pendientePorRecursar = intentosAnteriores.length > 0
    && !algunIntentoAprobado(intentosAnteriores, calificacionAprobatoria);
  const intentosPrevios = intentosAnteriores;

  if (!esDelGrado && !intentoActual && !pendientePorRecursar) return null;

  // Si el alumno ya cursa otro grado en este ciclo, aquí solo puede recursar
  const soloRecursamiento = Boolean(conflictoDeGrado) && !intentoActual && !pendientePorRecursar;
  // Currícula rígida: el grado del grupo espera a que termine el grado anterior
  const esperaGradoAnterior = Boolean(gradoAnterior) && esDelGrado;

  // Currícula flexible: la seriación ordena el avance. Solo se revisa cuando la
  // asignatura se cursaría por primera vez aquí; una captura que ya existe en
  // este grupo o un recursamiento no se bloquean, para poder corregirlos.
  const seriacionPendiente = (!intentoActual && intentosAnteriores.length === 0)
    ? revisarSeriacion({
      asignatura,
      grupo,
      asignaturasPorClave,
      calificacionesPorAsignatura,
      calificacionAprobatoria,
    })
    : [];
  const esperaSeriacion = seriacionPendiente.length > 0;

  const bloqueada = (!intentoActual && aprobadaEnOtroGrupo)
    || soloRecursamiento
    || esperaGradoAnterior
    || esperaSeriacion;

  let motivoBloqueo = null;
  let motivoBloqueoClave = null;
  if (!intentoActual && aprobadaEnOtroGrupo) {
    motivoBloqueo = 'Asignatura aprobada en otro ciclo escolar';
    motivoBloqueoClave = 'aprobada';
  } else if (esperaSeriacion) {
    motivoBloqueo = avisoSeriacionPendiente(seriacionPendiente);
    motivoBloqueoClave = 'seriacion';
  } else if (esperaGradoAnterior) {
    motivoBloqueo = avisoGradoAnteriorIncompleto(gradoAnterior);
    motivoBloqueoClave = 'grado-anterior';
  } else if (soloRecursamiento) {
    motivoBloqueo = avisoConflictoDeGrado(conflictoDeGrado);
    motivoBloqueoClave = 'otro-grado';
  }

  return {
    asignaturaId: asignatura.id,
    clave: asignatura.clave,
    nombre: asignatura.nombre,
    seriacion: asignatura.seriacion,
    creditos: asignatura.creditos,
    consecutivo: asignatura.consecutivo,
    tipoAsignatura: asignatura.tipo,
    gradoId: asignatura.gradoId,
    seccion: esRecursamiento ? SECCION_RECURSAMIENTO : SECCION_GRADO,
    inscrita: Boolean(intentoActual),
    ordinario: toCalificacionDto(intentoActual?.ordinario),
    extraordinario: toCalificacionDto(intentoActual?.extraordinario),
    bloqueada,
    motivoBloqueo,
    motivoBloqueoClave,
    requiereRevision: aprobatorias.length > 1,
    faltaExtraordinario,
    seriacionPendiente,
    ubicaciones: intentos.map((intento) => toUbicacionDto(intento, grupo, vigente)),
    intentosPrevios: intentosPrevios.map(toIntentoDto),
  };
};

const findAcreditacionAlumno = (
  findOneGrupoQuery,
  findOneAlumnoQuery,
  findOneProgramaQuery,
  findOneValidacionQuery,
  findOneAlumnoGrupoQuery,
  findAllAlumnoGrupoQuery,
  findAllAsignaturasQuery,
  findAllCalificacionesQuery,
) => async ({ alumnoId, grupoId }) => {
  Logger.info('[calificaciones]: find acreditacion alumno');

  const grupoInstance = await findOneGrupoQuery({ id: grupoId }, {
    include: [
      { association: 'cicloEscolar' },
      { association: 'grado' },
      { association: 'turno' },
    ],
    strict: false,
  });
  checkers.throwErrorIfDataIsFalsy(grupoInstance, 'grupos', grupoId);
  const grupo = grupoInstance.toJSON();
  const { programaId } = grupo.cicloEscolar;

  const alumno = await findOneAlumnoQuery({ id: alumnoId }, {
    include: [{ association: 'persona' }, { association: 'situacion' }],
    strict: false,
  });
  checkers.throwErrorIfDataIsFalsy(alumno, 'alumnos', alumnoId);

  if (Number(alumno.programaId) !== Number(programaId)) {
    throw boom.conflict(`[calificaciones]: alumno ${alumnoId} does not belong to the programa of grupo ${grupoId}`);
  }

  const [
    programa, validacion, alumnoGrupo, alumnoGrupos, asignaturas, calificaciones,
  ] = await Promise.all([
    findOneProgramaQuery({ id: programaId }),
    findOneValidacionQuery({ alumnoId, situacionValidacionId: SITUACIONES_VALIDACION }),
    findOneAlumnoGrupoQuery({ alumnoId, grupoId }),
    findAllAlumnoGrupoQuery({ alumnoId }, { include: INCLUDE_ALUMNO_GRUPOS, strict: false }),
    findAllAsignaturasQuery({ programaId }, {
      include: [{ association: 'grado' }],
      strict: false,
    }),
    findAllCalificacionesQuery({ alumnoId }, {
      include: [{
        association: 'grupo',
        include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
      }],
      strict: false,
    }),
  ]);
  checkers.throwErrorIfDataIsFalsy(programa, 'programas', programaId);

  const calificacionAprobatoria = Number(programa.calificacionAprobatoria) || 0;
  const calificacionesJson = calificaciones.map((calificacion) => calificacion.toJSON());
  const calificacionesPorAsignatura = agruparPorAsignatura(calificacionesJson);

  const conflictoDeGrado = buscarGradoEnCursoEnElCiclo(
    alumnoGrupos.map((alumnoGrupoInstance) => alumnoGrupoInstance.toJSON()),
    grupo,
    calificacionesJson,
  );

  const gradoAnterior = revisarGradoAnterior({
    asignaturas,
    grupo,
    calificacionesPorAsignatura,
  });

  const asignaturasPorClave = indexarAsignaturasPorClave(asignaturas);

  const filas = asignaturas
    .map((asignatura) => buildFila({
      asignatura,
      calificaciones: calificacionesPorAsignatura[asignatura.id] || [],
      grupo,
      calificacionAprobatoria,
      conflictoDeGrado,
      gradoAnterior,
      asignaturasPorClave,
      calificacionesPorAsignatura,
    }))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.seccion !== b.seccion) return a.seccion === SECCION_GRADO ? -1 : 1;
      return compararAsignaturas(a, b);
    });

  const clavesSinExtraordinario = filas
    .filter((fila) => fila.faltaExtraordinario)
    .map((fila) => fila.clave);

  const avisoFaltaExtraordinario = clavesSinExtraordinario.length > 0
    ? 'Estas asignaturas tienen el ordinario reprobado y no se ha capturado su'
      + ` extraordinario: ${clavesSinExtraordinario.join(', ')}. Mientras no quede`
      + ' registrado, el historial las imprime como pendientes.'
    : null;

  const clavesPorRevisar = filas
    .filter((fila) => fila.requiereRevision)
    .map((fila) => fila.clave);

  const avisoRevision = clavesPorRevisar.length > 0
    ? 'Estas asignaturas tienen más de una calificación aprobatoria capturada y hay que'
      + ` revisarlas: ${clavesPorRevisar.join(', ')}. Para los documentos se toma la`
      + ' primera aprobatoria.'
    : null;

  const clavesSeriadas = filas
    .filter((fila) => fila.motivoBloqueoClave === 'seriacion')
    .map((fila) => fila.clave);

  const avisoSeriacion = clavesSeriadas.length > 0
    ? avisoSeriacionDelGrupo(clavesSeriadas)
    : null;

  const motivosNoHabilitado = [
    Number(alumno.situacionId) !== SITUACION_ALUMNO_ACTIVO ? 'El alumno no está activo' : null,
    !validacion ? 'El alumno no está validado' : null,
  ].filter(Boolean);

  return {
    alumno: {
      id: alumno.id,
      matricula: alumno.matricula,
      nombre: alumno.persona?.nombre,
      apellidoPaterno: alumno.persona?.apellidoPaterno,
      apellidoMaterno: alumno.persona?.apellidoMaterno,
      situacion: alumno.situacion?.nombre,
    },
    grupo: {
      id: grupo.id,
      descripcion: grupo.descripcion,
      cicloEscolar: grupo.cicloEscolar?.nombre,
      grado: grupo.grado?.nombre,
      gradoId: grupo.gradoId,
      turno: grupo.turno?.nombre,
    },
    inscritoEnGrupo: Boolean(alumnoGrupo),
    avisoOtroGrado: conflictoDeGrado ? avisoConflictoDeGrado(conflictoDeGrado) : null,
    avisoGradoAnterior: gradoAnterior ? avisoGradoAnteriorIncompleto(gradoAnterior) : null,
    avisoSeriacion,
    avisoRevision,
    avisoFaltaExtraordinario,
    habilitadoParaCaptura: motivosNoHabilitado.length === 0,
    motivosNoHabilitado,
    limites: {
      calificacionMinima: programa.calificacionMinima,
      calificacionMaxima: programa.calificacionMaxima,
      calificacionAprobatoria: programa.calificacionAprobatoria,
      calificacionDecimal: Boolean(programa.calificacionDecimal),
    },
    asignaturas: filas,
  };
};

module.exports = findAcreditacionAlumno;
