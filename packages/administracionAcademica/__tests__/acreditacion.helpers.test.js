const { Op } = require('sequelize');
const {
  createAlumnoSearchQuery,
  normalizePagination,
} = require('../src/use-cases/db/alumnos/alumnos-acreditacion.helpers');
const {
  agruparIntentos,
  resolverVigente,
  clasificarIntentos,
} = require('../src/use-cases/db/alumnos/calificaciones-intentos.helpers');

const cal = (grupoId, ciclo, tipo, calificacion) => ({
  grupoId, tipo, calificacion, grupo: { cicloEscolar: { nombre: ciclo } },
});

describe('createAlumnoSearchQuery', () => {
  const condicionesDe = (query) => query[Op.and].map((palabra) => palabra[Op.or]);

  it('busca por matrícula y por las columnas reales de persona', () => {
    const [condiciones] = condicionesDe(createAlumnoSearchQuery('ponce'));

    expect(condiciones).toEqual([
      { '$Alumno.matricula$': { [Op.like]: '%ponce%' } },
      { '$persona.nombre$': { [Op.like]: '%ponce%' } },
      { '$persona.apellido_paterno$': { [Op.like]: '%ponce%' } },
      { '$persona.apellido_materno$': { [Op.like]: '%ponce%' } },
    ]);
  });

  it('exige que cada palabra aparezca en algún campo, sin importar el orden', () => {
    // "JESUS SAAVEDRA" debe encontrar a JESUS URIEL SAAVEDRA FLORES
    const query = createAlumnoSearchQuery('JESUS SAAVEDRA');
    const palabras = condicionesDe(query);

    expect(palabras).toHaveLength(2);
    expect(palabras[0][1]).toEqual({ '$persona.nombre$': { [Op.like]: '%JESUS%' } });
    expect(palabras[1][2]).toEqual({ '$persona.apellido_paterno$': { [Op.like]: '%SAAVEDRA%' } });
  });

  it('ignora los espacios de más', () => {
    expect(condicionesDe(createAlumnoSearchQuery('  LUIS   PONCE  '))).toHaveLength(2);
  });

  it('sin búsqueda no agrega condición', () => {
    expect(createAlumnoSearchQuery('')).toBeUndefined();
    expect(createAlumnoSearchQuery('   ')).toBeUndefined();
  });
});

describe('normalizePagination', () => {
  it('limita a 100 y ordena por matrícula por defecto', () => {
    expect(normalizePagination({ page: 2, limit: 500 })).toEqual({
      page: 2, limit: 100, offset: 200, sortBy: 'matricula', sortOrder: 'asc',
    });
  });
});

describe('intentos de calificación (recursamientos)', () => {
  const aprobatoria = 6;

  it('toma el intento aprobado aunque haya un extraordinario viejo reprobado', () => {
    const intentos = agruparIntentos([
      cal(30, '2023A', 1, '9'), cal(10, '2022A', 1, '5'), cal(10, '2022A', 2, '4'),
    ]);
    expect(resolverVigente(intentos, aprobatoria).calificacion).toBe('9');
  });

  it('toma el extraordinario aprobado del mismo intento', () => {
    const intentos = agruparIntentos([cal(10, '2022A', 1, '5'), cal(10, '2022A', 2, '8')]);
    expect(resolverVigente(intentos, aprobatoria).calificacion).toBe('8');
  });

  it('sin aprobados toma el último intento', () => {
    const intentos = agruparIntentos([
      cal(10, '2022A', 1, '5'), cal(10, '2022A', 2, '4'), cal(30, '2023A', 1, '5'),
    ]);
    expect(resolverVigente(intentos, aprobatoria).calificacion).toBe('5');
    expect(intentos[intentos.length - 1].ciclo).toBe('2023A');
  });

  it('un intento posterior no cuenta como anterior', () => {
    const intentos = agruparIntentos([cal(10, '2022A', 1, '5'), cal(30, '2023A', 1, null)]);
    const grupo2022 = { id: 10, cicloEscolar: { nombre: '2022A' } };
    const { intentoActual, intentosAnteriores, otrosIntentos } = clasificarIntentos(
      intentos,
      grupo2022,
    );

    expect(intentoActual.grupoId).toBe(10);
    expect(intentosAnteriores).toHaveLength(0);
    expect(otrosIntentos).toHaveLength(1);
  });
});
