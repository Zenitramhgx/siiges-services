const { checkers, Logger } = require('@siiges-services/shared');
const { compararCiclos } = require('./calificaciones-intentos.helpers');
const { INCLUDE_ALUMNO_GRUPOS } = require('./grupos-alumno.helpers');

/**
 * Un ciclo "con año" empieza con cuatro dígitos (2023A). Los que no, como
 * EQUIV, se ordenan después de cualquier año al compararlos como texto, así
 * que no pueden tomarse como el ciclo más reciente del alumno.
 */
const tieneAnio = (nombreCiclo) => /^\d{4}/.test(String(nombreCiclo || ''));

const numeroDeGrado = (grupo) => Number(grupo?.grado?.numeroGrado) || Number(grupo?.gradoId) || 0;

const toUbicacion = (grupo) => ({
  grupoId: grupo.id,
  descripcion: grupo.descripcion,
  cicloEscolarId: grupo.cicloEscolarId,
  ciclo: grupo.cicloEscolar?.nombre || '',
  gradoId: grupo.gradoId,
  grado: grupo.grado?.nombre || '',
  numeroGrado: numeroDeGrado(grupo),
});

const compararUbicaciones = (a, b) => {
  const porCiclo = compararCiclos(a.ciclo, b.ciclo);
  if (porCiclo !== 0) return porCiclo;
  return a.numeroGrado - b.numeroGrado;
};

/**
 * El grupo al que conviene llevar al capturista: el del ciclo más reciente
 * con año y, dentro de ese ciclo, el grado más alto, que es el que cursa
 * (los grados menores del mismo ciclo son grupos de recursamiento).
 */
const elegirSugerido = (ubicaciones) => {
  const conAnio = ubicaciones.filter((ubicacion) => tieneAnio(ubicacion.ciclo));
  const candidatas = conAnio.length > 0 ? conAnio : ubicaciones;
  if (candidatas.length === 0) return null;

  return candidatas.reduce(
    (acc, ubicacion) => (compararUbicaciones(ubicacion, acc) >= 0 ? ubicacion : acc),
  );
};

/**
 * Dónde tiene historia académica un alumno: los grupos en los que está
 * inscrito MÁS aquellos donde tiene calificaciones, porque una inscripción
 * borrada deja calificaciones vivas que de otro modo se perderían de vista.
 */
const findGruposAlumnoAcreditacion = (
  findOneAlumnoQuery,
  findAllAlumnoGrupoQuery,
  findAllCalificacionesQuery,
) => async ({ alumnoId }) => {
  Logger.info('[alumnos]: find grupos del alumno para acreditacion');

  const alumno = await findOneAlumnoQuery({ id: alumnoId });
  checkers.throwErrorIfDataIsFalsy(alumno, 'alumnos', alumnoId);

  const [alumnoGrupos, calificaciones] = await Promise.all([
    findAllAlumnoGrupoQuery({ alumnoId }, { include: INCLUDE_ALUMNO_GRUPOS, strict: false }),
    findAllCalificacionesQuery({ alumnoId }, {
      include: [{
        association: 'grupo',
        include: [{ association: 'cicloEscolar' }, { association: 'grado' }],
      }],
      strict: false,
    }),
  ]);

  const inscritoEn = new Set();
  const conCalificaciones = new Set();
  const porGrupoId = new Map();

  alumnoGrupos.forEach((alumnoGrupoInstance) => {
    const { grupo } = alumnoGrupoInstance.toJSON();
    if (!grupo) return;
    inscritoEn.add(grupo.id);
    porGrupoId.set(grupo.id, grupo);
  });

  calificaciones.forEach((calificacionInstance) => {
    const { grupo } = calificacionInstance.toJSON();
    if (!grupo) return;
    conCalificaciones.add(grupo.id);
    if (!porGrupoId.has(grupo.id)) porGrupoId.set(grupo.id, grupo);
  });

  const ubicaciones = Array.from(porGrupoId.values())
    .map((grupo) => ({
      ...toUbicacion(grupo),
      inscrito: inscritoEn.has(grupo.id),
      tieneCalificaciones: conCalificaciones.has(grupo.id),
    }))
    .sort(compararUbicaciones);

  return {
    grupos: ubicaciones,
    sugerido: elegirSugerido(ubicaciones),
  };
};

module.exports = findGruposAlumnoAcreditacion;
