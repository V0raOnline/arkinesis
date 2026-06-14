window.Renderers = window.Renderers || {};

window.Renderers.gearRenderer = (() => {
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
    drawGears(valores, resultados);
    drawTransmissionView(valores, resultados);
  }

  function drawGears(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const za = Math.max(8, Math.round(valores.dientes_a || 8));
    const zb = Math.max(8, Math.round(valores.dientes_b || 8));
    const rA = Math.max(44, Math.min(90, 24 + za * 1.2));
    const rB = Math.max(44, Math.min(120, 24 + zb * 1.2));
    const cxA = Math.max(110, W * 0.32);
    const cxB = Math.min(W - 110, cxA + rA + rB + 10);
    const cy = H * 0.48;
    const rpmA = 100, rpmB = resultados.velocidad_salida || 0;
    const speedA = 0.03, speedB = speedA * (za / zb);
    const angleA = frame * speedA, angleB = -frame * speedB;

    drawGear(ctx1, cxA, cy, rA, za, angleA, '#ff9b45', '#ff6b35');
    drawGear(ctx1, cxB, cy, rB, zb, angleB, '#00f0ff', '#00e5ff');

    drawSpinCue(cxA, cy - rA - 34, '\u21bb', '#ff9b45');
    drawSpinCue(cxB, cy - rB - 34, '\u21ba', '#00e5ff');

    ctx1.font = `400 ${18 + _F}px Space Mono, monospace`; ctx1.textAlign = 'center';
    ctx1.fillStyle = '#ff9b45'; ctx1.fillText('A', cxA, cy + rA + 36);
    ctx1.fillStyle = '#00e5ff'; ctx1.fillText('B', cxB, cy + rB + 36);

    ctx1.font = `400 ${14 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.92)';
    ctx1.fillText(za + ' dientes', cxA, cy + rA + 62);
    ctx1.fillText(zb + ' dientes', cxB, cy + rB + 62);

    ctx1.fillStyle = '#ff9b45'; ctx1.fillText(speedLabel(rpmA, rpmB, true),  cxA, cy - rA - 58);
    ctx1.fillStyle = '#00e5ff'; ctx1.fillText(speedLabel(rpmA, rpmB, false), cxB, cy - rB - 58);

    ctx1.font = `400 ${14 + _F}px Space Mono, monospace`; ctx1.textAlign = 'right'; ctx1.fillStyle = '#a8ff3e';
    ctx1.fillText(za < zb ? 'A RAPIDO \u00b7 B LENTO' : za > zb ? 'A LENTO \u00b7 B RAPIDO' : 'MISMA VELOCIDAD', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function drawTransmissionView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const entrada = 100, salida = resultados.velocidad_salida || 0;
    const za = Math.max(8, Math.round(valores.dientes_a || 8));
    const zb = Math.max(8, Math.round(valores.dientes_b || 8));
    const g = gcd(za, zb);

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('TRANSMISION', W - 12, 18);

    ctx2.textAlign = 'center';
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.76)';
    ctx2.fillText('Entrada', W / 2, 54);
    ctx2.font = `400 ${22 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#ff9b45';
    ctx2.fillText(formatShort(entrada) + ' rpm', W / 2, 88);

    drawFlowArrow(W/2, 110, W/2, 146);

    ctx2.font = `400 ${20 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#a8ff3e';
    ctx2.fillText((za/g) + ' : ' + (zb/g), W / 2, 178);
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.76)';
    ctx2.fillText('Relacion', W / 2, 200);

    drawFlowArrow(W/2, 220, W/2, 256);

    ctx2.fillText('Salida', W / 2, 288);
    ctx2.font = `400 ${22 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#00e5ff';
    ctx2.fillText(formatShort(salida) + ' rpm', W / 2, 322);

    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = salida > entrada ? '#00e5ff' : salida < entrada ? '#ff9b45' : '#a8ff3e';
    ctx2.fillText(salida > entrada ? 'multiplica velocidad' : salida < entrada ? 'reduce velocidad' : 'transmision directa', W/2, 350);
    ctx2.textAlign = 'left';
  }

  function drawGear(ctx, cx, cy, radius, teeth, angle, glow, stroke) {
    const innerRadius = radius * 0.78;
    const toothDepth = Math.max(8, radius * 0.12);
    const toothWidth = (Math.PI * 2) / teeth * 0.42;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(angle);
    ctx.beginPath();
    for (let i = 0; i < teeth; i++) {
      const base = (i / teeth) * Math.PI * 2;
      lineToPolar(ctx, i === 0, innerRadius, base - toothWidth);
      lineToPolar(ctx, false, innerRadius + toothDepth, base - toothWidth * 0.35);
      lineToPolar(ctx, false, innerRadius + toothDepth, base + toothWidth * 0.35);
      lineToPolar(ctx, false, innerRadius, base + toothWidth);
    }
    ctx.closePath(); ctx.fillStyle = glow + '18'; ctx.fill();
    ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, innerRadius * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fillStyle = stroke; ctx.shadowColor = stroke; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI/2) * i + angle * 0.08;
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * innerRadius * 0.64, Math.sin(a) * innerRadius * 0.64);
      ctx.strokeStyle = 'rgba(220,232,255,0.28)'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.restore();
  }

  function lineToPolar(ctx, move, r, angle) {
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
    if (move) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }

  function drawSpinCue(x, y, glyph, color) {
    ctx1.font = `400 ${26 + _F}px Space Mono, monospace`; ctx1.textAlign = 'center';
    ctx1.fillStyle = color; ctx1.fillText(glyph, x, y);
  }

  function drawFlowArrow(x1, y1, x2, y2) {
    ctx2.beginPath(); ctx2.moveTo(x1, y1); ctx2.lineTo(x2, y2);
    ctx2.strokeStyle = '#4a5a7a'; ctx2.lineWidth = 2; ctx2.stroke();
    const dx = x2-x1, dy = y2-y1, len = Math.sqrt(dx*dx+dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    ctx2.beginPath(); ctx2.moveTo(x2, y2);
    ctx2.lineTo(x2 - ux*12 + uy*5, y2 - uy*12 - ux*5);
    ctx2.lineTo(x2 - ux*12 - uy*5, y2 - uy*12 + ux*5);
    ctx2.fillStyle = '#4a5a7a'; ctx2.fill();
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  function speedLabel(rpmA, rpmB, isA) {
    if (Math.abs(rpmA - rpmB) < 0.5) return 'igual';
    if (isA) return rpmA > rpmB ? 'rapido' : 'lento';
    return rpmB > rpmA ? 'rapido' : 'lento';
  }

  function gcd(a, b) { while (b !== 0) { const t = b; b = a % b; a = t; } return a || 1; }
  function formatShort(n) { if (!isFinite(n)) return '0'; return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/,''); }

  return { init, draw };
})();




