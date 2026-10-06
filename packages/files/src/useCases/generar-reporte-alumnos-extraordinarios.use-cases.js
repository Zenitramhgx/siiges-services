const { Logger } = require('@siiges-services/shared');

const CALIFICACIONES_SIN_EXTRAORDINARIO = ['RC', 'NS', 'NC', 'NP', 'SD'];

const tieneExtraordinario = ({ calificacion }) => {
  const valor = String(calificacion ?? '').trim().toUpperCase();
  return !CALIFICACIONES_SIN_EXTRAORDINARIO.includes(valor);
};

const generarReporteAlumnosExtraordinarios = (
  GenerarReporteAlumnosExtraordinarios,
) => async (calificaciones) => {
  Logger.info(
    '[files.generarReporteAlumnosExtraordinarios.use-case]: '
    + 'Generando reporte de alumnos extraordinarios',
  );

  const calificacionesExtraordinario = (calificaciones || []).filter(tieneExtraordinario);

  const file = await GenerarReporteAlumnosExtraordinarios(calificacionesExtraordinario);
  return Buffer.from(file);
};

module.exports = generarReporteAlumnosExtraordinarios;
