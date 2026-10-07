const TIPO_SOLICITUD = {
  DUPLICADO: 'Duplicado',
  PARCIAL: 'Parcial',
  TOTAL: 'Total',
};

const DESCRIPCION_ANTECEDENTES_ACADEMICOS = {
  [TIPO_SOLICITUD.DUPLICADO]: '<li><strong>Duplicado de Certificado:</strong> Copia del certificado original.</li>',
  [TIPO_SOLICITUD.PARCIAL]: '<li><strong>Certificado Parcial:</strong> Copia del expediente completo del avance académico sellado y firmado. Si la IES está en SIGES, se agrega el <strong>"historial académico"</strong> con estatus de egresado.</li>',
  [TIPO_SOLICITUD.TOTAL]: '<li><strong>Certificado Total:</strong> Copia del expediente completo del avance académico sellado y firmado. Si la IES está en SIGES, se agrega el <strong>"historial académico"</strong> con estatus de egresado.</li>',
};

const generateAntecedentesAcademicos = (dataParsed) => {
  const { tipoSolicitud } = dataParsed;
  let antecedentes;
  switch (tipoSolicitud) {
    case TIPO_SOLICITUD.DUPLICADO:
      antecedentes = [DESCRIPCION_ANTECEDENTES_ACADEMICOS[TIPO_SOLICITUD.DUPLICADO]];
      break;
    case TIPO_SOLICITUD.PARCIAL:
      antecedentes = [DESCRIPCION_ANTECEDENTES_ACADEMICOS[TIPO_SOLICITUD.PARCIAL]];
      break;
    case TIPO_SOLICITUD.TOTAL:
      antecedentes = [DESCRIPCION_ANTECEDENTES_ACADEMICOS[TIPO_SOLICITUD.TOTAL]];
      break;
    default:
      antecedentes = [
        DESCRIPCION_ANTECEDENTES_ACADEMICOS[TIPO_SOLICITUD.TOTAL],
        DESCRIPCION_ANTECEDENTES_ACADEMICOS[TIPO_SOLICITUD.PARCIAL],
      ];
      break;
  }
  const newDataParsed = dataParsed;
  newDataParsed.antecedentesAcademicos = antecedentes.join('');
  return newDataParsed;
};

const generateMapFoliosAlumnos = (dataParsed) => {
  const { foliosAlumnos } = dataParsed;
  const mapFolios = foliosAlumnos.map((folioAlumno) => {
    const { alumno, folioDocumentoAlumno } = folioAlumno;
    return `<tr><td>${alumno?.persona?.nombre} ${alumno?.persona?.apellidoPaterno} ${alumno?.persona?.apellidoMaterno}</td><td>${folioDocumentoAlumno?.folioDocumento}</td></tr>`;
  });
  const newDataParsed = dataParsed;
  newDataParsed.foliosAlumnos = mapFolios.join('');
  return newDataParsed;
};

module.exports = { generateAntecedentesAcademicos, generateMapFoliosAlumnos };
