let obra;
let texturas = [];
let texturaElegida; // Guarda la textura fija seleccionada al azar

// Audios para el feedback de la interfaz
let sndOk, sndBack, sndSave; // 🔥 CAMBIO: Agregamos sndSave para el sonido de guardado

// Variables para transiciones (animación)
let cantidadSuave = 0;
let secundariasSuave = 0;
let fondoSuave = 0;
let tramasSuave = 0;

// Estado de los pinceles en la obra actual
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
  sSensibilidad,
  sUmbral;

// Configuración y calibración de audio
let AMP_MIN = 0.04; // Piso para aislar estática y ruido de fondo
let AMP_MAX = 0.28; // Para atenuar micrófonos muy sensibles
let umbralRuido = 0.16; // Umbral de corte base
let umbralDuracionSonido = 400; // Tiempo mínimo para considerar sonido continuo
let ventanaDoblePalma = 400; // Margen de tiempo para detectar la doble palma

let mic;
let audioIniciado = false;
let amp = 0;
let intensidad = 0;
let intensidadSuaveAudio = 0; // Filtro del audio para evitar picos bruscos

// Variables para detectar los estados del sonido
let haySonido = false;
let antesHabiaSonido = false;
let empezoElSonido = false;
let terminoElSonido = false;

let marcaInicioSonido = 0;
let durSonido = 0;
let marcaUltimoFinSonido = 0; // Para medir el tiempo entre aplausos

// Configuración de la secuencia de pasos
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

const textosInstrucciones = [
  "Emití un sonido sostenido para agregar las figuras principales de la obra (entre 1 y 5). Para confirmar y pasar al siguiente paso, da una palma o un chasquido, o dos para volver al estado anterior.",
  "Hablá o cantá cerca del micrófono para agrandar las figuras. Con una palma avanzás a las figuras intermedias y dos para regresas al estado anterior.",
  "Emití un sonido sostenido para agregar figuras secundarias dentro de cada núcleo. Una palma avanza a la paleta; dos palmas vuelven a la escala.",
  "Hablá o cantá cerca del micrófono para cambiar la paleta de colores inspiradas en Sonia Delaunay. Una palma avanza al fondo; dos palmas regresan.",
  "Usá tu voz para elegir la configuración del fondo en color pleno, mitades, cuadrantes, o bloques asimétricos. Da una palma para pasar al siguiente paso, o dos palmas para volver a la paleta.",
  "Emití un sonido sostenido para generar una figura en forma de 'S' por fuera de los núcleos. Una palma pasa a las tramas; dos regresan.",
  "Sostené el sonido para hacer agregar un sistema anillos en el fondo de la obra. Una palma avanza al paso final, y dosvuelven al paso anterior.",
  "Emití sonido para para desplazar verticalmente las dos mitades del lienzo, quebrando la simetrya perfecta de la pieza. Una palma vuelve al inicio; dos palmas vuelven a las tramas.",
];

let flagFeedback = 0; // Duración del pestañeo blanco al cambiar de paso
let exportandoPNG = false; // Bandera para ocultar el monitor técnico al guardar

// Variables para el autoguardado por silencio
let marcaInicioSilencio = 0;
let yaSeGuardoPorSilencio = false;
let flagGatillarCaptura = false;

// ==========================================================================
// PRELOAD & SETUP
// ==========================================================================

function preload() {
  for (let i = 1; i <= 6; i++) {
    texturas.push(loadImage("img/textura" + i + ".png"));
  }
  sndOk = loadSound("sound/ok.wav");
  sndBack = loadSound("sound/back.wav");
  sndSave = loadSound("sound/save.wav"); // 🔥 CAMBIO: Cargamos el archivo save.wav
}

function setup() {
  let canvas = createCanvas(600, 800);
  canvas.parent("canvas-holder");

  // Vinculamos las variables con los sliders del HTML
  sPaleta = select("#htmlSliderPaleta");
  sFondo = select("#htmlSliderFondo");
  sCantidad = select("#htmlSliderCantidad");
  sEscala = select("#htmlSliderEscala");
  sSecundarias = select("#htmlSliderSecundarias");
  sTramasFondo = select("#htmlSliderTramasFondo");
  sSinusoide = select("#htmlSliderSinusoide"); 
  sOffset = select("#htmlSliderOffset");
  sSensibilidad = select("#htmlSliderSensibilidad");
  sUmbral = select("#htmlSliderUmbral");

  // Iniciamos el micrófono y el gestor de señal
  mic = new p5.AudioIn();
  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorAmp.f = 0.88;

  // Eventos de los botones de la interfaz
  let btnG = document.getElementById("btnGenerar");
  if (btnG) btnG.onclick = () => generarNuevaObra();

  let btnD = document.getElementById("btnDescargar");
  if (btnD) btnD.onclick = () => prepararCapturaLimpia();

  // Botón comenzar de la pantalla de bienvenida
  let btnComenzar = document.getElementById("btnComenzarPerfo");
  if (btnComenzar) {
    btnComenzar.onclick = () => {
      iniciarEntornoAudio();
      marcaInicioSilencio = millis();
      yaSeGuardoPorSilencio = false;

      let screen = document.getElementById("welcome-screen");
      if (screen) screen.classList.add("hidden");
    };
  }

  generarNuevaObra();
  loop();
}

// ==========================================================================
// BUCLE PRINCIPAL DRAW
// ==========================================================================

function draw() {
  let paletaIndex = valoresPerformaticos.paleta;
  let pCorte = constrain(floor(paletaIndex), 0, 3);

  if (obra && obra.paletas && obra.paletas[pCorte]) {
    let coloresPaleta = obra.paletas[pCorte];
    background(coloresPaleta.fondos[0]);
  } else {
    background(255);
  }

  if (!audioIniciado) {
    background(20);
    return;
  }

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

  if (sSensibilidad) {
    let valorSlider = float(sSensibilidad.value());
    AMP_MAX = map(valorSlider, 1, 20, 0.35, 0.03);
    gestorAmp.maximo = AMP_MAX;
  }

  if (sUmbral) {
    umbralRuido = float(sUmbral.value());
  }

  amp = mic.getLevel();
  gestorAmp.actualizar(amp);

  intensidad = gestorAmp.filtrada;
  intensidadSuaveAudio = lerp(intensidadSuaveAudio, intensidad, 0.04);

  let antesHabiaSonido_local = haySonido;
  haySonido = intensidad > umbralRuido;
  empezoElSonido = haySonido && !antesHabiaSonido_local;
  terminoElSonido = !haySonido && antesHabiaSonido_local;

  if (empezoElSonido) {
    marcaInicioSonido = millis();
  }

  if (haySonido) {
    marcaInicioSilencio = millis();
    yaSeGuardoPorSilencio = false;

    durSonido = millis() - marcaInicioSonido;

    if (durSonido >= umbralDuracionSonido) {
      modularVolumenCircular(intensidadSuaveAudio);

      if (sCantidad && pasoActual === 1)
        sCantidad.value(constrain(floor(valoresPerformaticos.cantidad), 0, 5));
      if (sEscala && pasoActual === 2)
        sEscala.value(floor(valoresPerformaticos.escala));
      if (sSecundarias && pasoActual === 3)
        sSecundarias.value(floor(valoresPerformaticos.secundarias));
      if (sPaleta && pasoActual === 4)
        sPaleta.value(constrain(floor(valoresPerformaticos.paleta), 0, 3));
      if (sFondo && pasoActual === 5)
        sFondo.value(constrain(floor(valoresPerformaticos.fondo), 0, 5));
      if (sSinusoide && pasoActual === 6)
        sSinusoide.value(floor(valoresPerformaticos.sinusoide));
      if (sTramasFondo && pasoActual === 7)
        sTramasFondo.value(floor(valoresPerformaticos.tramas));
      if (sOffset && pasoActual === 8)
        sOffset.value(floor(valoresPerformaticos.offset));
    }
  } else {
    let tiempoEnSilencio = millis() - marcaInicioSilencio;
    if (
      tiempoEnSilencio >= 10000 &&
      !yaSeGuardoPorSilencio &&
      !flagGatillarCaptura
    ) {
      prepararCapturaLimpia();
      yaSeGuardoPorSilencio = true;
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

  let fondoValor = valoresPerformaticos.fondo;
  let cantidadValor = valoresPerformaticos.cantidad;
  let sinusoideValor = valoresPerformaticos.sinusoide;
  let offsetValor = valoresPerformaticos.offset;

  cantidadSuave = lerp(cantidadSuave, cantidadValor, 0.35);
  secundariasSuave = lerp(
    secundariasSuave,
    valoresPerformaticos.secundarias,
    0.12,
  );
  fondoSuave = lerp(fondoSuave, fondoValor, 0.25);
  tramasSuave = lerp(tramasSuave, valoresPerformaticos.tramas, 0.04);

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

  if (!exportandoPNG) {
    dibujarMonitorDatos();
  }

  if (flagGatillarCaptura) {
    // 🔥 CAMBIO: Disparamos el sonido save.wav al confirmar la exportación
    if (sndSave && sndSave.isLoaded()) {
      sndSave.play();
    }

    let timestamp =
      year() +
      nf(month(), 2) +
      nf(day(), 2) +
      "-" +
      nf(hour(), 2) +
      nf(minute(), 2) +
      nf(second(), 2);
    saveCanvas("sonia-delaunay-generator-" + timestamp, "png");
    flagGatillarCaptura = false;
    exportandoPNG = false;
  }
}

// ==========================================================================
// FUNCIONES AUXILIARES
// ==========================================================================

function modularVolumenCircular(intensidadFiltrada) {
  let factorEmpuje = intensidadFiltrada * 0.15;

  switch (pasoActual) {
    case 1:
      valoresPerformaticos.cantidad =
        (valoresPerformaticos.cantidad + factorEmpuje * 0.4) % 6;
      break;
    case 2:
      let rangoEscala = 300;
      let escalaRelativa =
        (valoresPerformaticos.escala - 100 + factorEmpuje * 30) %
        (rangoEscala + 1);
      valoresPerformaticos.escala = 100 + escalaRelativa;
      break;
    case 3:
      valoresPerformaticos.secundarias =
        (valoresPerformaticos.secundarias + factorEmpuje * 0.4) % 7;
      break;
    case 4:
      valoresPerformaticos.paleta =
        (valoresPerformaticos.paleta + factorEmpuje * 0.2) % 4;
      break;
    case 5:
      valoresPerformaticos.fondo =
        (valoresPerformaticos.fondo + factorEmpuje * 0.5) % 6;
      break;
    case 6:
      valoresPerformaticos.sinusoide =
        (valoresPerformaticos.sinusoide + factorEmpuje * 5) % 101;
      break;
    case 7:
      valoresPerformaticos.tramas =
        (valoresPerformaticos.tramas + factorEmpuje * 0.5) % 36;
      break;
    case 8:
      valoresPerformaticos.offset =
        (valoresPerformaticos.offset + factorEmpuje * 5) % 151;
      break;
  }
}

function avanzarPasoCircular() {
  pasoActual++;
  if (pasoActual > TOTAL_PASOS) pasoActual = 1;
  if (sndOk && sndOk.isLoaded()) sndOk.play();
  actualizarCartelInterfaz();
  flagFeedback = 5;
}

function retrocederPasoCircular() {
  pasoActual--;
  pasoActual--;
  if (pasoActual < 1) pasoActual = TOTAL_PASOS;
  if (sndBack && sndBack.isLoaded()) sndBack.play();
  actualizarCartelInterfaz();
  flagFeedback = 5;
}

function actualizarCartelInterfaz() {
  let cartel = select("#estado-perfo");
  if (cartel) cartel.html("Estado Actual: " + nombresEstados[pasoActual - 1]);

  let parrafoInstruccion = select("#htmlTextoInstruccion");
  if (parrafoInstruccion)
    parrafoInstruccion.html(textosInstrucciones[pasoActual - 1]);
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

  cantidadSuave = 0;
  secundariasSuave = 0;
  fondoSuave = 0;
  tramasSuave = 0;
  intensidadSuaveAudio = 0;

  if (sCantidad) sCantidad.value(0);
  if (sEscala) sEscala.value(100);
  if (sSecundarias) sSecundarias.value(0);
  if (sPaleta) sPaleta.value(0);
  if (sFondo) sFondo.value(0);
  if (sSinusoide) sSinusoide.value(0);
  if (sTramasFondo) sTramasFondo.value(0);
  if (sOffset) sOffset.value(0);

  actualizarCartelInterfaz();

  if (texturas.length > 0) {
    let indiceAzar = floor(random(0, texturas.length));
    texturaElegida = texturas[indiceAzar];
  }
  obra = new FamiliaAzar();
}

function prepararCapturaLimpia() {
  exportandoPNG = true;
  flagGatillarCaptura = true;
}

async function iniciarEntornoAudio() {
  if (audioIniciado) return;
  try {
    await userStartAudio();
    mic.start(() => {
      audioIniciado = true;
    });
  } catch (error) {
    console.error("Error al inicializar el micrófono:", error);
  }
}

function keyPressed() {
  if (key === " ") avanzarPasoCircular();
  else if (key.toLowerCase() === "b") retrocederPasoCircular();
  else if (key.toLowerCase() === "r") generarNuevaObra();
}

function dibujarMonitorDatos() {
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
    "INTENSIDAD: " +
      intensidad.toFixed(3) +
      " (UMB: " +
      umbralRuido.toFixed(2) +
      ")",
    25,
    23,
  );
  text("DURACION TRAMO: " + (durSonido / 1000).toFixed(2) + " s", 25, 41);

  let esVozLarga = durSonido >= umbralDuracionSonido;
  fill(esVozLarga ? "#c4a85a" : "#fe3f2c");
  textStyle(BOLD);
  let msgModo = "🛑 SILENCIO";
  if (haySonido) {
    msgModo = esVozLarga ? "🎙️ PINCELES VOZ" : "👏 GOLPE / PALMA";
  } else {
    let sRestantes = max(0, 10 - (millis() - marcaInicioSilencio) / 1000);
    if (!yaSeGuardoPorSilencio)
      msgModo = "⏱️ AUTO-PNG EN: " + sRestantes.toFixed(1) + "s";
    else msgModo = "💾 CAPTURA OK";
  }

  text("MODE: " + msgModo, 25, 56);

  fill(50);
  rect(135, 23, 75, 5);
  fill(0, 255, 0);
  rect(135, 23, map(intensidad, 0, 0.4, 0, 75, true), 5);

  stroke(255, 0, 0);
  let posLineaRoja = map(umbralRuido, 0, 0.4, 0, 75, true);
  line(135 + posLineaRoja, 21, 135 + posLineaRoja, 29);
  pop();
}