const {
  clavesAntecedentes,
  cicloEsAnterior,
  revisarSeriacion,
  mensajeSeriacionPendiente,
} = require('../src/use-cases/db/alumnos/seriacion.helpers');

const APROBATORIA = 6;

const ING1 = {
  id: 1, clave: 'ING-101', nombre: 'Inglés I', gradoId: 23, seriacion: null,
};
const ING2 = {
  id: 2, clave: 'ING-102', nombre: 'Inglés II', gradoId: 23, seriacion: 'ING-101',
};
const MAT = {
  id: 3, clave: 'MAT-100', nombre: 'Matemáticas', gradoId: 23, seriacion: '',
};
const TALLER = {
  id: 4, clave: 'TAL-200', nombre: 'Taller', gradoId: 23, seriacion: 'ING-101, MAT-100',
};
const SIN_RESOLVER = {
  id: 5, clave: 'XXX-500', nombre: 'Materia rara', gradoId: 23, seriacion: 'NO-EXISTE-999',
};
const AUTOREFERENTE = {
  id: 6, clave: 'AUT-600', nombre: 'Autorreferente', gradoId: 23, seriacion: 'AUT-600',
};

const ASIGNATURAS = [ING1, ING2, MAT, TALLER, SIN_RESOLVER, AUTOREFERENTE];

const asignaturasPorClave = ASIGNATURAS.reduce(
  (acc, asignatura) => ({ ...acc, [asignatura.clave]: asignatura }),
  {},
);

const GRUPO_FLEXIBLE = {
  id: 10,
  gradoId: 23,
  grado: { nombre: 'Flexible', numeroGrado: 1 },
  cicloEscolar: { nombre: '2024A' },
};

const GRUPO_RIGIDO = {
  id: 11,
  gradoId: 7,
  grado: { nombre: 'Cuarto semestre', numeroGrado: 4 },
  cicloEscolar: { nombre: '2024A' },
};

let secuencia = 0;
const calificacion = (asignaturaId, ciclo, valor, tipo = 1) => {
  secuencia += 1;
  return {
    id: secuencia,
    asignaturaId,
    grupoId: `g-${ciclo}`,
    tipo,
    calificacion: valor,
    fechaExamen: null,
    grupo: { cicloEscolar: { nombre: ciclo } },
  };
};

const faltantesDe = (asignatura, calificacionesPorAsignatura = {}, grupo = GRUPO_FLEXIBLE) => (
  revisarSeriacion({
    asignatura,
    grupo,
    asignaturasPorClave,
    calificacionesPorAsignatura,
    calificacionAprobatoria: APROBATORIA,
  })
);

describe('claves de la antecedente', () => {
  it('lee una clave sencilla sin importar espacios ni minúsculas', () => {
    expect(clavesAntecedentes('  ing-101 ')).toEqual(['ING-101']);
  });

  it('lee varias claves separadas por coma, diagonal o punto y coma', () => {
    expect(clavesAntecedentes('ING-101, MAT-100')).toEqual(['ING-101', 'MAT-100']);
    expect(clavesAntecedentes('ING-101/MAT-100')).toEqual(['ING-101', 'MAT-100']);
    expect(clavesAntecedentes('ING-101;MAT-100')).toEqual(['ING-101', 'MAT-100']);
  });

  it('trata los valores de relleno como si no hubiera seriación', () => {
    ['', '   ', null, undefined, 'NINGUNA', 'ninguno', 'N/A', 'No aplica', '-', '0'].forEach(
      (valor) => expect(clavesAntecedentes(valor)).toEqual([]),
    );
  });
});

describe('qué ciclo cuenta como anterior', () => {
  it('un ciclo con año anterior sí cuenta', () => {
    expect(cicloEsAnterior('2023B', '2024A')).toBe(true);
  });

  it('el mismo ciclo no cuenta', () => {
    expect(cicloEsAnterior('2024A', '2024A')).toBe(false);
  });

  it('un ciclo posterior no cuenta', () => {
    expect(cicloEsAnterior('2024B', '2024A')).toBe(false);
  });

  it('un ciclo sin año (EQUIV) cuenta como anterior, no como posterior', () => {
    expect(cicloEsAnterior('EQUIV', '2024A')).toBe(true);
  });
});

describe('seriación en currícula flexible', () => {
  it('bloquea la siguiente si la antecedente no se ha cursado', () => {
    expect(faltantesDe(ING2)).toEqual(['ING-101 Inglés I']);
  });

  it('deja capturar si la antecedente quedó acreditada en un ciclo anterior', () => {
    expect(faltantesDe(ING2, { 1: [calificacion(1, '2023B', '9')] })).toEqual([]);
  });

  it('bloquea si la antecedente se acreditó en el MISMO ciclo', () => {
    expect(faltantesDe(ING2, { 1: [calificacion(1, '2024A', '9')] })).toHaveLength(1);
  });

  it('bloquea si la antecedente se acreditó en un ciclo posterior', () => {
    expect(faltantesDe(ING2, { 1: [calificacion(1, '2024B', '9')] })).toHaveLength(1);
  });

  it('bloquea si la antecedente está reprobada', () => {
    expect(faltantesDe(ING2, { 1: [calificacion(1, '2023B', '5')] })).toHaveLength(1);
  });

  it('deja capturar si la antecedente se acreditó en extraordinario', () => {
    const historia = { 1: [calificacion(1, '2023B', '5'), calificacion(1, '2023B', '8', 2)] };
    expect(faltantesDe(ING2, historia)).toEqual([]);
  });

  it('un extraordinario con clave informativa no acredita la antecedente', () => {
    const historia = { 1: [calificacion(1, '2023B', '5'), calificacion(1, '2023B', 'NS', 2)] };
    expect(faltantesDe(ING2, historia)).toHaveLength(1);
  });

  it('una equivalencia acredita la antecedente', () => {
    expect(faltantesDe(ING2, { 1: [calificacion(1, 'EQUIV', '8')] })).toEqual([]);
  });

  it('una asignatura sin seriación nunca se bloquea', () => {
    expect(faltantesDe(ING1)).toEqual([]);
    expect(faltantesDe(MAT)).toEqual([]);
  });

  it('con varias antecedentes reporta solo las que faltan', () => {
    expect(faltantesDe(TALLER)).toEqual(['ING-101 Inglés I', 'MAT-100 Matemáticas']);
    expect(faltantesDe(TALLER, { 1: [calificacion(1, '2023B', '9')] })).toEqual(['MAT-100 Matemáticas']);
  });

  it('deja capturar cuando todas las antecedentes están acreditadas antes', () => {
    const historia = {
      1: [calificacion(1, '2023B', '9')],
      3: [calificacion(3, '2023A', '7')],
    };
    expect(faltantesDe(TALLER, historia)).toEqual([]);
  });

  it('no bloquea por una clave que no existe en el programa', () => {
    expect(faltantesDe(SIN_RESOLVER)).toEqual([]);
  });

  it('no bloquea si la seriación se apunta a sí misma', () => {
    expect(faltantesDe(AUTOREFERENTE)).toEqual([]);
  });
});

describe('seriación en currícula rígida', () => {
  it('no se revisa: ahí manda la regla del grado anterior', () => {
    expect(faltantesDe(ING2, {}, GRUPO_RIGIDO)).toEqual([]);
  });
});

describe('mensaje', () => {
  it('nombra las antecedentes que faltan', () => {
    const mensaje = mensajeSeriacionPendiente(['ING-101 Inglés I']);
    expect(mensaje).toContain('ING-101 Inglés I');
    expect(mensaje).toContain('ciclo anterior');
  });

  it('resume cuando son muchas', () => {
    const muchas = ['A 1', 'B 2', 'C 3', 'D 4', 'E 5', 'F 6', 'G 7'];
    expect(mensajeSeriacionPendiente(muchas)).toContain('y 2 más');
  });
});
