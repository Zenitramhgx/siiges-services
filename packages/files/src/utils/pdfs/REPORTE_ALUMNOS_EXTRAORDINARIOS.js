const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const imgHeader = fs.readFileSync(
  path.join(__dirname, '/images/img4.png'),
  { encoding: 'base64' },
);

function GenerarReporteAlumnosExtraordinarios(calificaciones) {
  const JsPDF = jsPDF;
  const doc = new JsPDF({ orientation: 'landscape' });
  let currentPositionY = 20;

  doc.addImage(imgHeader, 'JPEG', 60, 9, 100, 23);
  currentPositionY += 30;

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SECRETARÍA DE INNOVACIÓN, CIENCIA Y TECNOLOGÍA', 148, currentPositionY, { align: 'center' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('SUBSECRETARÍA DE EDUCACIÓN SUPERIOR', 148, currentPositionY + 5, { align: 'center' });
  doc.text('REPORTE DE ALUMNOS EN EXTRAORDINARIO', 148, currentPositionY + 10, { align: 'center' });
  currentPositionY += 20;

  const institucion = calificaciones?.[0]?.alumno?.programa?.plantel?.institucion?.nombre || 'No disponible';
  const claveCentroTrabajo = calificaciones?.[0]?.alumno?.programa?.plantel?.claveCentroTrabajo || 'No disponible';
  const acuerdoRvoe = calificaciones?.[0]?.alumno?.programa?.acuerdoRvoe;
  const nombrePrograma = calificaciones?.[0]?.alumno?.programa?.nombre;
  const rvoePrograma = acuerdoRvoe && nombrePrograma
    ? `${acuerdoRvoe} - ${nombrePrograma}`
    : 'No disponible';
  const fechaReporte = new Date().toLocaleDateString('es-MX');

  doc.autoTable({
    startY: currentPositionY,
    head: [[
      'Institución',
      'Clave Centro de Trabajo',
      'RVOE - Nombre del Programa',
      'Fecha de Reporte',
      'Total de Calificaciones',
    ]],
    body: [
      [institucion, claveCentroTrabajo, rvoePrograma, fechaReporte,
        calificaciones?.length || 0],
    ],
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [172, 178, 183], textColor: [0, 0, 0] },
  });
  currentPositionY = doc.previousAutoTable.finalY + 10;

  const calificacionesData = calificaciones?.length
    ? calificaciones.map((cal) => [
      cal?.alumno?.matricula || 'No disponible',
      cal?.alumno?.persona?.apellidoPaterno || 'No disponible',
      cal?.alumno?.persona?.apellidoMaterno || 'No disponible',
      cal?.alumno?.persona?.nombre || 'No disponible',
      cal?.asignatura?.grado?.nombre || 'No disponible',
      cal?.asignatura?.clave || 'No disponible',
    ])
    : [['No hay calificaciones extraordinarias disponibles']];

  doc.autoTable({
    startY: currentPositionY,
    head: [[
      'Matrícula',
      'Primer Apellido',
      'Segundo Apellido',
      'Nombre',
      'Grado',
      'Clave Asignatura',
    ]],
    body: calificacionesData,
    theme: 'grid',
    styles: { fontSize: 9 },
    headStyles: { fillColor: [172, 178, 183], textColor: [0, 0, 0] },
  });

  return doc.output('arraybuffer');
}

module.exports = { GenerarReporteAlumnosExtraordinarios };
