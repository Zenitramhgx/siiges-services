const { checkers } = require('@siiges-services/shared');

const findProgramaAsignatura = (findProgramaAsignaturaQuery) => async (identifierObj) => {
  const include = [{
    association: 'programas',
    include: [
      { association: 'asignaturas' },
      {
        include: [{
          association: 'nombre',
          include: [
            { association: 'area' },
            { association: 'clave' },
            { association: 'programaId' },
            { association: 'asignaturaId' },
          ],
        }],
      }],
  }];

  const asignaturas = await findProgramaAsignaturaQuery(identifierObj, {
    undefined,
    include,
    strict: false,
  });

  checkers.throwErrorIfDataIsFalsy(asignaturas, 'asignaturas', identifierObj.id);

  return asignaturas;
};

module.exports = findProgramaAsignatura;
