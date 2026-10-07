const tipoDocumentoObj = [
  {
    id: 1,
    name: 'LOGOTIPO',
  },
  {
    id: 2,
    name: 'FIRMA_REPRESENTANTE',
  },
  {
    id: 3,
    name: 'ESTUDIO_PERTINENCIA',
  },
  {
    id: 4,
    name: 'ESTUDIO_OFERTA_DEMANDA',
  },
  {
    id: 5,
    name: 'CONVENIOS',
  },
  {
    id: 6,
    name: 'MAPA_CURRICULAR',
  },
  {
    id: 7,
    name: 'REGLAS_ACADEMICAS',
  },
  {
    id: 8,
    name: 'ASIGNATURAS_DETALLE',
  },
  {
    id: 9,
    name: 'PROPUESTA_HEMEROGRAFICA',
  },
  {
    id: 10,
    name: 'INFORME_RESULTADOS_TRAYECTORIA_EDUCATIVA',
  },
  {
    id: 11,
    name: 'INSTRUMENTOS_TRAYECTORIA_EDUCATIVA',
  },
  {
    id: 12,
    name: 'TRAYECTORIA_EDUCATIVA',
  },
  {
    id: 13,
    name: 'BIOGRAFIA',
  },
  {
    id: 14,
    name: 'BIBLIOGRAFIA',
  },
  {
    id: 15,
    name: 'IDENTIFICACION_REPRESENTANTE',
  },
  {
    id: 16,
    name: 'COMPROBANTE_PAGO_RVOE',
  },
  {
    id: 17,
    name: 'ACREDITACION_INMUEBLE',
  },
  {
    id: 18,
    name: 'FOTOGRAFIA_INMUEBLE',
  },
  {
    id: 19,
    name: 'PLANO',
  },
  {
    id: 20,
    name: 'DICTAMENES',
  },
  {
    id: 21,
    name: 'CONSTANCIA_INFEJAL',
  },
  {
    id: 22,
    name: 'LICENCIA_MUNICIPAL',
  },
  {
    id: 23,
    name: 'SECRETARIA_SALUD',
  },
  {
    id: 24,
    name: 'COMPROBANTE_TELEFONO',
  },
  {
    id: 25,
    name: 'PROPUESTA_CALENDARIO',
  },
  {
    id: 26,
    name: 'PROYECTO_VINCULACION',
  },
  {
    id: 27,
    name: 'PROGRAMA_SUPERACION',
  },
  {
    id: 28,
    name: 'PLAN_MEJORA',
  },
  {
    id: 29,
    name: 'REGLAMENTO_INSTITUCIONAL',
  },
  {
    id: 30,
    name: 'CLAVE_CENTRO_TRABAJO',
  },
  {
    id: 31,
    name: 'FOTOGRAFIA_PERSONA',
  },
  {
    id: 32,
    name: 'PROPUESTA_HORARIO',
  },
  {
    id: 33,
    name: 'FORMA_MIGRATORIA',
  },
  {
    id: 34,
    name: 'ACTA_CONSTITUTIVA',
  },
  {
    id: 35,
    name: 'ACUERDO_ANTERIOR',
  },
  {
    id: 36,
    name: 'DICTAMEN_EVALUACION',
  },
  {
    id: 37,
    name: 'FORMATO_PEDAGOGICO_01',
  },
  {
    id: 38,
    name: 'DICTAMEN_IMPI',
  },
  {
    id: 39,
    name: 'FDA02',
  },
  {
    id: 40,
    name: 'ARCHIVO_VALIDACION_ALUMNO',
  },
  {
    id: 41,
    name: 'ARCHIVO_CERTIFICADO',
  },
  {
    id: 42,
    name: 'ARCHIVO_NACIMIENTO',
  },
  {
    id: 43,
    name: 'ARCHIVO_CURP',
  },
  {
    id: 44,
    name: 'FDA01',
  },
  {
    id: 45,
    name: 'FDA03',
  },
  {
    id: 46,
    name: 'FDA04',
  },
  {
    id: 47,
    name: 'FDA05',
  },
  {
    id: 48,
    name: 'FDA06',
  },
  {
    id: 49,
    name: 'FDP01',
  },
  {
    id: 50,
    name: 'FDP02',
  },
  {
    id: 51,
    name: 'FDP05',
  },
  {
    id: 52,
    name: 'FDP06',
  },
  {
    id: 53,
    name: 'OFICIO_ADMISORIO',
  },
  {
    id: 54,
    name: 'COMPROBANTE_PAGO_FOLIOS',
  },
  {
    id: 55,
    name: 'PROGRAMA_AUTORIZADO',
  },
  {
    id: 56,
    name: 'IDENTIFICACION_OFICIAL',
  },
  {
    id: 57,
    name: 'ANTECEDENTE_ACADEMICO',
  },
  {
    id: 58,
    name: 'PROPUESTA',
  },
  {
    id: 59,
    name: 'COMPROBANTE_PAGO_TRAMITE',
  },
  {
    id: 60,
    name: 'RESOLUCION',
  },
  {
    id: 61,
    name: 'ACUERDO_RVOE',
  },
  {
    id: 62,
    name: 'HISTORIAL_ACADEMICO',
  },
  {
    id: 63,
    name: 'REPORTE_BECAS',
  },
  {
    id: 64,
    name: 'REPORTE_SERV_SOC',
  },
  {
    id: 65,
    name: 'ACTA_COMITE_SERV_SOC',
  },
  {
    id: 66,
    name: 'ACTA_COMITE_BECAS',
  },
  {
    id: 67,
    name: 'TITULO_ELECTRONICO_XML',
  },
  {
    id: 68,
    name: 'TITULO_ELECTRONICO_PDF',
  },
  {
    id: 69,
    name: 'FDP03',
  },
  {
    id: 70,
    name: 'FDP04',
  },
  {
    id: 71,
    name: 'CERTIFICADO_PARCIAL_EQUIVALENCIA',
  },
  {
    id: 72,
    name: 'RESOLUCION_EQUIVALENCIA',
  },
  {
    id: 73,
    name: 'FORMATO_ASIGNACION_FOLIOS_CER',
  },
  {
    id: 74,
    name: 'FORMATO_ASIGNACION_FOLIOS_TIT',
  },
  {
    id: 75,
    name: 'CERTIFICADO_ELECTRONICO_PDF',
  },
  {
    id: 76,
    name: 'COPIA_REVALIDACION',
  },
  {
    id: 77,
    name: 'IDENTIFICACION_OFICIAL_CON_FOTOGRAFIA',
  },
];

module.exports = tipoDocumentoObj;
