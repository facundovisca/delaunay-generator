// ==========================================================================
// ARCHIVO: sketch.js
// INSTRUMENTO PARAMÉTRICO - REINICIO A BLANCO Y CONTROL INMUNE A REDONDEOS
// ==========================================================================

let obra;
let texturas = []; 

// Variables amortiguadoras para transiciones elásticas
let cantidadSuave = 0; 
let secundariasSuave = 0; 
let fondoSuave = 0; 
let tramasSuave = 0; 

// Variable interna flotante para manejar la J sin depender del paso del HTML
let tramasAcumuladas = 0; 

// Referencias a los elementos de control de la interfaz
let sPaleta, sFondo, sCantidad, sEscala, sSecundarias, sTramasFondo, sSinusoide, sOffset;

function preload() {
  for (let i = 1; i <= 6; i++) {
    texturas.push(loadImage('img/textura' + i + '.png'));
  }
}

function setup() {
  let canvas = createCanvas(600, 800);
  canvas.parent('canvas-holder');

  sPaleta = select('#htmlSliderPaleta');
  sFondo = select('#htmlSliderFondo');
  sCantidad = select('#htmlSliderCantidad'); 
  sEscala = select('#htmlSliderEscala'); 
  sSecundarias = select('#htmlSliderSecundarias');
  sSinusoide = select('#htmlSliderSinusoide'); 
  sTramasFondo = select('#htmlSliderTramasFondo'); 
  sOffset = select('#htmlSliderOffset'); 

  // Vinculación de botón Generar
  let btnG = document.getElementById('btnGenerar');
  if (btnG) {
    btnG.onclick = () => generarNuevaObra();
  }

  // Vinculación de botón Descargar Obra
  let btnD = document.getElementById('btnDescargar');
  if (btnD) {
    btnD.onclick = () => guardarCapturaObra();
  }

  generarNuevaObra();
  
  if (sTramasFondo) {
    tramasAcumuladas = float(sTramasFondo.value());
  }
  
  loop(); 
}

function draw() {
  background(255); // Fondo digital blanco estricto del lienzo
  
  let esMayus = keyIsDown(SHIFT);

  // --- DETECCIÓN CONTINUA ---
  if (keyIsPressed) {
    let letra = key.toLowerCase();

    // 4. Escala General (Tecla F)
    if (letra === 'f' && sEscala) {
      let v = float(sEscala.value()) + (esMayus ? -3 : 3);
      sEscala.value(constrain(v, 100, 400));
    }
    // 6. Amplitud Sinusoide (Tecla H)
    else if (letra === 'h' && sSinusoide) {
      let v = float(sSinusoide.value()) + (esMayus ? -1 : 1);
      sSinusoide.value(constrain(v, 0, 100));
    }
    // 7. Tramas de Fondo (Tecla J y J Mayúscula)
    else if (letra === 'j' && sTramasFondo) {
      tramasAcumuladas += (esMayus ? -0.25 : 0.25);
      tramasAcumuladas = constrain(tramasAcumuladas, 0, 35);
      sTramasFondo.value(round(tramasAcumuladas));
    }
    // 8. Offset Eje / Asimetría (Tecla K y K Mayúscula)
    else if (letra === 'k' && sOffset) {
      let v = float(sOffset.value()) + (esMayus ? -1.5 : 1.5);
      sOffset.value(constrain(v, 0, 150));
    }
  }

  // Lectura unificada de parámetros objetivos reales
  let fondoValor = sFondo ? sFondo.value() : 0;
  let cantidadValor = sCantidad ? sCantidad.value() : 0;
  let sinusoideValor = sSinusoide ? sSinusoide.value() : 0;
  let offsetValor = sOffset ? sOffset.value() : 0; 
  let paletaIndex = sPaleta ? sPaleta.value() : 0;

  // === MOTOR DE ANIMACIÓN LENTA POR INTERPOLACIÓN ===
  cantidadSuave = lerp(cantidadSuave, cantidadValor, 0.02);
  secundariasSuave = lerp(secundariasSuave, sSecundarias ? sSecundarias.value() : 0, 0.03); 
  fondoSuave = lerp(fondoSuave, fondoValor, 0.025); 
  tramasSuave = lerp(tramasSuave, tramasAcumuladas, 0.04); 

  if (obra) {
    // --- MITAD IZQUIERDA ---
    push();
    beginClip(); rect(0, 0, width / 2, height); endClip();
    translate(0, -offsetValor / 2);
    obra.dibujar(paletaIndex, fondoSuave, cantidadValor, cantidadSuave, sEscala.value(), secundariasSuave, tramasSuave, sinusoideValor);
    pop();

    // --- MITAD DERECHA ---
    push();
    beginClip(); rect(width / 2, 0, width / 2, height); endClip();
    translate(0, offsetValor / 2);
    obra.dibujar(paletaIndex, fondoSuave, cantidadValor, cantidadSuave, sEscala.value(), secundariasSuave, tramasSuave, sinusoideValor);
    pop();

    // === INTERFAZ REACTIVA: BARRA CROMÁTICA CON PROTECCIÓN ===
    let palElegida = obra.paletas[paletaIndex];
    let bloquePreview = select('#palette-preview-block');
    let contenedorBarra = select('#palette-bar-container');
    
    if (bloquePreview && contenedorBarra) {
      if (paletaIndex > 0 && palElegida) {
        bloquePreview.style("display", "block");
        contenedorBarra.html(""); 
        let todosLosColores = palElegida.fondos.concat(palElegida.acentos);
        todosLosColores.forEach(col => {
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

  // Solo aplica la textura si hay elementos activos en la grilla para no manchar el lienzo blanco
  if (texturas.length > 0 && (fondoValor > 0 || cantidadValor > 0 || tramasAcumuladas > 0)) {
    blendMode(MULTIPLY); tint(255, 145); image(texturas[0], 0, 0, width, height); tint(255, 255); blendMode(BLEND); 
  }
}

function keyPressed() {
  let esMayus = keyIsDown(SHIFT);

  if ((key === 'a' || key === 'A') && sPaleta) {
    let v = int(sPaleta.value());
    sPaleta.value(esMayus ? (v - 1 + 4) % 4 : (v + 1) % 4);
  }
  else if ((key === 's' || key === 'S') && sFondo) {
    let v = int(sFondo.value());
    sFondo.value(esMayus ? (v - 1 + 4) % 4 : (v + 1) % 4);
  }
  else if ((key === 'd' || key === 'D') && sCantidad) {
    let v = int(sCantidad.value());
    sCantidad.value(esMayus ? (v - 1 + 6) % 6 : (v + 1) % 6);
  }
  else if ((key === 'g' || key === 'G') && sSecundarias) {
    let v = int(sSecundarias.value());
    sSecundarias.value(esMayus ? (v - 1 + 7) % 7 : (v + 1) % 7);
  }

  if (key === ' ' || key === 'r' || key === 'R') {
    generarNuevaObra();
  }
}

// ACTUALIZADO: Forzamos a que el sistema limpie toda la interfaz y regrese al lienzo en blanco total
function generarNuevaObra() {
  if (sPaleta) sPaleta.value(0);
  if (sFondo) sFondo.value(0);
  if (sCantidad) sCantidad.value(0);
  if (sSecundarias) sSecundarias.value(0);
  if (sSinusoide) sSinusoide.value(0);
  if (sTramasFondo) sTramasFondo.value(0);
  if (sOffset) sOffset.value(0);
  if (sEscala) sEscala.value(100); 

  cantidadSuave = 0;
  secundariasSuave = 0;
  fondoSuave = 0;
  tramasSuave = 0;
  tramasAcumuladas = 0;

  obra = new FamiliaAzar();
}

function guardarCapturaObra() {
  let timestamp = year() + nf(month(), 2) + nf(day(), 2) + "-" + nf(hour(), 2) + nf(minute(), 2) + nf(second(), 2);
  saveCanvas("delaunay-generator" + timestamp, "png");
}