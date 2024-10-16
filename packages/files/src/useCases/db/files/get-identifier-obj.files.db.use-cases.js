// External dependencies
const { checkers, Logger } = require('@siiges-services/shared');
// Internal dependencies
const { findOneDocumentType } = require('../document-type');
const { findOneEntityType } = require('../entity-type');
const { findFileFDA02 } = require('../FDA');
const { findFileFDP05 } = require('../FDA');
const { findFileFDP02 } = require('../FDA');
const { findFileFDP06 } = require('../FDA');

const getFileIdentifierObj = async (fileData) => {
  const { tipoEntidad, entidadId, tipoDocumento } = fileData;

  Logger.info(`[Files:getFileIdentifierObj]: Getting file identifier with
tipoEntidad ${tipoEntidad}
entidadId ${entidadId}
tipoDocumento ${tipoDocumento}`);
  const tipoEntidadItem = await findOneEntityType(tipoEntidad);
  const tipoDocumentoItem = await findOneDocumentType(tipoDocumento);

  checkers.throwErrorIfDataIsFalsy(tipoEntidadItem, 'tipoEntidad', tipoEntidad);
  checkers.throwErrorIfDataIsFalsy(entidadId, 'entidadId', entidadId);
  checkers.throwErrorIfDataIsFalsy(tipoDocumentoItem, 'tipoDocumento', tipoDocumento);

  Logger.info('[Files:getFileIdentifierObj]: Identifier obtained');

  const fileMetdata = {
    entidadId,
    tipoDocumentoId: tipoDocumentoItem.id,
    tipoEntidadId: tipoEntidadItem.id,
  };

  /**
 * Objeto `filesFDA` que contiene funciones para encontrar archivos FDA específicos.
 * Cada propiedad del objeto representa un código de archivo FDA y
 * está asociada a una función asíncrona
 * que busca el archivo correspondiente basado en los parámetros proporcionados.
 *
 * Propiedades:
 *  - FDA01: Función asíncrona que utiliza `FDA.findFileFDA01` para buscar el archivo FDA01.
 *           Requiere `entidadId`, `fileMetdata`, `tipoDocumentoItem.name`, y `tipoEntidadItem.name`
 *           como parámetros para la búsqueda.
 *  - FDA02: Función asíncrona que utiliza `findFileFDA02` para buscar el archivo FDA02.
 *           Similar a FDA01, requiere `entidadId`, `fileMetdata`, `tipoDocumentoItem.name`,
 *           y `tipoEntidadItem.name` como parámetros para la búsqueda.
 *
 * Parámetros:
 *  - entidadId: Identificador de la entidad para la cual se busca el archivo.
 *  - fileMetdata: Metadatos del archivo proporcionados para la búsqueda.
 *  - tipoDocumentoItem.name: Nombre del tipo de documento utilizado en la búsqueda.
 *  - tipoEntidadItem.name: Nombre del tipo de entidad utilizado en la búsqueda.
 *
 * Ejemplo de uso:
 * ```
 * const resultadoFDA01 = await filesFDA.FDA01();
 * const resultadoFDA02 = await filesFDA['FDA02']();
 * ```
 */
  const filesFDA = { // Añadir funcion para buscar archivo FDA01
    FDA02: () => findFileFDA02(entidadId, fileMetdata, {
      tipoDocumento: tipoDocumentoItem.name,
      tipoEntidad: tipoEntidadItem.name,
    }),
    FDP05: () => findFileFDP05(entidadId, fileMetdata, {
      tipoDocumento: tipoDocumentoItem.name,
      tipoEntidad: tipoEntidadItem.name,
    }),
    FDP02: () => findFileFDP02(entidadId, fileMetdata, {
      tipoDocumento: tipoDocumentoItem.name,
      tipoEntidad: tipoEntidadItem.name,
    }),
    FDP06: () => findFileFDP06(entidadId, fileMetdata, {
      tipoDocumento: tipoDocumentoItem.name,
      tipoEntidad: tipoEntidadItem.name,
    }),
  };

  if (tipoDocumentoItem.name.startsWith('FD')) {
    await filesFDA[tipoDocumentoItem.name]();
  }

  return fileMetdata;
};

module.exports = getFileIdentifierObj;
