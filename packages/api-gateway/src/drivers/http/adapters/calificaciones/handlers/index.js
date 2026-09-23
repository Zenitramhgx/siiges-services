const updateCalificaciones = require('./update.handlers.calificaciones.adapters');
const findCalificacionesAlumno = require('./find-group.handlers.calificaciones-alumno.adapters');
const findAcreditacionAlumno = require('./find.handlers.acreditacion-alumno.adapters');
const updateAcreditacionAlumno = require('./update.handlers.acreditacion-alumno.adapters');

module.exports = {
  updateCalificaciones,
  findCalificacionesAlumno,
  findAcreditacionAlumno,
  updateAcreditacionAlumno,
};
