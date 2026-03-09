/**
 * renderers/induccion_magnetica.js
 *
 * Vista A — espira rectangular moviéndose hacia/dentro/fuera del campo B
 *           o rotando en él. Galvanómetro que reacciona a la fem.
 * Vista B — gráfica ε(t) en tiempo real.
 *
 * Toggle: desplazamiento / rotación
 */

window.Renderers = window.Renderers || {};

window.Renderers.induccion_magnetica = (() => {
  let c1, c2, ctx1, ctx2;
  let frame = 0;
  let modo = 'desplazamiento'; // 'desplazamiento' | 'rotacion'

  // Estado animación desplazamiento
  // La espira arranca a la izquierda del campo y avanza hacia la derecha
  // Fases: 'entrando' | 'dentro' | 'saliendo' | 'fuera'
  let espiraX = 0;   // x del borde izquierdo de la espira (px)
  let fase = 'fuera_izq';

  // Estado animación rotación
  let angulo = 0; // radianes

  // Historial ε para gráfica
  const histFem = [];
  const HIST_MAX = 300;

  // ── init ──────────────────────────────────────────────────────────────────
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
    // Espira arranca a la izquierda, fuera del campo
    espiraX = W * 0.05;
    fase = 'fuera_izq';
    angulo = 0;
  }

  // ── Toggle ────────────────────────────────────────────────────────────────
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
    btnR.textContent = 'rotación';
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

    // Ocultar slider modo
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

  // ── fórmulas por modo ──────────────────────────────────────────────────────
  const FORMULAS = {
    desplazamiento: {
      sim: 'ε = −N·B·L·v &nbsp;&nbsp;&nbsp; Φ = N·B·L²',
      res: (v, r) => `ε = −${v.N}·${v.B}·${v.L}·${v.v} = −${r.fem ? r.fem.toFixed(3) : '—'} V &nbsp; Φ = ${r.phi ? r.phi.toFixed(4) : '—'} Wb`,
    },
    rotacion: {
      sim: 'ε = −N·B·A·ω·sin(ωt) &nbsp;&nbsp;&nbsp; εₘₐₓ = N·B·A·ω',
      res: (v, r) => `εₘₐₓ = ${v.N}·${v.B}·${(v.L*v.L).toFixed(4)}·${v.v} = ${r.fem_max ? r.fem_max.toFixed(3) : '—'} V`,
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
    // Actualizar estado interno del selector
    if (window._actualizarCajaInfo && window._State && window._State.formula) {
      window._State.formula.formula_simbolica = f.sim;
      window._State.formula.formula_resuelta  = '__renderer__';
    }
  }

  // ── draw principal ────────────────────────────────────────────────────────
  function draw(valores, resultados) {
    frame++;
    actualizarFormulaUI(valores, resultados);
    if (modo === 'desplazamiento') {
      drawDesplazamiento(valores, resultados);
    } else {
      drawRotacion(valores, resultados);
    }
    drawGrafica(valores, resultados);
  }

  // ── helpers canvas ────────────────────────────────────────────────────────
  function grid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  // ── Vista A — desplazamiento ──────────────────────────────────────────────
  function drawDesplazamiento(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    grid(ctx1, W, H);

    const B  = valores.B;
    const L  = valores.L;
    const N  = valores.N;
    const v  = valores.v;

    // Geometría
    const campoX0 = W * 0.35;
    const campoX1 = W * 0.80;
    const campoY0 = H * 0.15;
    const campoY1 = H * 0.85;
    const campoW  = campoX1 - campoX0;
    const campoH  = campoY1 - campoY0;

    // Escala espira: L en metros → px, max ~35% de campoW
    const escala  = Math.min(campoW * 0.5, campoH * 0.7) / 0.5; // 0.5m → ese px
    const espW    = Math.min(L * escala, campoW * 0.6);
    const espH    = espW;
    const espiraY = H * 0.5 - espH / 2;

    // Velocidad en px/frame
    const vPx = (v / 10) * 2.5;

    // Mover espira
    espiraX += vPx;

    // Detectar fase
    const espDer = espiraX + espW;
    if (espiraX >= campoX1) {
      // Reinicio: vuelve a la izquierda
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

    // fem instantánea según fase
    let femInst = 0;
    if (fase === 'entrando') femInst =  N * B * L * v;
    if (fase === 'saliendo') femInst = -N * B * L * v;
    // dentro/fuera → 0

    // Historial
    histFem.push(femInst);
    if (histFem.length > HIST_MAX) histFem.shift();

    // ── Campo magnético (región + flechas ×) ──
    ctx1.fillStyle = 'rgba(0,229,255,0.06)';
    ctx1.fillRect(campoX0, campoY0, campoW, campoH);
    ctx1.strokeStyle = 'rgba(0,229,255,0.25)';
    ctx1.lineWidth = 1;
    ctx1.strokeRect(campoX0, campoY0, campoW, campoH);

    // Label B
    ctx1.font = '600 11px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(0,229,255,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText(`B = ${B} T`, campoX0 + campoW / 2, campoY0 - 8);

    // Símbolos × (campo entrando en pantalla)
    ctx1.fillStyle = 'rgba(0,229,255,0.3)';
    ctx1.font = '14px monospace';
    const cols = 4, rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let cc = 0; cc < cols; cc++) {
        const sx = campoX0 + (cc + 0.5) * campoW / cols;
        const sy = campoY0 + (r  + 0.5) * campoH / rows;
        ctx1.textAlign = 'center';
        ctx1.fillText('×', sx, sy + 5);
      }
    }

    // ── Espira ──
    const eColor = femInst !== 0 ? '#ff4d6d' : 'rgba(168,255,62,0.85)';
    ctx1.strokeStyle = eColor;
    ctx1.lineWidth = femInst !== 0 ? 2.5 : 1.8;
    if (femInst !== 0) {
      ctx1.shadowColor = eColor;
      ctx1.shadowBlur  = 8;
    }
    ctx1.strokeRect(espiraX, espiraY, espW, espH);
    ctx1.shadowBlur = 0;

    // Flecha de corriente inducida (solo cuando hay fem)
    if (femInst !== 0) {
      const sentido = femInst > 0 ? 1 : -1; // 1=antihorario, -1=horario
      drawFlechaEspira(ctx1, espiraX, espiraY, espW, espH, sentido, eColor);
    }

    // ── Galvanómetro ──
    const gx = W * 0.12, gy = H * 0.5;
    drawGalvanometro(ctx1, gx, gy, femInst, resultados.fem);

    // Hilo galvanómetro → espira
    ctx1.beginPath();
    ctx1.moveTo(gx + 22, gy);
    ctx1.lineTo(espiraX, espiraY + espH * 0.5);
    ctx1.strokeStyle = 'rgba(168,255,62,0.2)';
    ctx1.lineWidth = 1;
    ctx1.setLineDash([3, 4]);
    ctx1.stroke();
    ctx1.setLineDash([]);

    // ── Labels fase ──
    ctx1.textAlign = 'right';
    ctx1.font = '500 10px Space Mono, monospace';
    const faseColor = femInst !== 0 ? '#ff4d6d' : 'rgba(200,216,240,0.5)';
    const faseTexto = {
      fuera_izq: 'Φ = 0  →  ε = 0',
      entrando:  'ΔΦ/Δt > 0  →  ε ≠ 0',
      dentro:    'Φ = cte  →  ε = 0',
      saliendo:  'ΔΦ/Δt < 0  →  ε ≠ 0',
    }[fase] || '';
    ctx1.fillStyle = faseColor;
    ctx1.fillText(faseTexto, W - 10, 18);

    if (femInst !== 0) {
      ctx1.font = '400 10px Outfit, sans-serif';
      ctx1.fillStyle = 'rgba(255,77,109,0.8)';
      ctx1.fillText(`ε = ${Math.abs(femInst).toFixed(2)} V`, W - 10, 34);
    }
    ctx1.textAlign = 'left';
  }

  // ── flecha de corriente sobre la espira ──────────────────────────────────
  function drawFlechaEspira(ctx, x, y, w, h, sentido, color) {
    // sentido 1 = antihorario, -1 = horario
    // Ponemos la flecha en el borde superior, apuntando según sentido
    const mx = x + w / 2;
    const my = y;
    const sz = 7;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (sentido === 1) {
      // flecha apuntando izquierda (antihorario en borde superior)
      ctx.moveTo(mx,      my);
      ctx.lineTo(mx + sz, my - sz * 0.6);
      ctx.lineTo(mx + sz, my + sz * 0.6);
    } else {
      // flecha apuntando derecha (horario en borde superior)
      ctx.moveTo(mx,      my);
      ctx.lineTo(mx - sz, my - sz * 0.6);
      ctx.lineTo(mx - sz, my + sz * 0.6);
    }
    ctx.closePath();
    ctx.fill();
  }

  // ── galvanómetro ─────────────────────────────────────────────────────────
  function drawGalvanometro(ctx, cx, cy, femInst, femMax) {
    const r = 22;
    // Círculo
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(168,255,62,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(13,18,32,0.9)';
    ctx.fill();

    // Label G
    ctx.font = '700 10px Space Mono, monospace';
    ctx.fillStyle = 'rgba(168,255,62,0.7)';
    ctx.textAlign = 'center';
    ctx.fillText('G', cx, cy - r - 5);

    // Aguja
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

    // Centro aguja
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,216,240,0.5)';
    ctx.fill();

    // 0 en el centro abajo
    ctx.font = '400 7px Space Mono, monospace';
    ctx.fillStyle = 'rgba(74,90,122,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText('0', cx, cy + r - 3);
  }

  // ── Vista A — rotación ────────────────────────────────────────────────────
  function drawRotacion(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    grid(ctx1, W, H);

    const B = valores.B;
    const L = valores.L;
    const N = valores.N;
    const v = valores.v; // ω en rad/s

    // Incrementar ángulo
    angulo += v * 0.018; // escala visual razonable

    // fem instantánea: ε = N·B·A·ω·sin(ωt)
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

    // ── Campo (flechas →) ──
    ctx1.font = '13px monospace';
    ctx1.fillStyle = 'rgba(0,229,255,0.25)';
    const paso = 50;
    for (let x = paso; x < W - paso * 0.5; x += paso) {
      for (let y = paso; y < H - paso * 0.5; y += paso) {
        ctx1.textAlign = 'center';
        ctx1.fillText('→', x, y + 5);
      }
    }

    // Label B
    ctx1.font = '600 11px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(0,229,255,0.7)';
    ctx1.textAlign = 'right';
    ctx1.fillText(`B = ${B} T`, W - 10, 18);
    ctx1.textAlign = 'left';

    // ── Eje de rotación ──
    ctx1.beginPath();
    ctx1.moveTo(cx, cy - ejeLen * 0.55);
    ctx1.lineTo(cx, cy + ejeLen * 0.55);
    ctx1.strokeStyle = 'rgba(200,216,240,0.3)';
    ctx1.lineWidth = 2;
    ctx1.setLineDash([4, 4]);
    ctx1.stroke();
    ctx1.setLineDash([]);

    // ── Espira proyectada (elipse) ──
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

    // ── Galvanómetro ──
    drawGalvanometro(ctx1, W * 0.1, H * 0.5, femInst, femMax);

    // ── Label ε ──
    ctx1.textAlign = 'right';
    ctx1.font = '500 10px Space Mono, monospace';
    ctx1.fillStyle = Math.abs(femInst) > femMax * 0.05 ? 'rgba(255,77,109,0.9)' : 'rgba(200,216,240,0.5)';
    ctx1.fillText(`ε = ${femInst.toFixed(2)} V`, W - 10, 34);
    ctx1.font = '400 9px Outfit, sans-serif';
    ctx1.fillStyle = 'rgba(200,216,240,0.4)';
    ctx1.fillText(`εₘₐₓ = ${femMax.toFixed(2)} V`, W - 10, 50);
    ctx1.textAlign = 'left';
  }

  // ── Vista B — gráfica ε(t) ────────────────────────────────────────────────
  function drawGrafica(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    grid(ctx2, W, H);

    const femMax = resultados.fem || resultados.fem_max || 1;
    const pad = { t: 30, b: 30, l: 120, r: 15 };
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

    // Labels ejes
    ctx2.font = '400 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(200,216,240,0.7)';
    ctx2.textAlign = 'right';
    const femRef = Math.max(Math.abs(femMax), 0.01);
    ctx2.fillText(`+${femRef.toFixed(1)}`, pad.l - 6, pad.t + 4);
    ctx2.fillText('0',                      pad.l - 6, midY + 4);
    ctx2.fillText(`−${femRef.toFixed(1)}`, pad.l - 6, pad.t + gH + 4);

    ctx2.font = '500 10px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(0,229,255,0.7)';
    ctx2.textAlign = 'right';
    ctx2.fillText("ε(t)", pad.l - 4, pad.t - 8);
    ctx2.textAlign = 'left';
    ctx2.fillStyle = 'rgba(200,216,240,0.4)';
    ctx2.fillText('t →', pad.l + gW - 5, midY + 14);

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

    // Label valor actual
    ctx2.textAlign = 'right';
    ctx2.font = '500 11px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(255,77,109,0.9)';
    ctx2.fillText(`ε = ${last.toFixed(2)} V`, W - pad.r, pad.t - 8);
    ctx2.textAlign = 'left';
  }

  return { init, draw };
})();
