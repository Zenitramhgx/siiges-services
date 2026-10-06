<?php
require(realpath(__DIR__ ."/../fpdf181/fpdf.php"));

// Leer datos JSON desde stdin
$data = json_decode(file_get_contents('php://stdin'), true);

// Verifica si el JSON es válido
if (!$data) {
  fwrite(STDERR, "No se recibieron datos válidos o el JSON está malformado.\n");
  exit(1);
}

class PDF extends FPDF
{
  // Cabecera de p�gina
  function Header()
  {
    $this->Image(realpath(__DIR__ ."/../images/encabezado.png"), 60, 15, 75);
    $this->AddFont('Garet', '', 'Garet-Regular.php');
    $this->AddFont('Garetb', '', 'Garet-Bold.php');
    $this->SetFont("Garetb", "", 11);
    $this->Ln(25);
    $this->SetTextColor(255, 255, 255);
    $this->SetFillColor(115, 199, 209);
    $this->Cell(140, 5, "", 0, 0, "L");
    $this->Cell(45, 6, "FDA01", 0, 0, "R", true);
    $this->Ln(10);
  }

  // Pie de p�gina
  function Footer()
  {
    $this->SetY(-30);
    $this->SetFont("Garetb", "", 7);
    $this->SetTextColor(0, 0, 0);
    $this->Ln(5);
    $this->Image(realpath(__DIR__ ."/../images/direccion_sicyt.png"), 60, 245, 60);
    $this->SetY(-20);
    $this->SetTextColor(166, 166, 166);
    $this->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "Página " . $this->PageNo()), 0, 0, "R");
  }
}

$solicitud = $data ?? [];
$programa = $solicitud['programa'] ?? [];
$nivel = $programa['nivel'] ?? [];
$modalidad = $programa['modalidad'] ?? [];
$ciclo = $programa['ciclo'] ?? [];
$plantel = $programa['plantel'] ?? [];
$institucion = $plantel['institucion'] ?? [];
$ratificaciones = $institucion['ratificacionesNombre'] ?? [];
$ratificacion = $ratificaciones[0] ?? [];
$usuario = $solicitud['usuario']['persona'] ?? [];
$domicilio = $usuario['domicilio'] ?? [];

$programaTurnos = $programa['programaTurnos'] ?? [];
$turnoNombres = array_map(function($item) {
  return $item['turno']['nombre'] ?? '';
}, $programaTurnos);

$nombreInstitucion = !empty($institucion['esNombreAutorizado']) && $institucion['esNombreAutorizado']
  ? ($institucion['nombre'] ?? '[SIN NOMBRE]')
  : ($ratificacion['nombrePropuesto1'] ?? '[SIN RATIFICACIÓN]');

// El índice del arreglo se mapea como $tituloTipoSolicitud[$tipoSolicitudId - 1].
// El sufijo "(RVOE)" solo corresponde al tipo 1 (índice 0).
$tituloTipoSolicitud = [
  "SOLICITUD DE RECONOCIMIENTO DE VALIDEZ OFICIAL DE ESTUDIOS (RVOE)",
  "SOLICITUD DE REFRENDO A PLAN Y PROGRAMA DE ESTUDIO",
  "SOLICITUD DE CAMBIO DE DOMICILIO",
  "SOLICITUD DE CAMBIO DE REPRESENTANTE LEGAL",
  "SOLICITUD DE ACTUALIZACIÓN",
  "SOLICITUD DE CAMBIO DE NOMBRE DE INSTITUCIÓN"
];

$tipoSolicitudId = $solicitud['tipoSolicitudId'] ?? 0;
$titulo = $tituloTipoSolicitud[$tipoSolicitudId - 1] ?? '[TIPO DE SOLICITUD DESCONOCIDO]';

$pdf = new PDF();

$pdf->AliasNbPages();
$pdf->AddPage("P", "Letter");
$pdf->SetFont("Garetb", "", 11);
$pdf->SetMargins(20, 20, 20);
$pdf->Ln();
$pdf->SetTextColor(115, 199, 209);
$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "OFICIO DE ENTREGA DE DOCUMENTACIÓN"), 0, 1, "L");
$pdf->SetTextColor(0, 0, 0);
$pdf->Ln(10);
$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "SUBSECRETARÍA DE EDUCACIÓN SUPERIOR"), 0, 1, "L");
$pdf->Ln(5);
$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "AT´N: DIRECTOR GENERAL DE INCORPORACIÓN Y SERVICIOS ESCOLARES."), 0, 1, "R");

$pdf->Ln(5);
$pdf->SetFont("Garet", "", 9);
$fechaRaw = $solicitud["fecha"] ?? null;
$fechaFormateada = $fechaRaw ? date("d/m/Y", strtotime($fechaRaw)) : "";

$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $fechaFormateada), 0, 1, "R");
$pdf->Ln(5);
$pdf->MultiCell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "Por este conducto manifiesto que estoy en condiciones para iniciar el trámite de "
  . mb_strtoupper($titulo)
  . " del programa " . mb_strtoupper($nivel['descripcion'] ?? '')
  . " en " . mb_strtoupper($programa['nombre'] ?? '')
  . ", modalidad " . mb_strtoupper($modalidad['nombre'] ?? '')
  . ", en periodos " . mb_strtoupper($ciclo["nombre"] ?? '')
  . ", turno " . mb_strtoupper(implode(', ', array_filter($turnoNombres)))
  . " de la Institución " . mb_strtoupper($nombreInstitucion) . "."), 0, "J");
$pdf->Ln(5);

$pdf->MultiCell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', "Así mismo declaro Bajo Protesta de Decir la Verdad que la información y los documentos anexos en la presente solicitud son verídicos y fueron elaborados siguiendo principios éticos profesionales, que son de mi conocimiento las penas en que incurren quienes se conducen con falsedad ante autoridad distinta de la judicial, y señalo como domicilio para recibir notificaciones:"), 0, "J");
$pdf->Ln(5);
$pdf->SetTextColor(0, 0, 0);

$pdf->MultiCell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT',
  "Calle / Av. " . mb_strtoupper($domicilio["calle"])
    . ", N° " . mb_strtoupper($domicilio["numeroExterior"])
    . ($domicilio["numeroInterior"] ? ", int. " . mb_strtoupper($domicilio["numeroInterior"]) : "")
    . ", Col. "  . mb_strtoupper($domicilio["colonia"])
    . ", Municipio " . mb_strtoupper($domicilio["municipio"]["nombre"]) . "."
), 0, "J");


$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $usuario["telefono"] ? ("Número telefónico particular: " . $usuario["telefono"]) : ""), 0, 1, "L");
$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $usuario["celular"] ? ("Número telefónico celular: " . $usuario["celular"]) : ""), 0, 1, "L");

$pdf->Ln(5);

$pdf->MultiCell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT',"Quedo enterado de todas las disposiciones establecidas en la Ley General de Educación, La Ley General de Educación Superior, la Ley de Educación del Estado Libre y Soberano de Jalisco, la Ley de Educación Superior del Estado de Jalisco, así como del Instructivo para la obtención de Reconocimiento de Validez Oficial de Estudios de Educación Superior del Estado de Jalisco."), 0, "J");
$pdf->Ln(30);
$pdf->SetFont("Garetb", "", 11);
$pdf->Cell(0, 5, (iconv('UTF-8', 'ISO-8859-1//TRANSLIT',mb_strtoupper("Bajo protesta de decir verdad"))), 0, 1, "C");
$pdf->SetFont("Garet", "", 11);
$pdf->Cell(0, 5, iconv('UTF-8', 'ISO-8859-1//TRANSLIT',mb_strtoupper($usuario["nombre"] . " " . $usuario["apellidoPaterno"] . " " . $usuario["apellidoMaterno"])), 0, 1, "C");

echo $pdf->Output('S');
