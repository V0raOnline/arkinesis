window.Renderers = window.Renderers || {};

window.Renderers.flujo_electrico = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;
  // Posiciones x normalizadas (0..1) de cada electron entre placas
  let electrones = [];
  const N_ELECTRONES = 9;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    initElectrones();
  }

  function resizeAll() {
    [c1, c2].forEach(c => { if (!c) return; c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; });
  }

  function initElectrones() {
    electrones = [];
    for (let i = 0; i < N_ELECTRONES; i++) {
      electrones.push({
        x: 0.08 + Math.random() * 0.84,
        y: 0.15 + Math.random() * 0.7,
        wobble: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    drawCampoScene(valores, resultados);
    drawFuerzaView(valores, resultados);
  }

  // ── Vista A: placas + electrones ─────────────────────────────────────────
  function drawCampoScene(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const qNeg = valores.carga_negativa || 1;
    const qPos = valores.carga_positiva || 1;
    const dist = valores.distancia || 1;
    const velocidad = resultados.velocidad || 0;

    // La distancia controla la separacion visual entre placas
    const minGap = W * 0.18;
    const maxGap = W * 0.78;
    const gap = minGap + (dist - 1) / 9 * (maxGap - minGap);
    const cx = W / 2;
    const plateXNeg = cx - gap / 2;
    const plateXPos = cx + gap / 2;
    const plateTop = H * 0.18;
    const plateBot = H * 0.82;
    const plateH = plateBot - plateTop;

    drawCargaMask(plateXNeg, plateTop, plateBot, qNeg, '0,229,255', 'left');
    drawCargaMask(plateXPos, plateTop, plateBot, qPos, '255,77,109', 'right');

    // ── Placas ────────────────────────────────────────────────────────────
    const negGlow = 4 + (qNeg / 10) * 14;
    ctx1.save();
    ctx1.shadowColor = '#00e5ff'; ctx1.shadowBlur = negGlow;
    ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 4;
    ctx1.beginPath(); ctx1.moveTo(plateXNeg, plateTop); ctx1.lineTo(plateXNeg, plateBot); ctx1.stroke();
    ctx1.restore();

    const posGlow = 4 + (qPos / 10) * 14;
    ctx1.save();
    ctx1.shadowColor = '#ff4d6d'; ctx1.shadowBlur = posGlow;
    ctx1.strokeStyle = '#ff4d6d'; ctx1.lineWidth = 4;
    ctx1.beginPath(); ctx1.moveTo(plateXPos, plateTop); ctx1.lineTo(plateXPos, plateBot); ctx1.stroke();
    ctx1.restore();

    drawSimbolosCarga(plateXNeg, plateTop, plateBot, qNeg, '-', '#00e5ff');
    drawSimbolosCarga(plateXPos, plateTop, plateBot, qPos, '+', '#ff4d6d');

    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'center';
    ctx1.fillStyle = '#00e5ff';
    ctx1.fillText('NEGATIVO', plateXNeg, plateTop - 14);
    ctx1.fillStyle = '#ff4d6d';
    ctx1.fillText('POSITIVO', plateXPos, plateTop - 14);

    // ── Electrones ────────────────────────────────────────────────────────
    const driftSpeed = 0.0006 + (velocidad / 25) * 0.006;
    const innerLeft = plateXNeg + 14;
    const innerRight = plateXPos - 14;
    const innerW = innerRight - innerLeft;

    electrones.forEach((e) => {
      e.x += driftSpeed;
      if (e.x > 1) {
        e.x = 0;
        e.y = 0.15 + Math.random() * 0.7;
        e.wobble = Math.random() * Math.PI * 2;
      }
      e.wobble += 0.05;

      const px = innerLeft + e.x * innerW;
      const py = plateTop + e.y * plateH + Math.sin(e.wobble) * 6;

      ctx1.beginPath();
      ctx1.arc(px, py, 5, 0, Math.PI * 2);
      ctx1.fillStyle = '#a8ff3e';
      ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 8;
      ctx1.fill();
      ctx1.shadowBlur = 0;
      ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
      ctx1.fillStyle = 'rgba(8,11,20,0.9)';
      ctx1.fillText('-', px, py + 3.5);
    });

    // ── Flecha de fuerza ──────────────────────────────────────────────────
    const fuerza = resultados.fuerza || 0;
    const arrowLen = Math.min(60, 14 + fuerza * 3);
    const sampleY = plateTop + plateH * 0.5;
    drawArrow(ctx1, cx - arrowLen / 2, sampleY + 30, cx + arrowLen / 2, sampleY + 30, '#a8ff3e', 2);

    // ── Label distancia ───────────────────────────────────────────────────
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText('distancia entre polos', cx, plateBot + 26);

    // ── Titulo ────────────────────────────────────────────────────────────
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'right';
    ctx1.fillStyle = '#a8ff3e';
    ctx1.fillText('FLUJO ELECTRICO', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function drawSimbolosCarga(x, top, bot, carga, simbolo, color) {
    const n = Math.max(1, Math.round(carga));
    const innerTop = top + 14;
    const innerBot = bot - 14;
    const innerH = innerBot - innerTop;
    const step = innerH / Math.max(n, 1);
    ctx1.font = `400 ${13 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = color;
    ctx1.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const y = innerTop + step * (i + 0.5);
      ctx1.fillText(simbolo, x, y + 4);
    }
  }

  // ── Vista B: vector de fuerza ─────────────────────────────────────────────
  function drawFuerzaView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const fuerza = resultados.fuerza || 0;
    const campo = resultados.campo || 0;
    const velocidad = resultados.velocidad || 0;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('FUERZA ELECTRICA', W - 12, 18);

    // Vector central: longitud y grosor proporcionales a la fuerza
    const cy = H * 0.42;
    const maxLen = W * 0.7;
    const minLen = W * 0.12;
    const fuerzaMax = 100; // (10*10)/(1*1) caso extremo
    const t = Math.min(1, fuerza / fuerzaMax);
    const len = minLen + t * (maxLen - minLen);
    const width = 2 + t * 8;
    const glow = t * 22;

    const x0 = W / 2 - len / 2;
    const x1 = W / 2 + len / 2;

    ctx2.save();
    ctx2.shadowColor = '#a8ff3e'; ctx2.shadowBlur = glow;
    drawArrow(ctx2, x0, cy, x1, cy, '#a8ff3e', width);
    ctx2.restore();

    // Polos a los extremos del vector
    ctx2.font = `400 ${16 + _F}px Space Mono, monospace`;
    ctx2.textAlign = 'center';
    ctx2.fillStyle = '#00e5ff';
    ctx2.fillText('-', x0 - 18, cy + 6);
    ctx2.fillStyle = '#ff4d6d';
    ctx2.fillText('+', x1 + 18, cy + 6);

    // Valor numerico
    ctx2.font = `400 ${13 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(220,232,255,0.9)';
    ctx2.fillText('F = ' + fuerza.toFixed(1), W / 2, cy - 28);

    // ── Barras comparativas: campo / velocidad ──────────────────────────────
    const baseY = H * 0.86;
    const maxBarH = H * 0.22;
    const barW = Math.min(70, W * 0.16);
    const gap = Math.min(110, W * 0.24);
    const cx = W / 2;

    drawBar(cx - gap / 2, baseY, barW, Math.min(1, campo / 20) * maxBarH, '#00e5ff', 'Campo', campo.toFixed(1));
    drawBar(cx + gap / 2, baseY, barW, Math.min(1, velocidad / 60) * maxBarH, '#ff9b45', 'Veloc.', velocidad.toFixed(1));

    ctx2.textAlign = 'left';
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function drawArrow(ctx, x1, y1, x2, y2, color, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    ctx.stroke();
    const headW = 5 + width * 1.4;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headW * 1.6, y2 - headW * 0.7);
    ctx.lineTo(x2 - headW * 1.6, y2 + headW * 0.7);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function drawBar(x, baseY, width, height, color, label, valueText) {
    const topY = baseY - height;
    ctx2.fillStyle = color + '22';
    ctx2.fillRect(x - width / 2, topY, width, height);
    ctx2.strokeStyle = color; ctx2.lineWidth = 2;
    ctx2.strokeRect(x - width / 2, topY, width, height);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = color; ctx2.textAlign = 'center';
    ctx2.fillText(label, x, baseY + 16);
    ctx2.fillStyle = 'rgba(220,232,255,0.85)';
    ctx2.fillText(valueText, x, topY - 7);
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }


  // \u2500\u2500 Mascara de carga: nivel de relleno proporcional a la carga (1-10) \u2500\u2500\u2500\u2500\u2500\u2500\u2500
  function drawCargaMask(plateX, top, bot, carga, rgb, side) {
    const h = (bot - top) * Math.min(1, carga / 10);
    const maskW = 26;
    const x = side === 'left' ? plateX - maskW : plateX;
    const y0 = bot - h;
    const grad = ctx1.createLinearGradient(0, bot, 0, y0);
    grad.addColorStop(0, `rgba(${rgb},0.30)`);
    grad.addColorStop(1, `rgba(${rgb},0.02)`);
    ctx1.fillStyle = grad;
    ctx1.fillRect(x, y0, maskW, h);
    ctx1.strokeStyle = `rgba(${rgb},0.35)`;
    ctx1.lineWidth = 1;
    ctx1.beginPath(); ctx1.moveTo(x, y0); ctx1.lineTo(x + maskW, y0); ctx1.stroke();
  }
  return { init, draw };
})();

