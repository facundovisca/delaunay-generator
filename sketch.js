// ==========================================================================
// ARCHIVO: sketch.js
// VERSIÓN INTERACTIVA PRO: ESTRUCTURA DE FONDO FIJADA EN 5 VARIANTES EXACTAS
// ==========================================================================

let obra;
let texturas = [];
let texturaElegida; // Guarda la textura fija seleccionada al azar para la obra actual

// EFECTOS DE SONIDO PARA LA INTERFAZ PERFORMANCE
let sndOk, sndBack;

// VARIABLES AMORTIGUADORAS PARA TRANSICIONES ELÁSTICAS
let cantidadSuave = 0;
let secundariasSuave = 0;
let fondoSuave = 0;
let tramasSuave = 0;

// ESTRUCTURA DE MEMORIA INTERNA (FLOTANTE)
let valoresPerformaticos = {
  paleta: 0,
  fondo: 0,
  cantidad: 0,
  escala: 100,
  secundarias: 0,
  sinusoide: 0,
  tramas: 0,
  offset: 0,
};

// Referencias a los sliders del HTML
let sPaleta,
  sFondo,
  sCantidad,
  sEscala,
  sSecundarias,
  sTramasFondo,
  sSinusoide,
  sOffset,
  sSensibilidad;

// ------------- CONFIGURACIÓN DE AUDIO (ESTÁNDAR UNA) -----------------
let AMP_MIN = 0.002; // Piso de ruido mínimo
let AMP_MAX = 0.08; // Valor inicial (Se sobreescribe dinámicamente con el slider HTML)

let umbralRuido = 0.12; // CALIBRADO: Filtra ruidos chicos y el habla normal
let umbralDuracionSonido = 1000; // CALIBRADO: Evita falsos positivos dándole más colchón a la voz

let mic; // Instancia global requerida por la cátedra
let audioIniciado = false;
let amp = 0;
let intensidad = 0;

// -------- GESTORES DE SEÑAL -------
let gestorAmp;

// ------- ESTADOS Y EVENTOS TEMPORALES DE SONIDO -----
let haySonido = false;
let antesHabiaSonido = false;
let empezoElSonido = false;
let terminoElSonido = false;

let marcaInicioSonido = 0;
let durSonido = 0;

// VARIABLES PARA LA LÓGICA DE DOBLE PALMA (RETROCEDER)
let marcaUltimoFinSonido = 0;
let ventanaDoblePalma = 400; // Tiempo en ms para agrupar dos aplausos rápidos

// --- VARIABLES DEL ASISTENTE SECUENCIAL (NUEVO ORDEN PERFORMATICO) ---
let pasoActual = 1;
const TOTAL_PASOS = 8;
const nombresEstados = [
  "1. Cantidad de núcleos",
  "2. Escala General",
  "3. Figuras Intermedias",
  "4. Paleta Cromática",
  "5. Estructura de Fondo",
  "6. Amplitud Sinusoide (S)",
  "7. Tramas de Fondo",
  "8. Offset Eje (Asimetría)",
];

let flagFeedback = 0; // Pestañeo visual al cambiar de paso

// ==========================================================================
// PRELOAD & SETUP
// ==========================================================================
function preload() {
  for (let i = 1; i <= 6; i++) {
    texturas.push(loadImage("img/textura" + i + ".png"));
  }

  sndOk = loadSound("sound/ok.wav");
  sndBack = loadSound("sound/back.wav");
}

function setup() {
  let canvas = createCanvas(600, 800);
  canvas.parent("canvas-holder");

  sSensibilidad = select("#htmlSliderSensibilidad");
  sPaleta = select("#htmlSliderPaleta");
  sFondo = select("#htmlSliderFondo");
  sCantidad = select("#htmlSliderCantidad");
  sEscala = select("#htmlSliderEscala");
  sSecundarias = select("#htmlSliderSecundarias");
  sSinusoide = select("#htmlSliderSinusoide");
  sTramasFondo = select("#htmlSliderTramasFondo");
  sOffset = select("#htmlSliderOffset");

  mic = new p5.AudioIn();
  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);

  let btnG = document.getElementById("btnGenerar");
  if (btnG) btnG.onclick = () => generarNuevaObra();

  let btnD = document.getElementById("btnDescargar");
  if (btnD) btnD.onclick = () => guardarCapturaObra();

  let contenedorCanvas = select("#canvas-holder");
  if (contenedorCanvas) {
    contenedorCanvas.mousePressed(iniciarAudioCatedra);
  }

  generarNuevaObra();
  loop();
}

// ==========================================================================
// BUCLE PRINCIPAL DRAW
// ==========================================================================
function draw() {
  // --- CAMBIO AUTOMÁTICO Y SECO DE PALETA EN FONDO (SIN ANIMACIÓN) ---
  let paletaIndex = valoresPerformaticos.paleta;
  let pCorte = constrain(floor(paletaIndex), 0, 3);

  if (obra && obra.paletas && obra.paletas[pCorte]) {
    let coloresPaleta = obra.paletas[pCorte];
    background(coloresPaleta.fondos[0]);
  } else {
    background(255);
  }

  if (!audioIniciado) {
    fill(30);
    noStroke();
    rect(0, 0, width, height);
    fill(255);
    textSize(14);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text(
      "🎙️ HAZ CLIC EN EL LIENZO PARA INICIAR EL MICRÓFONO",
      width / 2,
      height / 2 - 20,
    );
    textSize(11);
    fill(160);
    textStyle(NORMAL);
    text(
      "Inicia el entorno acústico interactivo por palmas e intensidad circular.",
      width / 2,
      height / 2 + 15,
    );
    return;
  }

  // --- INTERACCIÓN DEL MOUSE ---
  let esVozLarga = durSonido >= umbralDuracionSonido;
  if (!esVozLarga) {
    if (sPaleta) valoresPerformaticos.paleta = float(sPaleta.value());
    if (sFondo) valoresPerformaticos.fondo = float(sFondo.value());
    if (sCantidad) valoresPerformaticos.cantidad = float(sCantidad.value());
    if (sEscala) valoresPerformaticos.escala = float(sEscala.value());
    if (sSecundarias)
      valoresPerformaticos.secundarias = float(sSecundarias.value());
    if (sSinusoide) valoresPerformaticos.sinusoide = float(sSinusoide.value());
    if (sTramasFondo) valoresPerformaticos.tramas = float(sTramasFondo.value());
    if (sOffset) valoresPerformaticos.offset = float(sOffset.value());
  }

  // --- ESCALADO DE SENSIVILIDAD EN VIVO (INTUITIVO INVERTIDO) ---
  if (sSensibilidad) {
    let valorSlider = float(sSensibilidad.value());
    AMP_MAX = map(valorSlider, 1, 20, 0.2, 0.01);
    gestorAmp.maximo = AMP_MAX;
  }

  // --- MOTOR ACÚSTICO NATIVO ---
  amp = mic.getLevel();
  gestorAmp.actualizar(amp);
  intensidad = gestorAmp.filtrada;

  haySonido = intensidad > umbralRuido;
  empezoElSonido = haySonido && !antesHabiaSonido;
  terminoElSonido = !haySonido && antesHabiaSonido;

  if (empezoElSonido) {
    marcaInicioSonido = millis();
  }

  if (haySonido) {
    durSonido = millis() - marcaInicioSonido;

    if (durSonido >= umbralDuracionSonido) {
      modularVolumenCircular(intensidad);

      // Sincronizamos hacia los sliders del HTML en tiempo real
      if (sCantidad && pasoActual === 1)
        sCantidad.value(constrain(floor(valoresPerformaticos.cantidad), 0, 5));
      if (sEscala && pasoActual === 2)
        sEscala.value(floor(valoresPerformaticos.escala));
      if (sSecundarias && pasoActual === 3)
        sSecundarias.value(floor(valoresPerformaticos.secundarias));
      if (sPaleta && pasoActual === 4)
        sPaleta.value(constrain(floor(valoresPerformaticos.paleta), 0, 3));
      if (sFondo && pasoActual === 5)
        sFondo.value(constrain(floor(valoresPerformaticos.fondo), 0, 4)); // Clavado en tope 4
      if (sSinusoide && pasoActual === 6)
        sSinusoide.value(floor(valoresPerformaticos.sinusoide));
      if (sTramasFondo && pasoActual === 7)
        sTramasFondo.value(floor(valoresPerformaticos.tramas));
      if (sOffset && pasoActual === 8)
        sOffset.value(floor(valoresPerformaticos.offset));
    }
  }

  if (terminoElSonido) {
    let duracionFinalTramo = millis() - marcaInicioSonido;

    if (duracionFinalTramo < umbralDuracionSonido) {
      let tiempoDesdeUltimaPalma = millis() - marcaUltimoFinSonido;

      if (tiempoDesdeUltimaPalma < ventanaDoblePalma) {
        retrocederPasoCircular();
      } else {
        avanzarPasoCircular();
      }
      marcaUltimoFinSonido = millis();
    }

    durSonido = 0;
  }

  // --- CALCULO DE AMORTIGUACIONES ELÁSTICAS ---
  let fondoValor = valoresPerformaticos.fondo;
  let cantidadValor = valoresPerformaticos.cantidad;
  let sinusoideValor = valoresPerformaticos.sinusoide;
  let offsetValor = valoresPerformaticos.offset;

  cantidadSuave = lerp(cantidadSuave, cantidadValor, 0.02);
  secundariasSuave = lerp(
    secundariasSuave,
    valoresPerformaticos.secundarias,
    0.03,
  );
  fondoSuave = lerp(fondoSuave, fondoValor, 0.025);
  tramasSuave = lerp(tramasSuave, valoresPerformaticos.tramas, 0.04);

  // --- DIBUJO DE LA OBRA CON CAMBIO AUTOMÁTICO SECO ---
  if (obra) {
    push();
    beginClip();
    rect(0, 0, width / 2, height);
    endClip();
    translate(0, -offsetValor / 2);
    obra.dibujar(
      pCorte,
      fondoSuave,
      constrain(floor(cantidadValor), 0, 5),
      cantidadSuave,
      valoresPerformaticos.escala,
      secundariasSuave,
      tramasSuave,
      sinusoideValor,
    );
    pop();

    push();
    beginClip();
    rect(width / 2, 0, width / 2, height);
    endClip();
    translate(0, offsetValor / 2);
    obra.dibujar(
      pCorte,
      fondoSuave,
      constrain(floor(cantidadValor), 0, 5),
      cantidadSuave,
      valoresPerformaticos.escala,
      secundariasSuave,
      tramasSuave,
      sinusoideValor,
    );
    pop();

    let palElegida = obra.paletas[pCorte];
    let bloquePreview = select("#palette-preview-block");
    let contenedorBarra = select("#palette-bar-container");
    if (bloquePreview && contenedorBarra) {
      if (floor(paletaIndex) >= 0 && palElegida) {
        bloquePreview.style("display", "block");
        contenedorBarra.html("");
        let todosLosColores = palElegida.fondos.concat(palElegida.acentos);
        todosLosColores.forEach((col) => {
          let muestra = createDiv("");
          muestra.addClass("color-swatch");
          muestra.style("background-color", col);
          muestra.parent(contenedorBarra);
        });
      } else {
        bloquePreview.style("display", "none");
      }
    }
  }

  if (
    texturaElegida &&
    (floor(fondoValor) > 0 ||
      floor(cantidadValor) > 0 ||
      valoresPerformaticos.tramas > 0)
  ) {
    blendMode(MULTIPLY);
    tint(255, 145);
    image(texturaElegida, 0, 0, width, height);
    tint(255, 255);
    blendMode(BLEND);
  }

  if (flagFeedback > 0) {
    push();
    fill(255, 255, 255, 140);
    noStroke();
    rect(0, 0, width, height);
    pop();
    flagFeedback--;
  }

  dibujarMonitorCatedra();
  antesHabiaSonido = haySonido;
}

// ==========================================================================
// MODULACIÓN POR VOLUMEN TOROIDAL - CONFIGURACIÓN DE MULTIPLICADORES
// ==========================================================================
function modularVolumenCircular(intensidadFiltrada) {
  let factorEmpuje = intensidadFiltrada * 0.15;

  switch (pasoActual) {
    case 1: // 1. Cantidad de núcleos
      valoresPerformaticos.cantidad =
        (valoresPerformaticos.cantidad + factorEmpuje * 0.5) % 6;
      break;

    case 2: // 2. Escala General (Turbo x50)
      let rangoEscala = 300;
      let escalaRelativa =
        (valoresPerformaticos.escala - 100 + factorEmpuje * 50) %
        (rangoEscala + 1);
      valoresPerformaticos.escala = 100 + escalaRelativa;
      break;

    case 3: // 3. Figuras Intermedias
      valoresPerformaticos.secundarias =
        (valoresPerformaticos.secundarias + factorEmpuje) % 7;
      break;

    case 4: // 4. Paleta Cromática
      valoresPerformaticos.paleta =
        (valoresPerformaticos.paleta + factorEmpuje * 0.8) % 4;
      break;

    case 5: // 5. Estructura de Fondo (🔥 CAMBIADO A % 6)
      valoresPerformaticos.fondo =
        (valoresPerformaticos.fondo + factorEmpuje * 1.5) % 6;
      break;

    case 6: // 6. Amplitud Sinusoide (Veloz x10)
      valoresPerformaticos.sinusoide =
        (valoresPerformaticos.sinusoide + factorEmpuje * 10) % 101;
      break;

    case 7: // 7. Tramas de Fondo (Turbo x6)
      valoresPerformaticos.tramas =
        (valoresPerformaticos.tramas + factorEmpuje * 4) % 36;
      break;

    case 8: // 8. Offset Eje / Asimetría (Turbo x25)
      valoresPerformaticos.offset =
        (valoresPerformaticos.offset + factorEmpuje * 25) % 151;
      break;
  }
}

// ==========================================================================
// GESTIÓN NAVEGACIÓN TOTALMENTE CIRCULAR E INFINITA
// ==========================================================================
function avanzarPasoCircular() {
  pasoActual++;
  if (pasoActual > TOTAL_PASOS) {
    pasoActual = 1;
  }
  if (sndOk && sndOk.isLoaded()) sndOk.play();
  actualizarCartelInterfaz();
  flagFeedback = 5;
}

function retrocederPasoCircular() {
  pasoActual--;
  pasoActual--;
  if (pasoActual < 1) {
    pasoActual = TOTAL_PASOS;
  }
  if (sndBack && sndBack.isLoaded()) sndBack.play();
  actualizarCartelInterfaz();
  flagFeedback = 5;
}

function actualizarCartelInterfaz() {
  let cartel = select("#estado-perfo");
  if (cartel) {
    cartel.html("Estado Actual: " + nombresEstados[pasoActual - 1]);
  }
}

function generarNuevaObra() {
  valoresPerformaticos = {
    paleta: 0,
    fondo: 0,
    cantidad: 0,
    escala: 100,
    secundarias: 0,
    sinusoide: 0,
    tramas: 0,
    offset: 0,
  };
  pasoActual = 1;
  actualizarCartelInterfaz();

  if (texturas.length > 0) {
    let indiceAzar = floor(random(0, texturas.length));
    texturaElegida = texturas[indiceAzar];
  }

  obra = new FamiliaAzar();
}

function guardarCapturaObra() {
  let timestamp =
    year() +
    nf(month(), 2) +
    nf(day(), 2) +
    "-" +
    nf(hour(), 2) +
    nf(minute(), 2) +
    nf(second(), 2);
  saveCanvas("delaunay-generator-" + timestamp, "png");
}

async function iniciarAudioCatedra() {
  if (audioIniciado) return;
  try {
    await userStartAudio();
    mic.start(() => {
      audioIniciado = true;
    });
  } catch (error) {
    console.error("Fallo al inicializar contexto de audio:", error);
  }
}

function keyPressed() {
  if (key === " ") avanzarPasoCircular();
  else if (key.toLowerCase() === "b") retrocederPasoCircular();
  else if (key.toLowerCase() === "r") generarNuevaObra();
}

// ==========================================================================
// INDICADORES TÉCNICOS VISUALES LIMPIOS
// ==========================================================================
function dibujarMonitorCatedra() {
  push();
  fill(15, 15, 15, 235);
  stroke(45);
  strokeWeight(1);
  rect(15, 15, 210, 65, 5);
  noStroke();
  fill(200);
  textSize(9);
  textAlign(LEFT, TOP);

  text(
    "INTENSIDAD: " + intensidad.toFixed(3) + " (UMB: " + umbralRuido + ")",
    25,
    23,
  );
  text("DURACIÓN TRAMO: " + (durSonido / 1000).toFixed(2) + " s", 25, 41);

  let esVozLarga = durSonido >= umbralDuracionSonido;
  fill(esVozLarga ? "#c4a85a" : "#fe3f2c");
  textStyle(BOLD);
  text(
    "MODE: " +
      (haySonido
        ? esVozLarga
          ? "🎙️ PINCELES VOZ"
          : "👏 GOLPE/PALMA"
        : "🛑 SILENCIO"),
    25,
    56,
  );

  fill(50);
  rect(135, 23, 75, 5);
  fill(0, 255, 0);
  rect(135, 23, map(intensidad, 0, 0.4, 0, 75, true), 5);
  stroke(255, 0, 0);
  line(135 + 75 * umbralRuido, 21, 135 + 75 * umbralRuido, 29);
  pop();
}
