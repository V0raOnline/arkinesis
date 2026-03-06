/**
 * renderers/onda_armonica.js
 * Vista A: onda propagándose en el espacio y(x,t)
 * Vista B: MAS de la partícula en x₀
 */

window.Renderers = window.Renderers || {};

window.Renderers.onda_armonica = (() => {
  let c1, c2, ctx1, ctx2;
  let frame = 0;

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
    drawOnda(valores, resultados);
    drawMAS(valores, resultados);
  }

  // ── Vista A: onda propagándose ────────────────────────────────────────────
  function drawOnda(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const A      = valores.A;
    const lambda = valores.lambda;
    const f      = valores.f;
    const x0     = valores.x0;
    const T      = resultados.T;
    const v      = resultados.v;
    const omega  = resultados.omega;
    const k      = resultados.k;

    const cx = W / 2, cy = H / 2;

    // Escala: cuántos píxeles por metro
    // Queremos mostrar ~3 longitudes de onda
    const pxPerM = Math.min((W * 0.85) / (lambda * 3), 80);
    const pxPerA = Math.min((H * 0.35) / A, 60);

    // Tiempo actual
    const t = (frame / 60); // segundos a 60fps

    // Grid fijo
    ctx1.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx1.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx1.beginPath(); ctx1.moveTo(x,0); ctx1.lineTo(x,H); ctx1.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx1.beginPath(); ctx1.moveTo(0,y); ctx1.lineTo(W,y); ctx1.stroke(); }

    // Eje x (equilibrio)
    ctx1.beginPath(); ctx1.moveTo(0, cy); ctx1.lineTo(W, cy);
    ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([6,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // Marcas λ en el eje
    const xOrigin = cx - lambda * 1.5 * pxPerM; // origen visual
    for (let n = 0; n <= 3; n++) {
      const xMark = xOrigin + n * lambda * pxPerM;
      ctx1.beginPath(); ctx1.moveTo(xMark, cy - 5); ctx1.lineTo(xMark, cy + 5);
      ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1; ctx1.setLineDash([]); ctx1.stroke();
      if (n < 3) {
        // Flecha doble λ
        const xNext = xOrigin + (n + 1) * lambda * pxPerM;
        ctx1.font = '400 10px Outfit, sans-serif';
        ctx1.fillStyle = 'rgba(0,229,255,0.5)';
        ctx1.textAlign = 'center';
        ctx1.fillText('λ', (xMark + xNext) / 2, cy + 16);
      }
    }

    // Onda: y(x,t) = A·sin(ωt − kx)
    ctx1.beginPath();
    let started = false;
    for (let px = 0; px < W; px++) {
      const xM = (px - cx) / pxPerM; // x en metros
      const y  = A * Math.sin(omega * t - k * xM);
      const py = cy - y * pxPerA;
      if (!started) { ctx1.moveTo(px, py); started = true; }
      else ctx1.lineTo(px, py);
    }
    ctx1.strokeStyle = '#00e5ff';
    ctx1.lineWidth = 2;
    ctx1.shadowColor = '#00e5ff';
    ctx1.shadowBlur = 6;
    ctx1.stroke();
    ctx1.shadowBlur = 0;

    // Marcas de amplitud A
    ctx1.strokeStyle = 'rgba(168,255,62,0.3)';
    ctx1.lineWidth = 1;
    ctx1.setLineDash([4,3]);
    ctx1.beginPath(); ctx1.moveTo(0, cy - A * pxPerA); ctx1.lineTo(W, cy - A * pxPerA); ctx1.stroke();
    ctx1.beginPath(); ctx1.moveTo(0, cy + A * pxPerA); ctx1.lineTo(W, cy + A * pxPerA); ctx1.stroke();
    ctx1.setLineDash([]);
    ctx1.font = '400 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(168,255,62,0.6)';
    ctx1.textAlign = 'left';
    ctx1.fillText('+A', 5, cy - A * pxPerA - 4);
    ctx1.fillText('-A', 5, cy + A * pxPerA + 12);

    // Partícula observada en x₀
    const xPx = cx + x0 * pxPerM;
    const yObs = A * Math.sin(omega * t - k * x0);
    const yPx  = cy - yObs * pxPerA;

    // Línea vertical en x₀
    ctx1.beginPath(); ctx1.moveTo(xPx, cy - A * pxPerA - 10); ctx1.lineTo(xPx, cy + A * pxPerA + 10);
    ctx1.strokeStyle = 'rgba(255,77,109,0.35)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([3,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // Punto partícula
    ctx1.beginPath(); ctx1.arc(xPx, yPx, 7, 0, Math.PI * 2);
    ctx1.fillStyle = 'rgba(255,107,53,0.2)'; ctx1.fill();
    ctx1.beginPath(); ctx1.arc(xPx, yPx, 4, 0, Math.PI * 2);
    ctx1.fillStyle = '#ff6b35';
    ctx1.shadowColor = '#ff6b35'; ctx1.shadowBlur = 10; ctx1.fill();
    ctx1.shadowBlur = 0;

    // Label x₀
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = '#ff6b35';
    ctx1.textAlign = 'center';
    ctx1.fillText('x₀=' + x0.toFixed(1) + 'm', xPx, cy + A * pxPerA + 22);

    // Flecha velocidad de propagación
    const arrowY = cy - A * pxPerA - 22;
    ctx1.beginPath(); ctx1.moveTo(cx + 10, arrowY); ctx1.lineTo(cx + 50, arrowY);
    ctx1.strokeStyle = 'rgba(168,255,62,0.6)'; ctx1.lineWidth = 1.5; ctx1.stroke();
    ctx1.beginPath();
    ctx1.moveTo(cx + 50, arrowY);
    ctx1.lineTo(cx + 43, arrowY - 4);
    ctx1.lineTo(cx + 43, arrowY + 4);
    ctx1.fillStyle = 'rgba(168,255,62,0.6)'; ctx1.fill();
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(168,255,62,0.7)';
    ctx1.textAlign = 'left';
    ctx1.fillText('v = ' + (v || 0).toFixed(1) + ' m/s', cx + 55, arrowY + 4);

    // Labels esquina
    ctx1.font = '500 10px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(74,90,122,0.7)';
    ctx1.textAlign = 'right';
    ctx1.fillText('ONDA', W - 10, 18);
    ctx1.textAlign = 'left';
  }

  // ── Vista B: MAS de la partícula en x₀ ───────────────────────────────────
  function drawMAS(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);

    const A     = valores.A;
    const f     = valores.f;
    const x0    = valores.x0;
    const T     = resultados.T;
    const omega = resultados.omega;
    const k     = resultados.k;

    const cx = W / 2, cy = H / 2;
    const pxPerA = Math.min((H * 0.35) / A, 60);

    // Tiempo actual
    const t = (frame / 60);

    // Grid fijo
    ctx2.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx2.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx2.beginPath(); ctx2.moveTo(x,0); ctx2.lineTo(x,H); ctx2.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx2.beginPath(); ctx2.moveTo(0,y); ctx2.lineTo(W,y); ctx2.stroke(); }

    // Eje temporal: cuántos períodos mostrar
    const periodsToShow = 3;
    const pxPerT = (W * 0.85) / periodsToShow;

    // Eje t (equilibrio)
    ctx2.beginPath(); ctx2.moveTo(0, cy); ctx2.lineTo(W, cy);
    ctx2.strokeStyle = 'rgba(74,90,122,0.5)'; ctx2.lineWidth = 1;
    ctx2.setLineDash([6,3]); ctx2.stroke(); ctx2.setLineDash([]);

    // Marcas T en el eje
    const tOrigin = cx - periodsToShow / 2 * pxPerT;
    for (let n = 0; n <= periodsToShow; n++) {
      const xMark = tOrigin + n * pxPerT;
      ctx2.beginPath(); ctx2.moveTo(xMark, cy - 5); ctx2.lineTo(xMark, cy + 5);
      ctx2.strokeStyle = 'rgba(74,90,122,0.5)'; ctx2.lineWidth = 1; ctx2.setLineDash([]); ctx2.stroke();
      if (n < periodsToShow) {
        ctx2.font = '400 10px Outfit, sans-serif';
        ctx2.fillStyle = 'rgba(255,77,109,0.5)';
        ctx2.textAlign = 'center';
        ctx2.fillText('T', (xMark + tOrigin + (n+1) * pxPerT) / 2, cy + 16);
      }
    }

    // Trazar y(x₀, t) para una ventana de tiempo centrada en t actual
    // La ventana muestra periodsToShow períodos
    const tWindow = periodsToShow * T;
    const tStart  = t - tWindow / 2;

    ctx2.beginPath();
    let started = false;
    for (let px = 0; px < W; px++) {
      const tPlot = tStart + (px / W) * tWindow;
      const y = A * Math.sin(omega * tPlot - k * x0);
      const py = cy - y * pxPerA;
      if (!started) { ctx2.moveTo(px, py); started = true; }
      else ctx2.lineTo(px, py);
    }
    ctx2.strokeStyle = '#ff4d6d';
    ctx2.lineWidth = 1.8;
    ctx2.shadowColor = '#ff4d6d';
    ctx2.shadowBlur = 5;
    ctx2.stroke();
    ctx2.shadowBlur = 0;

    // Punto "ahora" en el centro
    const yNow = A * Math.sin(omega * t - k * x0);
    const yNowPx = cy - yNow * pxPerA;

    ctx2.beginPath(); ctx2.arc(cx, yNowPx, 7, 0, Math.PI * 2);
    ctx2.fillStyle = 'rgba(255,107,53,0.2)'; ctx2.fill();
    ctx2.beginPath(); ctx2.arc(cx, yNowPx, 4, 0, Math.PI * 2);
    ctx2.fillStyle = '#ff6b35';
    ctx2.shadowColor = '#ff6b35'; ctx2.shadowBlur = 10; ctx2.fill();
    ctx2.shadowBlur = 0;

    // Línea vertical "ahora"
    ctx2.beginPath(); ctx2.moveTo(cx, cy - A * pxPerA - 8); ctx2.lineTo(cx, cy + A * pxPerA + 8);
    ctx2.strokeStyle = 'rgba(255,107,53,0.25)'; ctx2.lineWidth = 1;
    ctx2.setLineDash([3,3]); ctx2.stroke(); ctx2.setLineDash([]);

    // Marcas amplitud
    ctx2.strokeStyle = 'rgba(168,255,62,0.3)';
    ctx2.lineWidth = 1; ctx2.setLineDash([4,3]);
    ctx2.beginPath(); ctx2.moveTo(0, cy - A * pxPerA); ctx2.lineTo(W, cy - A * pxPerA); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(0, cy + A * pxPerA); ctx2.lineTo(W, cy + A * pxPerA); ctx2.stroke();
    ctx2.setLineDash([]);
    ctx2.font = '400 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(168,255,62,0.6)';
    ctx2.textAlign = 'left';
    ctx2.fillText('+A', 5, cy - A * pxPerA - 4);
    ctx2.fillText('-A', 5, cy + A * pxPerA + 12);

    // Vector velocidad instantánea (tangente → derivada: dy/dt = Aω·cos(ωt−kx₀))
    const vy = A * omega * Math.cos(omega * t - k * x0);
    const vyPx = -vy * pxPerA / (omega * A + 0.01) * 28; // escalar a 28px máx
    if (Math.abs(vyPx) > 1) {
      ctx2.beginPath(); ctx2.moveTo(cx, yNowPx); ctx2.lineTo(cx, yNowPx + vyPx);
      ctx2.strokeStyle = '#a8ff3e'; ctx2.lineWidth = 2; ctx2.stroke();
      ctx2.beginPath();
      const dir = vyPx > 0 ? 1 : -1;
      ctx2.moveTo(cx, yNowPx + vyPx);
      ctx2.lineTo(cx - 4, yNowPx + vyPx - dir * 7);
      ctx2.lineTo(cx + 4, yNowPx + vyPx - dir * 7);
      ctx2.fillStyle = '#a8ff3e'; ctx2.fill();
    }

    // Labels
    ctx2.font = '500 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(255,77,109,0.6)';
    ctx2.textAlign = 'left';
    ctx2.fillText('y(x₀=' + x0.toFixed(1) + ', t)', 8, 16);

    ctx2.fillStyle = 'rgba(168,255,62,0.6)';
    ctx2.fillText('↑ vel. part.', 8, 30);

    ctx2.font = '500 10px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(74,90,122,0.7)';
    ctx2.textAlign = 'right';
    ctx2.fillText('MAS', W - 10, 18);
    ctx2.textAlign = 'left';

    // Valor numérico desplazamiento actual
    ctx2.font = '600 11px Space Mono, monospace';
    ctx2.fillStyle = '#ff6b35';
    ctx2.textAlign = 'center';
    ctx2.fillText('y = ' + yNow.toFixed(3) + ' m', cx, H - 10);
  }

  return { init, draw };
})();
