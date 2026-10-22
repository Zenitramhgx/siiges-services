<?php
require(realpath(__DIR__ . "/../formatos/pdf.php"));

ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
error_reporting(E_ALL);

set_exception_handler(function ($e) {
  file_put_contents('php://stderr', "Uncaught Exception: " . $e->getMessage() . "\n");
  file_put_contents('php://stderr', $e->getTraceAsString() . "\n");
  exit(1);
});

set_error_handler(function ($severity, $message, $file, $line) {
  file_put_contents('php://stderr', "Error [$severity]: $message in $file on line $line\n");
  exit(1);
});

function safe_text($text) {
  if ($text === null || $text === '') {
    return '';
  }
  $text = preg_replace('/[\x{00A0}\x{2000}-\x{200F}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}]/u', ' ', $text);
  $converted = @mb_convert_encoding($text, 'ISO-8859-1', 'UTF-8');
  if ($converted === false) {
    return preg_replace('/[^\x20-\x7E]/', '', $text);
  }
  return $converted;
}

function valorVacio($valor) {
  return $valor === null || trim((string) $valor) === '';
}

/**
 * Calificaciones informativas que no son numéricas ni acreditan la materia.
 * Acreditación las captura de dos maneras: solo la clave ("RC") o la clave
 * con su descripción ("RC (Recursa)"), así que ambas deben tratarse igual.
 */
const CLAVES_CALIFICACION_INFORMATIVA = ['RC', 'NS', 'NC'];

function claveCalificacionInformativa($valor) {
  if (valorVacio($valor) || is_numeric($valor)) {
    return null;
  }
  $texto = strtoupper(trim((string) $valor));
  if (!preg_match('/^([A-Z]+)/', $texto, $coincidencias)) {
    return null;
  }
  return in_array($coincidencias[1], CLAVES_CALIFICACION_INFORMATIVA, true)
    ? $coincidencias[1]
    : null;
}

/**
 * Texto que se imprime en la columna CALI. La columna es angosta, por eso las
 * informativas se muestran con su clave corta y no con la descripción.
 */
function textoCalificacion($valor) {
  if (valorVacio($valor)) {
    return '';
  }
  return claveCalificacionInformativa($valor) ?? trim((string) $valor);
}

/**
 * Las calificaciones son numéricas. Un texto solo aparece en extraordinario
 * (RC, NS, NP, SD...) y siempre significa que no acreditó.
 */
function esAprobatoria($valor, $calificacionAprobatoria) {
  if (valorVacio($valor)) {
    return false;
  }
  return is_numeric($valor) && (float) $valor >= $calificacionAprobatoria;
}

function fechaEnSegundos($valor) {
  $tiempo = strtotime((string) $valor);
  return $tiempo ?: 0;
}

function ordenCiclo($nombreCiclo) {
  $nombre = (string) $nombreCiclo;
  return [substr($nombre, 0, 4), substr($nombre, 4)];
}

function agruparIntentos($registros) {
  $intentos = [];
  foreach ($registros as $reg) {
    $grupoId = $reg['grupoId'] ?? 'sin-grupo';
    if (!isset($intentos[$grupoId])) {
      $intentos[$grupoId] = [
        'ciclo' => $reg['grupo']['cicloEscolar']['nombre'] ?? '',
        'fecha' => 0,
        'ordinario' => null,
        'extraordinario' => null,
      ];
    }
    $esExtra = ((string) ($reg['tipo'] ?? '1')) === '2';
    $intentos[$grupoId][$esExtra ? 'extraordinario' : 'ordinario'] = $reg;
    $intentos[$grupoId]['fecha'] = max(
      $intentos[$grupoId]['fecha'],
      fechaEnSegundos($reg['fechaExamen'] ?? null)
    );
  }

  $intentos = array_values($intentos);

  usort($intentos, function ($a, $b) {
    if ($a['fecha'] > 0 && $b['fecha'] > 0 && $a['fecha'] !== $b['fecha']) {
      return $a['fecha'] <=> $b['fecha'];
    }
    $cicloCompare = ordenCiclo($a['ciclo']) <=> ordenCiclo($b['ciclo']);
    if ($cicloCompare !== 0) {
      return $cicloCompare;
    }
    return $a['fecha'] <=> $b['fecha'];
  });

  return $intentos;
}

function intentoAprobado($intento, $calificacionAprobatoria) {
  return esAprobatoria($intento['ordinario']['calificacion'] ?? null, $calificacionAprobatoria)
    || esAprobatoria($intento['extraordinario']['calificacion'] ?? null, $calificacionAprobatoria);
}

function algunIntentoAprobado($intentos, $calificacionAprobatoria) {
  foreach ($intentos as $intento) {
    if (intentoAprobado($intento, $calificacionAprobatoria)) {
      return true;
    }
  }
  return false;
}

/**
 * Gana la PRIMERA aprobatoria: en cuanto el alumno acredita, esa es la que
 * vale y lo capturado después no debió existir. Si ninguna acredita, se
 * muestra el último intento con valor.
 */
function resolverVigente($intentos, $calificacionAprobatoria) {
  foreach ($intentos as $intento) {
    if (esAprobatoria($intento['ordinario']['calificacion'] ?? null, $calificacionAprobatoria)) {
      return $intento['ordinario'];
    }
    if (esAprobatoria($intento['extraordinario']['calificacion'] ?? null, $calificacionAprobatoria)) {
      return $intento['extraordinario'];
    }
  }

  for ($i = count($intentos) - 1; $i >= 0; $i -= 1) {
    $intento = $intentos[$i];
    if (!valorVacio($intento['extraordinario']['calificacion'] ?? null)) {
      return $intento['extraordinario'];
    }
    if (!valorVacio($intento['ordinario']['calificacion'] ?? null)) {
      return $intento['ordinario'];
    }
  }

  return null;
}

function requiereExtraordinarioPendiente($intentos, $calificacionAprobatoria) {
  if (empty($intentos) || algunIntentoAprobado($intentos, $calificacionAprobatoria)) {
    return false;
  }

  $ultimo = $intentos[count($intentos) - 1];
  if (!valorVacio($ultimo['extraordinario']['calificacion'] ?? null)) {
    return false;
  }

  $valor = $ultimo['ordinario']['calificacion'] ?? null;
  return !valorVacio($valor) && is_numeric($valor);
}

/**
 * Etiqueta de la columna TIPO: el tipo con el que se capturó la
 * calificación, igual que en las secciones por ciclo escolar.
 */
function etiquetaTipoCalificacion($registro) {
  if ($registro === null) {
    return '';
  }

  return ((string) ($registro['tipo'] ?? '1')) === '2' ? 'Extraordinario' : 'Ordinario';
}

/**
 * Cada calificación capturada de una optativa, en orden cronológico
 * (ordinario y luego extraordinario dentro de cada intento). Las
 * inscripciones sin calificación se omiten.
 */
function registrosConCalificacion($intentos) {
  $registros = [];
  foreach ($intentos as $intento) {
    foreach (['ordinario', 'extraordinario'] as $clave) {
      $registro = $intento[$clave] ?? null;
      if ($registro !== null && !valorVacio($registro['calificacion'] ?? null)) {
        $registros[] = $registro;
      }
    }
  }
  return $registros;
}

function esElMismoRegistro($registroA, $registroB) {
  if ($registroA === null || $registroB === null) {
    return false;
  }
  $idA = $registroA['id'] ?? null;
  $idB = $registroB['id'] ?? null;
  if ($idA !== null && $idB !== null) {
    return $idA === $idB;
  }
  return $registroA === $registroB;
}

const NOMBRE_GRUPO_OPTATIVAS = 'OPTATIVAS ASIGNADAS';
const NOMBRE_GRUPO_PENDIENTES = 'ASIGNATURAS PENDIENTES';

const TIPO_GRUPO_CRONOLOGICO = 'cronologico';
const TIPO_GRUPO_OPTATIVAS = 'optativas';
const TIPO_GRUPO_PENDIENTES = 'pendientes';

const ANCHOS_COLUMNAS_NORMAL = [16, 17, 65, 22, 16, 13, 27];
const ALINEACIONES_COLUMNAS_NORMAL = ['C', 'C', 'L', 'C', 'C', 'C', 'C'];

// En optativas la columna CALI debe caber "NO ACREDITADO" (21.3 mm) y TIPO
// "Extraordinario" (18.2 mm); el ancho sobrante sale del nombre, que sí
// reparte el texto en varias líneas.
const ANCHOS_COLUMNAS_OPTATIVAS = [16, 17, 55, 22, 23, 13, 30];
const ALINEACIONES_COLUMNAS_OPTATIVAS = ['C', 'C', 'L', 'C', 'C', 'C', 'C'];

const INDICE_NOMBRE_ASIGNATURA = 2;

const INDICES_COLUMNAS_WRAP = [0, 1, 2];

function wrapTextFPDF($pdf, $text, $maxWidth) {
  $palabras = explode(' ', (string) $text);
  $lineas = [];
  $lineaActual = '';
  $paddingInterno = 2;

  foreach ($palabras as $palabra) {
    $lineaPrueba = $lineaActual === '' ? $palabra : $lineaActual . ' ' . $palabra;
    if ($pdf->GetStringWidth(safe_text($lineaPrueba)) <= ($maxWidth - $paddingInterno)) {
      $lineaActual = $lineaPrueba;
    } else {
      if ($lineaActual !== '') {
        $lineas[] = $lineaActual;
      }
      $lineaActual = $palabra;
    }
  }

  if ($lineaActual !== '') {
    $lineas[] = $lineaActual;
  }

  if (empty($lineas)) {
    $lineas[] = '';
  }

  return $lineas;
}

function dibujarFilaCalificacion($pdf, $valores, $coloresPorColumna, $anchos, $alineaciones) {
  $lineHeight = 5;
  $pdf->SetFont("Garet", "", 7);

  $lineasPorColumna = [];
  $maxLineas = 1;
  foreach (INDICES_COLUMNAS_WRAP as $idx) {
    if (!isset($valores[$idx])) {
      continue;
    }
    $lineas = wrapTextFPDF($pdf, $valores[$idx], $anchos[$idx]);
    $lineasPorColumna[$idx] = count($lineas);
    $maxLineas = max($maxLineas, count($lineas));
  }
  $rowHeight = $maxLineas * $lineHeight;

  $startX = $pdf->GetX();
  $startY = $pdf->GetY();
  $x = $startX;

  foreach ($valores as $i => $texto) {
    $color = $coloresPorColumna[$i] ?? [0, 0, 0];
    $align = $alineaciones[$i] ?? 'C';
    $ancho = $anchos[$i];

    $pdf->Rect($x, $startY, $ancho, $rowHeight);

    $pdf->SetTextColor($color[0], $color[1], $color[2]);

    if (in_array($i, INDICES_COLUMNAS_WRAP, true)) {
      $propiasLineas = $lineasPorColumna[$i] ?? 1;
      $alturaPropia = $propiasLineas * $lineHeight;
      $offsetVertical = ($rowHeight - $alturaPropia) / 2;

      $pdf->SetXY($x, $startY + $offsetVertical);
      $pdf->MultiCell($ancho, $lineHeight, safe_text($texto), 0, $align, false);
    } else {
      $pdf->SetXY($x, $startY);
      $pdf->Cell($ancho, $rowHeight, safe_text($texto), 0, 0, $align, false);
    }

    $x += $ancho;
  }

  $pdf->SetTextColor(0, 0, 0);
  $pdf->SetXY($startX, $startY + $rowHeight);
}

$data = json_decode(file_get_contents('php://stdin'), true);

if (!$data) {
  fwrite(STDERR, "No se recibieron datos válidos o el JSON está malformado.\n");
  exit(1);
}

$pdf = new PDF();

$alumno = $data['alumno'] ?? [];
$calificacionesInput = $data['calificaciones'] ?? [];
$asignaturasPrograma = $data['asignaturasPrograma'] ?? [];
$programa = $alumno['programa'] ?? [];
$nivel = $programa['nivel'] ?? [];
$modalidad = $programa['modalidad'] ?? [];
$ciclo = $programa['ciclo'] ?? [];
$plantel = $programa['plantel'] ?? [];
$institucion = $plantel['institucion'] ?? [];

$pdf->AliasNbPages();

$pdf->AddPage("P", "Letter");
$pdf->SetMargins(20, 20, 20);
$pdf->SetFont("Garet", "", 11);

$pdf->Ln(30);
$pdf->SetTextColor(115, 199, 209);
$pdf->Cell(0, 5, safe_text("HISTORIAL ACADÉMICO"), 0, 1, "L");
$pdf->Ln(5);
$pdf->SetTextColor(0, 0, 0);

$pdf->SetFont("Garet", "", 9);
$dataPrograma = array(
  [
    "name" => safe_text("NOMBRE DE LA INSTITUCIÓN"),
    "description" => safe_text(mb_strtoupper($institucion["nombre"] ?? ''))
  ],
  [
    "name" => safe_text("CLAVE DE CENTRO DE TRABAJO"),
    "description" => safe_text(mb_strtoupper($plantel["claveCentroTrabajo"] ?? ''))
  ],
  [
    "name" => safe_text("NUMERO DE ACUERDO"),
    "description" => safe_text(mb_strtoupper($programa["acuerdoRvoe"] ?? ''))
  ],
  [
    "name" => safe_text("NIVEL Y NOMBRE DEL PLAN DE ESTUDIOS"),
    "description" => safe_text(mb_strtoupper(($nivel["descripcion"] ?? '') . " en " . ($programa["nombre"] ?? '')))
  ],
);

$pdf->SetWidths(array(80, 95));

$pdf->SetLineHeight(5);

$pdf->SetColors([[191, 191, 191], []]);

foreach ($dataPrograma as $item) {
  $pdf->Row(array(
    $item['name'],
    $item['description']
  ));
}

$pdf->Ln(10);
$pdf->SetFillColor(166, 166, 166);
$pdf->SetFont("Garetb", "", 9);
$pdf->Cell(176, 5, safe_text("DATOS DEL ALUMNO"), 1, 1, "C", true);

$pdf->SetFont("Garet", "", 9);
$pdf->SetFillColor(191, 191, 191);
$pdf->Cell(29, 5, safe_text("MATRÍCULA"), 1, 0, "C", true);
$pdf->Cell(89, 5, safe_text("NOMBRE DEL ALUMNO"), 1, 0, "C", true);
$pdf->Cell(29, 5, safe_text("ESTATUS"), 1, 0, "C", true);
$pdf->Cell(29, 5, safe_text("VALIDACIÓN"), 1, 1, "C", true);

$dataDetalleDomicilioInstitucion1 = array(
  [
    "matricula" => safe_text(mb_strtoupper($alumno["matricula"] ?? '')),
    "nombre_alumno" => safe_text(mb_strtoupper(($alumno["persona"]["apellidoPaterno"] ?? '') . " " . ($alumno["persona"]["apellidoMaterno"] ?? '') . " " . ($alumno["persona"]["nombre"] ?? ''))),
    "estatus" => safe_text(mb_strtoupper($alumno["situacion"]["nombre"] ?? '')),
    "validaciones" => safe_text(mb_strtoupper($alumno["validacion"]["situacionValidacion"]['nombre'] ?? 'Sin Validar')),
  ]
);

$pdf->SetWidths(array(29, 89, 29, 29));

$pdf->SetLineHeight(5);
$pdf->SetColors([]);
$pdf->SetFont("Garet", "", 9);

foreach ($dataDetalleDomicilioInstitucion1 as $item) {
  $pdf->Row(array(
    $item['matricula'],
    $item['nombre_alumno'],
    $item['estatus'],
    $item['validaciones']
  ));
}

$pdf->Ln(10);

$total_creditos = 0;
$total_calificaciones = 0;
$total_materias = 0;

$asignaturasObligatoriasPorId = [];
foreach ($asignaturasPrograma as $asignaturaCat) {
  $asignaturasObligatoriasPorId[$asignaturaCat['id']] = $asignaturaCat;
}

$calificacionesPorAsignaturaId = [];
foreach ($calificacionesInput as $calificacion) {
  $asignaturaId = $calificacion['asignaturaId'] ?? null;
  if ($asignaturaId === null) {
    continue;
  }
  if (!isset($calificacionesPorAsignaturaId[$asignaturaId])) {
    $calificacionesPorAsignaturaId[$asignaturaId] = [];
  }
  $calificacionesPorAsignaturaId[$asignaturaId][] = $calificacion;
}

$calificacionAprobatoria = (float) ($programa["calificacionAprobatoria"] ?? 0);

$calificacionCiclo = [];
$filasPendientes = [];

foreach ($asignaturasPrograma as $asignaturaCat) {
  $calificacionesDeEstaAsignatura = $calificacionesPorAsignaturaId[$asignaturaCat['id']] ?? [];

  if (empty($calificacionesDeEstaAsignatura)) {
    $filasPendientes[] = [
      'asignatura' => $asignaturaCat,
      'calificacion' => null,
      'tipo' => 1,
      'fechaExamen' => null,
      'sinCalificacion' => true,
      'soloAcreditado' => false,
    ];
    continue;
  }

  foreach ($calificacionesDeEstaAsignatura as $cal) {
    $calificacionValor = $cal['calificacion'] ?? null;
    $calificacionVacia = valorVacio($calificacionValor);

    $nombreCiclo = $cal['grupo']['cicloEscolar']['nombre'] ?? 'SIN CICLO';

    if (!isset($calificacionCiclo[$nombreCiclo])) {
      $calificacionCiclo[$nombreCiclo] = [
        'tipoGrupo' => TIPO_GRUPO_CRONOLOGICO,
        'cicloNombre' => $nombreCiclo,
        'filas' => [],
      ];
    }

    $calificacionCiclo[$nombreCiclo]['filas'][] = [
      'asignatura' => $asignaturaCat,
      'calificacion' => $calificacionVacia ? null : $calificacionValor,
      'tipo' => $cal['tipo'] ?? null,
      'fechaExamen' => $calificacionVacia ? null : ($cal['fechaExamen'] ?? null),
      'sinCalificacion' => $calificacionVacia,
      'soloAcreditado' => false,
    ];
  }

  $intentos = agruparIntentos($calificacionesDeEstaAsignatura);

  $vigenteDeLaAsignatura = resolverVigente($intentos, $calificacionAprobatoria);
  $valorVigenteAsignatura = $vigenteDeLaAsignatura['calificacion'] ?? null;

  if (
    is_numeric($valorVigenteAsignatura)
    && (float) $valorVigenteAsignatura >= $calificacionAprobatoria
  ) {
    $total_creditos += (float) ($asignaturaCat['creditos'] ?? 0);
    $total_calificaciones += (float) $valorVigenteAsignatura;
    $total_materias += 1;
  }

  if (requiereExtraordinarioPendiente($intentos, $calificacionAprobatoria)) {
    $filasPendientes[] = [
      'asignatura' => $asignaturaCat,
      'calificacion' => null,
      'tipo' => 2,
      'fechaExamen' => null,
      'sinCalificacion' => true,
      'soloAcreditado' => false,
    ];
  }
}

$calificacionesOptativasPorAsignaturaId = [];
foreach ($calificacionesInput as $calificacion) {
  $asignatura = $calificacion['asignatura'] ?? [];
  $tipoCatalogo = $asignatura['tipo'] ?? null;
  $esOptativaDeCatalogo = ($tipoCatalogo === 2 || $tipoCatalogo === '2');
  if (!$esOptativaDeCatalogo) {
    continue;
  }
  $asignaturaId = $calificacion['asignaturaId'] ?? null;
  if ($asignaturaId === null) {
    continue;
  }
  if (!isset($calificacionesOptativasPorAsignaturaId[$asignaturaId])) {
    $calificacionesOptativasPorAsignaturaId[$asignaturaId] = [
      'asignatura' => $asignatura,
      'registros' => [],
    ];
  }
  $calificacionesOptativasPorAsignaturaId[$asignaturaId]['registros'][] = $calificacion;
}

$filasOptativas = [];

foreach ($calificacionesOptativasPorAsignaturaId as $info) {
  $asignaturaDet = $info['asignatura'];
  $intentos = agruparIntentos($info['registros']);
  $vigente = resolverVigente($intentos, $calificacionAprobatoria);

  if ($vigente === null) {
    $filasOptativas[] = [
      'asignatura' => $asignaturaDet,
      'calificacion' => null,
      'fechaExamen' => null,
      'tipoTexto' => '',
      'noAcreditado' => true,
      'esVigente' => false,
    ];
    continue;
  }

  // Igual que las obligatorias en su ciclo: se imprime cada intento,
  // no solo el vigente, para que quede constancia del ordinario o
  // extraordinario que no acreditó (50, RC, NS, ...).
  foreach (registrosConCalificacion($intentos) as $registro) {
    $filasOptativas[] = [
      'asignatura' => $asignaturaDet,
      'calificacion' => $registro['calificacion'],
      'fechaExamen' => $registro['fechaExamen'] ?? null,
      'tipoTexto' => etiquetaTipoCalificacion($registro),
      'noAcreditado' => false,
      'esVigente' => esElMismoRegistro($registro, $vigente),
    ];
  }

  if (
    !esAprobatoria($vigente['calificacion'], $calificacionAprobatoria)
    && requiereExtraordinarioPendiente($intentos, $calificacionAprobatoria)
  ) {
    $filasPendientes[] = [
      'asignatura' => $asignaturaDet,
      'calificacion' => null,
      'tipo' => 2,
      'fechaExamen' => null,
      'sinCalificacion' => true,
      'soloAcreditado' => false,
    ];
  }
}

if (!empty($filasOptativas)) {
  $calificacionCiclo[NOMBRE_GRUPO_OPTATIVAS] = [
    'tipoGrupo' => TIPO_GRUPO_OPTATIVAS,
    'cicloNombre' => NOMBRE_GRUPO_OPTATIVAS,
    'filas' => $filasOptativas,
  ];
}

if (!empty($filasPendientes)) {
  $calificacionCiclo[NOMBRE_GRUPO_PENDIENTES] = [
    'tipoGrupo' => TIPO_GRUPO_PENDIENTES,
    'cicloNombre' => NOMBRE_GRUPO_PENDIENTES,
    'filas' => $filasPendientes,
  ];
}

uasort($calificacionCiclo, function ($a, $b) {
  $rangoTipo = [
    TIPO_GRUPO_CRONOLOGICO => 0,
    TIPO_GRUPO_OPTATIVAS => 1,
    TIPO_GRUPO_PENDIENTES => 2,
  ];

  $rangoA = $rangoTipo[$a['tipoGrupo']] ?? 0;
  $rangoB = $rangoTipo[$b['tipoGrupo']] ?? 0;

  if ($rangoA !== $rangoB) {
    return $rangoA <=> $rangoB;
  }

  if ($rangoA !== 0) {
    return 0;
  }

  $yearA = substr($a['cicloNombre'], 0, 4);
  $yearB = substr($b['cicloNombre'], 0, 4);
  $periodoA = substr($a['cicloNombre'], 4);
  $periodoB = substr($b['cicloNombre'], 4);

  if ($yearB !== $yearA) {
    return $yearA <=> $yearB;
  }
  return $periodoA <=> $periodoB;
});

$creditosPrograma = (float) ($programa["creditos"] ?? 0);

foreach ($calificacionCiclo as $grupoKey => $grupoData) {
  if ($pdf->checkNewPage()) {
    $pdf->Ln(20);
  }

  $filas = $grupoData['filas'];

  $tieneConsecutivos = false;
  foreach ($filas as $fila) {
    $consecutivo = (int) ($fila['asignatura']['consecutivo'] ?? 0);
    if ($consecutivo > 0) {
      $tieneConsecutivos = true;
      break;
    }
  }

  if ($tieneConsecutivos) {
    usort($filas, function ($a, $b) {
      $ca = (int) ($a['asignatura']['consecutivo'] ?? 0);
      $cb = (int) ($b['asignatura']['consecutivo'] ?? 0);
      return $ca <=> $cb;
    });
  }

  $esGrupoOptativas = ($grupoData['tipoGrupo'] === TIPO_GRUPO_OPTATIVAS);
  $esGrupoPendientes = ($grupoData['tipoGrupo'] === TIPO_GRUPO_PENDIENTES);

  $anchos = $esGrupoOptativas ? ANCHOS_COLUMNAS_OPTATIVAS : ANCHOS_COLUMNAS_NORMAL;
  $alineaciones = $esGrupoOptativas ? ALINEACIONES_COLUMNAS_OPTATIVAS : ALINEACIONES_COLUMNAS_NORMAL;

  if ($esGrupoOptativas) {
    $tituloSeccion = mb_strtoupper(NOMBRE_GRUPO_OPTATIVAS);
  } elseif ($esGrupoPendientes) {
    $tituloSeccion = mb_strtoupper(NOMBRE_GRUPO_PENDIENTES);
  } else {
    $tituloSeccion = mb_strtoupper('CICLO ESCOLAR ' . $grupoData['cicloNombre']);
  }

  $pdf->SetFillColor(166, 166, 166);
  $pdf->SetFont("Garet", "", 9);
  $pdf->Cell(176, 5, safe_text($tituloSeccion), 1, 1, "C", true);

  $pdf->SetFont("Garetb", "", 7);
  $pdf->SetFillColor(191, 191, 191);

  if ($esGrupoOptativas) {
    $pdf->Cell($anchos[0], 8, safe_text("CLAVE"), 1, 0, "C", true);
    $pdf->Cell($anchos[1], 8, safe_text("SERIACIÓN"), 1, 0, "C", true);
    $pdf->Cell($anchos[2], 8, safe_text("ASIGNATURA O UNIDAD DE APRENDIZAJE"), 1, 0, "C", true);
    $pdf->Cell($anchos[3], 8, safe_text("TIPO"), 1, 0, "C", true);
    $pdf->Cell($anchos[4], 8, safe_text("CALI."), 1, 0, "C", true);
    $pdf->Cell($anchos[5], 8, safe_text("CRED."), 1, 0, "C", true);
    $pdf->MultiCell($anchos[6], 4, safe_text("FECHA DE ACREDITACIÓN"), 1, "C", true);
  } else {
    $pdf->Cell($anchos[0], 8, safe_text("CLAVE"), 1, 0, "C", true);
    $pdf->Cell($anchos[1], 8, safe_text("SERIACIÓN"), 1, 0, "C", true);
    $pdf->Cell($anchos[2], 8, safe_text("ASIGNATURA O UNIDAD DE APRENDIZAJE"), 1, 0, "C", true);
    $pdf->Cell($anchos[3], 8, safe_text("TIPO"), 1, 0, "C", true);
    $pdf->Cell($anchos[4], 8, safe_text("CALI."), 1, 0, "C", true);
    $pdf->Cell($anchos[5], 8, safe_text("CRED."), 1, 0, "C", true);
    $pdf->MultiCell($anchos[6], 4, safe_text("FECHA DE ACREDITACIÓN"), 1, "C", true);
  }

  $pdf->Ln(0);

  foreach ($filas as $detalle) {
    $asignaturaDetalle = $detalle['asignatura'];
    $rojo = [200, 0, 0];
    $negro = [0, 0, 0];

    if ($esGrupoOptativas) {
      $esNoAcreditado = $detalle['noAcreditado'] ?? false;
      $valorCalificacion = $detalle['calificacion'] ?? null;
      $calTexto = $esNoAcreditado ? 'NO ACREDITADO' : textoCalificacion($valorCalificacion);
      $colorCal = $esNoAcreditado ? $rojo : $negro;
      $fechaTexto = $detalle['fechaExamen'] ?? '';

      $valoresFila = [
        $asignaturaDetalle["clave"] ?? '',
        $asignaturaDetalle["seriacion"] ?? '',
        $asignaturaDetalle["nombre"] ?? '',
        $detalle['tipoTexto'] ?? '',
        $calTexto,
        $asignaturaDetalle["creditos"] ?? '',
        $fechaTexto,
      ];
      $coloresFila = [$negro, $negro, $negro, $negro, $colorCal, $negro, $negro];

      dibujarFilaCalificacion($pdf, $valoresFila, $coloresFila, $anchos, $alineaciones);

      if ($pdf->checkNewPage()) {
        $pdf->Ln(20);
      }

      // Solo la calificación vigente suma créditos y promedio; los intentos
      // anteriores se imprimen únicamente como constancia.
      $cuentaCredito = false;
      if (
        ($detalle['esVigente'] ?? false)
        && is_numeric($valorCalificacion)
        && (float) $valorCalificacion >= $calificacionAprobatoria
      ) {
        $cuentaCredito = true;
        $total_calificaciones += (float) $valorCalificacion;
        $total_materias += 1;
      }

      if ($cuentaCredito) {
        $total_creditos += (float) ($asignaturaDetalle["creditos"] ?? 0);
      }

      continue;
    }

    $sinCalificacion = $detalle['sinCalificacion'] ?? false;

    if ($sinCalificacion) {
      $tipo_txt = match ($detalle['tipo'] ?? 1) {
        1, '1' => 'Ordinario',
        2, '2' => 'Extraordinario',
        default => 'Ordinario'
      };
    } else {
      $tipo_txt = match ($detalle['tipo'] ?? '') {
        1, '1' => 'Ordinario',
        2, '2' => 'Extraordinario',
        default => 'Desconocido'
      };
    }

    $calificacionTexto = $sinCalificacion ? 'SIN' : textoCalificacion($detalle['calificacion'] ?? null);
    $fechaTexto = $sinCalificacion ? 'CALIFICAR' : ($detalle['fechaExamen'] ?? '');

    $valoresFila = [
      $asignaturaDetalle["clave"] ?? '',
      $asignaturaDetalle["seriacion"] ?? '',
      $asignaturaDetalle["nombre"] ?? '',
      $tipo_txt,
      $calificacionTexto,
      $asignaturaDetalle["creditos"] ?? '',
      $fechaTexto,
    ];
    $coloresFila = [$negro, $negro, $negro, $negro, $negro, $negro, $negro];
    if ($sinCalificacion) {
      $coloresFila[3] = $rojo;
      $coloresFila[4] = $rojo;
      $coloresFila[6] = $rojo;
    }

    dibujarFilaCalificacion($pdf, $valoresFila, $coloresFila, $anchos, $alineaciones);

    if ($pdf->checkNewPage()) {
      $pdf->Ln(20);
    }

  }

  $pdf->Ln(15);
}

$promedio_calificacion = 'N/A';

if ($total_materias != 0) {
  $promedioNumerico = $total_calificaciones / $total_materias;
  $calificacionMaximaNum = (float) ($programa['calificacionMaxima'] ?? 0);

  $esNotaPerfecta = $calificacionMaximaNum > 0
    && abs($promedioNumerico - $calificacionMaximaNum) < 0.005;

  if ($esNotaPerfecta) {
    $promedio_calificacion = (string) $calificacionMaximaNum;
  } else {
    $promedioTruncado = floor($promedioNumerico * 100) / 100;
    $promedio_calificacion = number_format($promedioTruncado, 2, '.', '');
  }
}

if ($creditosPrograma > 0 && $total_creditos >= $creditosPrograma) {
  $total_creditos = $creditosPrograma;
}

if ($pdf->checkNewPage()) {
  $pdf->Ln(20);
}

$pdf->SetFont("Garet", "", 9);
$pdf->SetFillColor(191, 191, 191);
$pdf->Cell(50, 5, safe_text("CRÉDITOS OBTENIDOS"), 1, 0, "C", true);
$pdf->Cell(50, 5, safe_text("PROMEDIO"), 1, 0, "C", true);
$pdf->Ln();

$pdf->SetFont("Garet", "", 9);
$pdf->SetFillColor(255, 255, 255);
$pdf->Cell(50, 5, safe_text($total_creditos . " de " . ($programa["creditos"] ?? '')), 1, 0, "C", true);
$pdf->Cell(50, 5, safe_text($promedio_calificacion), 1, 0, "C", true);
$pdf->Ln();

$pdf->Ln(15);

if ($pdf->checkNewPage()) {
  $pdf->Ln(20);
}

$fecha = $pdf->convertirFecha(date("Y-m-d"));
$pdf->SetFont("Garet", "", 8);
$pdf->MultiCell(176, 3, safe_text("El presente historial consigna las calificaciones que hasta la fecha han sido registradas en el  Sistema Integral de Información para la Gestión de la Educación Superior (SIIGES), el cumplimiento parcial o total del plan de estudios, los créditos obtenidos y la calificación total o parcial serán acreditados solamente por un certificado autorizado.

La información del presente cumple fines informativos, único para la consulta de la Institución y la Dirección de Servicios Escolares, fecha de consulta " . $fecha), 0, "J");
$pdf->Ln(5);

$pdf->Output("I", "kardex_" . ($alumno["matricula"] ?? '') . ".pdf");
