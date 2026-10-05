const {
  TIPOS_DOCUMENTO_REQUERIDOS,
  buildDocumentosPorAlumno,
  tieneDocumentosCompletos,
} = require('./documentos-requeridos.helpers');

const EGRESADO_SITUACION_ID = 3;
const ASIGNATURA_TIPO_REGULAR = 1;
const SITUACION_VALIDACION_AUTENTICO = 1;
const EGRESO_MASIVO_BATCH_SIZE = 10;

const toDecimal = (valor) => {
  const numero = parseFloat(valor);
  return Number.isNaN(numero) ? 0 : Math.round(numero * 100);
};

const checkAlumnoEgreso = (alumno, programaCache, calificacionesPorAlumno) => {
  if (!alumno.validacion || alumno.validacion.situacionValidacionId
    !== SITUACION_VALIDACION_AUTENTICO) {
    return false;
  }

  const { asignaturasRegulares, calificacionAprobatoria, creditosRequeridos } = programaCache;
  const calificaciones = calificacionesPorAlumno.get(alumno.id) || [];

  const aprobadasPorAsignatura = new Map();
  calificaciones.forEach((c) => {
    const nota = parseFloat(c.calificacion);
    if (!Number.isNaN(nota) && nota >= calificacionAprobatoria) {
      const previa = aprobadasPorAsignatura.get(c.asignaturaId);
      if (!previa || nota > previa.nota) {
        aprobadasPorAsignatura.set(c.asignaturaId, { nota, asignatura: c.asignatura });
      }
    }
  });

  const tieneMateriasFaltantes = asignaturasRegulares.some(
    (a) => !aprobadasPorAsignatura.has(a.id),
  );
  if (tieneMateriasFaltantes) return false;

  let creditosCursados = 0;
  aprobadasPorAsignatura.forEach(({ asignatura }) => {
    creditosCursados += toDecimal(asignatura.creditos);
  });

  return creditosCursados >= creditosRequeridos;
};

const buildProgramaCaches = async (
  programaIds,
  findOneProgramaQuery,
  findAllAsignaturasQuery,
) => {
  const programaCaches = new Map();

  await Promise.all(programaIds.map(async (programaId) => {
    const programa = await findOneProgramaQuery({ id: programaId });
    if (!programa) {
      programaCaches.set(programaId, null);
      return;
    }

    const asignaturasRegulares = await findAllAsignaturasQuery({
      programaId,
      tipo: ASIGNATURA_TIPO_REGULAR,
    });

    programaCaches.set(programaId, {
      asignaturasRegulares,
      calificacionAprobatoria: parseFloat(programa.calificacionAprobatoria),
      creditosRequeridos: toDecimal(programa.creditos),
    });
  }));

  return programaCaches;
};

const buildCalificacionesPorAlumno = async (alumnoIds, findAllCalificacionesQuery) => {
  const calificaciones = await findAllCalificacionesQuery(
    { alumnoId: alumnoIds },
    { include: ['asignatura'] },
  );

  const calificacionesPorAlumno = new Map();
  calificaciones.forEach((c) => {
    if (!calificacionesPorAlumno.has(c.alumnoId)) {
      calificacionesPorAlumno.set(c.alumnoId, []);
    }
    calificacionesPorAlumno.get(c.alumnoId).push(c);
  });

  return calificacionesPorAlumno;
};

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

const procesarLote = async (
  lote,
  programaCaches,
  findAllCalificacionesQuery,
  findAllFilesQuery,
  updateAlumnoQuery,
) => {
  const loteIds = lote.map((alumno) => alumno.id);

  const [calificacionesPorAlumno, archivos] = await Promise.all([
    buildCalificacionesPorAlumno(loteIds, findAllCalificacionesQuery),
    findAllFilesQuery(
      { entidadId: loteIds, tipoDocumentoId: TIPOS_DOCUMENTO_REQUERIDOS },
      { attributes: ['entidadId', 'tipoDocumentoId'] },
    ),
  ]);

  const documentosPorAlumno = buildDocumentosPorAlumno(archivos);

  const loteEgresables = [];
  const loteNoEgresables = [];

  lote.forEach((alumno) => {
    const programaCache = programaCaches.get(alumno.programaId);
    const documentosOk = tieneDocumentosCompletos(alumno.id, documentosPorAlumno);
    const requisitosAcademicosOk = programaCache
      ? checkAlumnoEgreso(alumno, programaCache, calificacionesPorAlumno)
      : false;

    if (documentosOk && requisitosAcademicosOk) {
      loteEgresables.push(alumno.id);
    } else {
      loteNoEgresables.push(alumno.id);
    }
  });

  if (loteEgresables.length > 0) {
    await updateAlumnoQuery({ id: loteEgresables }, { situacionId: EGRESADO_SITUACION_ID });
  }

  return { egresables: loteEgresables, noEgresables: loteNoEgresables };
};

const updateAlumnosEgreso = (
  findAllAlumnosQuery,
  findOneProgramaQuery,
  findAllAsignaturasQuery,
  findAllCalificacionesQuery,
  findAllFilesQuery,
  updateAlumnoQuery,
) => async ({ alumnoIds }) => {
  const alumnosEncontrados = await findAllAlumnosQuery(
    { id: alumnoIds },
    {
      attributes: ['id', 'situacionId', 'programaId'],
      include: [
        { association: 'validacion', attributes: ['situacionValidacionId'] },
      ],
    },
  );

  const idsEncontrados = alumnosEncontrados.map((alumno) => alumno.id);
  const idsNoEncontrados = alumnoIds.filter((id) => !idsEncontrados.includes(id));

  const egresables = [];
  const noEgresables = [...idsNoEncontrados];

  const yaEgresados = alumnosEncontrados.filter(
    (alumno) => alumno.situacionId === EGRESADO_SITUACION_ID,
  );
  yaEgresados.forEach((alumno) => egresables.push(alumno.id));

  const porValidar = alumnosEncontrados.filter(
    (alumno) => alumno.situacionId !== EGRESADO_SITUACION_ID,
  );

  if (porValidar.length > 0) {
    const programaIds = [...new Set(porValidar.map((alumno) => alumno.programaId))];
    const programaCaches = await buildProgramaCaches(
      programaIds,
      findOneProgramaQuery,
      findAllAsignaturasQuery,
    );

    const lotes = chunkArray(porValidar, EGRESO_MASIVO_BATCH_SIZE);

    await lotes.reduce(async (previousPromise, lote) => {
      await previousPromise;

      try {
        const resultado = await procesarLote(
          lote,
          programaCaches,
          findAllCalificacionesQuery,
          findAllFilesQuery,
          updateAlumnoQuery,
        );
        egresables.push(...resultado.egresables);
        noEgresables.push(...resultado.noEgresables);
      } catch (error) {
        const loteIds = lote.map((alumno) => alumno.id);
        noEgresables.push(...loteIds);
      }
    }, Promise.resolve());
  }

  return {
    egresados: egresables,
    noEgresados: noEgresables,
    totalEgresados: egresables.length,
    totalNoEgresados: noEgresables.length,
  };
};

module.exports = updateAlumnosEgreso;
