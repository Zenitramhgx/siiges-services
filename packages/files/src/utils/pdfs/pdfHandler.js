const fs = require('fs');
const path = require('path');

const NutmegFont = fs.readFileSync(path.resolve(__dirname, '../../../../../fonts/nutmeg-regular.ttf')).toString('base64');
const NutmegFontBold = fs.readFileSync(path.resolve(__dirname, '../../../../../fonts/nutmeg-bold.ttf')).toString('base64');

const { turnos } = require('./constants');
const { HEADER_MAIN_TITTLE } = require('./constants/fd02-constants');

const textFont = 'Nutmeg';

function addNutmeg(doc) {
  doc.addFileToVFS('nutmeg-bold.ttf', NutmegFontBold);
  doc.addFont('nutmeg-bold.ttf', 'Nutmeg', 'bold');
  doc.addFileToVFS('nutmeg-regular.ttf', NutmegFont);
  doc.addFont('nutmeg-regular.ttf', 'Nutmeg', 'normal');
  doc.setFont('Nutmeg', 'normal');
}

function crearCelda(doc, x, y, width, height, texto, fontSize = 8) {
  doc.rect(x, y, width, height, 'F');
  doc.rect(x, y, width, height, 'S');

  doc.setFont(textFont, 'bold');
  doc.setFontSize(fontSize);
  let setFillColor = [0, 0, 0];

  const textoWidth = (doc.getStringUnitWidth(texto) * doc.internal.getFontSize())
    / doc.internal.scaleFactor;
  let textoX = x + (width - textoWidth) / 2 + 10;

  if (texto.includes('FDA') || texto.includes('FDP')) {
    setFillColor = [255, 255, 255];
    textoX = x + width - (doc.getStringUnitWidth(texto) * doc.internal.getFontSize()) / doc.internal.scaleFactor - 2; // Right aligned position with no margin
  }

  doc.setTextColor(setFillColor[0], setFillColor[1], setFillColor[2]);
  doc.text(texto, textoX, y + 5);
}

function crearSeccion(currentPosition, doc, contenido, alineacion = 'justify') {
  const margenIzquierdo = 20;
  let currentPositionY = currentPosition;

  // Contenido de la sección
  doc.setFont(textFont); // Set the font family (assuming textFont is defined)
  doc.setFontSize(10); // Set the font size
  doc.setTextColor(0, 0, 0); // Set text color

  const textHeight = doc.getTextDimensions(contenido, { maxWidth: 175 }).h;

  if (currentPositionY + textHeight > doc.internal.pageSize.height - 20) {
    doc.addPage();
    currentPositionY = 20; // Reiniciar la posición vertical en la nueva página
  }

  // Calcular la posición X según la alineación
  const textX = alineacion === 'right'
    ? doc.internal.pageSize.width - margenIzquierdo
    : margenIzquierdo;

  if (alineacion === 'center') {
    const textoWidth = (doc.getStringUnitWidth(contenido) * doc.internal.getFontSize())
      / doc.internal.scaleFactor;
    const textoX = (doc.internal.pageSize.getWidth() - textoWidth) / 2;
    doc.text(contenido, textoX, currentPositionY, { maxWidth: 175 });
  } else {
    // Set font style to normal (not bold)
    doc.text(textX, currentPositionY, contenido, {
      maxWidth: 175,
      align: alineacion,
    });
  }
  doc.setFont('normal');
  // currentPositionY += textHeight + 5; // Espacio después de cada sección
  return currentPositionY;
}

function generarSeccionyTabla({
  titulo,
  tablaData,
  tableOptions = {},
  doc,
  currentPosition,
}) {
  const pageHeight = doc.internal.pageSize.height;
  const margin = 5;
  const availableSpace = pageHeight - margin;
  const textHeight = doc.getTextDimensions(titulo, {
    align: 'justify',
    maxWidth: 175,
  }).h;

  let currentPositionY = currentPosition;
  if (currentPositionY + textHeight + 20 > availableSpace) {
    doc.addPage();
    currentPositionY = margin;
  }

  // SOLO CAMBIA ESTA PARTE (color naranja)
  doc.setFillColor(255, 131, 0); // Color naranja directo
  crearCelda(
    doc,
    14,
    currentPositionY,
    182,
    7,
    titulo,
  );

  const startY = currentPositionY + (tableOptions.spaceBeforeTable || 5);

  doc.autoTable({
    startY,
    head: [tablaData.headers],
    body: tablaData.body,
    theme: 'grid',
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [255, 131, 0], // Naranja también para encabezados de tabla
      fontSize: 12,
      textColor: [20, 20, 20],
    },
    ...tableOptions,
  });

  return doc.previousAutoTable.finalY + 20;
}

function generateTable({
  headers,
  tableData,
  startY,
  headStyles,
  showHead,
  doc,
}) {
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY,
    theme: 'grid',
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      font: 'Nutmeg',
    },
    headStyles,
    showHead,
  });
}

function crearFilaFecha({
  currentPositionY: currentPosition, fecha, doc,
}) {
  let currentPositionY = currentPosition;

  const tableData = [
    ['FECHA', fecha],
  ];

  const pageWidth = doc.internal.pageSize.width;
  const rightMargin = 15; // Ajusta este valor para mover más a la derecha
  const tableWidth = 90; // Ajusta este valor para hacer la tabla más estrecha

  const tableOptions = {
    startY: currentPositionY,
    margin: { left: pageWidth - tableWidth - rightMargin, right: rightMargin }, // Posicionar la tabla más a la derecha
    tableWidth, // Ajustar el ancho de la tabla
    theme: 'grid',
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      fontSize: 8, // Ajustar el tamaño de fuente si es necesario
      cellPadding: 1, // Ajustar el padding para reducir la altura de las celdas
    },
    headStyles: {
      fontSize: 12,
    },
    showHead: false,
    columnStyles: {
      0: {
        fillColor: [255, 131, 0],
        cellWidth: tableWidth / 2, // Ajustar el ancho de la columna
      },
      1: {
        fontStyle: 'bold',
        cellWidth: tableWidth / 2, // Ajustar el ancho de la columna
      },
    },
  };

  // Calcular la altura del texto para verificar si es necesario agregar una nueva página
  const textHeight = doc.getTextDimensions(
    tableData.join('\n'),
    tableOptions,
  ).h;

  if (currentPositionY + textHeight > doc.internal.pageSize.height - 20) {
    doc.addPage();
    currentPositionY = 20; // Reiniciar la posición vertical en la nueva página
  }

  // Generar la tabla
  doc.autoTable({
    body: tableData,
    ...tableOptions,
  });

  // Actualizar la posición vertical después de la tabla
  currentPositionY = doc.previousAutoTable.finalY + 10; // Espacio después de la tabla
  return currentPositionY;
}

function seccionIntitucionTabla({
  currentPositionY: currentPosition, solicitud, doc, niveles,
}) {
  let currentPositionY = currentPosition;
  const nombreNivel = niveles
    .find(({ id }) => +id === solicitud?.programa.nivelId).descripcion;
  const dataColumn1 = [
    solicitud.programa.plantel.institucion.nombre,
    `${nombreNivel} en ${solicitud.programa.nombre}`,
    solicitud.programa.duracionPeriodos,
    solicitud.programa.plantel.institucion.razonSocial,
  ];

  const tableData = HEADER_MAIN_TITTLE.map((header, index) => [
    header,
    dataColumn1[index],
  ]);

  const tableOptions = {
    startY: currentPositionY,
    margin: { right: 14, left: 14 },
    theme: 'grid',
    styles: {
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
      font: 'Nutmeg',
    },
    headStyles: {
      fontSize: 15,
    },
    showHead: false,
    columnStyles: {
      0: {
        fillColor: [255, 131, 0],
      },
      1: {
        fontStyle: 'bold',
      },
    },
  };

  const textHeight = doc.getTextDimensions(
    tableData.join('\n'),
    tableOptions,
  ).h;

  if (currentPositionY + textHeight > doc.internal.pageSize.height - 20) {
    doc.addPage();
    currentPositionY = 20; // Reiniciar la posición vertical en la nueva página
  }

  doc.autoTable({
    body: tableData,
    ...tableOptions,
  });

  currentPositionY = doc.previousAutoTable.finalY + 10; // Espacio después de la tabla
  return currentPositionY;
}

function formatearFecha(fechaCreacion) {
  const meses = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  ];

  const fecha = new Date(fechaCreacion);
  const dia = fecha.getDate();
  const mes = meses[fecha.getMonth()];
  const año = fecha.getFullYear();

  return `${dia} DE ${mes} DE ${año}`;
}

function buscarDescripcionPorId(array, id) {
  return array.find(({ id: itemId }) => +itemId === id).descripcion;
}

function generarTiposDeTurno(programaTurnos) {
  return programaTurnos.map((turno) => turnos.find(({ id }) => +id === turno.turnoId).nombre).join(', ');
}
function agregarTextoJustificado(doc, texto, x, y, width, fontSize) {
  const maxY = 260;
  const words = texto.split(/\s+/);
  const spaceWidth = doc.getTextWidth(' ');
  const lineHeight = fontSize * 0.5;
  let currentLine = '';
  const lines = [];

  doc.setFont('Nutmeg', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(0, 0, 0);

  words.forEach((word) => {
    const testLine = `${currentLine + word} `;
    const testWidth = doc.getTextWidth(testLine);
    if (testWidth > width && currentLine !== '') {
      lines.push(currentLine.trim());
      currentLine = `${word} `;
    } else {
      currentLine = testLine;
    }
  });

  lines.push(currentLine.trim());

  lines.forEach((line, index) => {
    if (y + lineHeight > maxY) {
      doc.addPage();
      y = 55;

      doc.setFont('Nutmeg', 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
    }

    const wordsInLine = line.split(' ');
    let gapSize = spaceWidth;

    if (index !== lines.length - 1 && wordsInLine.length > 1) {
      const lineWidth = doc.getTextWidth(line);
      const extraSpace = (width - lineWidth) / (wordsInLine.length - 1);
      gapSize += extraSpace;
    }

    let positionX = x;
    wordsInLine.forEach((word, wordIndex) => {
      doc.text(word, positionX, y);
      positionX += doc.getTextWidth(word) + (wordIndex < wordsInLine.length - 1 ? gapSize : 0);
    });

    y += lineHeight;
  });

  return y;
}

function configurarFuenteYAgregarTexto(doc, fuente, tamaño, color, texto, x, y) {
  doc.setFont(textFont, fuente);
  doc.setFontSize(tamaño);
  doc.setTextColor(...color);
  doc.text(texto, x, y);
}

function generateTableWithStyles(headers, tableData, doc, currentPositionY) {
  generateTable({
    headers,
    tableData,
    startY: currentPositionY,
    headStyles: {
      fillColor: [255, 131, 0],
      fontSize: 12,
      textColor: [20, 20, 20],
      font: 'Nutmeg',
      halign: 'center',
      valign: 'middle',
    },
    doc,
  });
}

function updateCurrentPositionY(doc, offset = 5) {
  return doc.previousAutoTable.finalY + offset;
}

function generarTablaData(headers, body) {
  return {
    headers,
    body,
  };
}

function generateTableAndSection(titulo, tablaData, doc, currentPosition) {
  let currentPositionY = currentPosition;
  currentPositionY += generarSeccionyTabla({
    titulo,
    tablaData,
    tableOptions: {
      spaceBeforeTable: 7,
      ...tablaData,
    },
    doc,
    currentPosition: currentPositionY,
  });
  return currentPositionY;
}

function createSection(currentPosition, doc, text, align) {
  let currentPositionY = currentPosition;
  currentPositionY += crearSeccion(
    currentPositionY,
    doc,
    text,
    align,
  );
  return currentPositionY;
}

function agregarImagenYPaginaPie(doc, img) {
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i += 1) {
    doc.setPage(i);
    doc.setFont(textFont, 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const pageNumberText = `Página ${i} de ${totalPages}`;
    const pageNumberTextWidth = (doc
      .getStringUnitWidth(pageNumberText) * doc.internal.getFontSize())
      / doc.internal.scaleFactor;
    const pageNumberTextX = pageWidth - 20 - pageNumberTextWidth;
    const pageNumberTextY = pageHeight - 10;

    doc.text(pageNumberText, pageNumberTextX, pageNumberTextY);

    const imgBottomLeftX = 65;
    const imgBottomLeftY = pageHeight - 10;
    const imgBottomLeftWidth = 90;
    const imgBottomLeftHeight = 23;

    doc.addImage(
      img,
      'JPEG',
      imgBottomLeftX,
      imgBottomLeftY - imgBottomLeftHeight,
      imgBottomLeftWidth,
      imgBottomLeftHeight,
    );
  }
}

function generarPDF(doc, rutaArchivo) {
  const pdfDataUri = doc.output('arraybuffer');
  fs.writeFileSync(rutaArchivo, new Buffer.from(pdfDataUri));
}

function createCell(doc, x, y, width, initialHeight, text, bold = true, fontSize = 10, alignment = 'center') {
  if (bold) {
    doc.setFont('Nutmeg', 'bold');
  } else {
    doc.setFont('Nutmeg', 'normal');
  }
  doc.setFontSize(fontSize);

  // Split the text into lines that fit within the cell width
  const lineHeight = 3;
  const lines = doc.splitTextToSize(text || '', width - 2); // Leave some padding
  const totalTextHeight = lines.length * lineHeight;

  // Adjust cell height if the text overflows
  const newHeight = Math.max(initialHeight, totalTextHeight + 4); // Add some padding

  // Draw the cell
  doc.rect(x, y, width, newHeight, 'F'); // Draw the background
  doc.rect(x, y, width, newHeight, 'S'); // Draw the border

  // Adjust vertical alignment
  let textoY = y + 5;
  if (totalTextHeight < newHeight) {
    if (alignment === 'center') {
      textoY = y + (newHeight - totalTextHeight) / 2 + lineHeight / 2;
    } else if (alignment === 'bottom') {
      textoY = y + newHeight - totalTextHeight;
    }
  }

  // Set text color
  const setFillColor = [0, 0, 0];
  doc.setTextColor(setFillColor[0], setFillColor[1], setFillColor[2]);

  // Draw each line of text
  lines.forEach((line) => {
    const textoX = alignment === 'center'
      ? x + (width - (doc.getStringUnitWidth(line) * fontSize) / doc.internal.scaleFactor) / 2
      : x + 2;
    doc.text(line, textoX, textoY);
    textoY += lineHeight;
  });

  // Return the new cell height
  return newHeight;
}

function createTable(doc, item, currentPositionY, xInitial = 15) {
  let x = xInitial;
  let maxRowHeight = 0;

  item.contenido.forEach((cell) => {
    const ancho = cell.medida || 111;
    const lineHeight = 3;
    const lines = doc.splitTextToSize(cell.texto || '', ancho - 2);
    const totalTextHeight = lines.length * lineHeight;
    maxRowHeight = Math.max(maxRowHeight, totalTextHeight + 4);
  });

  x = xInitial;

  item.contenido.forEach((cell) => {
    const ancho = cell.medida || 111;
    let colorFondo;

    // Switch para manejar los colores
    switch (cell.color) {
      case 'blanco':
        colorFondo = [255, 255, 255]; // Blanco
        break;
      case 'gris':
        colorFondo = [172, 178, 183]; // Gris
        break;
      case 'naranja':
        colorFondo = [255, 131, 0]; // Naranja
        break;
      default:
        colorFondo = [0, 0, 0]; // Negro (color predeterminado)
    }

    doc.setFillColor(...colorFondo);
    createCell(
      doc,
      x,
      currentPositionY,
      ancho,
      maxRowHeight,
      cell.texto,
      cell.bold,
      cell.tamano,
      cell.acomodoLetra,
    );
    x += ancho;
  });
  return maxRowHeight;
}

function switchTablas(item, doc, titulo, currentPositionY, x) {
  let i = 0;
  let high = 0;
  switch (item.tipo) {
    case 'titulo':
      currentPositionY = generateTableAndSection(
        item.contenido,
        titulo,
        doc,
        currentPositionY,
      );
      currentPositionY = updateCurrentPositionY(doc, 0);
      break;
    case 'fila':
      do {
        high = createTable(doc, item, currentPositionY, x);
        i += 1;
      } while (i < item.repetirVeces);
      break;
    default:
      break;
  }
  return high;
}

function tableDate(doc, currentPositionY, date, sizeText = 30, sizeDateField = 45) {
  const xDateTable = 122;
  const dateTable = [
    {
      tipo: 'fila',
      contenido: [
        { texto: 'Fecha', medida: sizeText, color: 'naranja' },
        { texto: date, medida: sizeDateField, color: 'blanco' },
      ],
      repetirVeces: 1,
    },
  ];
  dateTable.forEach((item) => {
    switchTablas(item, doc, '', currentPositionY, xDateTable);
  });
}

module.exports = {
  tableDate,
  addNutmeg,
  crearCelda,
  crearSeccion,
  generarSeccionyTabla,
  generateTable,
  seccionIntitucionTabla,
  formatearFecha,
  buscarDescripcionPorId,
  generarTiposDeTurno,
  configurarFuenteYAgregarTexto,
  generateTableWithStyles,
  updateCurrentPositionY,
  generateTableAndSection,
  createSection,
  agregarImagenYPaginaPie,
  generarPDF,
  generarTablaData,
  crearFilaFecha,
  agregarTextoJustificado,
  switchTablas,
  createTable,
  createCell,
};
