const findGruposAlumnoAcreditacion = require('../src/use-cases/db/alumnos/find-group.grupos-alumno-acreditacion.use-cases');

const G1 = { id: 1, nombre: 'Primer cuatrimestre', numeroGrado: 1 };
const G4 = { id: 4, nombre: 'Cuarto cuatrimestre', numeroGrado: 4 };
const G5 = { id: 5, nombre: 'Quinto cuatrimestre', numeroGrado: 5 };

const grupo = (id, grado, cicloEscolarId, ciclo, descripcion = 'A') => ({
  id,
  descripcion,
  gradoId: grado.id,
  grado,
  cicloEscolarId,
  cicloEscolar: { nombre: ciclo },
});

const GRUPOS = {
  10: grupo(10, G1, 100, '2019B'),
  40: grupo(40, G4, 220, '2022C'),
  41: grupo(41, G4, 231, '2023A'),
  51: grupo(51, G5, 231, '2023A'),
  90: grupo(90, G1, 900, 'EQUIV'),
};

const instance = (obj) => ({ ...obj, toJSON: () => obj });

const construir = ({ inscripciones = [], calificaciones = [], alumno = { id: 7 } }) => {
  const queries = {
    findOneAlumnoQuery: async () => alumno,
    findAllAlumnoGrupoQuery: async () => inscripciones
      .map((grupoId) => instance({ alumnoId: 7, grupoId, grupo: GRUPOS[grupoId] })),
    findAllCalificacionesQuery: async () => calificaciones
      .map((grupoId, indice) => instance({
        id: indice + 1, alumnoId: 7, grupoId, grupo: GRUPOS[grupoId],
      })),
  };

  return findGruposAlumnoAcreditacion(
    queries.findOneAlumnoQuery,
    queries.findAllAlumnoGrupoQuery,
    queries.findAllCalificacionesQuery,
  );
};

describe('findGruposAlumnoAcreditacion', () => {
  it('sugiere el grado más alto del ciclo más reciente', async () => {
    const find = construir({ inscripciones: [40, 41, 51], calificaciones: [40, 41, 51] });

    const { sugerido, grupos } = await find({ alumnoId: 7 });

    expect(sugerido.grupoId).toBe(51);
    expect(sugerido.ciclo).toBe('2023A');
    expect(grupos.map((g) => g.ciclo)).toEqual(['2022C', '2023A', '2023A']);
  });

  it('alumno sin historia: no hay sugerido ni grupos', async () => {
    const find = construir({ inscripciones: [], calificaciones: [] });

    const { sugerido, grupos } = await find({ alumnoId: 7 });

    expect(sugerido).toBeNull();
    expect(grupos).toEqual([]);
  });

  it('incluye grupos donde solo quedan calificaciones, sin inscripción', async () => {
    const find = construir({ inscripciones: [51], calificaciones: [40, 51] });

    const { grupos } = await find({ alumnoId: 7 });
    const cuarto = grupos.find((g) => g.grupoId === 40);

    expect(cuarto).toBeDefined();
    expect(cuarto.inscrito).toBe(false);
    expect(cuarto.tieneCalificaciones).toBe(true);
  });

  it('no toma EQUIV como el ciclo más reciente', async () => {
    const find = construir({ inscripciones: [90, 41], calificaciones: [90, 41] });

    const { sugerido } = await find({ alumnoId: 7 });

    expect(sugerido.ciclo).toBe('2023A');
  });

  it('si solo tiene EQUIV, ese es el sugerido', async () => {
    const find = construir({ inscripciones: [90], calificaciones: [90] });

    const { sugerido } = await find({ alumnoId: 7 });

    expect(sugerido.ciclo).toBe('EQUIV');
  });

  it('ordena 2019B antes que 2022C', async () => {
    const find = construir({ inscripciones: [40, 10], calificaciones: [] });

    const { grupos, sugerido } = await find({ alumnoId: 7 });

    expect(grupos.map((g) => g.ciclo)).toEqual(['2019B', '2022C']);
    expect(sugerido.ciclo).toBe('2022C');
  });
});
