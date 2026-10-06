const { generateMapObservaciones } = require('./observacionSolicitud.topic');
const {
  generateAntecedentesAcademicos,
  generateMapFoliosAlumnos,
} = require('./folioDocumentosAlumnos.topic');

module.exports = {
  generateMapObservaciones,
  generateAntecedentesAcademicos,
  generateMapFoliosAlumnos,
};
