const findAcreditacionAlumno = require('../src/use-cases/db/alumnos/find.acreditacion-alumno.use-cases');
const updateAcreditacionAlumno = require('../src/use-cases/db/alumnos/update.acreditacion-alumno.use-cases');

// Escenario: alumno 7 del programa 1 (aprobatoria 6, escala 0-10, sin decimales)
// Grupo 10 = 2022A primer semestre, grupo 30 = 2023A tercer semestre
const GRUPOS = {
  10: { id: 10, gradoId: 1, cicloEscolar: { programaId: 1, nombre: '2022A' } },
  30: {
    id: 30,
    gradoId: 3,
    cicloEscolar: { programaId: 1, nombre: '2023A' },
    generacionFechaInicio: '2023-01-15T00:00:00Z',
  },
};
const ASIGNATURAS = [
  {
    id: 1, clave: 'DER-101', nombre: 'Constitucional', gradoId: 1,
  },
  {
    id: 2, clave: 'DER-102', nombre: 'Penal', gradoId: 1,
  },
  {
    id: 3, clave: 'DER-103', nombre: 'Civil', gradoId: 1,
  },
  {
    id: 5, clave: 'DER-301', nombre: 'Mercantil', gradoId: 3,
  },
  {
    id: 6, clave: 'DER-302', nombre: 'Laboral', gradoId: 3,
  },
];

const instance = (obj) => ({ ...obj, toJSON: () => obj });
const matches = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);

const buildDb = () => {
  const state = {
    calificaciones: [
      {
        id: 1, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1, calificacion: '5',
      },
      {
        id: 2, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 2, calificacion: '4',
      },
      {
        id: 3, alumnoId: 7, grupoId: 10, asignaturaId: 2, tipo: 1, calificacion: '8',
      },
    ],
    alumnoGrupos: [{ id: 1, alumnoId: 7, grupoId: 10 }],
    failCreateAsignaturaId: null,
    transaction: null,
  };

  const queries = {
    startTransactionQuery: jest.fn(async () => {
      const snapshot = JSON.parse(JSON.stringify(state.calificaciones));
      const snapshotGrupos = JSON.parse(JSON.stringify(state.alumnoGrupos));
      state.transaction = {
        status: 'open',
        commit: jest.fn(async () => { state.transaction.status = 'commit'; }),
        rollback: jest.fn(async () => {
          state.transaction.status = 'rollback';
          state.calificaciones = snapshot;
          state.alumnoGrupos = snapshotGrupos;
        }),
      };
      return state.transaction;
    }),
    findOneGrupoQuery: async ({ id }) => (GRUPOS[id] ? instance(GRUPOS[id]) : null),
    findOneAlumnoQuery: async (where) => {
      const alumno = {
        id: 7, programaId: 1, situacionId: 1, matricula: '24ALD0001', persona: {}, situacion: {},
      };
      return matches(alumno, where) ? alumno : null;
    },
    findOneProgramaQuery: async () => ({
      id: 1,
      calificacionMinima: 0,
      calificacionMaxima: 10,
      calificacionAprobatoria: 6,
      calificacionDecimal: false,
    }),
    findOneValidacionQuery: async () => ({ id: 1 }),
    findAllAsignaturasQuery: async () => ASIGNATURAS,
    findAllCalificacionesQuery: async (where) => state.calificaciones
      .filter((row) => matches(row, where))
      .map((row) => instance({ ...row, grupo: GRUPOS[row.grupoId] })),
    findOneAlumnoGrupoQuery: async (where) => state.alumnoGrupos
      .find((row) => matches(row, where)) || null,
    createAlumnoGrupoQuery: jest.fn(async (data) => {
      const row = { id: state.alumnoGrupos.length + 1, ...data };
      state.alumnoGrupos.push(row);
      return row;
    }),
    findOneCalificacionQuery: async (where) => state.calificaciones
      .find((row) => matches(row, where)) || null,
    createCalificacionQuery: jest.fn(async (data, include, dbParams) => {
      expect(dbParams.transaction).toBe(state.transaction);
      if (data.asignaturaId === state.failCreateAsignaturaId) throw new Error('falla BD');
      const row = { id: state.calificaciones.length + 100, ...data };
      state.calificaciones.push(row);
      return row;
    }),
    updateCalificacionQuery: jest.fn(async ({ id }, changes, dbParams) => {
      expect(dbParams.transaction).toBe(state.transaction);
      Object.assign(state.calificaciones.find((row) => row.id === id), changes);
    }),
  };

  return { state, queries };
};

const buildUseCases = (queries) => ({
  find: findAcreditacionAlumno(
    queries.findOneGrupoQuery,
    queries.findOneAlumnoQuery,
    queries.findOneProgramaQuery,
    queries.findOneValidacionQuery,
    queries.findOneAlumnoGrupoQuery,
    queries.findAllAsignaturasQuery,
    queries.findAllCalificacionesQuery,
  ),
  update: updateAcreditacionAlumno(
    queries.startTransactionQuery,
    queries.findOneGrupoQuery,
    queries.findOneAlumnoQuery,
    queries.findOneProgramaQuery,
    queries.findOneValidacionQuery,
    queries.findAllAsignaturasQuery,
    queries.findAllCalificacionesQuery,
    queries.findOneAlumnoGrupoQuery,
    queries.createAlumnoGrupoQuery,
    queries.findOneCalificacionQuery,
    queries.createCalificacionQuery,
    queries.updateCalificacionQuery,
  ),
});

const fecha = '2023-06-01';

describe('findAcreditacionAlumno', () => {
  it('muestra las asignaturas del grado y las pendientes por recursar', async () => {
    const { queries } = buildDb();
    const { find } = buildUseCases(queries);

    const result = await find({ alumnoId: 7, grupoId: 30 });
    const resumen = result.asignaturas.map((a) => [a.clave, a.seccion]);

    expect(resumen).toEqual([
      ['DER-301', 'grado'],
      ['DER-302', 'grado'],
      ['DER-101', 'recursamiento'], // reprobada en 2022A; Penal (aprobada) y Civil (nunca cursada) no
    ]);
    expect(result.habilitadoParaCaptura).toBe(true);
  });

  it('en un grupo anterior no muestra recursamientos de ciclos posteriores', async () => {
    const { state, queries } = buildDb();
    state.calificaciones.push({
      id: 50, alumnoId: 7, grupoId: 30, asignaturaId: 6, tipo: 1, calificacion: null,
    });
    const { find } = buildUseCases(queries);

    const result = await find({ alumnoId: 7, grupoId: 10 });

    expect(result.asignaturas.map((a) => a.clave)).toEqual(['DER-101', 'DER-102', 'DER-103']);
    expect(result.asignaturas[0].intentosPrevios).toHaveLength(0);
  });
});

describe('updateAcreditacionAlumno', () => {
  it('inscribe y califica recursamiento, ordinario y su extraordinario en un solo envío', async () => {
    const { state, queries } = buildDb();
    const { update } = buildUseCases(queries);

    await update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 2, calificacion: '8', fechaExamen: fecha,
      },
      {
        asignaturaId: 1, tipo: 1, calificacion: '9', fechaExamen: fecha,
      },
      {
        asignaturaId: 5, tipo: 1, calificacion: '5', fechaExamen: fecha,
      },
    ]);

    expect(state.transaction.status).toBe('commit');
    expect(queries.createAlumnoGrupoQuery).toHaveBeenCalledWith(
      { alumnoId: 7, grupoId: 30, periodoFechaInicio: '2023-01-15' },
      undefined,
      { transaction: state.transaction },
    );
    const enGrupo30 = state.calificaciones.filter((c) => c.grupoId === 30)
      .map((c) => `${c.asignaturaId}-t${c.tipo}=${c.calificacion}`);
    expect(enGrupo30).toEqual(['1-t1=9', '5-t1=5', '5-t2=8']);
  });

  it.each([
    ['extraordinario sin ordinario', [{
      asignaturaId: 5, tipo: 2, calificacion: '7', fechaExamen: fecha,
    }], 'sin ordinario calificado'],
    ['asignatura ya aprobada en otro ciclo', [{
      asignaturaId: 2, tipo: 1, calificacion: '9', fechaExamen: fecha,
    }], 'ya está aprobada'],
    ['otro grado sin intentos previos', [{ asignaturaId: 3, tipo: 1 }], 'ni está pendiente por recursar'],
    ['fuera de rango', [{
      asignaturaId: 5, tipo: 1, calificacion: '11', fechaExamen: fecha,
    }], 'mayor a la máxima'],
    ['decimal no permitido', [{
      asignaturaId: 5, tipo: 1, calificacion: '7.5', fechaExamen: fecha,
    }], 'no admite calificaciones decimales'],
    ['calificación sin fecha', [{ asignaturaId: 5, tipo: 1, calificacion: '7' }], 'fecha de examen es obligatoria'],
    ['renglón duplicado', [{ asignaturaId: 5, tipo: 1 }, { asignaturaId: 5, tipo: 1 }], 'duplicados'],
  ])('rechaza %s sin abrir transacción', async (_caso, body, mensaje) => {
    const { queries } = buildDb();
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, body)).rejects.toThrow(mensaje);
    expect(queries.startTransactionQuery).not.toHaveBeenCalled();
  });

  it('hace rollback si la BD falla a la mitad', async () => {
    const { state, queries } = buildDb();
    const antes = JSON.stringify({ c: state.calificaciones, g: state.alumnoGrupos });
    state.failCreateAsignaturaId = 1;
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '5', fechaExamen: fecha,
      },
      {
        asignaturaId: 1, tipo: 1, calificacion: '9', fechaExamen: fecha,
      },
    ])).rejects.toThrow('falla BD');

    expect(state.transaction.rollback).toHaveBeenCalled();
    expect(JSON.stringify({ c: state.calificaciones, g: state.alumnoGrupos })).toBe(antes);
  });
});
