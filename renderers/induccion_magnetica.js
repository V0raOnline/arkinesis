/**
 * renderers/induccion_magnetica.js
 *
 * Vista A â€” espira rectangular moviendose hacia/dentro/fuera del campo B
 *           o rotando en el. Galvanometro que reacciona a la fem.
 * Vista B â€” grafica e(t) en tiempo real.
 *
 * Toggle: desplazamiento / rotacion
 */

window.Renderers = window.Renderers || {};

window.Renderers.induccion_magnetica = (() => {
  let _F = 0;
  let c1, c2, ctx1, ctx2;
  let frame = 0;
  let modo = 'desplazamiento'; // 'desplazamiento' | 'rotacion'

  // Estado animacion desplazamiento
  let espiraX = 0;
  let fase = 'fuera_izq';

  // Estado animacion rotacion
  let angulo = 0;

  // Historial fem para grafica
  const histFem = [];
  const HIST_MAX = 300;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d');
    ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    insertarToggle();
    resetAnim();
  }

  function resizeAll() {
    [c1, c2].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  function resetAnim() {
    frame = 0;
    histFem.length = 0;
    if (!c1) return;
    const W = c1.width;
    espiraX = W * 0.05;
    fase = 'fuera_izq';
    angulo = 0;
  }

  // â”€â”€ Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function insertarToggle() {
    if (document.getElementById('induccion-toggle-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'induccion-toggle-wrap';
    wrap.style.cssText = `
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 1rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem;
    `;

    const btnD = document.createElement('button');
    btnD.id = 'btn-desplazamiento';
    btnD.textContent = 'desplazamiento';
    btnD.style.cssText = estiloToggle(true);

    const btnR = document.createElement('button');
    btnR.id = 'btn-rotacion';
    btnR.textContent = 'rotaci\u00f3n';
    btnR.style.cssText = estiloToggle(false);

    btnD.addEventListener('click', () => {
      modo = 'desplazamiento';
      btnD.style.cssText = estiloToggle(true);
      btnR.style.cssText = estiloToggle(false);
      actualizarFormulaUI();
      resetAnim();
    });

    btnR.addEventListener('click', () => {
      modo = 'rotacion';
      btnD.style.cssText = estiloToggle(false);
      btnR.style.cssText = estiloToggle(true);
      actualizarFormulaUI();
      resetAnim();
    });

    wrap.appendChild(btnD);
    wrap.appendChild(btnR);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);

    setTimeout(() => {
      const sl = document.getElementById('sl-modo');
      if (sl) {
        const row = sl.closest('.slider-row');
        if (row) row.style.display = 'none';
      }
    }, 100);
  }

  function estiloToggle(activo) {
    const base = `
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem;
      padding: 0.3rem 0.8rem;
      cursor: pointer;
      letter-spacing: 0.08em;
      border: 1px solid;
      background: transparent;
      transition: all 0.2s;
    `;
    return base + (activo
      ? 'border-color: #00e5ff; color: #00e5ff;'
      : 'border-color: #1a2540; color: #4a5a7a;');
  }

  // â”€â”€ formulas por modo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const FORMULAS = {
    desplazamiento: {
      sim: '\u03b5 = \u2212N\u00b7B\u00b7L\u00b7v &nbsp;&nbsp;&nbsp; \u03a6 = N\u00b7B\u00b7L\u00b2',
      res: (v, r) => `\u03b5 = \u2212${v.N}\u00b7${v.B}\u00b7${v.L}\u00b7${v.v} = \u2212${r.fem ? r.fem.toFixed(3) : '\u2014'} V &nbsp; \u03a6 = ${r.phi ? r.phi.toFixed(4) : '\u2014'} Wb`,
    },
    rotacion: {
      sim: '\u03b5 = \u2212N\u00b7B\u00b7A\u00b7\u03c9\u00b7sin(\u03c9t) &nbsp;&nbsp;&nbsp; \u03b5\u2098\u2090\u2093 = N\u00b7B\u00b7A\u00b7\u03c9',
      res: (v, r) => `\u03b5\u2098\u2090\u2093 = ${v.N}\u00b7${v.B}\u00b7${(v.L*v.L).toFixed(4)}\u00b7${v.v} = ${r.fem_max ? r.fem_max.toFixed(3) : '\u2014'} V`,
    },
  };

  function actualizarFormulaUI(valores, resultados) {
    const f = FORMULAS[modo];
    if (!f) return;
    const simEl = document.getElementById('info-formula-sim');
    const disEl = document.getElementById('formula-display');
    if (simEl) simEl.innerHTML = f.sim;
    if (disEl) {
      if (window._solucionVisible && valores && resultados) {
        disEl.innerHTML = f.res(valores, resultados);
      } else {
        disEl.innerHTML = f.sim;
      }
    }
    if (window._actualizarCajaInfo && window._State && window._State.formula) {
      window._State.formula.formula_simbolica = f.sim;
      window._State.formula.formula_resuelta  = '__renderer__';
    }
  }

  // â”€â”€ draw principal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    actualizarFormulaUI(valores, resultados);
    if (modo === 'desplazamiento') {
      drawDesplazamiento(valores, resultados);
    } else {
      drawRotacion(valores, resultados);
    }
    drawGrafica(valores, resultados);
  }

  // â”€â”€ helpers canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function grid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  // â”€â”€ Vista A â€” desplazamiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawDesplazamiento(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    grid(ctx1, W, H);

    const B  = valores.B;
    const L  = valores.L;
    const N  = valores.N;
    const v  = valores.v;

    const campoX0 = W * 0.35;
    const campoX1 = W * 0.80;
    const campoY0 = H * 0.15;
    const campoY1 = H * 0.85;
    const campoW  = campoX1 - campoX0;
    const campoH  = campoY1 - campoY0;

    const escala  = Math.min(campoW * 0.5, campoH * 0.7) / 0.5;
    const espW    = Math.min(L * escala, campoW * 0.6);
    const espH    = espW;
    const espiraY = H * 0.5 - espH / 2;

    const vPx = (v / 10) * 2.5;
    espiraX += vPx;

    const espDer = espiraX + espW;
    if (espiraX >= campoX1) {
      espiraX = W * 0.02;
      fase = 'fuera_izq';
    } else if (espiraX >= campoX0 && espDer >= campoX1) {
      fase = 'saliendo';
    } else if (espiraX >= campoX0) {
      fase = 'dentro';
    } else if (espDer > campoX0) {
      fase = 'entrando';
    } else {
      fase = 'fuera_izq';
    }

    let femInst = 0;
    if (fase === 'entrando') femInst =  N * B * L * v;
    if (fase === 'saliendo') femInst = -N * B * L * v;

    histFem.push(femInst);
    if (histFem.length > HIST_MAX) histFem.shift();

    // Campo magnetico (region + simbolos x)
    ctx1.fillStyle = 'rgba(0,229,255,0.06)';
    ctx1.fillRect(campoX0, campoY0, campoW, campoH);
    ctx1.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx1.lineWidth = 1;
    ctx1.strokeRect(campoX0, campoY0, campoW, campoH);

    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(0,229,255,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText(`B = ${B} T`, campoX0 + campoW / 2, campoY0 - 8);

    ctx1.fillStyle = 'rgba(0,229,255,0.3)';
    ctx1.font = '14px monospace';
    const cols = 4, rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let cc = 0; cc < cols; cc++) {
        const sx = campoX0 + (cc + 0.5) * campoW / cols;
        const sy = campoY0 + (r  + 0.5) * campoH / rows;
        ctx1.textAlign = 'center';
        ctx1.fillText('\u00d7', sx, sy + 5);
      }
    }

    // Espira
    const eColor = femInst !== 0 ? '#ff4d6d' : 'rgba(168,255,62,0.85)';
    ctx1.strokeStyle = eColor;
    ctx1.lineWidth = femInst !== 0 ? 2.5 : 1.8;
    if (femInst !== 0) {
      ctx1.shadowColor = eColor;
      ctx1.shadowBlur  = 8;
    }
    ctx1.strokeRect(espiraX, espiraY, espW, espH);
    ctx1.shadowBlur = 0;

    if (femInst !== 0) {
      const sentido = femInst > 0 ? 1 : -1;
      drawFlechaEspira(ctx1, espiraX, espiraY, espW, espH, sentido, eColor);
    }

    // Galvanometro
    const gx = W * 0.12, gy = H * 0.5;
    drawGalvanometro(ctx1, gx, gy, femInst, resultados.fem);

    ctx1.beginPath();
    ctx1.moveTo(gx + 22, gy);
    ctx1.lineTo(espiraX, espiraY + espH * 0.5);
    ctx1.strokeStyle = 'rgba(168,255,62,0.2)';
    ctx1.lineWidth = 1;
    ctx1.setLineDash([3, 4]);
    ctx1.stroke();
    ctx1.setLineDash([]);

    // Labels fase
    ctx1.textAlign = 'right';
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    const faseColor = femInst !== 0 ? '#ff4d6d' : 'rgba(200,216,240,0.5)';
    const faseTexto = {
      fuera_izq: '\u03a6 = 0  \u2192  \u03b5 = 0',
      entrando:  '\u0394\u03a6/\u0394t > 0  \u2192  \u03b5 \u2260 0',
      dentro:    '\u03a6 = cte  \u2192  \u03b5 = 0',
      saliendo:  '\u0394\u03a6/\u0394t < 0  \u2192  \u03b5 \u2260 0',
    }[fase] || '';
    ctx1.fillStyle = faseColor;
    ctx1.fillText(faseTexto, W - 10, 18);

    if (femInst !== 0) {
      ctx1.font = `400 ${10 + _F}px Outfit, sans-serif`;
      ctx1.fillStyle = 'rgba(255,77,109,0.8)';
      ctx1.fillText(`\u03b5 = ${Math.abs(femInst).toFixed(2)} V`, W - 10, 34);
    }
    ctx1.textAlign = 'left';
  }

  function drawFlechaEspira(ctx, x, y, w, h, sentido, color) {
    const mx = x + w / 2;
    const my = y;
    const sz = 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (sentido === 1) {
      ctx.moveTo(mx,      my);
      ctx.lineTo(mx + sz, my - sz * 0.6);
      ctx.lineTo(mx + sz, my + sz * 0.6);
    } else {
      ctx.moveTo(mx,      my);
      ctx.lineTo(mx - sz, my - sz * 0.6);
      ctx.lineTo(mx - sz, my + sz * 0.6);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawGalvanometro(ctx, cx, cy, femInst, femMax) {
    const r = 22;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168,255,62,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(13,18,32,0.9)';
    ctx.fill();

    ctx.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx.fillStyle = 'rgba(168,255,62,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('G', cx, cy - r - 5);

    const maxAng  = Math.PI * 0.6;
    const femRef  = femMax || 1;
    const deflect = femInst !== 0
      ? Math.max(-maxAng, Math.min(maxAng, (femInst / femRef) * maxAng))
      : 0;
    const agujaAng = -Math.PI / 2 + deflect;
    const agujaLen = r * 0.75;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(agujaAng) * agujaLen, cy + Math.sin(agujaAng) * agujaLen);
    ctx.strokeStyle = femInst !== 0 ? '#ff4d6d' : 'rgba(200,216,240,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,216,240,0.5)';
    ctx.fill();

    ctx.font = `400 ${7 + _F}px Space Mono, monospace`;
    ctx.fillStyle = 'rgba(74,90,122,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('0', cx, cy + r - 3);
  }

  // â”€â”€ Vista A â€” rotacion â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawRotacion(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    grid(ctx1, W, H);

    const B = valores.B;
    const L = valores.L;
    const N = valores.N;
    const v = valores.v; // omega en rad/s

    angulo += v * 0.018;

    const A      = L * L;
    const omega  = v;
    const femInst = N * B * A * omega * Math.sin(angulo);
    const femMax  = N * B * A * omega;

    histFem.push(femInst);
    if (histFem.length > HIST_MAX) histFem.shift();

    const cx = W * 0.5, cy = H * 0.5;
    const ejeLen = Math.min(W, H) * 0.3;
    const espW   = ejeLen;
    const espH   = Math.max(Math.abs(Math.cos(angulo)) * ejeLen * 0.6, 2);

    // Campo (flechas)
    ctx1.font = '13px monospace';
    ctx1.fillStyle = 'rgba(0,229,255,0.25)';
    const paso = 50;
    for (let x = paso; x < W - paso * 0.5; x += paso) {
      for (let y = paso; y < H - paso * 0.5; y += paso) {
        ctx1.textAlign = 'center';
        ctx1.fillText('\u2192', x, y + 5);
      }
    }

    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(0,229,255,0.7)';
    ctx1.textAlign = 'right';
    ctx1.fillText(`B = ${B} T`, W - 10, 18);
    ctx1.textAlign = 'left';

    // Eje de rotacion
    ctx1.beginPath();
    ctx1.moveTo(cx, cy - ejeLen * 0.55);
    ctx1.lineTo(cx, cy + ejeLen * 0.55);
    ctx1.strokeStyle = 'rgba(200,216,240,0.3)';
    ctx1.lineWidth = 2;
    ctx1.setLineDash([4, 4]);
    ctx1.stroke();
    ctx1.setLineDash([]);

    // Espira proyectada (elipse)
    const eColor = Math.abs(femInst) > femMax * 0.05 ? '#ff4d6d' : 'rgba(168,255,62,0.85)';
    ctx1.save();
    ctx1.translate(cx, cy);
    ctx1.strokeStyle = eColor;
    ctx1.lineWidth = Math.abs(femInst) > femMax * 0.05 ? 2.5 : 1.8;
    if (Math.abs(femInst) > femMax * 0.05) {
      ctx1.shadowColor = eColor;
      ctx1.shadowBlur  = 8;
    }
    ctx1.beginPath();
    ctx1.ellipse(0, 0, espW / 2, Math.max(espH, 2), 0, 0, Math.PI * 2);
    ctx1.stroke();
    ctx1.shadowBlur = 0;
    ctx1.restore();

    // Galvanometro
    drawGalvanometro(ctx1, W * 0.1, H * 0.5, femInst, femMax);

    // Labels e
    ctx1.textAlign = 'right';
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = Math.abs(femInst) > femMax * 0.05 ? 'rgba(255,77,109,0.9)' : 'rgba(200,216,240,0.5)';
    ctx1.fillText(`\u03b5 = ${femInst.toFixed(2)} V`, W - 10, 34);
    ctx1.font = `400 ${9 + _F}px Outfit, sans-serif`;
    ctx1.fillStyle = 'rgba(200,216,240,0.4)';
    ctx1.fillText(`\u03b5\u2098\u2090\u2093 = ${femMax.toFixed(2)} V`, W - 10, 50);
    ctx1.textAlign = 'left';
  }

  // â”€â”€ Vista B â€” grafica e(t) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawGrafica(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    grid(ctx2, W, H);

    const femMax = resultados.fem || resultados.fem_max || 1;
    // Padding izquierdo reducido: el ancho de la rejilla (40px) cubre las etiquetas del eje Y
    const pad = { t: 42, b: 28, l: 46, r: 15 };
    const gW  = W - pad.l - pad.r;
    const gH  = H - pad.t - pad.b;
    const midY = pad.t + gH / 2;

    // Ejes
    ctx2.strokeStyle = 'rgba(74,90,122,0.5)';
    ctx2.lineWidth = 1;
    ctx2.beginPath();
    ctx2.moveTo(pad.l, pad.t); ctx2.lineTo(pad.l, pad.t + gH); ctx2.stroke();
    ctx2.beginPath();
    ctx2.moveTo(pad.l, midY); ctx2.lineTo(pad.l + gW, midY); ctx2.stroke();

    // Labels eje Y
    ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.7)';
    ctx2.textAlign = 'right';
    const femRef = Math.max(Math.abs(femMax), 0.01);
    ctx2.fillText(`+${femRef.toFixed(1)}`, pad.l - 6, pad.t + 4);
    ctx2.fillText('0',                      pad.l - 6, midY + 4);
    ctx2.fillText(`\u2212${femRef.toFixed(1)}`, pad.l - 6, pad.t + gH + 4);

    // Titulo eje (esquina superior izquierda, no se monta con el label +X)
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(0,229,255,0.7)';
    ctx2.textAlign = 'left';
    ctx2.fillText('\u03b5(t)', pad.l, 18);

    // Label eje X, dentro del area de la grafica
    ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.4)';
    ctx2.textAlign = 'right';
    ctx2.fillText('t \u2192', pad.l + gW, midY + 16);

    if (histFem.length < 2) return;

    // Curva
    ctx2.beginPath();
    histFem.forEach((val, i) => {
      const x = pad.l + (i / (HIST_MAX - 1)) * gW;
      const y = midY - (val / femRef) * (gH / 2);
      i === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
    });
    ctx2.strokeStyle = 'rgba(255,77,109,0.85)';
    ctx2.lineWidth = 1.5;
    ctx2.stroke();

    // Punto actual
    const last = histFem[histFem.length - 1];
    const lx   = pad.l + gW;
    const ly   = midY - (last / femRef) * (gH / 2);
    ctx2.beginPath();
    ctx2.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx2.fillStyle = '#ff4d6d';
    ctx2.shadowColor = '#ff4d6d';
    ctx2.shadowBlur  = 6;
    ctx2.fill();
    ctx2.shadowBlur = 0;

    // Label valor actual (esquina superior derecha)
    ctx2.textAlign = 'right';
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(255,77,109,0.9)';
    ctx2.fillText(`\u03b5 = ${last.toFixed(2)} V`, W - pad.r, 16);
    ctx2.textAlign = 'left';
  }

  return { init, draw };
})();

