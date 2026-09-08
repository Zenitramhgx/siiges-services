function formatearFecha(fecha) {
  if (!fecha) return 'No disponible';
  return new Date(fecha).toLocaleDateString('es-MX');
}

function escapeCsv(value) {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function GenerarReporteAlumnosInactivosCSV(alumnos) {
  const BOM = '\uFEFF';
  const lines = [];

  const institucion = alumnos?.[0]?.programa?.plantel?.institucion?.nombre || 'No disponible';
  const claveCentroTrabajo = alumnos?.[0]?.programa?.plantel?.claveCentroTrabajo || 'No disponible';
  const acuerdoRvoe = alumnos?.[0]?.programa?.acuerdoRvoe;
  const nombrePrograma = alumnos?.[0]?.programa?.nombre;
  const rvoePrograma = acuerdoRvoe && nombrePrograma
    ? `${acuerdoRvoe} - ${nombrePrograma}`
    : 'No disponible';
  const fechaReporte = new Date().toLocaleDateString('es-MX');

  lines.push('Institución,Clave Centro de Trabajo,RVOE - Nombre del Programa,Fecha de Reporte,Total de Alumnos');
  lines.push([
    escapeCsv(institucion),
    escapeCsv(claveCentroTrabajo),
    escapeCsv(rvoePrograma),
    escapeCsv(fechaReporte),
    escapeCsv(alumnos?.length || 0),
  ].join(','));

  lines.push('');
  lines.push('Nombre,CURP,Fecha de Inicio de Antecedentes,Fecha de Fin de Antecedentes,Fecha de Expedición,Fecha de Creación,Tipo de Validación');

  if (alumnos && alumnos.length > 0) {
    alumnos.forEach((alumno) => {
      const nombre = `${alumno?.persona?.nombre || ''} ${alumno?.persona?.apellidoPaterno || ''} ${alumno?.persona?.apellidoMaterno || ''}`.trim() || 'No disponible';
      lines.push([
        escapeCsv(nombre),
        escapeCsv(alumno?.persona?.curp || 'No disponible'),
        escapeCsv(formatearFecha(alumno?.validacion?.fechaInicioAntecedente)),
        escapeCsv(formatearFecha(alumno?.validacion?.fechaFinAntecedente)),
        escapeCsv(formatearFecha(alumno?.validacion?.fechaExpedicion)),
        escapeCsv(formatearFecha(alumno?.createdAt)),
        escapeCsv(alumno?.validacion?.tipo?.nombre || 'No disponible'),
      ].join(','));
    });
  } else {
    lines.push('No hay alumnos inactivos disponibles,,,,,,');
  }

  return BOM + lines.join('\r\n');
}

module.exports = { GenerarReporteAlumnosInactivosCSV };
