window.Renderers = window.Renderers || {};

window.Renderers.pulleyRenderer = (() => {
  let _F = 0;
  let c1, c2, ctx1, ctx2, frame = 0;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
  }

  function resizeAll() {
    [c1, c2].forEach(c => { if (!c) return; c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; });
  }

  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    drawPulleySystem(valores, resultados);
    drawEffortView(valores, resultados);
  }

  function drawPulleySystem(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const n = Math.max(1, Math.round(valores.numero_poleas || 1));
    const centerX = W * 0.5, topY = H * 0.18;
    const pulleyRadius = Math.min(34, W * 0.045);
    const spacing = Math.min(76, W * 0.1);
    const groupWidth = (n - 1) * spacing;
    const firstX = centerX - groupWidth / 2;
    const movingY = H * 0.48, loadTop = H * 0.63;
    const loadHeight = Math.min(120, H * 0.18);
    const pullX = Math.max(firstX + groupWidth + pulleyRadius * 3.2, centerX + pulleyRadius * 3.2);
    const pullTop = topY + pulleyRadius + 18, pullBottom = H * 0.8;
    const forceRatio = Math.max(0.12, Math.min(1, (resultados.fuerza_necesaria || 0) / 1000));
    const forceBottom = pullTop + (pullBottom - pullTop) * forceRatio;
    const bob = Math.sin(frame * 0.04) * Math.min(8, resultados.fuerza_necesaria / 80);

    ctx1.strokeStyle = 'rgba(200,216,240,0.18)'; ctx1.lineWidth = 2;
    ctx1.beginPath();
    ctx1.moveTo(firstX - pulleyRadius * 1.4, topY - pulleyRadius * 1.4);
    ctx1.lineTo(firstX + groupWidth + pulleyRadius * 1.4, topY - pulleyRadius * 1.4);
    ctx1.stroke();

    for (let i = 0; i < n; i++) {
      const x = firstX + i * spacing;
      drawPulley(ctx1, x, topY, pulleyRadius, '#00e5ff');
      drawPulley(ctx1, x, movingY + bob, pulleyRadius, '#a8ff3e');
      ctx1.beginPath(); ctx1.moveTo(x - pulleyRadius, topY); ctx1.lineTo(x - pulleyRadius, movingY + bob);
      ctx1.strokeStyle = 'rgba(220,232,255,0.88)'; ctx1.lineWidth = 3; ctx1.stroke();
      ctx1.beginPath(); ctx1.moveTo(x + pulleyRadius, topY); ctx1.lineTo(x + pulleyRadius, movingY + bob); ctx1.stroke();
    }

    ctx1.beginPath();
    ctx1.moveTo(firstX - pulleyRadius, movingY + bob + pulleyRadius);
    ctx1.lineTo(firstX + groupWidth + pulleyRadius, movingY + bob + pulleyRadius);
    ctx1.strokeStyle = '#a8ff3e'; ctx1.lineWidth = 5; ctx1.stroke();

    ctx1.fillStyle = 'rgba(255,77,109,0.12)';
    ctx1.fillRect(centerX - 54, loadTop + bob, 108, loadHeight);
    ctx1.strokeStyle = '#ff4d6d'; ctx1.lineWidth = 2;
    ctx1.strokeRect(centerX - 54, loadTop + bob, 108, loadHeight);

    ctx1.font = `400 ${13 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'center'; ctx1.fillStyle = '#ff4d6d';
    ctx1.fillText('P = ' + formatShort(valores.peso) + ' N', centerX, loadTop + bob + loadHeight/2 + 4);

    ctx1.beginPath(); ctx1.moveTo(pullX, pullTop); ctx1.lineTo(pullX, pullBottom);
    ctx1.strokeStyle = 'rgba(220,232,255,0.88)'; ctx1.lineWidth = 3; ctx1.stroke();
    drawArrow(ctx1, pullX, pullTop + 8, pullX, forceBottom, '#ff6b35', 'F');

    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'left'; ctx1.fillStyle = '#ff6b35';
    ctx1.fillText(formatShort(resultados.fuerza_necesaria || 0) + ' N', pullX + 16, (pullTop + forceBottom)/2 + 4);

    ctx1.font = `400 ${14 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#a8ff3e'; ctx1.textAlign = 'right';
    ctx1.fillText(n === 1 ? 'POLEA FIJA' : 'POLIPASTO x' + n, W - 12, 18);

    ctx1.textAlign = 'left';
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(200,216,240,0.76)';
    ctx1.fillText('tramos que sostienen la carga: ' + n, 16, H - 16);
  }

  function drawEffortView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const peso = valores.peso || 0, fuerza = resultados.fuerza_necesaria || 0;
    const reduccion = resultados.porcentaje_reduccion || 0;
    const n = Math.max(1, Math.round(valores.numero_poleas || 1));
    const maxValue = Math.max(peso, fuerza, 1);
    const baseY = H * 0.83, barW = Math.min(84, W * 0.22);
    const leftX = W * 0.18, rightX = W * 0.58, maxBarH = H * 0.46;

    drawBar(leftX,  baseY, barW, (peso   / maxValue) * maxBarH, '#ff4d6d', 'Peso', peso,   'N');
    drawBar(rightX, baseY, barW, (fuerza / maxValue) * maxBarH, '#ff6b35', 'F',   fuerza, 'N');

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('ESFUERZO', W - 12, 18);

    ctx2.textAlign = 'left';
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.82)';
    ctx2.fillText('VM = ' + formatShort(resultados.ventaja_mecanica), 14, 42);
    ctx2.fillText('Reduccion = ' + formatShort(reduccion) + ' %', 14, 60);
    ctx2.fillText('Cada tramo = ' + formatShort(peso / n) + ' N', 14, 78);

    const trackY = H * 0.22, left = 24, right = W - 24;
    const segment = (right - left) / n;
    for (let i = 0; i < n; i++) {
      const x = left + i * segment + segment / 2;
      ctx2.beginPath(); ctx2.moveTo(x, trackY); ctx2.lineTo(x, trackY + 24);
      ctx2.strokeStyle = '#00e5ff'; ctx2.lineWidth = 2; ctx2.stroke();
      ctx2.beginPath(); ctx2.arc(x, trackY, 5, 0, Math.PI * 2);
      ctx2.fillStyle = '#00e5ff'; ctx2.fill();
    }

    ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(220,232,255,0.7)'; ctx2.textAlign = 'center';
    ctx2.fillText(n + ' tramos activos', W / 2, trackY + 44);
    ctx2.textAlign = 'left';
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawPulley(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.arc(x, y, r + 8, 0, Math.PI * 2); ctx.fillStyle = color + '12'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, label) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath(); ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux*14 + uy*7, y2 - uy*14 - ux*7);
    ctx.lineTo(x2 - ux*14 - uy*7, y2 - uy*14 + ux*7);
    ctx.fillStyle = color; ctx.fill();
    ctx.font = `400 ${13 + _F}px Space Mono, monospace`;
    ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText(label, x2, Math.min(y1, y2) - 12);
    ctx.textAlign = 'left';
  }

  function drawBar(x, baseY, width, height, color, label, value, unit) {
    const topY = baseY - height;
    ctx2.fillStyle = color + '22'; ctx2.fillRect(x, topY, width, height);
    ctx2.strokeStyle = color; ctx2.lineWidth = 2; ctx2.strokeRect(x, topY, width, height);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = color; ctx2.textAlign = 'center';
    ctx2.fillText(label, x + width/2, baseY + 18);
    ctx2.fillStyle = 'rgba(220,232,255,0.82)';
    ctx2.fillText(formatShort(value) + ' ' + unit, x + width/2, topY - 8);
    ctx2.textAlign = 'left';
  }

  function formatShort(n) { if (!isFinite(n)) return '0'; return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2).replace(/\.00$/,''); }

  return { init, draw };
})();




