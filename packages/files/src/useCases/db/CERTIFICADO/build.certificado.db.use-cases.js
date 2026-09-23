const { checkers } = require('@siiges-services/shared');

const formatDateDMY = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
};

const buildFileCertificado = (
  findOneFolioDocumentoAlumnoQuery,
  findAllCalificacionesQuery,
  findAllAsignaturasQuery,
  findOneDocumentoFirmadoQuery,
  updateDocumentoFirmadoQuery,
  GenerarCertificado,
) => async (folioDocAlumnoId, tipoDocumento) => {
  const include = [
    {
      association: 'solicitudFolioAlumno',
      include: [
        {
          association: 'solicitudFolio',
          include: [{ association: 'tipoSolicitudFolio' }],
        },
      ],
    },
    { association: 'libro' },
    { association: 'foja' },
    {
      association: 'alumno',
      include: [
        { association: 'persona' },
        {
          association: 'alumnoGrupos',
          include: [{ association: 'grupo' }],
        },
        {
          association: 'programa',
          include: [
            {
              association: 'plantel',
              include: [
                {
                  association: 'domicilio',
                  include: [
                    { association: 'estado' },
                    { association: 'municipio' },
                  ],
                },
                { association: 'institucion' },
              ],
            },
            { association: 'nivel' },
          ],
        },
      ],
    },
  ];

  const folioDocAlumno = await findOneFolioDocumentoAlumnoQuery(
    { id: folioDocAlumnoId },
    { include, strict: false },
  );

  checkers.throwErrorIfDataIsFalsy(
    folioDocAlumno,
    'folioDocumentoAlumno',
    folioDocAlumnoId,
  );

  let documentoFirmado = null;
  if (folioDocAlumno.folioDocumento) {
    documentoFirmado = await findOneDocumentoFirmadoQuery({
      folioInterno: folioDocAlumno.folioDocumento,
    });
  }

  let fechaExpedicionFinal;

  if (documentoFirmado?.fechaExpedicion) {
    fechaExpedicionFinal = documentoFirmado.fechaExpedicion;
  } else if (documentoFirmado) {
    fechaExpedicionFinal = new Date();
    await updateDocumentoFirmadoQuery(
      { id: documentoFirmado.id },
      { fechaExpedicion: fechaExpedicionFinal },
    );
  } else {
    fechaExpedicionFinal = new Date();
  }

  const includeCalificaciones = [
    { association: 'asignatura' },
    {
      association: 'grupo',
      include: [
        { association: 'cicloEscolar' },
        { association: 'grado' },
      ],
    },
  ];

  const calificaciones = await findAllCalificacionesQuery(
    { alumnoId: folioDocAlumno.alumno.id },
    { include: includeCalificaciones, strict: false },
  );

  const asignaturasPrograma = await findAllAsignaturasQuery({ programaId: folioDocAlumno.alumno.programaId, tipo: 1 }, { include: [{ association: 'grado' }], strict: false });

  const procesarCalificacionCruda = (valor) => {
    if (typeof valor === 'string' && valor.includes('(')) {
      return valor.substring(0, 2).trim();
    }
    return valor;
  };

  // Agrupa TODAS las calificaciones del alumno por asignaturaId (puede haber
  // varias: ordinario reprobado, extraordinario, recursada en otro ciclo).
  // Se usa para PINTAR la tabla: cada intento es su propia fila.
  const calificacionesTodasPorAsignaturaId = {};
  calificaciones.forEach((c) => {
    if (!calificacionesTodasPorAsignaturaId[c.asignaturaId]) {
      calificacionesTodasPorAsignaturaId[c.asignaturaId] = [];
    }
    calificacionesTodasPorAsignaturaId[c.asignaturaId].push(c);
  });

  // Calificación VIGENTE por asignatura (se usa solo para el promedio):
  // 1. Si existe algún intento aprobado (numérico >= calificación
  //    aprobatoria), la vigente es el aprobado MÁS RECIENTE por fechaExamen.
  //    Así una recursada aprobada gana sobre un ordinario reprobado y sobre
  //    un extraordinario no numérico (ej. "RC").
  // 2. Si no hay ninguno aprobado, la vigente es el intento MÁS RECIENTE
  //    (en empate de fecha, el extraordinario va después del ordinario).
  const calificacionAprobatoriaNum = Number(
    folioDocAlumno.alumno.programa?.calificacionAprobatoria,
  ) || 0;

  const fechaEnMs = (valor) => {
    const tiempo = new Date(valor).getTime();
    return Number.isNaN(tiempo) ? 0 : tiempo;
  };

  const tieneValor = (c) => c.calificacion !== null
    && c.calificacion !== undefined
    && String(c.calificacion).trim() !== '';

  const valorNumerico = (c) => Number(procesarCalificacionCruda(c.calificacion));

  // Ciclo escolar como respaldo cuando a algún intento le falta fechaExamen
  const compararCiclos = (a = '', b = '') => {
    const anioCompare = a.substring(0, 4).localeCompare(b.substring(0, 4));
    if (anioCompare !== 0) return anioCompare;
    return a.substring(4).localeCompare(b.substring(4));
  };

  const compararIntentos = (a, b) => {
    const fechaA = fechaEnMs(a.fechaExamen);
    const fechaB = fechaEnMs(b.fechaExamen);
    if (fechaA > 0 && fechaB > 0 && fechaA !== fechaB) return fechaA - fechaB;

    const cicloCompare = compararCiclos(
      a.grupo?.cicloEscolar?.nombre,
      b.grupo?.cicloEscolar?.nombre,
    );
    if (cicloCompare !== 0) return cicloCompare;

    if (fechaA !== fechaB) return fechaA - fechaB;

    const tipoA = a.tipo === 2 || a.tipo === '2' ? 2 : 1;
    const tipoB = b.tipo === 2 || b.tipo === '2' ? 2 : 1;
    if (tipoA !== tipoB) return tipoA - tipoB;

    return (a.id || 0) - (b.id || 0);
  };

  // Las filas de cada asignatura salen en orden cronológico:
  // ordinario antes que extraordinario dentro del mismo intento.
  Object.values(calificacionesTodasPorAsignaturaId).forEach((lista) => {
    lista.sort(compararIntentos);
  });

  const calificacionVigentePorAsignaturaId = {};
  Object.entries(calificacionesTodasPorAsignaturaId).forEach(([asignaturaId, lista]) => {
    const intentos = lista.filter(tieneValor).sort(compararIntentos);
    if (intentos.length === 0) return;

    const aprobados = intentos.filter((c) => {
      const n = valorNumerico(c);
      return !Number.isNaN(n) && n >= calificacionAprobatoriaNum;
    });

    calificacionVigentePorAsignaturaId[asignaturaId] = aprobados.length > 0
      ? aprobados[aprobados.length - 1]
      : intentos[intentos.length - 1];
  });

  const calificacionesPorGrado = {};

  asignaturasPrograma.forEach((asignatura) => {
    const gradoId = asignatura.grado?.id || asignatura.gradoId || 'SIN_GRADO';
    const gradoNombre = asignatura.grado?.nombre || 'SIN GRADO';
    const gradoNumero = asignatura.grado?.numeroGrado || 0;

    if (!calificacionesPorGrado[gradoId]) {
      calificacionesPorGrado[gradoId] = {
        gradoId,
        gradoNombre,
        gradoNumero,
        asignaturas: [],
      };
    }

    const calificacionesDeEstaAsignatura = calificacionesTodasPorAsignaturaId[asignatura.id] || [];

    if (calificacionesDeEstaAsignatura.length === 0) {
      calificacionesPorGrado[gradoId].asignaturas.push({
        asignaturaId: asignatura.id,
        nombre: asignatura.nombre || '',
        clave: asignatura.clave || '',
        consecutivo: asignatura.consecutivo || 0,
        periodo: 'SIN CICLO',
        calificacion: null,
        tipo: undefined,
        sinCalificacion: true,
      });
    } else {
      calificacionesDeEstaAsignatura.forEach((c) => {
        calificacionesPorGrado[gradoId].asignaturas.push({
          asignaturaId: asignatura.id,
          nombre: asignatura.nombre || '',
          clave: asignatura.clave || '',
          consecutivo: asignatura.consecutivo || 0,
          periodo: c.grupo?.cicloEscolar?.nombre || 'SIN CICLO',
          calificacion: procesarCalificacionCruda(c.calificacion),
          tipo: c.tipo,
          sinCalificacion: false,
        });
      });
    }
  });

  // Asignaturas OPTATIVAS (tipo=2 en el catálogo): bloque aparte
  // "OPTATIVAS ASIGNADAS" al final, con TODOS sus datos reales. Se pinta
  // cada intento como su propia fila (igual que las obligatorias).
  const asignaturasOptativas = [];
  const asignaturaIdsOptativas = new Set();

  calificaciones.forEach((c) => {
    const tipoCatalogo = c.asignatura?.tipo;
    const esOptativaDeCatalogo = tipoCatalogo === 2 || tipoCatalogo === '2';
    if (!esOptativaDeCatalogo) return;

    asignaturaIdsOptativas.add(c.asignaturaId);

    asignaturasOptativas.push({
      asignaturaId: c.asignaturaId,
      nombre: c.asignatura?.nombre || '',
      clave: c.asignatura?.clave || '',
      consecutivo: c.asignatura?.consecutivo || 0,
      periodo: c.grupo?.cicloEscolar?.nombre || 'SIN CICLO',
      calificacion: procesarCalificacionCruda(c.calificacion),
      tipo: c.tipo,
      sinCalificacion: false,
    });
  });

  if (asignaturasOptativas.length > 0) {
    calificacionesPorGrado.OPTATIVA = {
      gradoId: 'OPTATIVA',
      gradoNombre: 'OPTATIVAS ASIGNADAS',
      gradoNumero: Object.values(calificacionesPorGrado).length > 0
        ? Math.max(...Object.values(calificacionesPorGrado).map((g) => g.gradoNumero)) + 1
        : 1,
      asignaturas: asignaturasOptativas,
    };
  }

  Object.values(calificacionesPorGrado).forEach((grado) => {
    grado.asignaturas.sort((a, b) => {
      const nombreCompare = (a.nombre || '').localeCompare(b.nombre || '');
      if (nombreCompare !== 0) return nombreCompare;

      const cicloCompare = compararCiclos(a.periodo, b.periodo);
      if (cicloCompare !== 0) return cicloCompare;

      const tipoA = a.tipo === 2 || a.tipo === '2' ? 2 : 1;
      const tipoB = b.tipo === 2 || b.tipo === '2' ? 2 : 1;
      return tipoA - tipoB;
    });
  });

  const gradosOrdenados = Object.values(calificacionesPorGrado)
    .sort((a, b) => a.gradoNumero - b.gradoNumero);

  const obtenerCalificacionesNumericasVigentes = (asignaturaIds) => asignaturaIds
    .map((asignaturaId) => {
      const vigente = calificacionVigentePorAsignaturaId[asignaturaId];
      if (!vigente) return null;

      const calProcesada = procesarCalificacionCruda(vigente.calificacion);
      const cal = typeof calProcesada === 'string' && calProcesada.includes('(')
        ? null
        : Number(calProcesada);
      return cal;
    })
    .filter((n) => n !== null && !Number.isNaN(n) && n > 0);

  // Promedio sobre OBLIGATORIAS + OPTATIVAS, una sola vez por asignatura
  // (asignaturaIdsOptativas es un Set para no contar dos veces una optativa
  // que tenga varios intentos).
  const calificacionesNumericasObligatorias = obtenerCalificacionesNumericasVigentes(
    asignaturasPrograma.map((asignatura) => asignatura.id),
  );
  const calificacionesNumericasOptativas = obtenerCalificacionesNumericasVigentes(
    Array.from(asignaturaIdsOptativas),
  );
  const calificacionesNumericasTotales = [
    ...calificacionesNumericasObligatorias,
    ...calificacionesNumericasOptativas,
  ];

  // Formato: sin decimales solo si es nota perfecta (igual a la calificación
  // máxima del programa); en cualquier otro caso se TRUNCA a 2 decimales.
  let promedioGeneral = 'N/A';
  if (calificacionesNumericasTotales.length > 0) {
    const promedioNumerico = calificacionesNumericasTotales.reduce((sum, n) => sum + n, 0)
      / calificacionesNumericasTotales.length;
    const calificacionMaximaNum = Number(folioDocAlumno.alumno.programa?.calificacionMaxima);

    const esNotaPerfecta = !Number.isNaN(calificacionMaximaNum)
      && Math.abs(promedioNumerico - calificacionMaximaNum) < 0.005;

    if (esNotaPerfecta) {
      promedioGeneral = String(calificacionMaximaNum);
    } else {
      const promedioTruncado = Math.trunc(promedioNumerico * 100) / 100;
      promedioGeneral = promedioTruncado.toFixed(2);
    }
  }

  const grupos = folioDocAlumno.alumno.alumnoGrupos?.map((ag) => ag.grupo).filter(Boolean) || [];

  const fechaInicioRaw = grupos
    .map((g) => g.generacionFechaInicio)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0] || null;

  // fechaTerminacion: fechaExamen MÁS RECIENTE entre todas las calificaciones.
  const fechaTerminacionRaw = calificaciones
    .map((c) => c.fechaExamen)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;

  const certificado = {
    folioControl: folioDocAlumno.folioDocumento,
    nombreAlumno: folioDocAlumno.alumno.persona.nombre,
    paternoAlumno: folioDocAlumno.alumno.persona.apellidoPaterno,
    maternoAlumno: folioDocAlumno.alumno.persona.apellidoMaterno,
    curp: folioDocAlumno.alumno.persona.curp,
    matricula: folioDocAlumno.alumno.matricula,
    carrera: folioDocAlumno.alumno.programa.nombre,
    nivelId: folioDocAlumno.alumno.programa.nivelId,
    nombreNivel: folioDocAlumno.alumno.programa.nivel?.descripcion,
    calificacionDecimal: folioDocAlumno.alumno.programa?.calificacionDecimal,
    nombrePlantel: folioDocAlumno.alumno.programa.plantel.institucion.nombre,
    municipio: folioDocAlumno.alumno.programa.plantel.domicilio.municipio.nombre,
    fechaInicio: formatDateDMY(fechaInicioRaw),
    fechaTerminacion: formatDateDMY(fechaTerminacionRaw),
    fechaExamen: formatDateDMY(folioDocAlumno?.solicitudFolioAlumno?.fechaExamenProfesional
      || folioDocAlumno?.solicitudFolioAlumno?.fechaExencionExamenProfesional),
    fechaExpedicion: formatDateDMY(fechaExpedicionFinal),
    cct: folioDocAlumno.alumno.programa.plantel.claveCentroTrabajo,
    rvoe: folioDocAlumno.alumno.programa.acuerdoRvoe,
    fechaRvoe: formatDateDMY(folioDocAlumno.alumno.programa.fechaSurteEfecto),
    totalAsignaturas: asignaturasPrograma.length,
    promedioGeneral,
    director:
      folioDocAlumno.alumno.programa.plantel.director
      || 'DIRECTOR DEL PLANTEL',
    grados: gradosOrdenados,
    tipoCertificado: folioDocAlumno?.solicitudFolioAlumno
      ?.solicitudFolio?.tipoSolicitudFolio?.descripcion,
    libro: folioDocAlumno.libro?.nombre,
    foja: folioDocAlumno.foja?.nombre,
    creditosPrograma: folioDocAlumno.alumno.programa?.creditos,
    calificacionMinima: folioDocAlumno.alumno.programa?.calificacionMinima,
    calificacionMaxima: folioDocAlumno.alumno.programa?.calificacionMaxima,
    calificacionAprobatoria: folioDocAlumno.alumno.programa?.calificacionAprobatoria,
    claveInstitucionDGP: folioDocAlumno?.solicitudFolioAlumno?.solicitudFolio?.claveInstitucionDGP,
    claveCarreraDGP: folioDocAlumno?.solicitudFolioAlumno?.solicitudFolio?.claveCarreraDGP,
    identificadorDocumento: documentoFirmado?.identificadorDocumentoSicyt,
    sitioVerificacion: documentoFirmado
      ? `https://portalvalidacion.jalisco.gob.mx/#/resultado/${documentoFirmado.uriValidacionSicyt}`
      : null,
    nombreFirmanteIes: documentoFirmado?.nombreFirmanteIes,
    cargoFirmanteIes: documentoFirmado?.cargoFirmanteIes,
    secuenciaDocumentoIes: documentoFirmado?.secuenciaDocumentoIes,
    fechaFirmadoIes: formatDateDMY(documentoFirmado?.fechaFirmadoIes),
    firmaElectronicaIes: documentoFirmado?.firmaDigitalIes,
    nombreFirmanteSicyt: documentoFirmado?.nombreFirmanteSicyt,
    cargoFirmanteSicyt: documentoFirmado?.cargoFirmanteSicyt,
    secuenciaDocumentoSicyt: documentoFirmado?.secuenciaDocumentoSicyt,
    fechaFirmadoSicyt: formatDateDMY(documentoFirmado?.fechaFirmadoSicyt),
    firmaElectronicaSicyt: documentoFirmado?.firmaDigitalSicyt,
  };

  const file = await GenerarCertificado(certificado, tipoDocumento);

  return Buffer.from(file);
};

module.exports = { buildFileCertificado };
