/**
 * renderers/campo_magnetico.js
 * Renderer: Protón en campo magnético uniforme
 * 
 * Exporta window.Renderers.campo_magnetico
 * API requerida: { init(c1, c2), draw(valores, resultados, formula) }
 */

window.Renderers = window.Renderers || {};

window.Renderers.campo_magnetico = (() => {
  let canvas3d, canvasXY, ctx3, ctxXY, frame = 0;

  function init(c1, c2) {
    canvas3d = c1;
    canvasXY = c2;
    ctx3   = canvas3d.getContext('2d');
    ctxXY  = canvasXY.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
  }

  function resizeAll() {
    [canvas3d, canvasXY].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  function draw(valores, resultados, formula) {
    frame++;

    const B     = valores.B;
    const theta = valores.theta * Math.PI / 180;
    const r     = resultados.r   || 0;
    const vperp = resultados.vperp || 0;
    const vpar  = resultados.vpar  || 0;

    draw3D(B, theta, r, vperp, vpar);
    drawXY(r, theta, vperp);
  }

  // ── Vista 3D ──────────────────────────────────────────────────────────────
  function draw3D(B, theta, r, vperp, vpar) {
    const W = canvas3d.width, H = canvas3d.height;
    ctx3.clearRect(0, 0, W, H);

    const cx = W * 0.45, cy = H * 0.5;
    const scale = Math.min(W, H) * 0.3;

    function iso(x, y, z) {
      const px = cx + (x - z) * Math.cos(Math.PI / 6) * scale * 0.5;
      const py = cy - y * scale * 0.45 + (x + z) * Math.sin(Math.PI / 6) * scale * 0.25;
      return [px, py];
    }

    // Grid
    ctx3.strokeStyle = 'rgba(26,37,64,0.8)';
    ctx3.lineWidth = 0.5;
    for (let i = -2; i <= 2; i++) {
      ctx3.beginPath();
      let [ax, ay] = iso(i, -1.2, -2); let [bx, by] = iso(i, -1.2, 2);
      ctx3.moveTo(ax, ay); ctx3.lineTo(bx, by); ctx3.stroke();
      ctx3.beginPath();
      [ax, ay] = iso(-2, -1.2, i); [bx, by] = iso(2, -1.2, i);
      ctx3.moveTo(ax, ay); ctx3.lineTo(bx, by); ctx3.stroke();
    }

    // Campo B (flechas verdes)
    ctx3.strokeStyle = 'rgba(168,255,62,0.45)';
    ctx3.lineWidth = 1.5;
    for (let xi = -1.5; xi <= 1.5; xi += 1.0) {
      for (let zi = -1.5; zi <= 1.5; zi += 1.0) {
        const [ax, ay] = iso(xi, -1.0, zi);
        const [bx, by] = iso(xi,  0.9, zi);
        ctx3.beginPath(); ctx3.moveTo(ax, ay); ctx3.lineTo(bx, by); ctx3.stroke();
        ctx3.beginPath(); ctx3.moveTo(bx, by);
        ctx3.lineTo(bx - 3, by + 5); ctx3.lineTo(bx + 3, by + 5);
        ctx3.fillStyle = 'rgba(168,255,62,0.45)'; ctx3.fill();
      }
    }
    ctx3.font = '600 11px Space Mono, monospace';
    ctx3.fillStyle = '#a8ff3e';
    const [blx, bly] = iso(1.8, 1.1, -1.5);
    ctx3.fillText('B (+z)', blx, bly);

    // Hélice
    const N = 300;
    const turns = 2.5;
    // rNorm: r ya viene normalizado del motor (0..~0.5), clampear a [0.1, 0.85]
    const rNorm = Math.max(0.1, Math.min(0.85, r));
    const ratio = Math.abs(vperp) > 1 ? vpar / vperp : 0;
    const pitchNorm = rNorm * ratio * 1.2;

    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * turns * 2 * Math.PI;
      const hx = rNorm * Math.cos(t);
      const hy = -1.0 + (t / (turns * 2 * Math.PI)) * Math.min(pitchNorm * turns, 2.2);
      const hz = rNorm * Math.sin(t);
      pts.push(iso(hx, hy, hz));
    }

    // Trail animado
    const progress = (frame % 120) / 120;
    const endIdx   = Math.floor(progress * N);

    ctx3.beginPath();
    ctx3.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= endIdx; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
    ctx3.strokeStyle = 'rgba(0,229,255,0.15)'; ctx3.lineWidth = 6; ctx3.stroke();

    ctx3.beginPath();
    ctx3.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= endIdx; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
    ctx3.strokeStyle = '#00e5ff'; ctx3.lineWidth = 1.5; ctx3.stroke();

    // Hélice completa (tenue)
    ctx3.beginPath();
    ctx3.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i <= N; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
    ctx3.strokeStyle = 'rgba(0,229,255,0.1)'; ctx3.lineWidth = 1; ctx3.stroke();

    // Protón
    const [px, py] = pts[endIdx];
    ctx3.beginPath(); ctx3.arc(px, py, 8, 0, Math.PI * 2);
    ctx3.fillStyle = 'rgba(255,107,53,0.2)'; ctx3.fill();
    ctx3.beginPath(); ctx3.arc(px, py, 4, 0, Math.PI * 2);
    ctx3.fillStyle = '#ff6b35'; ctx3.shadowColor = '#ff6b35'; ctx3.shadowBlur = 10; ctx3.fill();
    ctx3.shadowBlur = 0;

    // Etiqueta trayectoria
    ctx3.font = '600 10px Space Mono, monospace';
    ctx3.fillStyle = '#a8ff3e';
    const thetaDeg = theta * 180 / Math.PI;
    const label = thetaDeg < 3 ? 'LINEAL' : thetaDeg > 87 ? 'CIRCULAR' : 'HELICOIDAL';
    ctx3.fillText(label, W - 90, H - 12);
  }

  // ── Vista XY ──────────────────────────────────────────────────────────────
  function drawXY(r, theta, vperp) {
    const W = canvasXY.width, H = canvasXY.height;
    ctxXY.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const rNorm = Math.max(0.1, Math.min(0.95, r));
    const scale = Math.min(W, H) * 0.35;
    const rad   = rNorm * scale;

    // Grid
    ctxXY.strokeStyle = 'rgba(26,37,64,0.7)';
    ctxXY.lineWidth = 0.5;
    for (let i = -4; i <= 4; i++) {
      ctxXY.beginPath(); ctxXY.moveTo(cx + i * scale * 0.5, 0); ctxXY.lineTo(cx + i * scale * 0.5, H); ctxXY.stroke();
      ctxXY.beginPath(); ctxXY.moveTo(0, cy + i * scale * 0.5); ctxXY.lineTo(W, cy + i * scale * 0.5); ctxXY.stroke();
    }

    // Ejes
    ctxXY.strokeStyle = 'rgba(74,90,122,0.5)'; ctxXY.lineWidth = 1;
    ctxXY.beginPath(); ctxXY.moveTo(cx, 10); ctxXY.lineTo(cx, H - 10); ctxXY.stroke();
    ctxXY.beginPath(); ctxXY.moveTo(10, cy); ctxXY.lineTo(W - 10, cy); ctxXY.stroke();

    // Puntos B (campo saliendo +z)
    for (let xi = -2; xi <= 2; xi++) {
      for (let yi = -2; yi <= 2; yi++) {
        const bx = cx + xi * scale * 0.45;
        const by = cy + yi * scale * 0.45;
        ctxXY.beginPath(); ctxXY.arc(bx, by, 3, 0, Math.PI * 2);
        ctxXY.fillStyle = 'rgba(168,255,62,0.3)'; ctxXY.fill();
        ctxXY.beginPath(); ctxXY.arc(bx, by, 1, 0, Math.PI * 2);
        ctxXY.fillStyle = 'rgba(168,255,62,0.7)'; ctxXY.fill();
      }
    }

    // Círculo (glow + línea)
    ctxXY.beginPath(); ctxXY.arc(cx, cy, rad, 0, Math.PI * 2);
    ctxXY.strokeStyle = 'rgba(0,229,255,0.12)'; ctxXY.lineWidth = 8; ctxXY.stroke();
    ctxXY.beginPath(); ctxXY.arc(cx, cy, rad, 0, Math.PI * 2);
    ctxXY.strokeStyle = 'rgba(0,229,255,0.6)'; ctxXY.lineWidth = 1.5; ctxXY.stroke();

    // Protón animado
    const progress = (frame % 120) / 120;
    const angle = -progress * Math.PI * 2 - Math.PI / 2;
    const px = cx + rad * Math.cos(angle);
    const py = cy + rad * Math.sin(angle);

    // Radio (línea punteada)
    ctxXY.beginPath(); ctxXY.moveTo(cx, cy); ctxXY.lineTo(px, py);
    ctxXY.strokeStyle = 'rgba(168,255,62,0.35)'; ctxXY.lineWidth = 1;
    ctxXY.setLineDash([4, 3]); ctxXY.stroke(); ctxXY.setLineDash([]);
    ctxXY.font = '600 10px Space Mono, monospace'; ctxXY.fillStyle = '#a8ff3e';
    ctxXY.fillText('r', cx + (px - cx) * 0.5 + 5, cy + (py - cy) * 0.5 - 4);

    // Protón
    ctxXY.beginPath(); ctxXY.arc(px, py, 9, 0, Math.PI * 2);
    ctxXY.fillStyle = 'rgba(255,107,53,0.2)'; ctxXY.fill();
    ctxXY.beginPath(); ctxXY.arc(px, py, 5, 0, Math.PI * 2);
    ctxXY.fillStyle = '#ff6b35'; ctxXY.shadowColor = '#ff6b35'; ctxXY.shadowBlur = 12; ctxXY.fill();
    ctxXY.shadowBlur = 0;

    // Vector velocidad (tangente)
    const vLen = 8 + (vperp / 5e6) * 32;
    const vx = -Math.sin(angle) * vLen, vy = Math.cos(angle) * vLen;
    ctxXY.beginPath(); ctxXY.moveTo(px, py); ctxXY.lineTo(px + vx, py + vy);
    ctxXY.strokeStyle = '#ff4d6d'; ctxXY.lineWidth = 2; ctxXY.stroke();
    const vlen = Math.sqrt(vx * vx + vy * vy);
    const uvx = vx / vlen, uvy = vy / vlen;
    ctxXY.beginPath();
    ctxXY.moveTo(px + vx, py + vy);
    ctxXY.lineTo(px + vx - uvx * 7 + uvy * 4, py + vy - uvy * 7 - uvx * 4);
    ctxXY.lineTo(px + vx - uvx * 7 - uvy * 4, py + vy - uvy * 7 + uvx * 4);
    ctxXY.fillStyle = '#ff4d6d'; ctxXY.fill();

    // Labels ejes
    ctxXY.font = '500 9px Outfit, sans-serif';
    ctxXY.fillStyle = 'rgba(200,216,240,0.4)';
    ctxXY.fillText('x', W - 14, cy - 5);
    ctxXY.fillText('y', cx + 5, 14);
    ctxXY.font = '500 9px Space Mono, monospace';
    ctxXY.fillStyle = '#a8ff3e';
    ctxXY.fillText('⊙ B', 10, H - 12);
  }

  return { init, draw };
})();
