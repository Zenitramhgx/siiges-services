const deleteCalificacionAlumno = require('../src/use-cases/db/alumnos/delete.calificacion-alumno.use-cases');

const grupoDe = (id, ciclo, descripcion = 'A') => ({
  id,
  descripcion,
  gradoId: 1,
  grado: { nombre: 'Primer semestre' },
  cicloEscolar: { nombre: ciclo },
});

const GRUPOS = {
  10: grupoDe(10, '2022A'),
  20: grupoDe(20, '2022B', 'B'),
  30: grupoDe(30, '2023A', 'C'),
};

const instance = (obj) => ({ ...obj, toJSON: () => obj });
const matches = (row, where) => Object.entries(where).every(([k, v]) => row[k] === v);

const buildDb = () => {
  const state = {
    calificaciones: [
      {
        id: 1, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1, calificacion: '5', deletedAt: null,
      },
      {
        id: 2, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 2, calificacion: '4', deletedAt: null,
      },
      {
        id: 3, alumnoId: 7, grupoId: 10, asignaturaId: 2, tipo: 1, calificacion: '8', deletedAt: null,
      },
    ],
    transaction: null,
  };

  const vivas = () => state.calificaciones.filter((row) => row.deletedAt === null);

  const queries = {
    startTransactionQuery: jest.fn(async () => {
      const snapshot = JSON.parse(JSON.stringify(state.calificaciones));
      state.transaction = {
        commit: jest.fn(async () => {}),
        rollback: jest.fn(async () => { state.calificaciones = snapshot; }),
      };
      return state.transaction;
    }),
    findOneGrupoQuery: async ({ id }) => (GRUPOS[id] ? instance(GRUPOS[id]) : null),
    findOneAlumnoQuery: async ({ id }) => (id === 7 ? { id: 7, programaId: 1 } : null),
    findAllCalificacionesQuery: async (where) => vivas()
      .filter((row) => matches(row, where))
      .map((row) => instance({ ...row, grupo: GRUPOS[row.grupoId] })),
    updateCalificacionQuery: jest.fn(async ({ id }, cambios, dbParams) => {
      expect(dbParams.transaction).toBe(state.transaction);
      Object.assign(state.calificaciones.find((row) => row.id === id), cambios);
    }),
  };

  return { state, vivas, queries };
};

const build = (queries) => deleteCalificacionAlumno(
  queries.startTransactionQuery,
  queries.findOneGrupoQuery,
  queries.findOneAlumnoQuery,
  queries.findAllCalificacionesQuery,
  queries.updateCalificacionQuery,
);

describe('deleteCalificacionAlumno', () => {
  it('borrar el ordinario se lleva también su extraordinario', async () => {
    const { vivas, queries } = buildDb();
    const borrar = build(queries);

    const resultado = await borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1,
    });

    expect(resultado.borradas.map((c) => c.id).sort()).toEqual([1, 2]);
    expect(vivas().map((c) => c.id)).toEqual([3]);
    expect(resultado.grupo.ciclo).toBe('2022A');
    expect(resultado.grupo.grado).toBe('Primer semestre');
  });

  it('borrar solo el extraordinario deja el ordinario', async () => {
    const { vivas, queries } = buildDb();
    const borrar = build(queries);

    const resultado = await borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 2,
    });

    expect(resultado.borradas.map((c) => c.id)).toEqual([2]);
    expect(vivas().map((c) => c.id)).toEqual([1, 3]);
  });

  it('un ordinario sin extraordinario se borra solo', async () => {
    const { vivas, queries } = buildDb();
    const borrar = build(queries);

    await borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 2, tipo: 1,
    });

    expect(vivas().map((c) => c.id)).toEqual([1, 2]);
  });

  it('rechaza si la calificación no existe', async () => {
    const { queries } = buildDb();
    const borrar = build(queries);

    await expect(borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 2, tipo: 2,
    })).rejects.toThrow('no tiene calificación tipo 2');

    expect(queries.startTransactionQuery).not.toHaveBeenCalled();
  });

  it('rechaza un tipo que no es ordinario ni extraordinario', async () => {
    const { queries } = buildDb();
    const borrar = build(queries);

    await expect(borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 9,
    })).rejects.toThrow('tipo 9 no es válido');
  });

  it('no borra nada si falla a la mitad', async () => {
    const { state, vivas, queries } = buildDb();
    let llamadas = 0;
    queries.updateCalificacionQuery = async ({ id }, cambios) => {
      llamadas += 1;
      if (llamadas === 2) throw new Error('falla BD');
      Object.assign(state.calificaciones.find((row) => row.id === id), cambios);
    };
    const borrar = build(queries);

    await expect(borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1,
    })).rejects.toThrow('falla BD');

    expect(state.transaction.rollback).toHaveBeenCalled();
    expect(vivas().map((c) => c.id)).toEqual([1, 2, 3]);
  });
});

describe('borrado con recursas: el caso de n intentos', () => {
  // 2022A: ord 5 / ext 4   (intento 1)
  // 2022B: ord 5 / ext 4   (recursa 1)
  // 2023A: ord 8           (recursa 2)
  const conDosRecursas = () => {
    const state = {
      calificaciones: [
        {
          id: 1, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1, calificacion: '5', fechaExamen: '2022-06-10', deletedAt: null,
        },
        {
          id: 2, alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 2, calificacion: '4', fechaExamen: '2022-06-25', deletedAt: null,
        },
        {
          id: 3, alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 1, calificacion: '5', fechaExamen: '2022-11-10', deletedAt: null,
        },
        {
          id: 4, alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 2, calificacion: '4', fechaExamen: '2022-11-25', deletedAt: null,
        },
        {
          id: 5, alumnoId: 7, grupoId: 30, asignaturaId: 1, tipo: 1, calificacion: '8', fechaExamen: '2023-06-10', deletedAt: null,
        },
      ],
      transaction: null,
    };
    const vivas = () => state.calificaciones.filter((row) => row.deletedAt === null);
    const queries = {
      startTransactionQuery: jest.fn(async () => {
        state.transaction = { commit: jest.fn(async () => {}), rollback: jest.fn(async () => {}) };
        return state.transaction;
      }),
      findOneGrupoQuery: async ({ id }) => (GRUPOS[id] ? instance(GRUPOS[id]) : null),
      findOneAlumnoQuery: async () => ({ id: 7, programaId: 1 }),
      findAllCalificacionesQuery: async (where) => vivas()
        .filter((row) => matches(row, where))
        .map((row) => instance({ ...row, grupo: GRUPOS[row.grupoId] })),
      updateCalificacionQuery: async ({ id }, cambios) => {
        Object.assign(state.calificaciones.find((row) => row.id === id), cambios);
      },
    };
    return { state, vivas, queries };
  };

  it('conserva el ordinario de la recursa 1 y borra todo lo posterior', async () => {
    const { vivas, queries } = conDosRecursas();
    const borrar = build(queries);

    const resultado = await borrar({
      alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 1, alcance: 'posteriores',
    });

    // se va el extraordinario de la recursa 1 (4) y toda la recursa 2 (5)
    expect(resultado.borradas.map((c) => c.id)).toEqual([4, 5]);
    // sobrevive lo anterior y el ancla
    expect(vivas().map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('borrar desde la recursa 1 se lleva también su ordinario', async () => {
    const { vivas, queries } = conDosRecursas();
    const borrar = build(queries);

    await borrar({
      alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 1, alcance: 'desde',
    });

    expect(vivas().map((c) => c.id)).toEqual([1, 2]);
  });

  it('borrar solo un registro no toca las recursas', async () => {
    const { vivas, queries } = conDosRecursas();
    const borrar = build(queries);

    await borrar({
      alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 2, alcance: 'registro',
    });

    expect(vivas().map((c) => c.id)).toEqual([1, 2, 3, 5]);
  });

  it('el primer intento arrastra absolutamente todo lo que vino después', async () => {
    const { vivas, queries } = conDosRecursas();
    const borrar = build(queries);

    await borrar({
      alumnoId: 7, grupoId: 10, asignaturaId: 1, tipo: 1, alcance: 'desde',
    });

    expect(vivas()).toEqual([]);
  });

  it('en el último intento no hay nada posterior que borrar', async () => {
    const { queries } = conDosRecursas();
    const borrar = build(queries);

    await expect(borrar({
      alumnoId: 7, grupoId: 30, asignaturaId: 1, tipo: 1, alcance: 'posteriores',
    })).rejects.toThrow('no hay calificaciones posteriores');
  });

  it('rechaza un alcance inventado', async () => {
    const { queries } = conDosRecursas();
    const borrar = build(queries);

    await expect(borrar({
      alumnoId: 7, grupoId: 20, asignaturaId: 1, tipo: 1, alcance: 'todo',
    })).rejects.toThrow('alcance todo no es válido');
  });
});
