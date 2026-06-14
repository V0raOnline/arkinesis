window.Renderers = window.Renderers || {};

window.Renderers.conductores_aislantes = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;

  // Atomos: rejilla fija por panel
  const COLS = 4, ROWS = 3;
  // Electrones libres del conductor (se mueven por toda la red)
  let freeElectrons = [];
  const N_FREE = 7;
  // Electrones ligados (uno por atomo, en ambos paneles)
  let boundPhaseCond = [];
  let boundPhaseAisl = [];

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    initElectrons();
  }

  function resizeAll() {
    [c1, c2].forEach(c => { if (!c) return; c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; });
  }

  function initElectrons() {
    freeElectrons = [];
    for (let i = 0; i < N_FREE; i++) {
      freeElectrons.push({
        col: Math.random() * COLS,
        row: Math.random() * ROWS,
        vx: (Math.random() - 0.5) * 0.02,
        vy: (Math.random() - 0.5) * 0.02,
      });
    }
    boundPhaseCond = [];
    boundPhaseAisl = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      boundPhaseCond.push(Math.random() * Math.PI * 2);
      boundPhaseAisl.push(Math.random() * Math.PI * 2);
    }
  }

  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    drawRedes(valores, resultados);
    drawMovilidadView(valores, resultados);
  }

  // ── Vista A: dos redes de atomos ─────────────────────────────────────────
  function drawRedes(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const field = valores.electricField || 0;
    const fieldT = field / 100;

    const panelGap = W * 0.04;
    const panelW = (W - panelGap) / 2 - 14;
    const panelTop = H * 0.16;
    const panelBot = H * 0.86;
    const panelH = panelBot - panelTop;

    const condX0 = 10;
    const aislX0 = W / 2 + panelGap / 2;

    // Titulos
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'center';
    ctx1.fillStyle = '#a8ff3e';
    ctx1.fillText('CONDUCTOR', condX0 + panelW / 2, panelTop - 16);
    ctx1.fillStyle = '#ff4d6d';
    ctx1.fillText('AISLANTE', aislX0 + panelW / 2, panelTop - 16);

    drawRedConductor(condX0, panelTop, panelW, panelH, fieldT);
    drawRedAislante(aislX0, panelTop, panelW, panelH, fieldT);

    // Linea de campo electrico (flecha si field>0)
    if (field > 0) {
      ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
      ctx1.fillStyle = `rgba(168,255,62,${0.3 + fieldT * 0.6})`;
      ctx1.textAlign = 'center';
      ctx1.fillText('campo electrico \u2192', condX0 + panelW / 2, panelBot + 22);
      ctx1.fillText('campo electrico \u2192', aislX0 + panelW / 2, panelBot + 22);
    } else {
      ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
      ctx1.fillStyle = 'rgba(220,232,255,0.4)';
      ctx1.textAlign = 'center';
      ctx1.fillText('sin campo electrico', condX0 + panelW / 2, panelBot + 22);
      ctx1.fillText('sin campo electrico', aislX0 + panelW / 2, panelBot + 22);
    }

    // Titulo general
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#00e5ff';
    ctx1.textAlign = 'right';
    ctx1.fillText('REDES ATOMICAS', W - 14, 20);

    // Leyenda: simbolos de la red atomica
    const legY = c1.height - 12;
    ctx1.beginPath();
    ctx1.arc(20, legY, 6, 0, Math.PI * 2);
    ctx1.fillStyle = 'rgba(220,232,255,0.10)';
    ctx1.fill();
    ctx1.strokeStyle = 'rgba(220,232,255,0.5)';
    ctx1.lineWidth = 1.2;
    ctx1.stroke();
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.65)';
    ctx1.textAlign = 'left';
    ctx1.fillText('= atomo (nucleo)', 32, legY + 4);

    ctx1.beginPath();
    ctx1.arc(195, legY, 3.5, 0, Math.PI * 2);
    ctx1.fillStyle = '#a8ff3e';
    ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 5;
    ctx1.fill();
    ctx1.shadowBlur = 0;
    ctx1.fillStyle = 'rgba(220,232,255,0.65)';
    ctx1.fillText('= electron', 205, legY + 4);
    ctx1.textAlign = 'left';
  }

  function drawRedConductor(x0, top, w, h, fieldT) {
    const cellW = w / COLS, cellH = h / ROWS;

    // Atomos (nucleo) sin sus electrones externos: los electrones son "libres"
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const cx = x0 + cellW * (col + 0.5);
        const cy = top + cellH * (r + 0.5);
        drawNucleo(cx, cy, '#00e5ff');
      }
    }

    // Enlaces (red de "mar de electrones")
    ctx1.strokeStyle = 'rgba(0,229,255,0.12)';
    ctx1.lineWidth = 1;
    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const cx = x0 + cellW * (col + 0.5);
        const cy = top + cellH * (r + 0.5);
        if (col < COLS - 1) {
          ctx1.beginPath(); ctx1.moveTo(cx, cy); ctx1.lineTo(cx + cellW, cy); ctx1.stroke();
        }
        if (r < ROWS - 1) {
          ctx1.beginPath(); ctx1.moveTo(cx, cy); ctx1.lineTo(cx, cy + cellH); ctx1.stroke();
        }
      }
    }

    // Electrones libres: movimiento browniano + deriva hacia la derecha segun campo
    const driftSpeed = fieldT * 0.025;
    freeElectrons.forEach((e) => {
      e.col += e.vx + driftSpeed;
      e.row += e.vy;

      // rebote en los bordes
      if (e.col < 0) { e.col = 0; e.vx = Math.abs(e.vx); }
      if (e.col > COLS) { e.col = 0; } // sale por la derecha, reaparece a la izquierda (deriva)
      if (e.row < 0) { e.row = 0; e.vy = Math.abs(e.vy); }
      if (e.row > ROWS) { e.row = ROWS; e.vy = -Math.abs(e.vy); }

      // cambio aleatorio de direccion ocasional
      if (Math.random() < 0.02) {
        e.vx = (Math.random() - 0.5) * 0.02;
        e.vy = (Math.random() - 0.5) * 0.02;
      }

      const px = x0 + e.col * cellW;
      const py = top + e.row * cellH;
      drawElectron(px, py, '#a8ff3e', 0.9);
    });
  }

  function drawRedAislante(x0, top, w, h, fieldT) {
    const cellW = w / COLS, cellH = h / ROWS;
    // Radio de orbita: el campo apenas afecta (electron sigue ligado a su atomo)
    const orbitR = 13 + fieldT * 1.5;

    for (let r = 0; r < ROWS; r++) {
      for (let col = 0; col < COLS; col++) {
        const cx = x0 + cellW * (col + 0.5);
        const cy = top + cellH * (r + 0.5);
        const idx = r * COLS + col;

        // Orbita guia (tenue)
        ctx1.beginPath();
        ctx1.arc(cx, cy, orbitR, 0, Math.PI * 2);
        ctx1.strokeStyle = 'rgba(255,77,109,0.15)';
        ctx1.lineWidth = 1;
        ctx1.stroke();

        drawNucleo(cx, cy, '#ff4d6d');

        // Electron ligado: orbita alrededor de su atomo, no se desplaza a otros
        boundPhaseAisl[idx] += 0.04 + fieldT * 0.005;
        const ex = cx + Math.cos(boundPhaseAisl[idx]) * orbitR;
        const ey = cy + Math.sin(boundPhaseAisl[idx]) * orbitR;
        drawElectron(ex, ey, '#a8ff3e', 0.9);
      }
    }
  }

  function drawNucleo(cx, cy, color) {
    ctx1.beginPath();
    ctx1.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx1.fillStyle = color + '18';
    ctx1.fill();
    ctx1.strokeStyle = color;
    ctx1.lineWidth = 1.5;
    ctx1.stroke();
  }

  function drawElectron(px, py, color, alpha) {
    ctx1.beginPath();
    ctx1.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx1.fillStyle = color;
    ctx1.shadowColor = color; ctx1.shadowBlur = 6 * alpha;
    ctx1.globalAlpha = alpha;
    ctx1.fill();
    ctx1.shadowBlur = 0;
    ctx1.globalAlpha = 1;
  }

  // ── Vista B: barras MOVILIDAD ELECTRONICA ───────────────────────────────
  function drawMovilidadView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const movCond = resultados.movilidad_conductor || 0;
    const movAisl = resultados.movilidad_aislante || 0;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('MOVILIDAD ELECTRONICA', W - 12, 18);

    const baseY = H * 0.84;
    const maxBarH = H * 0.56;
    const barW = Math.min(80, W * 0.18);
    const gap = Math.min(130, W * 0.28);
    const cx = W / 2;

    drawBar2(cx - gap / 2, baseY, barW, (movCond / 100) * maxBarH, '#00e5ff', 'Conductor', movCond.toFixed(0));
    drawBar2(cx + gap / 2, baseY, barW, (movAisl / 100) * maxBarH, '#ff4d6d', 'Aislante', movAisl.toFixed(0));

    ctx2.textAlign = 'left';
  }

  function drawBar2(x, baseY, width, height, color, label, valueText) {
    const topY = baseY - height;
    ctx2.fillStyle = color + '22';
    ctx2.fillRect(x - width / 2, topY, width, height);
    ctx2.strokeStyle = color; ctx2.lineWidth = 2;
    ctx2.strokeRect(x - width / 2, topY, width, height);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = color; ctx2.textAlign = 'center';
    ctx2.fillText(label, x, baseY + 18);
    ctx2.fillStyle = 'rgba(220,232,255,0.85)';
    ctx2.fillText(valueText, x, topY - 8);
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  return { init, draw };
})();

