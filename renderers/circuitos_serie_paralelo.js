window.Renderers = window.Renderers || {};

window.Renderers.circuitos_serie_paralelo = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;
  let tipo = 'serie';
  let averia = 'ok';

  // Particulas de corriente
  let particulasMain = [];   // rama principal (serie) o tronco comun (paralelo)
  let particulasB1   = [];   // rama bombilla 1 (paralelo)
  let particulasB2   = [];   // rama bombilla 2 (paralelo)
  const N_PART = 8;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    insertarUI();
    initParticulas();
  }

  function resizeAll() {
    [c1, c2].forEach(c => { if (!c) return; c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; });
  }

  function initParticulas() {
    particulasMain = Array.from({length: N_PART}, (_, i) => ({ t: i / N_PART }));
    particulasB1   = Array.from({length: N_PART}, (_, i) => ({ t: i / N_PART }));
    particulasB2   = Array.from({length: N_PART}, (_, i) => ({ t: i / N_PART + 0.5 }));
  }

  // ── UI: toggle tipo + boton averia ────────────────────────────────────────
  function insertarUI() {
    if (document.getElementById('sp-ui-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'sp-ui-wrap';
    wrap.style.cssText = 'display:flex; flex-direction:column; gap:0.6rem; margin-bottom:1rem; font-family:Space Mono,monospace;';

    // Toggle serie / paralelo
    const tipoLabel = document.createElement('div');
    tipoLabel.textContent = 'Tipo de circuito:';
    tipoLabel.style.cssText = 'font-size:0.6rem;letter-spacing:0.15em;text-transform:uppercase;color:#4a5a7a;';
    wrap.appendChild(tipoLabel);

    const tipoRow = document.createElement('div');
    tipoRow.style.cssText = 'display:flex;gap:0.4rem;';
    const btnSerie    = crearBtn('btn-sp-serie',    'Serie',    true);
    const btnParalelo = crearBtn('btn-sp-paralelo', 'Paralelo', false);

    function resetAveria() {
      averia = 'ok';
      const btn = document.getElementById('btn-sp-averia');
      if (btn) {
        btn.textContent = '\u26a1 fundir una bombilla';
        btn.style.cssText = estiloBtn(false) + 'color:#ff4d6d;border-color:#ff4d6d;';
      }
    }

    btnSerie.addEventListener('click', () => {
      tipo = 'serie'; resetAveria();
      btnSerie.style.cssText    = estiloBtn(true);
      btnParalelo.style.cssText = estiloBtn(false);
      sincronizarMotor();
    });
    btnParalelo.addEventListener('click', () => {
      tipo = 'paralelo'; resetAveria();
      btnSerie.style.cssText    = estiloBtn(false);
      btnParalelo.style.cssText = estiloBtn(true);
      sincronizarMotor();
    });
    tipoRow.appendChild(btnSerie);
    tipoRow.appendChild(btnParalelo);
    wrap.appendChild(tipoRow);

    // Boton de averia aleatoria
    const btnAveria = document.createElement('button');
    btnAveria.id = 'btn-sp-averia';
    btnAveria.textContent = '\u26a1 fundir una bombilla';
    btnAveria.style.cssText = estiloBtn(false) + 'margin-top:0.2rem;color:#ff4d6d;border-color:#ff4d6d;';
    btnAveria.addEventListener('click', () => {
      if (averia !== 'ok') {
        // Reset
        averia = 'ok';
        btnAveria.textContent = '\u26a1 fundir una bombilla';
        btnAveria.style.cssText = estiloBtn(false) + 'color:#ff4d6d;border-color:#ff4d6d;';
      } else {
        // Averia aleatoria
        averia = Math.random() < 0.5 ? 'fundida_1' : 'fundida_2';
        const cual = averia === 'fundida_1' ? '1' : '2';
        btnAveria.textContent = '\u21ba restablecer (bombilla ' + cual + ' fundida)';
        btnAveria.style.cssText = estiloBtn(true) + 'color:#ff4d6d;border-color:#ff4d6d;';
      }
      sincronizarMotor();
    });
    wrap.appendChild(btnAveria);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);

    setTimeout(() => {
      // Ocultar selects generados por el motor
      ['tipo', 'averia'].forEach(id => {
        const el = document.getElementById('sl-' + id);
        if (el) { const row = el.closest('.slider-row'); if (row) row.style.display = 'none'; }
      });
      // Sincronizar estado inicial
      if (window._State && window._State.valores) {
        tipo   = window._State.valores.tipo   || 'serie';
        averia = window._State.valores.averia || 'ok';
        btnSerie.style.cssText    = estiloBtn(tipo === 'serie');
        btnParalelo.style.cssText = estiloBtn(tipo === 'paralelo');
      }
    }, 150);
  }

  function crearBtn(id, label, activo) {
    const btn = document.createElement('button');
    btn.id = id; btn.textContent = label;
    btn.style.cssText = estiloBtn(activo);
    return btn;
  }

  function estiloBtn(activo) {
    return `font-family:'Space Mono',monospace;font-size:0.65rem;padding:0.3rem 0.7rem;cursor:pointer;letter-spacing:0.04em;border:1px solid;background:transparent;transition:all 0.2s;` +
      (activo ? 'border-color:#00e5ff;color:#00e5ff;' : 'border-color:#1a2540;color:#4a5a7a;');
  }

  function sincronizarMotor() {
    if (window._State && window._State.valores) {
      window._State.valores.tipo   = tipo;
      window._State.valores.averia = averia;
      if (window._onCambio) window._onCambio();
    }
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    // Sincronizar desde reset/URL
    if (valores.tipo !== tipo || valores.averia !== averia) {
      tipo   = valores.tipo   || 'serie';
      averia = valores.averia || 'ok';
      const btnS = document.getElementById('btn-sp-serie');
      const btnP = document.getElementById('btn-sp-paralelo');
      if (btnS) btnS.style.cssText = estiloBtn(tipo === 'serie');
      if (btnP) btnP.style.cssText = estiloBtn(tipo === 'paralelo');
    }

    if (tipo === 'serie') {
      drawSerie(valores, resultados);
    } else {
      drawParalelo(valores, resultados);
    }
    drawAnalisis(valores, resultados);
  }

  // ── Estado de cada bombilla ───────────────────────────────────────────────
  // Devuelve: 'encendida' | 'apagada' | 'fundida'
  function estadoBombilla(num, tipo, averia) {
    const fundidaEsta = (num === 1 && averia === 'fundida_1') || (num === 2 && averia === 'fundida_2');
    const fundidaOtra = (num === 1 && averia === 'fundida_2') || (num === 2 && averia === 'fundida_1');
    if (fundidaEsta) return 'fundida';
    if (tipo === 'serie' && fundidaOtra) return 'apagada';
    return 'encendida';
  }

  // ── Vista A: Serie ────────────────────────────────────────────────────────
  function drawSerie(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const V  = valores.tension || 12;
    const iNorm = Math.min(1, (resultados.i_bombilla || 0) / 4);

    const margin = Math.min(W, H) * 0.1;
    const left = margin, right = W - margin;
    const top = H * 0.18, bottom = H * 0.82;
    const b1X = left  + (right - left) * 0.35;
    const b2X = left  + (right - left) * 0.65;
    const pilaX = left + (right - left) * 0.12;

    const est1 = estadoBombilla(1, tipo, averia);
    const est2 = estadoBombilla(2, tipo, averia);
    const hayCorrente = averia === 'ok';
    const wireI = hayCorrente ? iNorm : 0;

    // Cables
    drawWireSerie(left, right, top, bottom, b1X, b2X, pilaX, wireI);

    // Particulas
    if (hayCorrente) {
      const speed = 0.001 + iNorm * 0.006;
      particulasMain.forEach(p => {
        p.t -= speed;
        const [px, py] = loopSerie(p.t, left, right, top, bottom, b1X, b2X, pilaX);
        drawParticula(px, py, iNorm);
      });
    }

    // Pila
    drawPila(pilaX, bottom, V);

    // Bombillas
    drawBombilla(b1X, top, est1, iNorm, '1');
    drawBombilla(b2X, top, est2, iNorm, '2');

    // Labels
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#00e5ff'; ctx1.textAlign = 'right';
    ctx1.fillText('cableado: ' + (valores.tension || 12) + ' V  |  R = 6\u03a9 c/u', W - 14, bottom + 22);
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#a8ff3e'; ctx1.textAlign = 'right';
    ctx1.fillText('SERIE', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function drawWireSerie(left, right, top, bottom, b1X, b2X, pilaX, iNorm) {
    const alpha = 0.3 + iNorm * 0.6;
    const glow  = iNorm > 0 ? 2 + iNorm * 10 : 0;
    ctx1.save();
    ctx1.strokeStyle = `rgba(168,255,62,${alpha})`;
    ctx1.lineWidth = 2.5;
    ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = glow;
    // Superior: pila izq -> B1 -> B2 -> derecha
    line(ctx1, left, top, b1X - 14, top);
    line(ctx1, b1X + 14, top, b2X - 14, top);
    line(ctx1, b2X + 14, top, right, top);
    // Laterales
    line(ctx1, right, top, right, bottom);
    line(ctx1, left,  top, left,  bottom);
    // Inferior: right -> pila -> left
    line(ctx1, right, bottom, pilaX + 14, bottom);
    line(ctx1, pilaX - 14, bottom, left, bottom);
    ctx1.restore();
  }

  function loopSerie(t, left, right, top, bottom, b1X, b2X, pilaX) {
    const segs = [
      {from:[left,top],         to:[b1X-14,top]},
      {from:[b1X+14,top],       to:[b2X-14,top]},
      {from:[b2X+14,top],       to:[right,top]},
      {from:[right,top],        to:[right,bottom]},
      {from:[right,bottom],     to:[pilaX+14,bottom]},
      {from:[pilaX-14,bottom],  to:[left,bottom]},
      {from:[left,bottom],      to:[left,top]},
    ];
    return segPoint(t, segs);
  }

  // -- Vista A: Paralelo (dos carriles verticales, bombillas como puentes horizontales) --
  function drawParalelo(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const V = valores.tension || 12;
    const iNorm = Math.min(1, (resultados.i_bombilla || 0) / 4);

    // Geometria: dos carriles verticales + bombillas como puentes horizontales
    const margin = Math.min(W, H) * 0.12;
    const carrilPos = margin;              // carril positivo (izquierda)
    const carrilNeg = W - margin;         // carril negativo (derecha)
    const top    = H * 0.14;
    const bottom = H * 0.86;
    const pilaY  = bottom;
    // Bombillas en filas horizontales
    const b1Y = top + (bottom - top) * 0.3;
    const b2Y = top + (bottom - top) * 0.65;
    const bCenterX = (carrilPos + carrilNeg) / 2;

    const est1 = estadoBombilla(1, tipo, averia);
    const est2 = estadoBombilla(2, tipo, averia);
    const i1Norm = est1 === "encendida" ? iNorm : 0;
    const i2Norm = est2 === "encendida" ? iNorm : 0;
    const iMax = Math.max(i1Norm, i2Norm);

    // Carriles verticales (tronco comun)
    // Carriles verticales: segmentados por rama para glow correcto
    function drawCarril(x, yTop, yBot, iNormSeg) {
      const a = iNormSeg > 0 ? 0.3 + iNormSeg * 0.55 : 0.18;
      const g = iNormSeg > 0 ? 2 + iNormSeg * 10 : 0;
      ctx1.save();
      ctx1.strokeStyle = `rgba(168,255,62,${a})`;
      ctx1.lineWidth = 3;
      ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = g;
      line(ctx1, x, yTop, x, yBot);
      ctx1.restore();
    }
    // Segmento superior: b1Y -> b2Y (solo brilla si b1 conduce)
    drawCarril(carrilPos, b1Y, b2Y, i1Norm);
    drawCarril(carrilNeg, b1Y, b2Y, i1Norm);
    // Segmento inferior: b2Y -> bottom (brilla si cualquiera conduce)
    drawCarril(carrilPos, b2Y, bottom, iMax);
    drawCarril(carrilNeg, b2Y, bottom, iMax);

    // Pila en la base (entre los dos carriles)
    drawPilaHorizontal(bCenterX, bottom, V);
    // Conector pila -> carriles
    ctx1.save();
    ctx1.strokeStyle = `rgba(168,255,62,${iMax > 0 ? 0.3 + iMax * 0.55 : 0.18})`; ctx1.lineWidth = 2.5;
    ctx1.shadowColor = "#a8ff3e"; ctx1.shadowBlur = iMax > 0 ? 2 + iMax * 10 : 0;
    line(ctx1, carrilPos, bottom, bCenterX - 20, bottom);
    line(ctx1, bCenterX + 20, bottom, carrilNeg, bottom);
    ctx1.restore();

    // Ramas horizontales
    drawRamaH(carrilPos, carrilNeg, b1Y, i1Norm, est1);
    drawRamaH(carrilPos, carrilNeg, b2Y, i2Norm, est2);

    // Particulas rama 1
    if (i1Norm > 0) {
      const speed = 0.001 + i1Norm * 0.006;
      particulasB1.forEach(p => {
        p.t -= speed;
        const [px, py] = loopRamaH(p.t, carrilPos, carrilNeg, b1Y, top, bottom, bCenterX);
        drawParticula(px, py, i1Norm);
      });
    }
    // Particulas rama 2
    if (i2Norm > 0) {
      const speed = 0.001 + i2Norm * 0.006;
      particulasB2.forEach(p => {
        p.t -= speed;
        const [px, py] = loopRamaH(p.t, carrilPos, carrilNeg, b2Y, top, bottom, bCenterX);
        drawParticula(px, py, i2Norm);
      });
    }

    // Bombillas
    drawBombillaH(bCenterX, b1Y, est1, iNorm, "1");
    drawBombillaH(bCenterX, b2Y, est2, iNorm, "2");

    // Rotulo cableado abajo
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = "#00e5ff"; ctx1.textAlign = "center";
    ctx1.fillText(V + " V  |  R = 6\u03a9 c/u", (carrilPos + carrilNeg) / 2, bottom + 22);
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = "#a8ff3e"; ctx1.textAlign = "right";
    ctx1.fillText("PARALELO", W - 14, 20);
    ctx1.textAlign = "left";
  }

  function drawPilaHorizontal(cx, y, V) {
    ctx1.save(); ctx1.translate(cx, y);
    ctx1.strokeStyle = "rgba(220,232,255,0.9)"; ctx1.lineWidth = 3;
    // Linea larga (+) a la izquierda
    ctx1.beginPath(); ctx1.moveTo(-14, -10); ctx1.lineTo(-14, 10); ctx1.stroke();
    ctx1.lineWidth = 1.5;
    ctx1.beginPath(); ctx1.moveTo(14, -5); ctx1.lineTo(14, 5); ctx1.stroke();
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = "#ff4d6d"; ctx1.textAlign = "center";
    ctx1.fillText("+", -14, -18);
    ctx1.fillStyle = "#00e5ff";
    ctx1.fillText("-", 14, -18);
    ctx1.restore();
  }

  function drawRamaH(xPos, xNeg, y, iNorm, estado) {
    const alpha = estado !== "fundida" ? 0.3 + iNorm * 0.6 : 0.12;
    const glow  = iNorm > 0 ? 2 + iNorm * 10 : 0;
    ctx1.save();
    ctx1.strokeStyle = `rgba(168,255,62,${alpha})`;
    ctx1.lineWidth = 2;
    ctx1.shadowColor = "#a8ff3e"; ctx1.shadowBlur = glow;
    const bw = 28; // semiancho de la bombilla
    const midX = (xPos + xNeg) / 2;
    line(ctx1, xPos,        y, midX - bw, y);
    line(ctx1, midX + bw,   y, xNeg,      y);
    ctx1.restore();
  }

  function loopRamaH(t, xPos, xNeg, bY, top, bottom, cx) {
    const bw = 28;
    const segs = [
      {from:[xPos, bY],   to:[cx - bw, bY]},  // rama izq -> bombilla
      {from:[cx + bw, bY],to:[xNeg, bY]},      // bombilla -> carril neg
      {from:[xNeg, bY],   to:[xNeg, bottom]},  // baja por carril neg
      {from:[xNeg, bottom],to:[cx + 20, bottom]}, // base hacia pila
      {from:[cx - 20, bottom],to:[xPos, bottom]}, // pila hacia carril pos
      {from:[xPos, bottom],to:[xPos, bY]},     // sube por carril pos
    ];
    return segPoint(t, segs);
  }

  function drawBombillaH(cx, y, estado, iNorm, label) {
    // Bombilla horizontal: misma logica que drawBombilla pero centrada en cx,y
    drawBombilla(cx, y, estado, iNorm, label);
  }


  // ── Helpers de dibujo ─────────────────────────────────────────────────────
  function drawBombilla(x, y, estado, iNorm, label) {
    const r = 13;
    ctx1.save();

    if (estado === 'fundida') {
      // Rojo quemado: "esta es la culpable"
      ctx1.strokeStyle = '#ff4d6d';
      ctx1.lineWidth = 2;
      ctx1.shadowColor = '#ff4d6d'; ctx1.shadowBlur = 6;
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.stroke();
      // Filamento roto (linea interrumpida)
      ctx1.beginPath(); ctx1.moveTo(x - 6, y - 4); ctx1.lineTo(x - 1, y); ctx1.stroke();
      ctx1.beginPath(); ctx1.moveTo(x + 6, y - 4); ctx1.lineTo(x + 1, y); ctx1.stroke();
      ctx1.fillStyle = '#ff4d6d'; ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
      ctx1.textAlign = 'center';
      ctx1.fillText('FUNDIDA', x, y - r - 8);

    } else if (estado === 'apagada') {
      // Gris tenue: "sin corriente, no es su culpa"
      ctx1.strokeStyle = 'rgba(74,90,122,0.5)';
      ctx1.lineWidth = 1.5;
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.stroke();
      const k = r * 0.55;
      ctx1.beginPath();
      ctx1.moveTo(x-k, y-k); ctx1.lineTo(x+k, y+k);
      ctx1.moveTo(x+k, y-k); ctx1.lineTo(x-k, y+k);
      ctx1.stroke();
      ctx1.fillStyle = 'rgba(74,90,122,0.6)'; ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
      ctx1.textAlign = 'center';
      ctx1.fillText('sin corriente', x, y - r - 8);

    } else {
      // Encendida: glow proporcional a iNorm
      const gR = 200 + Math.round(iNorm * 55);
      const gG = 180 + Math.round(iNorm * 67);
      const gB = Math.round(iNorm * 20);
      const glowColor = `rgb(${gR},${gG},${gB})`;
      ctx1.shadowColor = glowColor; ctx1.shadowBlur = 8 + iNorm * 24;
      ctx1.fillStyle = `rgba(${gR},${gG},${gB},${0.1 + iNorm * 0.3})`;
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.fill();
      ctx1.strokeStyle = glowColor; ctx1.lineWidth = 2;
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.stroke();
      const k = r * 0.55;
      ctx1.beginPath();
      ctx1.moveTo(x-k, y-k); ctx1.lineTo(x+k, y+k);
      ctx1.moveTo(x+k, y-k); ctx1.lineTo(x-k, y+k);
      ctx1.stroke();
    }

    // Numero de bombilla
    ctx1.shadowBlur = 0;
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = estado === 'fundida' ? '#ff4d6d' : estado === 'apagada' ? 'rgba(74,90,122,0.6)' : 'rgba(220,232,255,0.8)';
    ctx1.textAlign = 'center';
    ctx1.fillText('\u26a1 ' + label, x, y + r + 16);
    ctx1.restore();
  }

  function drawPila(x, y, V) {
    ctx1.save(); ctx1.translate(x, y);
    ctx1.strokeStyle = 'rgba(220,232,255,0.9)'; ctx1.lineWidth = 3;
    ctx1.beginPath(); ctx1.moveTo(-10, -14); ctx1.lineTo(-10, 14); ctx1.stroke();
    ctx1.lineWidth = 1.5;
    ctx1.beginPath(); ctx1.moveTo(10, -8); ctx1.lineTo(10, 8); ctx1.stroke();
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#ff4d6d'; ctx1.textAlign = 'center';
    ctx1.fillText('+', -10, -22);
    ctx1.fillStyle = '#00e5ff';
    ctx1.fillText('-', 10, -22);
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.8)';
    ctx1.fillText(V + ' V', 0, 28);
    ctx1.restore();
  }

  function drawParticula(px, py, iNorm) {
    ctx1.beginPath(); ctx1.arc(px, py, 2.5 + iNorm, 0, Math.PI * 2);
    ctx1.fillStyle = '#a8ff3e';
    ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 4 + iNorm * 7;
    ctx1.fill(); ctx1.shadowBlur = 0;
  }

  function line(ctx, x1, y1, x2, y2) {
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  }

  function segPoint(t, segs) {
    const lengths = segs.map(s => Math.hypot(s.to[0]-s.from[0], s.to[1]-s.from[1]));
    const total   = lengths.reduce((a,b) => a+b, 0);
    let d = ((t % 1) + 1) % 1 * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= lengths[i]) {
        const f = lengths[i] > 0 ? d / lengths[i] : 0;
        const s = segs[i];
        return [s.from[0]+(s.to[0]-s.from[0])*f, s.from[1]+(s.to[1]-s.from[1])*f];
      }
      d -= lengths[i];
    }
    return segs[0].from;
  }

  // ── Vista B: Analisis comparativo ─────────────────────────────────────────
  function drawAnalisis(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const V   = valores.tension || 12;
    const vB  = resultados.v_bombilla  || 0;
    const iB  = resultados.i_bombilla  || 0;
    const iT  = resultados.i_total     || 0;
    const pot = resultados.potencia_bombilla || 0;

    const esSerie   = tipo === 'serie';
    const hayAveria = averia !== 'ok';
    const est1 = estadoBombilla(1, tipo, averia);
    const est2 = estadoBombilla(2, tipo, averia);

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('ANALISIS', W - 12, 18);
    ctx2.textAlign = 'left';

    const rows = [
      { label: 'Tipo',          valor: esSerie ? 'Serie' : 'Paralelo', color: '#00e5ff' },
      { label: 'V pila',        valor: V + ' V', color: 'rgba(220,232,255,0.85)' },
      { label: 'V / bombilla',  valor: hayAveria ? '--' : vB.toFixed(1) + ' V', color: esSerie ? '#ff9b45' : '#a8ff3e' },
      { label: 'I / bombilla',  valor: hayAveria ? '--' : iB.toFixed(3) + ' A', color: 'rgba(220,232,255,0.85)' },
      { label: 'I total',       valor: hayAveria ? '--' : iT.toFixed(3) + ' A', color: 'rgba(220,232,255,0.85)' },
      { label: 'P / bombilla',  valor: hayAveria ? '--' : pot.toFixed(2) + ' W', color: '#ff9b45' },
    ];

    const startY = H * 0.18;
    const rowH = Math.min(H * 0.12, 42);

    rows.forEach((row, i) => {
      const y = startY + i * rowH;
      ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
      ctx2.fillStyle = 'rgba(200,216,240,0.7)'; ctx2.textAlign = 'left';
      ctx2.fillText(row.label + ':', 18, y);
      ctx2.fillStyle = row.color;
      ctx2.textAlign = 'right';
      ctx2.fillText(row.valor, W - 18, y);

      if (i < rows.length - 1) {
        ctx2.strokeStyle = 'rgba(26,37,64,0.6)'; ctx2.lineWidth = 1;
        ctx2.beginPath(); ctx2.moveTo(14, y + rowH * 0.5); ctx2.lineTo(W-14, y + rowH * 0.5); ctx2.stroke();
      }
    });

    // Estado de cada bombilla
    const finalY = startY + rows.length * rowH + 10;
    ctx2.textAlign = 'center';
    [{ label: '\u26a1 1', est: est1 }, { label: '\u26a1 2', est: est2 }].forEach((b, i) => {
      const bx = W * (i === 0 ? 0.3 : 0.7);
      const color = b.est === 'encendida' ? '#a8ff3e' : b.est === 'fundida' ? '#ff4d6d' : 'rgba(74,90,122,0.6)';
      const texto = b.est === 'encendida' ? 'ON' : b.est === 'fundida' ? 'FUNDIDA' : 'OFF';
      ctx2.font = `400 ${12 + _F}px Space Mono, monospace`;
      ctx2.fillStyle = color;
      ctx2.fillText(b.label, bx, finalY);
      ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
      ctx2.fillText(texto, bx, finalY + 18);
    });

    ctx2.textAlign = 'left';
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  return { init, draw };
})();
