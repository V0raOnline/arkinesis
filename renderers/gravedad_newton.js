/**
 * renderers/gravedad_newton.js
 * Vista 1: orbita eliptica animada con baricentro real
 * Vista 2: vista lateral con ocultacion
 */

window.Renderers = window.Renderers || {};

window.Renderers.gravedad_newton = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let vPrev = null;
  const G = 6.674e-11;
  const OMEGA = (2 * Math.PI) / (8 * 60);

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d');
    ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
  }

  function resizeAll() {
    [c1, c2].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  function draw(valores, resultados) {
    frame++;
    const angle = frame * OMEGA;
    const e  = Math.max(0, Math.min(0.95, valores.e || 0));
    const m1 = valores.m1;
    const m2 = valores.m2;
    const r  = valores.r;

    // Semieje mayor visual escala con r del slider
    const rVisMin = 55, rVisMax = Math.min(c1.width, c1.height) * 0.414;
    const a_total = rVisMin + ((r - 1) / (100 - 1)) * (rVisMax - rVisMin);

    // Baricentro proporcional a masas
    const total_m = m1 + m2;
    const a1 = a_total * (m2 / total_m);
    const a2 = a_total * (m1 / total_m);
    const b1 = a1 * Math.sqrt(1 - e * e);
    const b2 = a2 * Math.sqrt(1 - e * e);

    // Radios visuales calculados UNA SOLA VEZ por frame, solo dependen de masa
    // No dependen de distancia instantanea -> sin pulso
    const r1vis = 7 + (m1 / 200) * 22;
    const r2vis = 7 + (m2 / 200) * 22;

    drawOrbita(valores, resultados, angle, a1, b1, a2, b2, e, a_total, r1vis, r2vis);
    drawLateral(valores, resultados, angle, a1, b1, a2, b2, e, r1vis, r2vis);
  }

  // Vista 1: plano XY
  function drawOrbita(valores, resultados, angle, a1, b1, a2, b2, e, a_total, r1vis, r2vis) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const m1 = valores.m1, m2 = valores.m2;
    const F  = resultados.F || 0;
    const bcx = W / 2, bcy = H / 2;

    drawGrid(ctx1, W, H);

    // Baricentro
    ctx1.beginPath();
    ctx1.arc(bcx, bcy, 3, 0, Math.PI * 2);
    ctx1.fillStyle = 'rgba(255,255,255,0.2)';
    ctx1.fill();
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(255,255,255,0.6)';
    ctx1.textAlign = 'center';
    ctx1.fillText('CM', bcx, bcy - 7);

    // Orbitas guia
    ctx1.beginPath();
    ctx1.ellipse(bcx, bcy, a1, b1, 0, 0, Math.PI * 2);
    ctx1.strokeStyle = 'rgba(0,229,255,0.07)';
    ctx1.lineWidth = 1; ctx1.stroke();

    ctx1.beginPath();
    ctx1.ellipse(bcx, bcy, a2, b2, 0, 0, Math.PI * 2);
    ctx1.strokeStyle = 'rgba(168,255,62,0.07)';
    ctx1.lineWidth = 1; ctx1.stroke();

    // Posiciones
    const [x1, y1] = elipsePos(bcx, bcy, a1, b1, angle + Math.PI);
    const [x2, y2] = elipsePos(bcx, bcy, a2, b2, angle);

    // Trails
    drawTrail(ctx1, bcx, bcy, a1, b1, angle + Math.PI, 80, 'rgba(0,229,255,0.35)');
    drawTrail(ctx1, bcx, bcy, a2, b2, angle, 80, 'rgba(168,255,62,0.35)');

    // Linea entre masas
    ctx1.beginPath(); ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2);
    ctx1.strokeStyle = 'rgba(255,77,109,0.15)';
    ctx1.lineWidth = 1;
    ctx1.setLineDash([3,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // Flechas de fuerza
    const dx12 = x2 - x1, dy12 = y2 - y1;
    const dist12 = Math.sqrt(dx12*dx12 + dy12*dy12);
    const fNorm = Math.min(F / 1e20, 1.0);
    const fLen = 8 + fNorm * 22;
    drawArrow(ctx1, x1, y1, x1 + (dx12/dist12)*fLen, y1 + (dy12/dist12)*fLen, '#ff4d6d');
    drawArrow(ctx1, x2, y2, x2 - (dx12/dist12)*fLen, y2 - (dy12/dist12)*fLen, '#ff4d6d');

    // Velocidades tangentes
    const [nx1, ny1] = elipsePos(bcx, bcy, a1, b1, angle + Math.PI + 0.05);
    const [nx2, ny2] = elipsePos(bcx, bcy, a2, b2, angle + 0.05);
    drawVelArrow(ctx1, x1, y1, nx1, ny1, 14 + fNorm*10, '#00e5ff');
    drawVelArrow(ctx1, x2, y2, nx2, ny2, 14 + fNorm*10, '#00e5ff');

    // Masas con radio estatico
    drawMass(ctx1, x1, y1, r1vis, '#00e5ff', 'm\u2081');
    drawMass(ctx1, x2, y2, r2vis, '#a8ff3e', 'm\u2082');

    // Velocidad vis-viva instantanea
    const distPx   = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
    const escM = 1e24, escR = 1e8;
    const rSemieje = valores.r * escR;
    const rInst    = (distPx / (a_total * 2)) * rSemieje * 2;
    const Mkg      = valores.m1 * escM;
    const vVis     = Math.sqrt(G * Mkg * (2 / Math.max(rInst, rSemieje * 0.05) - 1 / rSemieje));
    const vActual  = isFinite(vVis) ? vVis : (resultados.v_orb || 0);

    // Flecha tendencia
    const umbral    = vActual * 0.002;
    const vSubiendo = vPrev !== null && vActual > vPrev + umbral;
    const vBajando  = vPrev !== null && vActual < vPrev - umbral;
    vPrev = vActual;

    // Info inferior izquierda
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.textAlign = 'left';
    let yInfo = H - 10;

    ctx1.fillStyle = 'rgba(200,216,240,0.8)';
    ctx1.fillText('F = ' + formatNum(resultados.F) + ' N', 10, yInfo);
    yInfo -= 16;

    if (e > 0.01) {
      ctx1.fillStyle = 'rgba(255,107,53,0.55)';
      ctx1.fillText('e = ' + e.toFixed(2) + ' (solo visual)', 10, yInfo);
      yInfo -= 16;

      const vColor  = vSubiendo ? '#a8ff3e' : vBajando ? '#ff4d6d' : 'rgba(200,216,240,0.5)';
      const vFlecha = vSubiendo ? ' \u2191' : vBajando ? ' \u2193' : '';
      ctx1.fillStyle = vColor;
      ctx1.fillText('v = ' + formatNum(vActual) + ' m/s' + vFlecha, 10, yInfo);
    }

    ctx1.fillStyle = 'rgba(200,216,240,0.75)';
    ctx1.textAlign = 'right';
    ctx1.fillText('VISTA SUPERIOR (XY)', W - 10, 18);
    ctx1.textAlign = 'left';
  }

  // Vista 2: lateral XZ con ocultacion
  function drawLateral(valores, resultados, angle, a1, b1, a2, b2, e, r1vis, r2vis) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);

    const m1 = valores.m1, m2 = valores.m2;
    const bcx = W / 2, bcy = H / 2;

    drawGrid(ctx2, W, H);

    ctx2.beginPath();
    ctx2.arc(bcx, bcy, 3, 0, Math.PI * 2);
    ctx2.fillStyle = 'rgba(255,255,255,0.2)';
    ctx2.fill();
    ctx2.font = '500 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(255,255,255,0.6)';
    ctx2.textAlign = 'center';
    ctx2.fillText('CM', bcx, bcy - 7);

    ctx2.beginPath();
    ctx2.ellipse(bcx, bcy, a1, b1 * 0.3, 0, 0, Math.PI * 2);
    ctx2.strokeStyle = 'rgba(0,229,255,0.07)';
    ctx2.lineWidth = 1; ctx2.stroke();

    ctx2.beginPath();
    ctx2.ellipse(bcx, bcy, a2, b2 * 0.3, 0, 0, Math.PI * 2);
    ctx2.strokeStyle = 'rgba(168,255,62,0.07)';
    ctx2.lineWidth = 1; ctx2.stroke();

    const [lx1, lraw1] = elipsePos(bcx, bcy, a1, b1, angle + Math.PI);
    const [lx2, lraw2] = elipsePos(bcx, bcy, a2, b2, angle);
    const ly1 = bcy + (lraw1 - bcy) * 0.3;
    const ly2 = bcy + (lraw2 - bcy) * 0.3;

    const prof1 = Math.sin(angle + Math.PI);
    const prof2 = Math.sin(angle);

    ctx2.beginPath(); ctx2.moveTo(lx1, ly1); ctx2.lineTo(lx2, ly2);
    ctx2.strokeStyle = 'rgba(255,77,109,0.12)';
    ctx2.lineWidth = 1;
    ctx2.setLineDash([3,3]); ctx2.stroke(); ctx2.setLineDash([]);

    const m1detras = prof1 > prof2;
    if (m1detras) {
      drawMassOculta(ctx2, lx1, ly1, r1vis, '#00e5ff', 'm\u2081');
      drawMass(ctx2, lx2, ly2, r2vis, '#a8ff3e', 'm\u2082');
    } else {
      drawMassOculta(ctx2, lx2, ly2, r2vis, '#a8ff3e', 'm\u2082');
      drawMass(ctx2, lx1, ly1, r1vis, '#00e5ff', 'm\u2081');
    }

    const superposicion = Math.abs(lx1 - lx2) < (r1vis + r2vis) * 0.8;
    ctx2.font = '600 9px Space Mono, monospace';
    ctx2.textAlign = 'center';
    if (superposicion) {
      const tapado = m1detras ? 'm\u2081' : 'm\u2082';
      ctx2.fillStyle = 'rgba(255,107,53,0.7)';
      ctx2.fillText(tapado + ' oculta tras ' + (m1detras ? 'm\u2082' : 'm\u2081'), W/2, H - 24);
    } else {
      ctx2.fillStyle = 'rgba(168,255,62,0.85)';
      ctx2.fillText('ambas visibles', W/2, H - 24);
    }

    ctx2.font = '500 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right';
    ctx2.fillText('VISTA LATERAL (XZ)', W - 10, 18);
    ctx2.textAlign = 'left';
    ctx2.fillStyle = 'rgba(200,216,240,0.8)';
    ctx2.fillText('T = ' + formatNum(resultados.T) + ' s', 10, H - 10);
  }

  // Helpers
  function elipsePos(cx, cy, a, b, angle) {
    return [cx + a * Math.cos(angle), cy + b * Math.sin(angle)];
  }

  function drawTrail(ctx, cx, cy, a, b, angle, len, color) {
    ctx.beginPath();
    for (let i = len; i >= 0; i--) {
      const ang = angle - i * OMEGA;
      const [tx, ty] = elipsePos(cx, cy, a, b, ang);
      if (i === len) ctx.moveTo(tx, ty);
      else ctx.lineTo(tx, ty);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.5)';
    ctx.lineWidth = 0.5;
    for (let i = -8; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(W/2 + i*40, 0); ctx.lineTo(W/2 + i*40, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H/2 + i*40); ctx.lineTo(W, H/2 + i*40); ctx.stroke();
    }
  }

  function drawMass(ctx, x, y, r, color, label) {
    const grad = ctx.createRadialGradient(x, y, r*0.2, x, y, r+8);
    grad.addColorStop(0, color + '33');
    grad.addColorStop(1, 'transparent');
    ctx.beginPath(); ctx.arc(x, y, r+8, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = color + '22'; ctx.fill();
    ctx.font = '600 9px Space Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + r + 13);
    ctx.textAlign = 'left';
  }

  function drawMassOculta(ctx, x, y, r, color, label) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.strokeStyle = color + '35';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3,2]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = color + '08'; ctx.fill();
    ctx.font = '600 9px Space Mono, monospace';
    ctx.fillStyle = color + '35';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + r + 13);
    ctx.textAlign = 'left';
  }

  function drawArrow(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
    const dx = x2-x1, dy = y2-y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 2) return;
    const ux = dx/len, uy = dy/len;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - ux*6 + uy*3, y2 - uy*6 - ux*3);
    ctx.lineTo(x2 - ux*6 - uy*3, y2 - uy*6 + ux*3);
    ctx.fillStyle = color; ctx.fill();
  }

  function drawVelArrow(ctx, x, y, nx, ny, scale, color) {
    const dx = nx - x, dy = ny - y;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len < 0.01) return;
    drawArrow(ctx, x, y, x + (dx/len)*scale, y + (dy/len)*scale, color);
  }

  function formatNum(n) {
    if (n === null || n === undefined || isNaN(n)) return '---';
    const abs = Math.abs(n);
    if (abs === 0) return '0';
    const exp = Math.floor(Math.log10(abs));
    const sup = ['\u2070','\u00b9','\u00b2','\u00b3','\u2074','\u2075','\u2076','\u2077','\u2078','\u2079'];
    if (Math.abs(exp) >= 3) {
      const neg = exp < 0 ? '\u207b' : '';
      const expStr = String(Math.abs(exp)).split('').map(c => sup[+c]).join('');
      return (n / Math.pow(10, exp)).toFixed(2) + ' x10' + neg + expStr;
    }
    return n.toPrecision(3);
  }

  return { init, draw };
})();
