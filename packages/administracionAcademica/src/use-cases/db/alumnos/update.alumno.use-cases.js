const boom = require('@hapi/boom');
const { checkers } = require('@siiges-services/shared');
const { checkDocumentosAlumno } = require('./documentos-requeridos.helpers');

const EGRESADO_SITUACION_ID = 3;
const SITUACION_ACTIVO_ID = 1;
const ASIGNATURA_TIPO_REGULAR = 1;
const SITUACION_VALIDACION_AUTENTICO = 1;

// Los créditos tienen máximo 2 decimales; se manejan como enteros (centésimas)
// para evitar errores de punto flotante (ej. 81.03999999999999).
const toDecimal = (valor) => {
  const numero = parseFloat(valor);
  return Number.isNaN(numero) ? 0 : Math.round(numero * 100);
};

const validateActivacionRequirements = async (alumno, findAllFilesQuery) => {
  if (!alumno.validacion || alumno.validacion.situacionValidacionId
    !== SITUACION_VALIDACION_AUTENTICO) {
    throw boom.badRequest(
      'Este alumno no se puede activar: Su validación no está en estatus Auténtico.',
    );
  }

  const documentosOk = await checkDocumentosAlumno(alumno.id, findAllFilesQuery);
  if (!documentosOk) {
    throw boom.badRequest(
      'Este alumno no se puede activar: Le faltan documentos requeridos (certificado, acta de nacimiento, CURP o archivo de validación).',
    );
  }
};

const validateEgresoRequirements = async (
  alumno,
  findOneProgramaQuery,
  findAllAsignaturasQuery,
  findAllCalificacionesQuery,
  findAllFilesQuery,
) => {
  if (!alumno.validacion || alumno.validacion.situacionValidacionId
    !== SITUACION_VALIDACION_AUTENTICO) {
    throw boom.badRequest(
      'Este alumno no se puede validar como Egresado: Su validación no está en estatus Auténtico.',
    );
  }

  const documentosOk = await checkDocumentosAlumno(alumno.id, findAllFilesQuery);
  if (!documentosOk) {
    throw boom.badRequest(
      'Este alumno no se puede validar como Egresado: Le faltan documentos requeridos (certificado, acta de nacimiento, CURP o archivo de validación).',
    );
  }

  const programa = await findOneProgramaQuery({ id: alumno.programaId });
  checkers.throwErrorIfDataIsFalsy(programa, 'programas', alumno.programaId);

  const asignaturasRegulares = await findAllAsignaturasQuery({
    programaId: programa.id,
    tipo: ASIGNATURA_TIPO_REGULAR,
  });

  const calificaciones = await findAllCalificacionesQuery(
    { alumnoId: alumno.id },
    { include: ['asignatura'] },
  );

  const aprobatoria = parseFloat(programa.calificacionAprobatoria);

  const aprobadasPorAsignatura = new Map();
  calificaciones.forEach((c) => {
    const nota = parseFloat(c.calificacion);
    if (!Number.isNaN(nota) && nota >= aprobatoria) {
      const previa = aprobadasPorAsignatura.get(c.asignaturaId);
      if (!previa || nota > previa.nota) {
        aprobadasPorAsignatura.set(c.asignaturaId, { nota, asignatura: c.asignatura });
      }
    }
  });

  const tieneMateriasFaltantes = asignaturasRegulares.some(
    (a) => !aprobadasPorAsignatura.has(a.id),
  );

  if (tieneMateriasFaltantes) {
    throw boom.badRequest(
      'Este alumno no se puede validar como Egresado: Le faltan asignaturas obligatorias por aprobar.',
    );
  }

  const creditosRequeridos = toDecimal(programa.creditos);
  let creditosCursados = 0;
  aprobadasPorAsignatura.forEach(({ asignatura }) => {
    creditosCursados += toDecimal(asignatura.creditos);
  });

  if (creditosCursados < creditosRequeridos) {
    throw boom.badRequest(
      `Este alumno no se puede validar como Egresado: Los créditos cursados (${creditosCursados / 100}) son menores a los créditos requeridos por el RVOE (${creditosRequeridos / 100}).`,
    );
  }
};

const updateAlumno = (
  findOneAlumnoQuery,
  findOneAlumnoTipoTramiteQuery,
  createAlumnoTipoTramiteQuery,
  updateAlumnoQuery,
  updateAlumnoTipoTramiteQuery,
  updatePersonaQuery,
  findOneProgramaQuery,
  findAllAsignaturasQuery,
  findAllCalificacionesQuery,
  findAllFilesQuery,
) => async (identifierObj, changes) => {
  const { id } = identifierObj;
  const requiereValidacionEgreso = changes.situacionId === EGRESADO_SITUACION_ID;
  const requiereValidacionActivacion = changes.situacionId === SITUACION_ACTIVO_ID;

  const alumno = await findOneAlumnoQuery(
    identifierObj,
    (requiereValidacionEgreso || requiereValidacionActivacion)
      ? { include: ['validacion'] }
      : undefined,
  );
  checkers.throwErrorIfDataIsFalsy(alumno, 'alumnos', id);

  if (requiereValidacionEgreso && alumno.situacionId !== EGRESADO_SITUACION_ID) {
    await validateEgresoRequirements(
      alumno,
      findOneProgramaQuery,
      findAllAsignaturasQuery,
      findAllCalificacionesQuery,
      findAllFilesQuery,
    );
  }

  if (requiereValidacionActivacion && alumno.situacionId !== SITUACION_ACTIVO_ID) {
    await validateActivacionRequirements(alumno, findAllFilesQuery);
  }

  let personaUpdated;
  const alumnoUpdated = await updateAlumnoQuery(identifierObj, changes);

  if (changes.persona) {
    const { persona } = changes;
    personaUpdated = await updatePersonaQuery({ id: alumno.personaId }, persona);
    alumnoUpdated.dataValues.persona = personaUpdated.dataValues;
  }

  if (changes.alumnoTipoTramite) {
    const existingAlumnoTipoTramite = await findOneAlumnoTipoTramiteQuery({ alumnoId: alumno.id });

    if (existingAlumnoTipoTramite) {
      const updatedAlumnoTipoTramite = await updateAlumnoTipoTramiteQuery(
        existingAlumnoTipoTramite.id,
        { tipoTramiteId: changes.alumnoTipoTramite },
      );
      alumnoUpdated.dataValues.alumnoTipoTramite = updatedAlumnoTipoTramite.dataValues;
    } else {
      const newAlumnoTipoTramite = await createAlumnoTipoTramiteQuery({
        alumnoId: alumno.id,
        tipoTramiteId: changes.alumnoTipoTramite,
      });
      alumnoUpdated.dataValues.alumnoTipoTramite = newAlumnoTipoTramite.dataValues;
    }
  }

  return alumnoUpdated;
};

module.exports = updateAlumno;
