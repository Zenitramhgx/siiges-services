const templateHelper = require('../helpers');

const ADD_DETAILS_MAPPING = {
  observacionSolicitud: templateHelper.generateMapObservaciones,
  folioDocumentosAlumnos: templateHelper.generateAntecedentesAcademicos,
};

module.exports = {
  addDetailsHtml: (dataParsed, type) => {
    const detailMapping = ADD_DETAILS_MAPPING[type];
    if (detailMapping) {
      return detailMapping(dataParsed);
    }
    return dataParsed;
  },
};
