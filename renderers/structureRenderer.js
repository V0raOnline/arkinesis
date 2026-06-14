window.Renderers = window.Renderers || {};

window.Renderers.structureRenderer = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;
  let currentShear = 0;

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
    drawStructureScene(valores, resultados);
    drawComparisonView(valores, resultados);
  }

  function drawStructureScene(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const carga = valores.carga || 0;
    const t = carga / 100;
    const maxShear = Math.min(W * 0.06, 40);
    currentShear += (t * maxShear - currentShear) * 0.12;
    const wobble = carga > 10 ? Math.sin(frame * 0.06) * currentShear * 0.12 : 0;
    const totalShear = currentShear + wobble;

    const size = Math.min(W * 0.22, H * 0.36, 160);
    const midY = H * 0.46, leftCx = W * 0.27, rightCx = W * 0.73;
    const topY = midY - size / 2, botY = midY + size / 2;

    ctx1.font = `400 ${13 + _F}px Space Mono, monospace`; ctx1.textAlign = 'center';
    ctx1.fillStyle = '#ff4d6d'; ctx1.fillText('CUADRADO', leftCx, topY - 72);
    ctx1.fillStyle = '#a8ff3e'; ctx1.fillText('TRIANGULADO', rightCx, topY - 72);

    const arrowLen = 18 + t * 30, arrowW = 2 + t * 4, arrowGlow = t * 18;
    drawLoadArrow(leftCx,  topY - 8, arrowLen, '#ff4d6d', arrowW, arrowGlow);
    drawLoadArrow(rightCx, topY - 8, arrowLen, '#a8ff3e', arrowW, arrowGlow);

    // Cuadrado
    const sq = {
      tl: { x: leftCx - size/2 + totalShear, y: topY },
      tr: { x: leftCx + size/2 + totalShear, y: topY },
      br: { x: leftCx + size/2, y: botY },
      bl: { x: leftCx - size/2, y: botY },
    };
    ctx1.beginPath(); ctx1.moveTo(sq.tl.x,sq.tl.y); ctx1.lineTo(sq.tr.x,sq.tr.y);
    ctx1.lineTo(sq.br.x,sq.br.y); ctx1.lineTo(sq.bl.x,sq.bl.y); ctx1.closePath();
    ctx1.fillStyle = 'rgba(255,77,109,0.06)'; ctx1.fill();
    drawBeam(ctx1, sq.tl, sq.tr, '#ff4d6d', 3); drawBeam(ctx1, sq.tr, sq.br, '#ff4d6d', 3);
    drawBeam(ctx1, sq.br, sq.bl, '#ff4d6d', 3); drawBeam(ctx1, sq.bl, sq.tl, '#ff4d6d', 3);
    drawNode(ctx1, sq.tl, '#ff4d6d'); drawNode(ctx1, sq.tr, '#ff4d6d');
    drawNode(ctx1, sq.br, '#ff4d6d', true); drawNode(ctx1, sq.bl, '#ff4d6d', true);

    if (carga > 5) {
      ctx1.font = `400 ${11 + _F}px Space Mono, monospace`; ctx1.fillStyle = 'rgba(255,77,109,0.85)';
      ctx1.fillText('+' + Math.round(carga) + '% def.', leftCx + totalShear/2, botY + 28);
    }

    // Triangulada
    const triShear = t * maxShear * 0.2 + (carga > 10 ? Math.sin(frame * 0.06) * t * maxShear * 0.02 : 0);
    const tr = {
      tl: { x: rightCx - size/2 + triShear, y: topY },
      tr: { x: rightCx + size/2 + triShear, y: topY },
      br: { x: rightCx + size/2, y: botY },
      bl: { x: rightCx - size/2, y: botY },
    };
    ctx1.beginPath(); ctx1.moveTo(tr.tl.x,tr.tl.y); ctx1.lineTo(tr.tr.x,tr.tr.y);
    ctx1.lineTo(tr.br.x,tr.br.y); ctx1.lineTo(tr.bl.x,tr.bl.y); ctx1.closePath();
    ctx1.fillStyle = 'rgba(168,255,62,0.06)'; ctx1.fill();
    drawBeam(ctx1, tr.tl, tr.tr, '#a8ff3e', 3); drawBeam(ctx1, tr.tr, tr.br, '#a8ff3e', 3);
    drawBeam(ctx1, tr.br, tr.bl, '#a8ff3e', 3); drawBeam(ctx1, tr.bl, tr.tl, '#a8ff3e', 3);
    drawBeam(ctx1, tr.tl, tr.br, 'rgba(0,229,255,0.18)', 1.5);

    ctx1.save();
    ctx1.shadowColor = '#00e5ff'; ctx1.shadowBlur = 4 + t * 20; ctx1.globalAlpha = 0.55 + t * 0.45;
    drawBeam(ctx1, tr.bl, tr.tr, '#00e5ff', 2 + t * 2);
    ctx1.globalAlpha = 1; ctx1.shadowBlur = 0; ctx1.restore();

    drawNode(ctx1, tr.tl, '#a8ff3e'); drawNode(ctx1, tr.tr, '#a8ff3e');
    drawNode(ctx1, tr.br, '#a8ff3e', true); drawNode(ctx1, tr.bl, '#a8ff3e', true);

    if (carga > 5) {
      ctx1.font = `400 ${11 + _F}px Space Mono, monospace`; ctx1.fillStyle = 'rgba(168,255,62,0.85)';
      ctx1.fillText('+' + (carga * 0.2).toFixed(0) + '% def.', rightCx + triShear/2, botY + 28);
    }

    const midDiagX = (tr.bl.x + tr.tr.x) / 2, midDiagY = (tr.bl.y + tr.tr.y) / 2;
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = `rgba(0,229,255,${0.4 + t * 0.6})`; ctx1.textAlign = 'left';
    ctx1.fillText('diagonal', midDiagX + 8, midDiagY - 4);

    drawGround(leftCx, botY, size);
    drawGround(rightCx, botY, size);

    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`; ctx1.textAlign = 'right'; ctx1.fillStyle = '#a8ff3e';
    ctx1.fillText('TRIANGULACION', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function drawComparisonView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const carga   = valores.carga || 0;
    const defCuad = resultados.deformacion_cuadrado  || 0;
    const defTri  = resultados.deformacion_triangulo  || 0;
    const estCuad = resultados.estabilidad_cuadrado  || 0;
    const estTri  = resultados.estabilidad_triangulo  || 0;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('COMPARATIVA', W - 12, 18);

    const baseY = H * 0.54, maxBarH = H * 0.32;
    const barW = Math.min(72, W * 0.16), gap = Math.min(110, W * 0.24), cx = W / 2;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.7)'; ctx2.textAlign = 'center';
    ctx2.fillText('DEFORMACION', cx, baseY - maxBarH - 20);

    drawBar2(cx - gap/2, baseY, barW, (defCuad/100) * maxBarH, '#ff4d6d', 'Cuad.', Math.round(defCuad) + '%');
    drawBar2(cx + gap/2, baseY, barW, (defTri /100) * maxBarH, '#a8ff3e', 'Tri.',  defTri.toFixed(0) + '%');

    const baseY2 = H * 0.88, maxBarH2 = H * 0.18;
    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`; ctx2.fillStyle = 'rgba(200,216,240,0.7)';
    ctx2.fillText('ESTABILIDAD', cx, baseY2 - maxBarH2 - 14);
    drawBar2(cx - gap/2, baseY2, barW, (Math.max(0,estCuad)/100) * maxBarH2, '#ff4d6d', '', Math.max(0,estCuad).toFixed(0) + '%');
    drawBar2(cx + gap/2, baseY2, barW, (Math.max(0,estTri) /100) * maxBarH2, '#a8ff3e', '', Math.max(0,estTri).toFixed(0) + '%');

    if (carga > 0) {
      ctx2.font = `400 ${12 + _F}px Space Mono, monospace`; ctx2.fillStyle = '#00e5ff';
      const msg = carga >= 50 ? 'La triangulacion reduce la deformacion un 80%' : 'La estructura triangulada mantiene mejor su forma';
      ctx2.fillText(msg, cx, baseY + 28);
    }
    ctx2.textAlign = 'left';
  }

  function drawBeam(ctx, a, b, color, width) {
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.stroke();
  }

  function drawNode(ctx, p, color, fixed = false) {
    ctx.beginPath(); ctx.arc(p.x, p.y, fixed ? 7 : 5, 0, Math.PI*2);
    ctx.fillStyle = fixed ? color + '44' : color; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    if (fixed) {
      ctx.beginPath(); ctx.moveTo(p.x-9, p.y+7); ctx.lineTo(p.x+9, p.y+7); ctx.lineTo(p.x, p.y); ctx.closePath();
      ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  function drawGround(cx, y, size) {
    ctx1.beginPath(); ctx1.moveTo(cx-size/2-8, y+14); ctx1.lineTo(cx+size/2+8, y+14);
    ctx1.strokeStyle = 'rgba(200,216,240,0.2)'; ctx1.lineWidth = 2; ctx1.stroke();
    for (let x = cx-size/2-4; x < cx+size/2+8; x += 12) {
      ctx1.beginPath(); ctx1.moveTo(x, y+14); ctx1.lineTo(x-7, y+22);
      ctx1.strokeStyle = 'rgba(200,216,240,0.14)'; ctx1.lineWidth = 1.5; ctx1.stroke();
    }
  }

  function drawLoadArrow(cx, tipY, len, color, width, glow) {
    ctx1.save(); ctx1.shadowColor = color; ctx1.shadowBlur = glow;
    ctx1.beginPath(); ctx1.moveTo(cx, tipY-len); ctx1.lineTo(cx, tipY);
    ctx1.strokeStyle = color; ctx1.lineWidth = width; ctx1.stroke();
    const headW = 5 + width * 1.2;
    ctx1.beginPath(); ctx1.moveTo(cx, tipY);
    ctx1.lineTo(cx-headW, tipY-headW*1.6); ctx1.lineTo(cx+headW, tipY-headW*1.6);
    ctx1.fillStyle = color; ctx1.fill(); ctx1.restore();
  }

  function drawBar2(x, baseY, width, height, color, label, valueText) {
    const topY = baseY - height;
    ctx2.fillStyle = color + '22'; ctx2.fillRect(x-width/2, topY, width, height);
    ctx2.strokeStyle = color; ctx2.lineWidth = 2; ctx2.strokeRect(x-width/2, topY, width, height);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`; ctx2.fillStyle = color; ctx2.textAlign = 'center';
    if (label) ctx2.fillText(label, x, baseY + 16);
    ctx2.fillStyle = 'rgba(220,232,255,0.85)'; ctx2.fillText(valueText, x, topY - 7);
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  return { init, draw };
})();
