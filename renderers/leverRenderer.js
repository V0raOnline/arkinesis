window.Renderers = window.Renderers || {};

window.Renderers.leverRenderer = (() => {
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
    drawLeverScene(valores, resultados);
    drawMomentsView(valores, resultados);
  }

  function drawLeverScene(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const fulcrumX = W * 0.5, fulcrumY = H * 0.58;
    const leverHalf = Math.min(W * 0.44, 280);
    const maxArm = 10, minReach = leverHalf * 0.2;
    const leftReach  = minReach + (valores.brazo_potencia   / maxArm) * (leverHalf - minReach);
    const rightReach = minReach + (valores.brazo_resistencia / maxArm) * (leverHalf - minReach);
    const delta   = resultados.diferencia_momentos || 0;
    const balance = Math.max(-1, Math.min(1, delta / 180));
    const wobble  = Math.abs(balance) > 0.05 ? Math.sin(frame * 0.04) * 0.003 : 0;
    const angle   = -balance * 0.22 + wobble;

    const left  = rotatePoint(fulcrumX - leftReach,  fulcrumY, fulcrumX, fulcrumY, angle);
    const right = rotatePoint(fulcrumX + rightReach, fulcrumY, fulcrumX, fulcrumY, angle);

    ctx1.beginPath(); ctx1.moveTo(left.x, left.y); ctx1.lineTo(right.x, right.y);
    ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 12; ctx1.lineCap = 'round'; ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(left.x, left.y); ctx1.lineTo(right.x, right.y);
    ctx1.strokeStyle = 'rgba(255,255,255,0.12)'; ctx1.lineWidth = 1.5; ctx1.stroke();

    drawFulcrum(fulcrumX, fulcrumY);

    const leftForce  = 48 + (valores.fuerza_aplicada / 500) * 120;
    const rightForce = 48 + (valores.resistencia     / 500) * 120;
    drawArrow(ctx1, left.x,  left.y  - leftForce,  left.x,  left.y  - 8, '#ff6b35', 'F');
    drawArrow(ctx1, right.x, right.y - 8, right.x, right.y - rightForce, '#ff4d6d', 'R');
    drawArmLabel(midPoint(left, { x: fulcrumX, y: fulcrumY }), valores.brazo_potencia,   '#00e5ff', 'bp');
    drawArmLabel(midPoint({ x: fulcrumX, y: fulcrumY }, right), valores.brazo_resistencia, '#a8ff3e', 'br');

    const estado = resultados.equilibrio < 1 ? 'EQUILIBRIO' : delta > 0 ? 'GANA POTENCIA' : 'GANA RESISTENCIA';
    const estadoColor = resultados.equilibrio < 1 ? '#a8ff3e' : delta > 0 ? '#00e5ff' : '#ff4d6d';
    ctx1.font = `400 ${14 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = estadoColor; ctx1.textAlign = 'right';
    ctx1.fillText(estado, W - 12, 18);

    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(200,216,240,0.72)'; ctx1.textAlign = 'center';
    ctx1.fillText('fulcro', fulcrumX, fulcrumY + 70);
    ctx1.textAlign = 'left';
  }

  function drawMomentsView(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const mp = resultados.momento_potencia   || 0;
    const mr = resultados.momento_resistencia || 0;
    const maxMoment = Math.max(mp, mr, 1);
    const baseY = H * 0.82, barW = Math.min(90, W * 0.18);
    const leftX = W * 0.28, rightX = W * 0.58, maxBarH = H * 0.46;

    drawBar(leftX,  baseY, barW, (mp / maxMoment) * maxBarH, '#00e5ff', 'Mp', mp);
    drawBar(rightX, baseY, barW, (mr / maxMoment) * maxBarH, '#ff4d6d', 'Mr', mr);

    const vm = resultados.ventaja_mecanica || 0;
    const eq = resultados.equilibrio || 0;
    const delta = resultados.diferencia_momentos || 0;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('MOMENTOS', W - 12, 18);

    ctx2.textAlign = 'left';
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.82)';
    ctx2.fillText('VM = ' + formatShort(vm), 14, 42);
    ctx2.fillText('Delta = ' + formatShort(delta) + ' N\u00b7m', 14, 60);
    ctx2.fillText('Error equilibrio = ' + formatShort(eq) + ' N\u00b7m', 14, 78);
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  }

  function drawFulcrum(x, y) {
    ctx1.beginPath(); ctx1.moveTo(x - 42, y + 52); ctx1.lineTo(x + 42, y + 52); ctx1.lineTo(x, y + 4); ctx1.closePath();
    ctx1.fillStyle = 'rgba(168,255,62,0.16)'; ctx1.fill();
    ctx1.strokeStyle = '#a8ff3e'; ctx1.lineWidth = 2; ctx1.stroke();
    ctx1.beginPath(); ctx1.arc(x, y, 8, 0, Math.PI * 2);
    ctx1.fillStyle = '#a8ff3e'; ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 14; ctx1.fill(); ctx1.shadowBlur = 0;
  }

  function drawArrow(ctx, x1, y1, x2, y2, color, label) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.stroke();
    const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy) || 1;
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

  function drawArmLabel(point, armValue, color, label) {
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = color; ctx1.textAlign = 'center';
    ctx1.fillText(label + ' = ' + formatShort(armValue) + ' m', point.x, point.y - 18);
    ctx1.textAlign = 'left';
  }

  function drawBar(x, baseY, width, height, color, label, value) {
    const topY = baseY - height;
    ctx2.fillStyle = color + '22'; ctx2.fillRect(x, topY, width, height);
    ctx2.strokeStyle = color; ctx2.lineWidth = 2; ctx2.strokeRect(x, topY, width, height);
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = color; ctx2.textAlign = 'center';
    ctx2.fillText(label, x + width/2, baseY + 18);
    ctx2.fillStyle = 'rgba(220,232,255,0.82)';
    ctx2.fillText(formatShort(value) + ' N\u00b7m', x + width/2, topY - 8);
    ctx2.textAlign = 'left';
  }

  function rotatePoint(x, y, cx, cy, angle) {
    const dx = x-cx, dy = y-cy;
    return { x: cx + dx*Math.cos(angle) - dy*Math.sin(angle), y: cy + dx*Math.sin(angle) + dy*Math.cos(angle) };
  }
  function midPoint(a, b) { return { x: (a.x+b.x)/2, y: (a.y+b.y)/2 }; }
  function formatShort(n) { if (!isFinite(n)) return '0'; return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2).replace(/\.00$/,''); }

  return { init, draw };
})();




