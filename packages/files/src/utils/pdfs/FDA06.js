const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
require('jspdf-autotable');

const {
  modalidades,
  ciclos,
} = require('./constants');
const {
  crearCelda,
  crearSeccion,
  agregarImagenYPaginaPie,
  configurarFuenteYAgregarTexto,
  addNutmeg,
  agregarTextoJustificado,
  buscarDescripcionPorId,
} = require('./pdfHandler');

const img1 = fs.readFileSync(path.join(__dirname, '/images/img4.png'), { encoding: 'base64' });
const img3 = fs.readFileSync(path.join(__dirname, '/images/img6.png'), { encoding: 'base64' });

function GenerarFDA06(solicitud) {
  const JsPDF = jsPDF;
  const doc = new JsPDF();
  addNutmeg(doc);

  const ciclosTipo = buscarDescripcionPorId(ciclos, solicitud.programa.cicloId);
  const modalidadTipo = buscarDescripcionPorId(modalidades, solicitud.programa.modalidadId);
  const textoCiclos = ciclosTipo === 'Semestral' ? 'Semestrales' : 'Cuatrimestrales';

  doc.addImage(img1, 'JPEG', 60, 9, 100, 23);
  doc.setFillColor(116, 200, 210);
  crearCelda(doc, 166, 40, 30, 7, 'FDA06', 10);

  configurarFuenteYAgregarTexto(doc, 'bold', 12, [116, 200, 210], 'OBLIGACIONES ADQUIRIDAS AL OBTENER UN RVOE', 20, 60);
  let currentPositionY = 70;

  doc.setTextColor(0, 0, 0);
  doc.setFont('Nutmeg', 'normal');

  const content = `
El/La ${solicitud.usuario.persona.nombre} ${solicitud.usuario.persona.apellidoPaterno} ${solicitud.usuario.persona.apellidoMaterno} de ${solicitud.programa.plantel.institucion.nombre} declara, bajo protesta de decir verdad, que los datos proporcionados en la solicitud ${solicitud.folio} cuentan con un inmueble con las condiciones de seguridad, higiénicas necesarias para impartir el plan de estudios para el programa ${ciclosTipo} ${solicitud.programa.nombre}, modalidad ${modalidadTipo} en períodos ${textoCiclos}, asimismo ACEPTA cumplir y se compromete con las siguientes obligaciones derivadas del otorgamiento del Reconocimiento de Validez Oficial de Estudios:

1.- Cumplir con lo dispuesto en la Constitución Política de los Estados Unidos Mexicanos en el artículo 3°, la Ley General de Educación, la Ley General de Educación Superior, la Ley de Educación del Estado Libre y Soberano de Jalisco, la Ley de Educación Superior del Estado de Jalisco y demás disposiciones legales y administrativas que le sean aplicables.

2.- Mencionar, en toda su documentación y publicidad que expida, la fecha y número del acuerdo por el cual se otorgó el Reconocimiento de Validez Oficial de Estudios, la autoridad que lo expidió y el periodo establecido.

3.- Respetar los lineamientos descritos en el RVOE que establecen los lineamientos legales para la comercialización de los servicios educativos que prestan los particulares.

4.- Ceñirse a los planes y programas autorizados por la Autoridad Educativa y a los tiempos aprobados para su aplicación.

5.- Los planes y programas de estudio validados por la Autoridad Educativa, una vez que son aprobados no podrán modificarse hasta su vencimiento, de lo contrario no tendrá validez para cualquier trámite ante cualquier autoridad competente.

6.- La Institución se compromete a mantener actualizados los planes y programas de estudio de acuerdo a los avances de la materia y someterlos a refrendo al término del periodo establecido por la Autoridad Educativa.

7.- Reportar a la Autoridad Educativa, cualquier daño o modificación que sufra el inmueble en su estructura, con posterioridad a la fecha de presentación de la solicitud de autorización del Reconocimiento de Validez Oficial de Estudios, proporcionando, en su caso, los datos de la nueva constancia en la que se acredite que las reparaciones o modificaciones cumplen con las normas de construcción y seguridad.

8.- Facilitar y colaborar en las actividades de evaluación, inspección y vigilancia que las autoridades competentes realicen u ordenen, como lo establece la Ley General de Educación en su artículo 149 fracción V.

9.- Conservar en el domicilio en el que se autorizó el RVOE, todos los documentos administrativos y de control escolar que se generen, de manera física de conformidad a la Ley General de Educación en su artículo 151.

10.- Mantener vigente la posesión legal del inmueble, el Dictamen de seguridad estructural, Licencia de uso de suelo, Dictamen de protección civil y Licencia municipal.

11.- Constituir el Comité de Seguridad Escolar, de conformidad con los lineamientos establecidos en el Diario Oficial de la Federación del 4 de septiembre de 1986.

12.- La SICyT verificará las instalaciones para que cumplan con la normatividad vigente, higiene seguridad y pedagogía.

13.- Cumplir con el perfil de personal docente, tanto de nuevo ingreso como los propuestos a una asignatura diferente. Cualquier modificación deberá presentarse a la Autoridad Educativa para su autorización.

14.- Contar con el acervo bibliográfico y los recursos didácticos requeridos para el desarrollo del plan de estudios y sus respectivos programas.

15.- Proporcionar un mínimo de becas del 5% del total de población estudiantil, establecidas en la Ley y los lineamientos en la materia. Generar documentación que lo acredite y tenerla en físico por si la SICyT lo solicita en la visita de vigilancia.

16.- Pagar anualmente la matrícula de alumnos por cada RVOE otorgado y alumno activo en cada ejercicio escolar, acatando los requisitos y tiempos establecidos en la convocatoria correspondiente.

17.- Dar el seguimiento académico y reportar a la Dirección de Servicios Escolares los avances académicos de los alumnos a partir de su inscripción, acreditación, regularización, reinscripción, certificación y titulación.

18.- Una vez recibido el Acuerdo de Incorporación, el particular deberá realizar los registros ante las autoridades correspondientes para la asignación de la clave de centro de trabajo, su registro ante la Dirección de Profesiones del Estado de Jalisco y la Dirección General de Profesiones de la SEP y aquellos que correspondan.

19.- Es obligación de la Institución Educativa que la documentación que presenta sea auténtica.

20.- Emitir sus propios reglamentos internos, solicitar la autorización a la Secretaría de Innovación Ciencia y Tecnología; una vez autorizados, los dará a conocer antes del trámite de inscripción o reinscripción. Deberá conservar evidencia a fin de que la Autoridad Educativa verifique el cumplimiento de esta obligación.
`;

  const normalizedContent = content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
    .trim();

  const paragraphs = normalizedContent.split(/\n\s*\n/);

  paragraphs.forEach((paragraph) => {
    currentPositionY = agregarTextoJustificado(
      doc,
      paragraph.trim(),
      20,
      currentPositionY,
      170,
      10,
    );
    currentPositionY += 5;
  });

  currentPositionY += 10;
  currentPositionY = crearSeccion(currentPositionY, doc, 'BAJO PROTESTA DE DECIR VERDAD', 'center');
  currentPositionY += 5;
  crearSeccion(
    currentPositionY,
    doc,
    `${solicitud.usuario.persona.nombre} ${solicitud.usuario.persona.apellidoPaterno} ${solicitud.usuario.persona.apellidoMaterno}`,
    'center',
  );

  agregarImagenYPaginaPie(doc, img3);

  const pdfDataUri = doc.output('arraybuffer');
  return pdfDataUri;
}

module.exports = { GenerarFDA06 };
