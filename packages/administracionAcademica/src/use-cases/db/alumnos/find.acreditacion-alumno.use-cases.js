const boom = require('@hapi/boom');
const { checkers, Logger } = require('@siiges-services/shared');
const {
  agruparIntentos,
  agruparPorAsignatura,
  algunIntentoAprobado,
  clasificarIntentos,
} = require('./calificaciones-intentos.helpers');

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
  asignatura, calificaciones, grupo, calificacionAprobatoria,
}) => {
  const {
    intentoActual, otrosIntentos, intentosAnteriores,
  } = clasificarIntentos(agruparIntentos(calificaciones), grupo);

  const esDelGrado = Number(asignatura.gradoId) === Number(grupo.gradoId);
  const aprobadaEnOtroGrupo = algunIntentoAprobado(otrosIntentos, calificacionAprobatoria);
  const pendientePorRecursar = intentosAnteriores.length > 0
    && !algunIntentoAprobado(intentosAnteriores, calificacionAprobatoria);
  const intentosPrevios = intentosAnteriores;

  if (!esDelGrado && !intentoActual && !pendientePorRecursar) return null;

  const bloqueada = !intentoActual && aprobadaEnOtroGrupo;

  return {
    asignaturaId: asignatura.id,
    clave: asignatura.clave,
    nombre: asignatura.nombre,
    seriacion: asignatura.seriacion,
    creditos: asignatura.creditos,
    consecutivo: asignatura.consecutivo,
    tipoAsignatura: asignatura.tipo,
    gradoId: asignatura.gradoId,
    seccion: esDelGrado ? SECCION_GRADO : SECCION_RECURSAMIENTO,
    inscrita: Boolean(intentoActual),
    ordinario: toCalificacionDto(intentoActual?.ordinario),
    extraordinario: toCalificacionDto(intentoActual?.extraordinario),
    bloqueada,
    motivoBloqueo: bloqueada ? 'Asignatura aprobada en otro ciclo escolar' : null,
    intentosPrevios: intentosPrevios.map(toIntentoDto),
  };
};

const findAcreditacionAlumno = (
  findOneGrupoQuery,
  findOneAlumnoQuery,
  findOneProgramaQuery,
  findOneValidacionQuery,
  findOneAlumnoGrupoQuery,
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

  const [programa, validacion, alumnoGrupo, asignaturas, calificaciones] = await Promise.all([
    findOneProgramaQuery({ id: programaId }),
    findOneValidacionQuery({ alumnoId, situacionValidacionId: SITUACIONES_VALIDACION }),
    findOneAlumnoGrupoQuery({ alumnoId, grupoId }),
    findAllAsignaturasQuery({ programaId }),
    findAllCalificacionesQuery({ alumnoId }, {
      include: [{ association: 'grupo', include: [{ association: 'cicloEscolar' }] }],
      strict: false,
    }),
  ]);
  checkers.throwErrorIfDataIsFalsy(programa, 'programas', programaId);

  const calificacionAprobatoria = Number(programa.calificacionAprobatoria) || 0;
  const calificacionesPorAsignatura = agruparPorAsignatura(
    calificaciones.map((calificacion) => calificacion.toJSON()),
  );

  const filas = asignaturas
    .map((asignatura) => buildFila({
      asignatura,
      calificaciones: calificacionesPorAsignatura[asignatura.id] || [],
      grupo,
      calificacionAprobatoria,
    }))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.seccion !== b.seccion) return a.seccion === SECCION_GRADO ? -1 : 1;
      return compararAsignaturas(a, b);
    });

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
