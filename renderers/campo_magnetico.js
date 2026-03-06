/**
 * renderers/campo_magnetico.js
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

    const B        = valores.B;
    const theta    = valores.theta * Math.PI / 180;
    const thetaDeg = valores.theta;
    const r        = resultados.r      || 0;
    const vperp    = resultados.vperp  || 0;
    const vpar     = resultados.vpar   || 0;
    const v        = valores.v * (valores.escala || 1e6);

    // Casos límite
    const esRectilineo = thetaDeg < 2 || thetaDeg > 178;
    const esCircular   = thetaDeg > 88 && thetaDeg < 92;

    draw3D(B, theta, r, vperp, vpar, esRectilineo, esCircular);
    drawXY(r, theta, vperp, esRectilineo, esCircular);
  }

  // ── Vista 3D ──────────────────────────────────────────────────────────────
  function draw3D(B, theta, r, vperp, vpar, esRectilineo, esCircular) {
    const W = canvas3d.width, H = canvas3d.height;
    ctx3.clearRect(0, 0, W, H);

    const cx = W * 0.45, cy = H * 0.5;
    const scale = Math.min(W, H) * 0.3;

    function iso(x, y, z) {
      const px = cx + (x - z) * Math.cos(Math.PI / 6) * scale * 0.5;
      const py = cy - y * scale * 0.45 + (x + z) * Math.sin(Math.PI / 6) * scale * 0.25;
      return [px, py];
    }

    const bPositivo = theta <= Math.PI / 2;

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

    // Campo B
    ctx3.strokeStyle = 'rgba(168,255,62,0.45)';
    ctx3.lineWidth = 1.5;
    for (let xi = -1.5; xi <= 1.5; xi += 1.0) {
      for (let zi = -1.5; zi <= 1.5; zi += 1.0) {
        if (bPositivo) {
          const [ax, ay] = iso(xi, -1.0, zi);
          const [bx, by] = iso(xi,  0.9, zi);
          ctx3.beginPath(); ctx3.moveTo(ax, ay); ctx3.lineTo(bx, by); ctx3.stroke();
          ctx3.beginPath(); ctx3.moveTo(bx, by);
          ctx3.lineTo(bx - 3, by + 5); ctx3.lineTo(bx + 3, by + 5);
          ctx3.fillStyle = 'rgba(168,255,62,0.45)'; ctx3.fill();
        } else {
          const [ax, ay] = iso(xi,  0.9, zi);
          const [bx, by] = iso(xi, -1.0, zi);
          ctx3.beginPath(); ctx3.moveTo(ax, ay); ctx3.lineTo(bx, by); ctx3.stroke();
          ctx3.beginPath(); ctx3.moveTo(bx, by);
          ctx3.lineTo(bx - 3, by - 5); ctx3.lineTo(bx + 3, by - 5);
          ctx3.fillStyle = 'rgba(168,255,62,0.45)'; ctx3.fill();
        }
      }
    }

    ctx3.font = '600 11px Space Mono, monospace';
    ctx3.fillStyle = '#a8ff3e';
    const [blx, bly] = iso(1.8, 1.1, -1.5);
    ctx3.fillText(bPositivo ? 'B (+z)' : 'B (-z)', blx, bly);

    if (esRectilineo) {
      // ── Movimiento rectilíneo: línea recta paralela a B ──────────────────
      const N = 60;
      const progress = (frame % 120) / 120;
      // La partícula viaja a lo largo de y (dirección B en iso)
      // Si bPositivo: viaja en +y (sube); si !bPositivo: viaja en -y (baja)
      const dir = bPositivo ? 1 : -1;
      const yPos = -1.0 + dir * progress * 2.2;

      // Trayectoria completa (línea tenue)
      const [p0x, p0y] = iso(0, -1.0, 0);
      const [p1x, p1y] = iso(0,  1.2, 0);
      ctx3.beginPath(); ctx3.moveTo(p0x, p0y); ctx3.lineTo(p1x, p1y);
      ctx3.strokeStyle = 'rgba(0,229,255,0.15)'; ctx3.lineWidth = 3; ctx3.stroke();
      ctx3.beginPath(); ctx3.moveTo(p0x, p0y); ctx3.lineTo(p1x, p1y);
      ctx3.strokeStyle = 'rgba(0,229,255,0.4)'; ctx3.lineWidth = 1; ctx3.stroke();

      // Partícula
      const [px, py] = iso(0, yPos, 0);
      ctx3.beginPath(); ctx3.arc(px, py, 8, 0, Math.PI * 2);
      ctx3.fillStyle = 'rgba(255,107,53,0.2)'; ctx3.fill();
      ctx3.beginPath(); ctx3.arc(px, py, 4, 0, Math.PI * 2);
      ctx3.fillStyle = '#ff6b35'; ctx3.shadowColor = '#ff6b35'; ctx3.shadowBlur = 10; ctx3.fill();
      ctx3.shadowBlur = 0;

      ctx3.font = '600 10px Space Mono, monospace';
      ctx3.fillStyle = '#a8ff3e';
      ctx3.fillText('LINEAL', W - 72, H - 12);

    } else {
      // ── Hélice / Círculo ──────────────────────────────────────────────────
      const N = 300;
      const turns = 2.5;

      const rMetros = r;
      const rLog = Math.log10(Math.max(rMetros, 1e-4) + 1e-4);
      const rMin = Math.log10(1e-4 + 1e-4);
      const rMax = Math.log10(1.0 + 1e-4);
      const rNorm = Math.max(0.08, Math.min(0.85, (rLog - rMin) / (rMax - rMin) * 0.85 + 0.08));

      const ratio = Math.abs(vperp) > 1 ? vpar / vperp : 0;
      const pitchNorm = rNorm * ratio * 1.2;

      const rotDir     = bPositivo ? 1 : -1;
      const totalPitch = esCircular ? 0 : Math.min(Math.abs(pitchNorm) * turns, 2.2);
      const pitchDir   = vpar >= 0 ? 1 : -1;
      const yStart     = -pitchDir * totalPitch / 2;

      const pts = [];
      for (let i = 0; i <= N; i++) {
        const t    = (i / N) * turns * 2 * Math.PI;
        const frac = t / (turns * 2 * Math.PI);
        const hx = rNorm * Math.cos(rotDir * t);
        const hy = yStart + pitchDir * frac * totalPitch;
        const hz = rNorm * Math.sin(rotDir * t);
        pts.push(iso(hx, hy, hz));
      }

      const progress = (frame % 120) / 120;
      const endIdx   = Math.floor(progress * N);

      // Hélice completa tenue
      ctx3.beginPath();
      ctx3.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= N; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
      ctx3.strokeStyle = 'rgba(0,229,255,0.1)'; ctx3.lineWidth = 1; ctx3.stroke();

      // Trail glow
      ctx3.beginPath();
      ctx3.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= endIdx; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
      ctx3.strokeStyle = 'rgba(0,229,255,0.15)'; ctx3.lineWidth = 6; ctx3.stroke();

      // Trail principal
      ctx3.beginPath();
      ctx3.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i <= endIdx; i++) ctx3.lineTo(pts[i][0], pts[i][1]);
      ctx3.strokeStyle = '#00e5ff'; ctx3.lineWidth = 1.5; ctx3.stroke();

      // Partícula
      const [px, py] = pts[endIdx];
      ctx3.beginPath(); ctx3.arc(px, py, 8, 0, Math.PI * 2);
      ctx3.fillStyle = 'rgba(255,107,53,0.2)'; ctx3.fill();
      ctx3.beginPath(); ctx3.arc(px, py, 4, 0, Math.PI * 2);
      ctx3.fillStyle = '#ff6b35'; ctx3.shadowColor = '#ff6b35'; ctx3.shadowBlur = 10; ctx3.fill();
      ctx3.shadowBlur = 0;

      ctx3.font = '600 10px Space Mono, monospace';
      ctx3.fillStyle = '#a8ff3e';
      const label = esCircular ? 'CIRCULAR' : 'HELICOIDAL';
      ctx3.fillText(label, W - 90, H - 12);
    }
  }

  // ── Vista XY ──────────────────────────────────────────────────────────────
  function drawXY(r, theta, vperp, esRectilineo, esCircular) {
    const W = canvasXY.width, H = canvasXY.height;
    ctxXY.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const scale = Math.min(W, H) * 0.35;

    const bPositivo = theta <= Math.PI / 2;

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

    // Representación del campo B (puntos o crucetas)
    for (let xi = -2; xi <= 2; xi++) {
      for (let yi = -2; yi <= 2; yi++) {
        const bx = cx + xi * scale * 0.45;
        const by = cy + yi * scale * 0.45;

        if (bPositivo) {
          ctxXY.beginPath(); ctxXY.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctxXY.fillStyle = 'rgba(168,255,62,0.25)'; ctxXY.fill();
          ctxXY.beginPath(); ctxXY.arc(bx, by, 1.2, 0, Math.PI * 2);
          ctxXY.fillStyle = 'rgba(168,255,62,0.7)'; ctxXY.fill();
        } else {
          const size = 3.5;
          ctxXY.strokeStyle = 'rgba(168,255,62,0.65)';
          ctxXY.lineWidth = 1.2;
          ctxXY.beginPath(); ctxXY.arc(bx, by, size, 0, Math.PI * 2); ctxXY.stroke();
          ctxXY.beginPath();
          ctxXY.moveTo(bx - size * 0.65, by - size * 0.65);
          ctxXY.lineTo(bx + size * 0.65, by + size * 0.65);
          ctxXY.moveTo(bx + size * 0.65, by - size * 0.65);
          ctxXY.lineTo(bx - size * 0.65, by + size * 0.65);
          ctxXY.stroke();
        }
      }
    }

    if (esRectilineo) {
      // ── Vista XY rectilíneo: punto fijo en el centro (no hay componente xy) ──
      // La partícula no se mueve en el plano XY — solo avanza en Z (dirección B)
      // Mostramos el punto fijo con label explicativo

      ctxXY.beginPath(); ctxXY.arc(cx, cy, 9, 0, Math.PI * 2);
      ctxXY.fillStyle = 'rgba(255,107,53,0.2)'; ctxXY.fill();
      ctxXY.beginPath(); ctxXY.arc(cx, cy, 5, 0, Math.PI * 2);
      ctxXY.fillStyle = '#ff6b35'; ctxXY.shadowColor = '#ff6b35'; ctxXY.shadowBlur = 12; ctxXY.fill();
      ctxXY.shadowBlur = 0;

      // Anillo pulsante para indicar que no hay movimiento circular
      const pulse = 0.5 + 0.5 * Math.sin(frame * 0.08);
      ctxXY.beginPath(); ctxXY.arc(cx, cy, 18 + pulse * 6, 0, Math.PI * 2);
      ctxXY.strokeStyle = `rgba(255,107,53,${0.15 + pulse * 0.1})`; ctxXY.lineWidth = 1;
      ctxXY.stroke();

      ctxXY.font = '500 9px Space Mono, monospace';
      ctxXY.fillStyle = 'rgba(200,216,240,0.5)';
      ctxXY.textAlign = 'center';
      ctxXY.fillText('sin movimiento en XY', cx, cy + 32);
      ctxXY.fillText('v⊥ = 0 → F = 0', cx, cy + 46);
      ctxXY.textAlign = 'left';

    } else {
      // ── Vista XY normal: círculo ──────────────────────────────────────────
      const rMetros = r;
      const rLog = Math.log10(Math.max(rMetros, 1e-4) + 1e-4);
      const rMin = Math.log10(1e-4 + 1e-4);
      const rMax = Math.log10(1.0 + 1e-4);
      const rNorm = Math.max(0.08, Math.min(0.95, (rLog - rMin) / (rMax - rMin) * 0.87 + 0.08));
      const rad = rNorm * scale;

      // Círculo trayectoria
      ctxXY.beginPath(); ctxXY.arc(cx, cy, rad, 0, Math.PI * 2);
      ctxXY.strokeStyle = 'rgba(0,229,255,0.12)'; ctxXY.lineWidth = 8; ctxXY.stroke();
      ctxXY.beginPath(); ctxXY.arc(cx, cy, rad, 0, Math.PI * 2);
      ctxXY.strokeStyle = 'rgba(0,229,255,0.6)'; ctxXY.lineWidth = 1.5; ctxXY.stroke();

      // Protón animado
      const sentido = bPositivo ? -1 : 1;
      const progress = (frame % 120) / 120;
      const angle = sentido * progress * Math.PI * 2 - Math.PI / 2;
      const px = cx + rad * Math.cos(angle);
      const py = cy + rad * Math.sin(angle);

      // Radio punteado
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

      // Vector velocidad tangente
      const vLen = 8 + (vperp / 5e6) * 32;
      const vx = -sentido * Math.sin(angle) * vLen;
      const vy =  sentido * Math.cos(angle) * vLen;
      ctxXY.beginPath(); ctxXY.moveTo(px, py); ctxXY.lineTo(px + vx, py + vy);
      ctxXY.strokeStyle = '#ff4d6d'; ctxXY.lineWidth = 2; ctxXY.stroke();
      const vlen = Math.sqrt(vx * vx + vy * vy);
      const uvx = vx / vlen, uvy = vy / vlen;
      ctxXY.beginPath();
      ctxXY.moveTo(px + vx, py + vy);
      ctxXY.lineTo(px + vx - uvx * 7 + uvy * 4, py + vy - uvy * 7 - uvx * 4);
      ctxXY.lineTo(px + vx - uvx * 7 - uvy * 4, py + vy - uvy * 7 + uvx * 4);
      ctxXY.fillStyle = '#ff4d6d'; ctxXY.fill();
    }

    // Labels
    ctxXY.font = '500 9px Outfit, sans-serif';
    ctxXY.fillStyle = 'rgba(200,216,240,0.4)';
    ctxXY.fillText('x', W - 14, cy - 5);
    ctxXY.fillText('y', cx + 5, 14);
    ctxXY.font = '500 10px Space Mono, monospace';
    ctxXY.fillStyle = '#a8ff3e';
    ctxXY.fillText(bPositivo ? '⊙ B (+z)' : '⊗ B (-z)', 10, H - 12);
  }

  return { init, draw };
})();
