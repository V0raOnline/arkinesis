window.Renderers = window.Renderers || {};

window.Renderers.beltRenderer = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;

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
    drawBeltScene(valores, resultados);
    drawTransmissionView(valores, resultados);
  }

  function calcTangents(cxA, cxB, cy, rA, rB) {
    if (Math.abs(rB - rA) < 0.5) {
      return { tAx_top: cxA, tAy_top: cy - rA, tBx_top: cxB, tBy_top: cy - rB, tAx_bot: cxA, tAy_bot: cy + rA, tBx_bot: cxB, tBy_bot: cy + rB };
    }
    const dist = cxB - cxA;
    const px = cxA + dist * rA / (rA - rB);
    const py = cy;
    const dA = Math.abs(cxA - px), dB = Math.abs(cxB - px);
    const sinBeta = rA / dA, cosBeta = Math.sqrt(Math.max(0, 1 - sinBeta * sinBeta));
    const uAx = (cxA - px) / dA, uBx = (cxB - px) / dB;
    return {
      tAx_top: px + uAx * dA * cosBeta * cosBeta, tAy_top: py - rA * cosBeta,
      tBx_top: px + uBx * dB * cosBeta * cosBeta, tBy_top: py - rB * cosBeta,
      tAx_bot: px + uAx * dA * cosBeta * cosBeta, tAy_bot: py + rA * cosBeta,
      tBx_bot: px + uBx * dB * cosBeta * cosBeta, tBy_bot: py + rB * cosBeta,
    };
  }

  function drawBeltScene(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const da = Math.max(5, valores.diametro_a || 20);
    const db = Math.max(5, valores.diametro_b || 40);
    const realRatio = Math.max(da, db) / Math.min(da, db);
    const MAX_VISUAL_RATIO = 4;
    const approxMode = realRatio > MAX_VISUAL_RATIO;
    let daVis = da, dbVis = db;
    if (approxMode) { if (da < db) dbVis = da * MAX_VISUAL_RATIO; else daVis = db * MAX_VISUAL_RATIO; }

    const margin = 32;
    const scaleByWidth  = (W - 2 * margin) / (2.5 * (daVis + dbVis));
    const scaleByHeight = (H * 0.40) / Math.max(daVis, dbVis);
    const scale = Math.min(scaleByWidth, scaleByHeight);
    const rA = Math.max(12, daVis * scale), rB = Math.max(12, dbVis * scale);
    const dist = Math.max(rA + rB + 40, (rA + rB) * 1.5);
    const cy = H * 0.46, cxA = W / 2 - dist / 2, cxB = W / 2 + dist / 2;

    const speedA = 0.025, speedB = speedA * (da / db);
    const angleA = frame * speedA, angleB = frame * speedB;

    const t = calcTangents(cxA, cxB, cy, rA, rB);
    const angA_top = Math.atan2(t.tAy_top - cy, t.tAx_top - cxA);
    const angA_bot = Math.atan2(t.tAy_bot - cy, t.tAx_bot - cxA);
    const angB_top = Math.atan2(t.tBy_top - cy, t.tBx_top - cxB);
    const angB_bot = Math.atan2(t.tBy_bot - cy, t.tBx_bot - cxB);
    const beltOffset = (frame * speedA * rA * 4) % 20;

    function traceBelt() {
      ctx1.beginPath();
      ctx1.moveTo(t.tAx_top, t.tAy_top);
      ctx1.lineTo(t.tBx_top, t.tBy_top);
      ctx1.arc(cxB, cy, rB, angB_top, angB_bot, false);
      ctx1.lineTo(t.tAx_bot, t.tAy_bot);
      ctx1.arc(cxA, cy, rA, angA_bot, angA_top, false);
      ctx1.closePath();
    }

    ctx1.save(); traceBelt();
    ctx1.strokeStyle = 'rgba(168,255,62,0.45)'; ctx1.lineWidth = 8; ctx1.lineJoin = 'round'; ctx1.stroke();
    ctx1.restore();
    ctx1.save(); traceBelt();
    ctx1.setLineDash([10, 10]); ctx1.lineDashOffset = -beltOffset;
    ctx1.strokeStyle = 'rgba(168,255,62,0.95)'; ctx1.lineWidth = 2.5; ctx1.stroke();
    ctx1.setLineDash([]); ctx1.restore();

    drawPulley(ctx1, cxA, cy, rA, angleA, '#ff9b45', '#ff6b35');
    drawPulley(ctx1, cxB, cy, rB, angleB, '#00f0ff', '#00e5ff');
    drawSpinCue(cxA, cy - rA - 24, '\u21bb', '#ff9b45');
    drawSpinCue(cxB, cy - rB - 24, '\u21bb', '#00e5ff');

    ctx1.font = `400 ${15 + _F}px Space Mono, monospace`; ctx1.textAlign = 'center';
    ctx1.fillStyle = '#ff9b45'; ctx1.fillText('A', cxA, cy + rA + 24);
    ctx1.fillStyle = '#00e5ff'; ctx1.fillText('B', cxB, cy + rB + 24);

    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.92)';
    ctx1.fillText('\u00d8 ' + da + ' cm', cxA, cy + rA + 42);
    ctx1.fillText('\u00d8 ' + db + ' cm', cxB, cy + rB + 42);

    const rpmB = resultados.velocidad_salida || 0;
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#ff9b45'; ctx1.fillText('100 rpm', cxA, cy - rA - 42);
    ctx1.fillStyle = '#00e5ff'; ctx1.fillText(formatShort(rpmB) + ' rpm', cxB, cy - rB - 42);

    const relStr = da < db ? 'A RAPIDO \u00b7 B LENTO' : da > db ? 'A LENTO \u00b7 B RAPIDO' : 'MISMA VELOCIDAD';
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.textAlign = 'right'; ctx1.fillStyle = '#a8ff3e';
    ctx1.fillText(relStr, W - 14, 20);

    ctx1.textAlign = 'left';
    if (approxMode) {
      ctx1.font = `400 ${11 + _F}px Space Mono, monospace`; ctx1.fillStyle = 'rgba(255,180,50,0.82)';
      ctx1.fillText('* escala aproximada (diferencia real: 1:' + realRatio.toFixed(0) + ')', 14, H - 14);
    }
  }

  function drawTransmissionView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const da = Math.max(5, valores.diametro_a || 20);
    const db = Math.max(5, valores.diametro_b || 40);
    const entrada = 100, salida = resultados.velocidad_salida || 0;
    const g = gcd(Math.round(da), Math.round(db));
    const realRatio = Math.max(da, db) / Math.min(da, db);
    const approxMode = realRatio > 4;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('TRANSMISION', W - 12, 18);
    ctx2.textAlign = 'center';
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.76)';
    ctx2.fillText('Entrada', W / 2, 54);
    ctx2.font = `400 ${22 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#ff9b45';
    ctx2.fillText(formatShort(entrada) + ' rpm', W / 2, 88);

    drawFlowArrow(W / 2, 110, W / 2, 146);

    ctx2.font = `400 ${20 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#a8ff3e';
    ctx2.fillText('\u00d8' + da + ' : \u00d8' + db, W / 2, 178);
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.76)';
    ctx2.fillText('Relacion ' + Math.round(da / g) + ':' + Math.round(db / g), W / 2, 200);

    drawFlowArrow(W / 2, 220, W / 2, 256);

    ctx2.fillText('Salida', W / 2, 288);
    ctx2.font = `400 ${22 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#00e5ff';
    ctx2.fillText(formatShort(salida) + ' rpm', W / 2, 322);

    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = salida > entrada ? '#00e5ff' : salida < entrada ? '#ff9b45' : '#a8ff3e';
    ctx2.fillText(salida > entrada ? 'multiplica velocidad' : salida < entrada ? 'reduce velocidad' : 'transmision directa', W / 2, 350);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(168,255,62,0.7)';
    ctx2.fillText('mismo sentido de giro', W / 2, 375);

    if (approxMode) {
      ctx2.fillStyle = 'rgba(255,180,50,0.75)';
      ctx2.fillText('* Vista A a escala aproximada', W / 2, 410);
      ctx2.fillText('  Diferencia real: 1:' + realRatio.toFixed(0), W / 2, 426);
    }
    ctx2.textAlign = 'left';
  }

  function drawPulley(ctx, cx, cy, r, angle, glow, stroke) {
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, Math.PI * 2); ctx.fillStyle = glow + '14'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = stroke; ctx.lineWidth = 4; ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = angle + (Math.PI / 2) * i;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 0.18, cy + Math.sin(a) * r * 0.18);
      ctx.lineTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82);
      ctx.strokeStyle = stroke; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
    }
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.16, 0, Math.PI * 2);
    ctx.fillStyle = stroke; ctx.shadowColor = stroke; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
  }

  function drawSpinCue(x, y, glyph, color) {
    ctx1.font = `400 ${20 + _F}px Space Mono, monospace`; ctx1.textAlign = 'center';
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

  function gcd(a, b) { while (b !== 0) { const t = b; b = a % b; a = t; } return a || 1; }
  function formatShort(n) { if (!isFinite(n)) return '0'; return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/,''); }

  return { init, draw };
})();

