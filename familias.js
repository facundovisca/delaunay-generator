// ==========================================================================
// ARCHIVO: familias.js
// MOTOR VISUAL/GEOMÉTRICO Y CAPAS DE RENDERIZADO
// ==========================================================================

class FamiliaAzar {
  constructor() {
    this.cx = width / 2;
    this.scale = 0.85;

    // Listado de paletas cromáticas inspiradas en la familia de obras de Sonia Delaunay
    this.paletas = [
      {
        id: "F1",
        fondos: ["#5F93A9", "#F8D821"],
        acentos: [
          "#34393e",
          "#fe3f2c",
          "#c2cd1d",
          "#6BA0B8",
          "#9ea091",
          "#4f74d1",
          "#f6fffc",
          "#898A88",
          "#ab9f3d",
          "#b7d752",
        ],
      },
      {
        id: "F2",
        fondos: ["#8fa8b0", "#c4a85a", "#b8b8b0", "#d4b870"],
        acentos: [
          "#1a1a1a",
          "#f0ede6",
          "#e8c700",
          "#d42b1e",
          "#e05a1a",
          "#3a8c2f",
          "#2060b0",
          "#c94060",
          "#e8a030",
          "#f5c0b0",
          "#6ab8d0",
          "#c8d040",
          "#5090c8",
          "#88c870",
        ],
      },
      {
        id: "F3",
        fondos: ["#fdfbfa", "#f6f2eb", "#eae2d5", "#d0bfa6"], // Fondos claros tipo hueso o arena
        acentos: [
          "#2d2a29",
          "#eedebc",
          "#5d7648",
          "#f3e8cd",
          "#c5422d",
          "#373334",
          "#6981b7",
        ],
      },
      {
        id: "F4",
        fondos: ["#f3f0e8", "#e6e0d6"],
        acentos: [
          "#111111",
          "#d7263d",
          "#3562b7",
          "#f2c94c",
          "#1f2a44",
          "#243b55",
          "#2c3e50",
        ],
      },
    ];

    this.pal = random(this.paletas);
    this.ySplitL = height * 0.38;
    this.ySplitR = height * 0.61;

    // Estructura para los anillos concéntricos del fondo (trama compleja)
    this.disenoAnillosTraseros = [];
    for (let i = 0; i < 40; i++) {
      this.disenoAnillosTraseros.push({
        grosorAleatorio: random() < 0.65 ? random(2, 6) : random(15, 35),
        aireSiguiente: random(12, 28),
      });
    }

    // Configuración de grosores para las capas secundarias internas
    this.disenoFigurasIntermedias = [];
    for (let j = 0; j < 10; j++) {
      this.disenoFigurasIntermedias.push({
        grosorFactor: random() < 0.7 ? random(0.15, 0.45) : random(0.6, 1.25),
      });
    }

    // Generación de la semilla morfológica para los 5 núcleos potenciales
    this.poolNodos = [];
    let ladosBase = ["L", "R", "L", "R", "L"];

    let idxPrincipalAnt = null;
    let idxSecundarioAnt = null;
    let idxCentroAnt = null;
    let contadorNegros = 0;

    for (let i = 0; i < 5; i++) {
      let poolIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      let evitarP = [];
      if (idxPrincipalAnt !== null) evitarP.push(idxPrincipalAnt);
      if (idxSecundarioAnt !== null) evitarP.push(idxSecundarioAnt);
      let idxP = this.validarIndice(poolIndices, evitarP);

      let evitarS = [idxP];
      if (idxSecundarioAnt !== null) evitarS.push(idxSecundarioAnt);
      let idxS = this.validarIndice(poolIndices, evitarS);

      let idxC;
      if (contadorNegros < 2 && random() < 0.45) {
        idxC = 0;
        contadorNegros++;
      } else {
        let evitarC = [idxP, idxS];
        if (idxCentroAnt !== null) evitarC.push(idxCentroAnt);
        idxC = this.validarIndice(poolIndices, evitarC);
      }

      this.poolNodos.push({
        lado: ladosBase[i],
        genArcoF1: random(),
        genAnilloF2: random(),
        genPuroF4: random(),
        genRemix1_4: random(),
        idxPrincipal: idxP,
        idxSecundario: idxS,
        idxCentro: idxC,
      });

      idxPrincipalAnt = idxP;
      idxSecundarioAnt = idxS;
      idxCentroAnt = idxC;
    }

    if (contadorNegros === 0) {
      this.poolNodos[1].idxCentro = 0;
    }
  }

  // Evita que se repitan colores contiguos en el mismo núcleo
  validarIndice(pool, IP) {
    let opciones = pool.filter((idx) => !IP.includes(idx));
    return opciones.length > 0 ? random(opciones) : random(pool);
  }

  // Maneja la interpolación visual al mover el slider de fondo
  dibujarFondo(valFondoAnimado, colF1, colF2) {
    noStroke();
    let hExtra = 300;
    let yInicio = -hExtra;
    let altoTotal = height + hExtra * 2;

    let fondoBase = floor(valFondoAnimado);
    let fondoSiguiente = ceil(valFondoAnimado);
    let fraccion = valFondoAnimado - fondoBase;

    this.renderEstructuraEspecifica(
      fondoBase,
      255,
      colF1,
      colF2,
      yInicio,
      altoTotal,
      hExtra,
    );

    if (fraccion > 0) {
      let alphaTransicion = fraccion * 255;
      this.renderEstructuraEspecifica(
        fondoSiguiente,
        alphaTransicion,
        colF1,
        colF2,
        yInicio,
        altoTotal,
        hExtra,
      );
    }
  }

  // Renderiza las divisiones geométricas del fondo según el tipo
  renderEstructuraEspecifica(
    tipo,
    alphaVal,
    colF1,
    colF2,
    yInicio,
    altoTotal,
    hExtra,
  ) {
    let c1 = color(colF1);
    c1.setAlpha(alphaVal);
    let c2 = color(colF2);
    c2.setAlpha(alphaVal);
    noStroke();

    switch (tipo) {
      case 0:
        break;
      case 1: // Dividido vertical simétrico
        fill(c1);
        rect(0, yInicio, this.cx, altoTotal);
        fill(c2);
        rect(this.cx, yInicio, this.cx, altoTotal);
        break;
      case 2: // Dividido vertical invertido
        fill(c2);
        rect(0, yInicio, this.cx, altoTotal);
        fill(c1);
        rect(this.cx, yInicio, this.cx, altoTotal);
        break;
      case 3: // Cuadrantes asimétricos desfasados
        fill(c1);
        rect(0, yInicio, this.cx, this.ySplitL + hExtra);
        fill(c2);
        rect(0, this.ySplitL, this.cx, height - this.ySplitL + hExtra);
        fill(c2);
        rect(this.cx, yInicio, this.cx, this.ySplitR + hExtra);
        fill(c1);
        rect(this.cx, this.ySplitR, this.cx, height - this.ySplitR + hExtra);
        break;
      case 4: // Cuadrantes asimétricos invertidos
        fill(c2);
        rect(0, yInicio, this.cx, this.ySplitL + hExtra);
        fill(c1);
        rect(0, this.ySplitL, this.cx, height - this.ySplitL + hExtra);
        fill(c1);
        rect(this.cx, yInicio, this.cx, this.ySplitR + hExtra);
        fill(c2);
        rect(this.cx, this.ySplitR, this.cx, height - this.ySplitR + hExtra);
        break;
      case 5: // Bloques con compresión vertical
        let yDesplazadoL = this.ySplitL * 0.65;
        let yDesplazadoR = this.ySplitR * 1.25;
        fill(c1);
        rect(0, yInicio, this.cx, yDesplazadoL + hExtra);
        fill(c2);
        rect(0, yDesplazadoL, this.cx, height - yDesplazadoL + hExtra);
        fill(c2);
        rect(this.cx, yInicio, this.cx, yDesplazadoR + hExtra);
        fill(c1);
        rect(this.cx, yDesplazadoR, this.cx, height - yDesplazadoR + hExtra);
        break;
    }
  }

  // Dibuja un semicírculo puro relleno
  renderMasaSemicirculo(lado, y, d, colHex, alphaVal = 255, flip = 1) {
    let c = color(colHex);
    c.setAlpha(alphaVal);
    fill(c);
    noStroke();
    let a1 = lado === "L" ? HALF_PI : -HALF_PI;
    let a2 = lado === "L" ? HALF_PI + PI : HALF_PI;
    arc(this.cx, y, d, d, a1 * flip, a2 * flip);
  }

  // Dibuja un arco con grosor de línea determinado sin relleno
  renderAnilloCalado(lado, y, dExt, grosorFijo, colHex, alphaVal = 255) {
    let c = color(colHex);
    c.setAlpha(alphaVal);
    push();
    noFill();
    stroke(c);
    strokeCap(SQUARE);
    strokeWeight(grosorFijo);
    let a1 = lado === "L" ? HALF_PI : -HALF_PI;
    let a2 = lado === "L" ? HALF_PI + PI : HALF_PI;
    let dMedio = dExt - grosorFijo;
    if (dMedio <= 0) dMedio = 10;
    arc(this.cx, y, dMedio, dMedio, a1, a2);
    pop();
  }

  // Dibuja la trama de anillos concéntricos del fondo
  dibujarTramasTraseras(valTramasAnimada, acentos, fEscala) {
    if (valTramasAnimada <= 0) return;
    let dActual = 1300 * fEscala;
    let totalAProcesar = ceil(valTramasAnimada);

    for (let i = 0; i < totalAProcesar; i++) {
      let config =
        this.disenoAnillosTraseros[i % this.disenoAnillosTraseros.length];
      let colR = acentos[(i + 1) % acentos.length];
      let colL = acentos[(i + 4) % acentos.length];
      let grosorCalibrado = config.grosorAleatorio * fEscala;
      let restoT = valTramasAnimada - i;
      let alphaAnillo = constrain(restoT, 0, 1) * 255;

      if (alphaAnillo > 0) {
        this.renderAnilloCalado(
          "R",
          height / 2,
          dActual,
          grosorCalibrado,
          colR,
          alphaAnillo,
        );
        this.renderAnilloCalado(
          "L",
          height / 2,
          dActual,
          grosorCalibrado,
          colL,
          alphaAnillo,
        );
      }
      dActual -= grosorCalibrado + config.aireSiguiente * fEscala;
      if (dActual < 10) break;
    }
  }

  // Función principal de renderizado de la obra
  dibujar(
    idxPaleta,
    valFondoAnimado,
    cantNodosFisicos,
    cantNodosAnimada,
    valEscala,
    valD2Animada,
    valTramasAnimada,
    valSinusoide,
  ) {
    let palElegida = this.paletas[idxPaleta];
    let acentos = palElegida.acentos;

    let indicesUsadosPorTotem = new Set();
    this.poolNodos.forEach((nodo) => {
      indicesUsadosPorTotem.add(nodo.idxPrincipal % acentos.length);
      indicesUsadosPorTotem.add(nodo.idxSecundario % acentos.length);
      indicesUsadosPorTotem.add(nodo.idxCentro % acentos.length);
    });

    let opcionesLibres = [];
    for (let i = 0; i < acentos.length; i++) {
      if (!indicesUsadosPorTotem.has(i)) opcionesLibres.push(acentos[i]);
    }
    if (opcionesLibres.length < 2) opcionesLibres = palElegida.fondos;

    let idxBase = floor(valFondoAnimado) % palElegida.fondos.length;
    let idxSiguiente = ceil(valFondoAnimado) % palElegida.fondos.length;

    let fondoColor1 = palElegida.fondos[idxBase];
    let fondoColor2 = palElegida.fondos[idxSiguiente];

    if (palElegida.id === "F4") {
      fondoColor1 = palElegida.fondos[0];
      fondoColor2 = "#16191e";
      if (
        this.poolNodos[0] &&
        acentos[this.poolNodos[0].idxPrincipal % acentos.length] === "#111111"
      ) {
        fondoColor2 = "#252930";
      }
    }

    let factorEscalaSlider = map(valEscala, 100, 400, 1, 1.15);

    // Capa 1: Geometría de fondo
    this.dibujarFondo(valFondoAnimado, fondoColor1, fondoColor2);

    // Capa 2: Tramas concéntricas traseras
    this.dibujarTramasTraseras(valTramasAnimada, acentos, factorEscalaSlider);

    if (cantNodosFisicos <= 0 && cantNodosAnimada <= 0) return;

    // Calcula distribución y tamaño de los núcleos según la cantidad activa
    let maxDiamPorAncho = width * this.scale;
    let maxDiamPorAlto =
      (height * this.scale) / (cantNodosFisicos > 0 ? cantNodosFisicos : 1);
    let diametroD1 = min(maxDiamPorAncho, maxDiamPorAlto) * factorEscalaSlider;
    let radioD1 = diametroD1 / 2;
    let altoTotalTotem =
      diametroD1 * (cantNodosFisicos > 0 ? cantNodosFisicos : 1);
    let yInicial = height / 2 - altoTotalTotem / 2 + radioD1;

    let nodosActivos = [];
    for (let i = 0; i < ceil(cantNodosAnimada); i++) {
      let yPos = yInicial + i * diametroD1;
      let seed = this.poolNodos[i];
      if (!seed) continue;

      let resto = cantNodosAnimada - i;
      let factorOpacidad = constrain(resto, 0, 1);
      let alphaNodo = factorOpacidad * 255;

      if (alphaNodo > 0) {
        nodosActivos.push({
          y: yPos,
          lado: seed.lado,
          d1: diametroD1,
          alpha: alphaNodo,
          genArcoF1: seed.genArcoF1,
          genAnilloF2: seed.genAnilloF2,
          genPuroF4: seed.genPuroF4,
          genRemix1_4: seed.genRemix1_4,
          idxPrincipal: seed.idxPrincipal,
          idxSecundario: seed.idxSecundario,
          colorPrincipal: acentos[seed.idxPrincipal % acentos.length],
          colorSecundario: acentos[seed.idxSecundario % acentos.length],
          colorCentro: acentos[seed.idxCentro % acentos.length],
        });
      }
    }

    // Capa 3: Dibujo de las estructuras internas de cada núcleo
    nodosActivos.forEach((n) => {
      let diametroD3 = n.d1 * 0.3;
      let cA = n.colorPrincipal;
      let cB = n.colorSecundario;
      let expMorfologico = map(n.genAnilloF2, 0, 1, 1.4, 2.5);
      let maxCapasSecundarias = ceil(valD2Animada);

      // Comportamiento morfológico tipo Remix
      if (n.genRemix1_4 > 0.7) {
        if (n.genArcoF1 > 0.5) {
          this.renderMasaSemicirculo("L", n.y, n.d1, cA, n.alpha);
          this.renderMasaSemicirculo("R", n.y, n.d1, cB, n.alpha);
          for (let j = maxCapasSecundarias; j >= 1; j--) {
            let restoS = valD2Animada - (j - 1);
            let alphaSecundaria = constrain(restoS, 0, 1) * n.alpha;
            let normPaso = pow(map(j, 0, 6, 0, 1), expMorfologico);
            let nudoDiam = map(normPaso, 0, 1, diametroD3, n.d1);
            let colL = acentos[(n.idxPrincipal + j) % acentos.length];
            let colR = acentos[(n.idxSecundario + j) % acentos.length];
            this.renderMasaSemicirculo(
              "L",
              n.y,
              nudoDiam,
              colL,
              alphaSecundaria,
            );
            this.renderMasaSemicirculo(
              "R",
              n.y,
              nudoDiam,
              colR,
              alphaSecundaria,
            );
          }
        } else {
          this.renderMasaSemicirculo("L", n.y, n.d1, cA, n.alpha);
          this.renderMasaSemicirculo("R", n.y, n.d1, cB, n.alpha);
          let colMascaraL = fondoColor1;
          for (let j = maxCapasSecundarias; j >= 1; j--) {
            let restoS = valD2Animada - (j - 1);
            let alphaSecundaria = constrain(restoS, 0, 1) * n.alpha;
            let normPaso = pow(map(j, 0, 6, 0, 1), expMorfologico);
            let nudoDiam = map(normPaso, 0, 1, diametroD3, n.d1);
            let colF = acentos[(n.idxSecundario + j) % acentos.length];
            if (j % 2 === 0) colF = colMascaraL;
            this.renderMasaSemicirculo(
              "L",
              n.y,
              nudoDiam,
              colF,
              alphaSecundaria,
            );
            this.renderMasaSemicirculo(
              "R",
              n.y,
              nudoDiam,
              colF,
              alphaSecundaria,
            );
          }
        }
        this.renderMasaSemicirculo(
          "L",
          n.y,
          diametroD3,
          n.colorCentro,
          n.alpha,
        );
        this.renderMasaSemicirculo(
          "R",
          n.y,
          diametroD3,
          n.colorCentro,
          n.alpha,
        );
        return;
      }

      // Comportamiento morfológico tipo Anillo Fijo
      if (n.genPuroF4 > 0.65) {
        let grosorFijoAnillo = n.d1 * 0.12;
        this.renderAnilloCalado("L", n.y, n.d1, grosorFijoAnillo, cA, n.alpha);
        this.renderAnilloCalado("R", n.y, n.d1, grosorFijoAnillo, cB, n.alpha);
        this.renderMasaSemicirculo(
          "L",
          n.y,
          n.d1 - grosorFijoAnillo,
          cA,
          n.alpha,
        );
        this.renderMasaSemicirculo(
          "R",
          n.y,
          n.d1 - grosorFijoAnillo,
          cB,
          n.alpha,
        );

        for (let j = maxCapasSecundarias; j >= 1; j--) {
          let restoS = valD2Animada - (j - 1);
          let alphaSecundaria = constrain(restoS, 0, 1) * n.alpha;
          let normPaso = pow(map(j, 0, 6, 0, 1), expMorfologico);
          let nudoDiam = map(
            normPaso,
            0,
            1,
            diametroD3,
            n.d1 - grosorFijoAnillo,
          );
          let colL = acentos[(n.idxPrincipal + j) % acentos.length];
          let colR = acentos[(n.idxSecundario + j) % acentos.length];
          this.renderMasaSemicirculo("L", n.y, nudoDiam, colR, alphaSecundaria);
          this.renderMasaSemicirculo("R", n.y, nudoDiam, colL, alphaSecundaria);
        }
        this.renderMasaSemicirculo(
          "L",
          n.y,
          diametroD3,
          n.colorCentro,
          n.alpha,
        );
        this.renderMasaSemicirculo(
          "R",
          n.y,
          diametroD3,
          n.colorCentro,
          n.alpha,
        );

        let cCentroExtra = color(cA);
        cCentroExtra.setAlpha(n.alpha);
        fill(cCentroExtra);
        noStroke();
        circle(this.cx, n.y, diametroD3 * 0.3);
        return;
      }

      // Comportamiento regular: Masas o Arcos calados concéntricos
      let esCalado = n.genAnilloF2 > 0.5;
      let grosorBase = n.d1 * 0.15;

      if (esCalado) {
        this.renderAnilloCalado("L", n.y, n.d1, grosorBase, cA, n.alpha);
        this.renderAnilloCalado("R", n.y, n.d1, grosorBase, cB, n.alpha);
      } else {
        this.renderMasaSemicirculo("L", n.y, n.d1, cA, n.alpha);
        this.renderMasaSemicirculo("R", n.y, n.d1, cB, n.alpha);
      }

      let dBaseProgreso = esCalado ? n.d1 - grosorBase : n.d1;
      for (let j = maxCapasSecundarias; j >= 1; j--) {
        let restoS = valD2Animada - (j - 1);
        let alphaSecundaria = constrain(restoS, 0, 1) * n.alpha;
        let normPaso = pow(map(j, 0, 6, 0, 1), expMorfologico);
        let nudoDiam = map(normPaso, 0, 1, diametroD3, dBaseProgreso);

        let colL = acentos[(n.idxPrincipal + j) % acentos.length];
        let colR = acentos[(n.idxSecundario + j) % acentos.length];
        let configVariacion =
          this.disenoFigurasIntermedias[
            j % this.disenoFigurasIntermedias.length
          ];

        if (esCalado) {
          let grosorModificado =
            grosorBase * 0.4 * configVariacion.grosorFactor;
          this.renderAnilloCalado(
            "L",
            n.y,
            nudoDiam,
            grosorModificado,
            colL,
            alphaSecundaria,
          );
          this.renderAnilloCalado(
            "R",
            n.y,
            nudoDiam,
            grosorModificado,
            colR,
            alphaSecundaria,
          );
        } else {
          let nudoDiamModificado =
            nudoDiam * (0.85 + configVariacion.grosorFactor * 0.25);
          nudoDiamModificado = constrain(
            nudoDiamModificado,
            diametroD3,
            dBaseProgreso,
          );
          this.renderMasaSemicirculo(
            "L",
            n.y,
            nudoDiamModificado,
            colR,
            alphaSecundaria,
          );
          this.renderMasaSemicirculo(
            "R",
            n.y,
            nudoDiamModificado,
            colL,
            alphaSecundaria,
          );
        }
      }

      this.renderMasaSemicirculo("L", n.y, diametroD3, n.colorCentro, n.alpha);
      this.renderMasaSemicirculo("R", n.y, diametroD3, n.colorCentro, n.alpha);
    });

    // Capa 4: Arcos sinusoidales en S que conectan los núcleos por encima
    let fPuenteProporcional = map(valSinusoide, 0, 100, 0, diametroD1 * 0.3);
    if (fPuenteProporcional > 0) {
      nodosActivos.forEach((n, idx) => {
        if (idx < nodosActivos.length - 1) {
          let nodoSiguiente = nodosActivos[idx + 1];
          let diametroExteriorBase = n.d1;
          let grosorLinea = fPuenteProporcional;

          let dPuenteA = diametroExteriorBase + grosorLinea;
          let dPuenteB = nodoSiguiente.d1 + grosorLinea;

          let prohibidosL = [n.colorPrincipal, fondoColor1, fondoColor2];
          let opcionesValidasL = acentos.filter(
            (col) => !prohibidosL.includes(col),
          );
          let colPuenteL =
            opcionesValidasL.length > 0 ? opcionesValidasL[0] : n.colorCentro;

          let prohibidosR = [
            nodoSiguiente.colorSecundario,
            fondoColor1,
            fondoColor2,
          ];
          let opcionesValidasR = acentos.filter(
            (col) => !prohibidosR.includes(col),
          );
          let colPuenteR =
            opcionesValidasR.length > 0
              ? opcionesValidasR[0]
              : nodoSiguiente.colorCentro;

          if (colPuenteL === colPuenteR && opcionesValidasR.length > 1) {
            colPuenteR = opcionesValidasR[1];
          }

          let alphaPuente = (n.alpha + nodoSiguiente.alpha) / 2;

          this.renderAnilloCalado(
            n.lado,
            n.y,
            dPuenteA,
            grosorLinea,
            colPuenteL,
            alphaPuente,
          );
          this.renderAnilloCalado(
            nodoSiguiente.lado,
            nodoSiguiente.y,
            dPuenteB,
            grosorLinea,
            colPuenteR,
            alphaPuente,
          );
        }
      });
    }
  }
}
