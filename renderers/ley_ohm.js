window.Renderers = window.Renderers || {};

window.Renderers.ley_ohm = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;
  let calcular = 'I';

  let particulas = [];
  const N_PART = 10;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    insertarToggle();
    initParticulas();
  }

  function resizeAll() {
    [c1, c2].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  function initParticulas() {
    particulas = [];
    for (let i = 0; i < N_PART; i++) {
      particulas.push({ t: i / N_PART });
    }
  }

  // -- Toggle: que variable calcular ----------------------------------------
  function insertarToggle() {
    if (document.getElementById('ohm-toggle-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'ohm-toggle-wrap';
    wrap.style.cssText = `
      display: flex; flex-direction: column; gap: 0.4rem;
      margin-bottom: 1rem;
      font-family: 'Space Mono', monospace;
    `;

    const label = document.createElement('div');
    label.textContent = 'Calcular:';
    label.style.cssText = `
      font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase;
      color: #4a5a7a; margin-bottom: 0.2rem;
    `;
    wrap.appendChild(label);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex; gap:0.4rem;';

    const opciones = [
      { id: 'I', label: 'I  (A)' },
      { id: 'V', label: 'V  (V)' },
      { id: 'R', label: 'R  (\u03a9)' },
    ];

    const botones = {};
    opciones.forEach(op => {
      const btn = document.createElement('button');
      btn.id = 'btn-ohm-' + op.id;
      btn.textContent = op.label;
      btn.style.cssText = estiloToggle(op.id === calcular);
      btn.addEventListener('click', () => {
        calcular = op.id;
        opciones.forEach(o => {
          botones[o.id].style.cssText = estiloToggle(o.id === calcular);
        });
        sincronizarSliders();
        if (window._State && window._State.valores) {
          window._State.valores.calcular = calcular;
          if (window._onCambio) window._onCambio();
        }
      });
      botones[op.id] = btn;
      btnRow.appendChild(btn);
    });

    wrap.appendChild(btnRow);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);

    setTimeout(() => {
      const sl = document.getElementById('sl-calcular');
      if (sl) {
        const row = sl.closest('.slider-row');
        if (row) row.style.display = 'none';
      }
      const val = (window._State && window._State.valores) ? window._State.valores.calcular : 'I';
      calcular = val;
      opciones.forEach(o => {
        botones[o.id].style.cssText = estiloToggle(o.id === calcular);
      });
      sincronizarSliders();
    }, 150);
  }

  function sincronizarSliders() {
    const mapa = { I: 'intensidad', V: 'tension', R: 'resistencia' };
    ['tension', 'intensidad', 'resistencia'].forEach(s => {
      const row = document.getElementById('sl-' + s);
      if (!row) return;
      const rowEl = row.closest('.slider-row');
      if (!rowEl) return;
      rowEl.style.display = (mapa[calcular] === s) ? 'none' : '';
    });
  }

  function estiloToggle(activo) {
    const base = `
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem; padding: 0.3rem 0.7rem;
      cursor: pointer; letter-spacing: 0.06em;
      border: 1px solid; background: transparent;
      transition: all 0.2s;
    `;
    return base + (activo
      ? 'border-color: #00e5ff; color: #00e5ff;'
      : 'border-color: #1a2540; color: #4a5a7a;');
  }

  // -- Actualizar formula en caja inferior ----------------------------------
  const FORMULAS_OHM = {
    I: { sim: 'I = V / R',    res: function(v,r) { return 'I = ' + (r.V||0).toFixed(1) + ' / ' + (r.R||0).toFixed(1) + ' = ' + (r.I||0).toFixed(3) + ' A'; } },
    V: { sim: 'V = I \u00d7 R', res: function(v,r) { return 'V = ' + (r.I||0).toFixed(3) + ' \u00d7 ' + (r.R||0).toFixed(1) + ' = ' + (r.V||0).toFixed(2) + ' V'; } },
    R: { sim: 'R = V / I',    res: function(v,r) { return 'R = ' + (r.V||0).toFixed(1) + ' / ' + (r.I||0).toFixed(3) + ' = ' + (r.R||0).toFixed(1) + ' \u03a9'; } },
  };

  function actualizarFormulaUI(resultados) {
    const f = FORMULAS_OHM[calcular];
    if (!f) return;
    const simEl = document.getElementById('info-formula-sim');
    const disEl = document.getElementById('formula-display');
    if (simEl) simEl.textContent = f.sim;
    if (disEl) {
      if (window._solucionVisible) {
        disEl.textContent = f.res({}, resultados);
        disEl.classList.add('solucion');
      } else {
        disEl.textContent = f.sim;
        disEl.classList.remove('solucion');
      }
    }
  }

  // -- Draw -----------------------------------------------------------------
  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    if (valores.calcular !== calcular) {
      calcular = valores.calcular;
      ['I','V','R'].forEach(id => {
        const btn = document.getElementById('btn-ohm-' + id);
        if (btn) btn.style.cssText = estiloToggle(id === calcular);
      });
      sincronizarSliders();
    }
    actualizarFormulaUI(resultados);
    drawCircuito(valores, resultados);
    drawTriangulo(valores, resultados);
  }

  // -- Vista A: circuito con glow variable ----------------------------------
  function drawCircuito(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const V = resultados.V || 0;
    const I = resultados.I || 0;
    const R = resultados.R || 0;

    const iNorm = Math.min(1, Math.max(0, I / 10));

    const margin = Math.min(W, H) * 0.12;
    const left = margin, right = W - margin;
    const top = H * 0.22, bottom = H * 0.82;
    const bulbX = left + (right - left) * 0.5;
    const pilaX = left + (right - left) * 0.22;

    const wireAlpha = 0.3 + iNorm * 0.6;
    const wireColor = `rgba(168,255,62,${wireAlpha})`;
    const glowBlur  = 2 + iNorm * 14;

    // Cables del lazo
    ctx1.save();
    ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = glowBlur;
    ctx1.strokeStyle = wireColor; ctx1.lineWidth = 2.5;
    ctx1.beginPath(); ctx1.moveTo(left, top); ctx1.lineTo(bulbX - 16, top); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(bulbX + 16, top); ctx1.lineTo(right, top); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(right, top); ctx1.lineTo(right, bottom); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(right, bottom); ctx1.lineTo(pilaX + 18, bottom); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(pilaX - 18, bottom); ctx1.lineTo(left, bottom); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(left, bottom); ctx1.lineTo(left, top); ctx1.stroke();
    ctx1.restore();

    drawPila(pilaX, bottom, V);
    drawBombilla(bulbX, top, iNorm);
    drawResistencia(right, (top + bottom) / 2, R, iNorm);

    // Particulas (electrones reales: de - a +, sentido antihorario)
    const speed = 0.001 + iNorm * 0.008;
    particulas.forEach(p => {
      p.t -= speed;
      const [px, py] = loopPoint(p.t, left, right, top, bottom, bulbX, pilaX);
      ctx1.beginPath();
      ctx1.arc(px, py, 2.5 + iNorm * 1.5, 0, Math.PI * 2);
      ctx1.fillStyle = '#a8ff3e';
      ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 4 + iNorm * 8;
      ctx1.fill(); ctx1.shadowBlur = 0;
    });

    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#a8ff3e'; ctx1.textAlign = 'right';
    ctx1.fillText('LEY DE OHM', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function loopPoint(t, left, right, top, bottom, bulbX, pilaX) {
    const segs = [
      { from: [left, top],          to: [bulbX - 16, top] },
      { from: [bulbX + 16, top],    to: [right, top] },
      { from: [right, top],         to: [right, bottom] },
      { from: [right, bottom],      to: [pilaX + 18, bottom] },
      { from: [pilaX - 18, bottom], to: [left, bottom] },
      { from: [left, bottom],       to: [left, top] },
    ];
    const lengths = segs.map(s => Math.hypot(s.to[0]-s.from[0], s.to[1]-s.from[1]));
    const total   = lengths.reduce((a,b) => a+b, 0);
    let d = ((t % 1) + 1) % 1 * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= lengths[i]) {
        const f = lengths[i] > 0 ? d / lengths[i] : 0;
        const s = segs[i];
        return [s.from[0] + (s.to[0]-s.from[0])*f, s.from[1] + (s.to[1]-s.from[1])*f];
      }
      d -= lengths[i];
    }
    return segs[0].from;
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
    ctx1.fillStyle = '#ff4d6d';
    ctx1.fillText(V.toFixed(1) + ' V', 0, 30);
    ctx1.restore();
  }

  function drawBombilla(x, y, iNorm) {
    const r = 15;
    ctx1.save();
    const glowR = 200 + Math.round(iNorm * 55);
    const glowG = 180 + Math.round(iNorm * 67);
    const glowB = Math.round(iNorm * 20);
    const glowColor = `rgb(${glowR},${glowG},${glowB})`;
    if (iNorm > 0.05) {
      ctx1.shadowColor = glowColor; ctx1.shadowBlur = 8 + iNorm * 28;
      ctx1.fillStyle = `rgba(${glowR},${glowG},${glowB},${0.1 + iNorm * 0.3})`;
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.fill();
    }
    ctx1.strokeStyle = iNorm > 0.05 ? glowColor : 'rgba(220,232,255,0.55)';
    ctx1.lineWidth = 2;
    ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.stroke();
    const k = r * 0.6;
    ctx1.beginPath();
    ctx1.moveTo(x-k, y-k); ctx1.lineTo(x+k, y+k);
    ctx1.moveTo(x+k, y-k); ctx1.lineTo(x-k, y+k);
    ctx1.stroke();
    ctx1.restore();
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = iNorm > 0.05 ? `rgb(${200+Math.round(iNorm*55)},${180+Math.round(iNorm*67)},${Math.round(iNorm*20)})` : 'rgba(220,232,255,0.5)';
    ctx1.textAlign = 'center';
    ctx1.fillText('I', x, y - r - 10);
  }

  function drawResistencia(x, y, R, iNorm) {
    const w = 14, h = 36;
    const glowA = 0.4 + iNorm * 0.6;
    ctx1.save(); ctx1.translate(x, y);
    ctx1.strokeStyle = `rgba(255,155,69,${glowA})`; ctx1.lineWidth = 2;
    if (iNorm > 0.05) { ctx1.shadowColor = '#ff9b45'; ctx1.shadowBlur = 4 + iNorm * 10; }
    ctx1.strokeRect(-w/2, -h/2, w, h);
    ctx1.beginPath(); ctx1.moveTo(0, -h/2 - 10); ctx1.lineTo(0, -h/2); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(0,  h/2 + 10); ctx1.lineTo(0,  h/2); ctx1.stroke();
    ctx1.shadowBlur = 0;
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = `rgba(255,155,69,${glowA + 0.2})`;
    ctx1.textAlign = 'left';
    ctx1.fillText(R.toFixed(0) + ' \u03a9', w/2 + 8, 4);
    ctx1.restore();
  }

  // -- Vista B: triangulo VIR interactivo -----------------------------------
  function drawTriangulo(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const V = resultados.V || 0;
    const I = resultados.I || 0;
    const R = resultados.R || 0;
    const P = resultados.potencia || 0;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('V = I \u00d7 R', W - 12, 18);
    ctx2.textAlign = 'left';

    const cx = W / 2, triTop = H * 0.18, triH = H * 0.44;
    const triW = triH * 1.1;

    // Triangulo
    ctx2.beginPath();
    ctx2.moveTo(cx, triTop);
    ctx2.lineTo(cx - triW/2, triTop + triH);
    ctx2.lineTo(cx + triW/2, triTop + triH);
    ctx2.closePath();
    ctx2.strokeStyle = 'rgba(74,90,122,0.5)'; ctx2.lineWidth = 1.5; ctx2.stroke();

    // Division horizontal
    const divY = triTop + triH * 0.48;
    const xAtDivLeft  = cx - triW/2 * 0.52;
    const xAtDivRight = cx + triW/2 * 0.52;
    ctx2.beginPath(); ctx2.moveTo(xAtDivLeft, divY); ctx2.lineTo(xAtDivRight, divY); ctx2.stroke();
    // Division vertical
    ctx2.beginPath(); ctx2.moveTo(cx, divY); ctx2.lineTo(cx, triTop + triH); ctx2.stroke();

    // Celdas
    drawCeldaTriangulo(cx,                        triTop + triH * 0.24,   'V', V.toFixed(2) + ' V',   calcular === 'V');
    drawCeldaTriangulo(cx - triW * 0.26, divY + triH * 0.27, 'I', I.toFixed(3) + ' A', calcular === 'I');
    drawCeldaTriangulo(cx + triW * 0.26, divY + triH * 0.27, 'R', R.toFixed(1) + ' \u03a9', calcular === 'R');

    // Reglas
    const rulesY = triTop + triH + 28;
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.6)'; ctx2.textAlign = 'center';
    ctx2.fillText('V = I \u00d7 R', cx - triW * 0.28, rulesY);
    ctx2.fillText('I = V / R',      cx,                rulesY);
    ctx2.fillText('R = V / I',      cx + triW * 0.28,  rulesY);

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#ff9b45';
    ctx2.fillText('P = ' + P.toFixed(2) + ' W', cx, rulesY + 28);
    ctx2.textAlign = 'left';
  }

  function drawCeldaTriangulo(x, y, letra, valor, destacado) {
    const color = destacado ? '#00e5ff' : 'rgba(200,216,240,0.75)';
    if (destacado) { ctx2.save(); ctx2.shadowColor = '#00e5ff'; ctx2.shadowBlur = 12; }
    ctx2.font = `400 ${destacado ? 20 + _F : 16 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = color; ctx2.textAlign = 'center';
    ctx2.fillText(letra, x, y - 2);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = destacado ? '#00e5ff' : 'rgba(200,216,240,0.55)';
    ctx2.fillText(valor, x, y + 16);
    if (destacado) ctx2.restore();
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  return { init, draw };
})();
