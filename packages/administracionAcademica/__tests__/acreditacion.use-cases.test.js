const findAcreditacionAlumno = require('../src/use-cases/db/alumnos/find.acreditacion-alumno.use-cases');
const updateAcreditacionAlumno = require('../src/use-cases/db/alumnos/update.acreditacion-alumno.use-cases');

// Escenario: alumno 7 del programa 1 (aprobatoria 6, escala 0-10, sin decimales)
// Grupo 10 = 2022A primer semestre, grupo 30 = 2023A tercer semestre
const GRUPOS = {
  10: {
    id: 10,
    gradoId: 1,
    descripcion: 'A',
    cicloEscolarId: 100,
    grado: { id: 1, nombre: 'Primer semestre', numeroGrado: 1 },
    cicloEscolar: { programaId: 1, nombre: '2022A' },
  },
  30: {
    id: 30,
    gradoId: 3,
    descripcion: 'B',
    cicloEscolarId: 300,
    grado: { id: 3, nombre: 'Tercer semestre', numeroGrado: 3 },
    cicloEscolar: { programaId: 1, nombre: '2023A' },
    generacionFechaInicio: '2023-01-15T00:00:00Z',
  },
  // Mismo ciclo que el grupo 10 (100) pero de otro grado: caso prohibido
  11: {
    id: 11,
    gradoId: 3,
    descripcion: 'C',
    cicloEscolarId: 100,
    grado: { id: 3, nombre: 'Tercer semestre', numeroGrado: 3 },
    cicloEscolar: { programaId: 1, nombre: '2022A' },
  },
};
const GRADO_1 = { id: 1, nombre: 'Primer semestre', numeroGrado: 1 };
const GRADO_3 = { id: 3, nombre: 'Tercer semestre', numeroGrado: 3 };
const GRADO_5 = { id: 5, nombre: 'Quinto semestre', numeroGrado: 5 };
const GRADO_FLEXIBLE = { id: 24, nombre: 'Flexible Semestral', numeroGrado: 1 };

const ASIGNATURAS = [
  {
    id: 1, clave: 'DER-101', nombre: 'Constitucional', gradoId: 1, grado: GRADO_1,
  },
  {
    id: 2, clave: 'DER-102', nombre: 'Penal', gradoId: 1, grado: GRADO_1,
  },
  {
    id: 3, clave: 'DER-103', nombre: 'Civil', gradoId: 1, grado: GRADO_1,
  },
  {
    id: 5, clave: 'DER-301', nombre: 'Mercantil', gradoId: 3, grado: GRADO_3,
  },
  {
    id: 6, clave: 'DER-302', nombre: 'Laboral', gradoId: 3, grado: GRADO_3,
  },
  {
    id: 8, clave: 'DER-501', nombre: 'Amparo', gradoId: 5, grado: GRADO_5,
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
      {
        id: 4, alumnoId: 7, grupoId: 10, asignaturaId: 3, tipo: 1, calificacion: '7',
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
    findAllAlumnoGrupoQuery: async (where) => state.alumnoGrupos
      .filter((row) => matches(row, where))
      .map((row) => instance({ ...row, grupo: GRUPOS[row.grupoId] })),
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
    queries.findAllAlumnoGrupoQuery,
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
    queries.findAllAlumnoGrupoQuery,
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
    ['otro grado sin intentos previos', [{ asignaturaId: 8, tipo: 1 }], 'ni está pendiente por recursar'],
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

  it('rechaza cursar un segundo grado completo en el mismo ciclo', async () => {
    const { state, queries } = buildDb();
    const { update } = buildUseCases(queries);

    // Ya cursa Primer semestre (grupo 10) en 2022A; el grupo 11 es Tercer
    // semestre del MISMO ciclo y DER-301 es materia nueva, no un recursamiento
    await expect(update({ alumnoId: 7, grupoId: 11 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).rejects.toThrow('solo puede recursar materias pendientes');

    expect(queries.startTransactionQuery).not.toHaveBeenCalled();
    expect(state.calificaciones.some((c) => c.grupoId === 11)).toBe(false);
  });

  it('sí permite recursar una materia pendiente aunque curse otro grado ese ciclo', async () => {
    const { state, queries } = buildDb();
    const { update } = buildUseCases(queries);

    // Constitucional (1) viene reprobada de 2022A: en 2023A se recursa en el
    // grupo 30 mientras el alumno cursa Tercer semestre
    await update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 1, tipo: 1, calificacion: '9', fechaExamen: fecha,
      },
    ]);

    // y ahora, en ese mismo ciclo, un grupo de otro grado solo acepta recursamientos
    state.alumnoGrupos.push({ id: 99, alumnoId: 7, grupoId: 31 });
    GRUPOS[31] = {
      id: 31,
      gradoId: 5,
      descripcion: 'D',
      cicloEscolarId: 300,
      grado: GRADO_5,
      cicloEscolar: { programaId: 1, nombre: '2023A' },
    };

    await expect(update({ alumnoId: 7, grupoId: 31 }, [
      {
        asignaturaId: 8, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).rejects.toThrow('solo puede recursar materias pendientes');

    delete GRUPOS[31];
  });

  it('sí permite capturar en otro grado si es de un ciclo distinto', async () => {
    const { queries } = buildDb();
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).resolves.toBeDefined();
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

describe('currícula rígida y fecha de examen', () => {
  const sinCalificarCivil = (state) => {
    // eslint-disable-next-line no-param-reassign
    state.calificaciones = state.calificaciones.filter((row) => row.asignaturaId !== 3);
  };

  const manana = () => {
    const fechaManana = new Date();
    fechaManana.setDate(fechaManana.getDate() + 1);
    return fechaManana.toISOString().slice(0, 10);
  };

  it('rechaza una fecha de examen posterior a hoy', async () => {
    const { queries } = buildDb();
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: manana(),
      },
    ])).rejects.toThrow('no puede ser posterior a hoy');

    expect(queries.startTransactionQuery).not.toHaveBeenCalled();
  });

  it('acepta la fecha de hoy', async () => {
    const { queries } = buildDb();
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: new Date().toISOString().slice(0, 10),
      },
    ])).resolves.toBeDefined();
  });

  it('rígida: no deja calificar el grado si el anterior tiene materias sin calificar', async () => {
    const { state, queries } = buildDb();
    sinCalificarCivil(state);
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).rejects.toThrow('currícula rígida');

    expect(queries.startTransactionQuery).not.toHaveBeenCalled();
  });

  it('rígida: aun así permite recursar materias del grado anterior', async () => {
    const { state, queries } = buildDb();
    sinCalificarCivil(state);
    const { update } = buildUseCases(queries);

    // Constitucional (1) es de Primer semestre y viene reprobada: se recursa
    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 1, tipo: 1, calificacion: '9', fechaExamen: fecha,
      },
    ])).resolves.toBeDefined();
  });

  it('rígida: con el grado anterior completo sí deja calificar', async () => {
    const { queries } = buildDb();
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 30 }, [
      {
        asignaturaId: 5, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).resolves.toBeDefined();
  });

  it('flexible: no exige el grado anterior', async () => {
    const { state, queries } = buildDb();
    sinCalificarCivil(state);
    GRUPOS[40] = {
      id: 40,
      gradoId: 24,
      descripcion: 'F',
      cicloEscolarId: 400,
      grado: GRADO_FLEXIBLE,
      cicloEscolar: { programaId: 1, nombre: '2024A' },
    };
    const asignaturaFlexible = {
      id: 9, clave: 'DER-F01', nombre: 'Seminario', gradoId: 24, grado: GRADO_FLEXIBLE,
    };
    ASIGNATURAS.push(asignaturaFlexible);
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 40 }, [
      {
        asignaturaId: 9, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).resolves.toBeDefined();

    ASIGNATURAS.pop();
    delete GRUPOS[40];
  });

  it('primer grado: no hay grado anterior que exigir', async () => {
    const { state, queries } = buildDb();
    sinCalificarCivil(state);
    const { update } = buildUseCases(queries);

    await expect(update({ alumnoId: 7, grupoId: 10 }, [
      {
        asignaturaId: 3, tipo: 1, calificacion: '8', fechaExamen: fecha,
      },
    ])).resolves.toBeDefined();
  });

  it('find: avisa del grado anterior y bloquea las filas de ese grado', async () => {
    const { state, queries } = buildDb();
    sinCalificarCivil(state);
    const { find } = buildUseCases(queries);

    const result = await find({ alumnoId: 7, grupoId: 30 });

    expect(result.avisoGradoAnterior).toContain('currícula rígida');
    expect(result.avisoGradoAnterior).toContain('DER-103 Civil');

    const porClave = Object.fromEntries(result.asignaturas.map((a) => [a.clave, a]));
    expect(porClave['DER-301'].bloqueada).toBe(true);
    expect(porClave['DER-101'].bloqueada).toBe(false);
  });

  it('find: sin pendientes del grado anterior no hay aviso ni bloqueo', async () => {
    const { queries } = buildDb();
    const { find } = buildUseCases(queries);

    const result = await find({ alumnoId: 7, grupoId: 30 });

    expect(result.avisoGradoAnterior).toBeNull();
    expect(result.asignaturas.every((a) => a.bloqueada === false)).toBe(true);
  });
});
