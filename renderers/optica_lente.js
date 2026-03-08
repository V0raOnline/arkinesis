/**
 * renderers/optica_lente.js
 */

window.Renderers = window.Renderers || {};

window.Renderers.optica_lente = (() => {
  let c1, c2, ctx1, ctx2;

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
    drawDiagrama(valores, resultados);
    drawInfo(valores, resultados);
  }

  // ── Vista A: diagrama de rayos ────────────────────────────────────────────
  function drawDiagrama(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const f  = valores.f;
    const so = valores.so;
    const ho = valores.ho;
    const si = resultados.si;
    const hi = resultados.hi;
    const A  = resultados.A;

    const lx = W * 0.5;
    const oy = H * 0.5;

    const maxDist = Math.max(Math.abs(so), Math.abs(si || 1), Math.abs(f)) * 1.4;
    const scale = Math.min((W * 0.42) / maxDist, 6);

    // Grid fijo: paso constante de 40px, independiente de scale
    ctx1.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx1.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) {
      ctx1.beginPath(); ctx1.moveTo(x, 0); ctx1.lineTo(x, H); ctx1.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx1.beginPath(); ctx1.moveTo(0, y); ctx1.lineTo(W, y); ctx1.stroke();
    }

    // Eje óptico
    ctx1.beginPath(); ctx1.moveTo(0, oy); ctx1.lineTo(W, oy);
    ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([6,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // Focos
    const fxRight = lx + f * scale;
    const fxLeft  = lx - f * scale;
    drawFoco(ctx1, fxRight, oy, f > 0 ? "F'" : "F'");
    drawFoco(ctx1, fxLeft,  oy, f > 0 ? "F"  : "F");

    // Lente
    const lh = Math.min(H * 0.38, 120);
    drawLente(ctx1, lx, oy, lh, f > 0);

    // Objeto
    const ox = lx - so * scale;
    const oh = ho * scale * 0.8;
    drawObjeto(ctx1, ox, oy, oh);

    // Imagen
    if (si !== null && isFinite(si) && Math.abs(si) < 1e6) {
      const ix = lx + si * scale;
      const ih = Math.abs(hi) * scale * 0.8;
      const invertida = hi < 0;
      drawImagen(ctx1, ix, oy, ih, invertida, si > 0);
    }

    // 3 rayos característicos
    if (si !== null && isFinite(si) && Math.abs(si) < 1e6) {
      drawRayos(ctx1, lx, oy, ox, oy - oh, f, so, si, hi, scale, W, H);
    }

    // Pantalla (solo imagen real)
    if (si !== null && isFinite(si) && si > 0 && Math.abs(si) < 1e6) {
      const ix = lx + si * scale;
      const ph = Math.min(H * 0.45, 100);
      ctx1.beginPath(); ctx1.moveTo(ix - 2, oy - ph); ctx1.lineTo(ix - 2, oy + ph);
      ctx1.strokeStyle = 'rgba(200,216,240,0.18)'; ctx1.lineWidth = 2; ctx1.stroke();
      ctx1.beginPath(); ctx1.moveTo(ix + 2, oy - ph); ctx1.lineTo(ix + 2, oy + ph);
      ctx1.strokeStyle = 'rgba(200,216,240,0.10)'; ctx1.lineWidth = 1.5; ctx1.stroke();
      ctx1.font = '400 8px Space Mono, monospace';
      ctx1.fillStyle = 'rgba(200,216,240,0.3)';
      ctx1.textAlign = 'center';
      ctx1.fillText('pantalla', ix, oy - ph - 5);
      ctx1.textAlign = 'left';
    }

    // Labels
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(200,216,240,0.4)';
    ctx1.textAlign = 'center';
    ctx1.fillText('s_o = ' + so.toFixed(0) + ' cm', (ox + lx) / 2, oy + 18);

    if (si !== null && isFinite(si) && Math.abs(si) < 1e6) {
      const ix = lx + si * scale;
      const color = si > 0 ? 'rgba(168,255,62,0.6)' : 'rgba(255,107,53,0.6)';
      ctx1.fillStyle = color;
      ctx1.fillText('s_i = ' + si.toFixed(1) + ' cm', (lx + ix) / 2, oy + 30);
    }

    const tipoLente = f > 0 ? 'CONVERGENTE' : 'DIVERGENTE';
    const tipoImg   = (si === null || !isFinite(si)) ? 'SIN IMAGEN' :
                      si > 0 ? 'IMAGEN REAL' : 'IMAGEN VIRTUAL';

    ctx1.textAlign = 'right';
    ctx1.fillStyle = f > 0 ? 'rgba(0,229,255,0.6)' : 'rgba(255,107,53,0.5)';
    ctx1.fillText(tipoLente, W - 10, 18);
    ctx1.fillStyle = si > 0 ? 'rgba(168,255,62,0.6)' : 'rgba(255,107,53,0.5)';
    ctx1.fillText(tipoImg, W - 10, 32);
    ctx1.textAlign = 'left';

    if (A !== null && isFinite(A)) {
      const Astr = A >= 0 ? '+' + A.toFixed(2) : A.toFixed(2);
      ctx1.fillStyle = 'rgba(200,216,240,0.35)';
      ctx1.fillText('A = ' + Astr + (Math.abs(A) > 1 ? '  (amplía)' : '  (reduce)'), 10, H - 10);
    }
  }

  // ── 3 rayos característicos (lente convergente y divergente) ─────────────
  function drawRayos(ctx, lx, oy, ox, objTopY, f, so, si, hi, scale, W, H) {
    const ix = lx + si * scale;
    const iy = oy - hi * scale * 0.8;  // punta de la imagen

    const fxRight = lx + f * scale;   // F' (lado imagen)
    const fxLeft  = lx - f * scale;   // F  (lado objeto)

    const convergente = f > 0;
    const imagenReal  = si > 0;

    // ── RAYO 1: paralelo al eje óptico → refracta ─────────────────────────
    // Tramo objeto → lente: horizontal (rayo físico real)
    drawSegmento(ctx, ox, objTopY, lx, objTopY, '#ff4d6d');

    if (convergente) {
      if (imagenReal) {
        // Sólido hasta imagen, luego punteado
        drawSegmento(ctx, lx, objTopY, ix, iy, '#ff4d6d');
        const dx = ix - lx, dy = iy - objTopY;
        const t = (W - ix) / dx;
        drawSegmentoDashed(ctx, ix, iy, W, iy + dy * t, 'rgba(255,77,109,0.35)');
      } else {
        extenderHastaX(ctx, lx, objTopY, ix, iy, W, '#ff4d6d', false);
      }
    } else {
      // Divergente: el rayo sale divergiendo desde la lente hacia la derecha
      // Dirección: como si viniera del foco virtual F' (izquierda de lente, mismo lado objeto)
      // Pendiente = desde F' virtual hasta el punto de incidencia en la lente
      const slope = (objTopY - oy) / (lx - fxRight);
      extenderHastaX(ctx, lx, objTopY, W, objTopY + slope * (W - lx), W, '#ff4d6d', false);
      // Prolongación punteada hacia atrás hasta la imagen virtual
      drawSegmentoDashed(ctx, lx, objTopY, ix, iy, '#ff4d6d');
    }

    // ── RAYO 2: pasa por el centro óptico → sin desvío ────────────────────
    const slope2 = (iy - objTopY) / (ix - ox);
    extenderHastaX(ctx, ox, objTopY, convergente ? W : lx + (lx - ox) * 0.8,
      objTopY + slope2 * ((convergente ? W : lx + (lx - ox) * 0.8) - ox),
      convergente ? W : lx + (lx - ox) * 0.8, '#00e5ff', false);
    if (!convergente) {
      drawSegmentoDashed(ctx, lx, objTopY + slope2 * (lx - ox), ix, iy, '#00e5ff');
    }
    // Rayo 2 convergente: cortar en imagen si real
    if (convergente && imagenReal) {
      // extenderHastaX ya llegó hasta W, lo redibujamos solo hasta ix
      // (el extenderHastaX de arriba ya llegó a W — sobreescribimos el tramo post-imagen)
      const yAtIx = objTopY + slope2 * (ix - ox);
      // Redibujar sólido solo hasta ix para limpiar el trazo anterior
      ctx.beginPath(); ctx.moveTo(ox, objTopY); ctx.lineTo(ix, yAtIx);
      ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.2; ctx.setLineDash([]); ctx.stroke();
      // Punteado atenuado desde ix
      drawSegmentoDashed(ctx, ix, yAtIx, W, yAtIx + slope2 * (W - ix), 'rgba(0,229,255,0.35)');
    }

    // ── RAYO 3: pasa por F (lado objeto) → sale paralelo al eje ──────────
    if (convergente) {
      const slopeFoco = (oy - objTopY) / (fxLeft - ox);
      const yAtLente = objTopY + slopeFoco * (lx - ox);
      drawSegmento(ctx, ox, objTopY, lx, yAtLente, '#a8ff3e');
      if (imagenReal) {
        // Sólido hasta imagen, punteado después
        drawSegmento(ctx, lx, yAtLente, ix, yAtLente, '#a8ff3e');
        drawSegmentoDashed(ctx, ix, yAtLente, W, yAtLente, 'rgba(168,255,62,0.35)');
      } else {
        extenderHastaX(ctx, lx, yAtLente, W, yAtLente, W, '#a8ff3e', false);
      }
    } else {
      // Divergente: rayo apunta hacia F' virtual (lado imagen) → sale paralelo
      const slopeFoco = (oy - objTopY) / (fxRight - ox);
      const yAtLente  = objTopY + slopeFoco * (lx - ox);
      drawSegmento(ctx, ox, objTopY, lx, yAtLente, '#a8ff3e');
      // Sale paralelo al eje hacia la derecha (rayo real)
      extenderHastaX(ctx, lx, yAtLente, W, yAtLente, W, '#a8ff3e', false);
      // Prolongación punteada hacia atrás hasta la imagen virtual
      drawSegmentoDashed(ctx, lx, yAtLente, ix, iy, '#a8ff3e');
    }
  }

  function drawSegmento(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.stroke();
  }

  function drawSegmentoDashed(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    ctx.setLineDash([3,3]); ctx.stroke(); ctx.setLineDash([]);
  }

  // Dibuja desde (x1,y1) hasta (x2,y2) y luego extiende en la misma dirección hasta xMax
  function extenderHastaX(ctx, x1, y1, x2, y2, xMax, color, dashed) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    // Calcular el punto real en xMax si la dirección lo alcanza
    let xFin = x2, yFin = y2;
    if (Math.abs(dx) > 0.01) {
      const t = (xMax - x1) / dx;
      if (t > 1) { // solo extender si xMax está más allá de x2
        xFin = xMax;
        yFin = y1 + dy * t;
      }
    }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xFin, yFin);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2;
    if (dashed) ctx.setLineDash([3,3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── Vista B: resumen de casos ─────────────────────────────────────────────
  function drawInfo(valores, resultados) {
    const W = c2.width, H = c2.height;
    // FIX: clearRect limpio, sin ctx.save/restore que acumulara transformaciones
    ctx2.clearRect(0, 0, W, H);

    const f  = valores.f;
    const so = valores.so;
    const si = resultados.si;
    const A  = resultados.A;
    const P  = resultados.P;

    // Grid estático limpio
    ctx2.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx2.lineWidth = 0.5;
    for (let i = 0; i < W; i += 40) { ctx2.beginPath(); ctx2.moveTo(i,0); ctx2.lineTo(i,H); ctx2.stroke(); }
    for (let j = 0; j < H; j += 40) { ctx2.beginPath(); ctx2.moveTo(0,j); ctx2.lineTo(W,j); ctx2.stroke(); }

    drawZonasMini(ctx2, W, H, f, so, si);

    const desc = getCaso(f, so, si, A);
    ctx2.font = '500 10px Outfit, sans-serif';
    ctx2.fillStyle = 'rgba(220,232,255,0.9)';
    ctx2.textAlign = 'center';
    const lines = desc.split('\n');
    const cx = W / 2;
    lines.forEach((l, i) => ctx2.fillText(l, cx, H - 28 + i * 14));

    if (f > 0) {
      const leyenda = [
        { color: 'rgba(168,255,62,0.6)',  label: 'so > 2F   imagen real, reducida' },
        { color: 'rgba(0,229,255,0.6)',   label: 'F < so < 2F   imagen real, ampliada' },
        { color: 'rgba(255,107,53,0.6)',  label: 'so < F   imagen virtual (lupa)' },
      ];
      const ly = H * 0.76 + 80;
      ctx2.font = '400 11px Outfit, sans-serif';
      leyenda.forEach((item, i) => {
        const y = ly + i * 22;
        ctx2.beginPath(); ctx2.arc(12, y, 4, 0, Math.PI * 2);
        ctx2.fillStyle = item.color; ctx2.fill();
        ctx2.fillStyle = 'rgba(200,216,240,0.6)';
        ctx2.textAlign = 'left';
        ctx2.fillText(item.label, 22, y + 4);
      });
    }

    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.font = '500 12px Space Mono, monospace';
    ctx2.textAlign = 'right';
    ctx2.fillText('RESUMEN', W - 10, 18);
    ctx2.textAlign = 'left';
  }

  function drawZonasMini(ctx, W, H, f, so, si) {
    const lx = W / 2, oy = H * 0.38;
    const scale = Math.min(W * 0.35 / Math.max(Math.abs(f) * 2, 10), 3.5);
    const lh = 55;

    ctx.beginPath(); ctx.moveTo(20, oy); ctx.lineTo(W - 20, oy);
    ctx.strokeStyle = 'rgba(74,90,122,0.4)'; ctx.lineWidth = 1;
    ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

    if (f > 0) {
      const f2x = lx - 2 * f * scale;
      const fx  = lx - f * scale;

      ctx.fillStyle = 'rgba(168,255,62,0.04)';
      ctx.fillRect(20, oy - 30, f2x - 20, 60);
      ctx.fillStyle = 'rgba(0,229,255,0.04)';
      ctx.fillRect(f2x, oy - 30, fx - f2x, 60);
      ctx.fillStyle = 'rgba(255,107,53,0.04)';
      ctx.fillRect(fx, oy - 30, lx - fx, 60);
    }

    drawFoco(ctx, lx + f * scale, oy, "F'");
    drawFoco(ctx, lx - f * scale, oy, "F");
    if (f > 0) drawFoco(ctx, lx - 2 * f * scale, oy, "2F");

    drawLente(ctx, lx, oy, lh, f > 0);

    const ox = lx - so * scale;
    if (ox > 15 && ox < W - 15) {
      ctx.beginPath(); ctx.arc(ox, oy - 10, 4, 0, Math.PI*2);
      ctx.fillStyle = '#ff6b35'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox, oy - 14);
      ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }

  function getCaso(f, so, si, A) {
    if (!isFinite(si) || si === null) return 'Objeto en el foco → imagen en el infinito';
    if (f > 0) {
      if (so > 2 * f)  return 'Objeto más allá de 2F → imagen real, invertida, reducida';
      if (so === 2 * f) return 'Objeto en 2F → imagen real, invertida, mismo tamaño';
      if (so > f)      return 'Objeto entre F y 2F → imagen real, invertida, ampliada';
      return               'Objeto entre F y lente → imagen virtual, derecha, ampliada';
    } else {
      return 'Lente divergente → imagen siempre virtual, derecha, reducida';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function drawLente(ctx, x, cy, h, convergente) {
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, cy - h); ctx.lineTo(x, cy + h); ctx.stroke();
    const dir = convergente ? 1 : -1;
    drawArrowHead(ctx, x, cy - h, 0, -dir, '#00e5ff');
    drawArrowHead(ctx, x, cy + h, 0,  dir, '#00e5ff');
  }

  function drawArrowHead(ctx, x, y, dx, dy, color) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - dy * 6 - dx * 8, y + dx * 6 - dy * 8);
    ctx.lineTo(x + dy * 6 - dx * 8, y - dx * 6 - dy * 8);
    ctx.fillStyle = color; ctx.fill();
  }

  function drawFoco(ctx, x, y, label) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
    ctx.font = '500 8px Space Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 7);
    ctx.textAlign = 'left';
  }

  function drawObjeto(ctx, x, y, h) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h);
    ctx.strokeStyle = '#ff6b35'; ctx.lineWidth = 2; ctx.stroke();
    drawArrowHead(ctx, x, y - h, 0, -1, '#ff6b35');
    ctx.font = '500 8px Space Mono, monospace';
    ctx.fillStyle = '#ff6b35';
    ctx.textAlign = 'center';
    ctx.fillText('OBJ', x, y + 12);
    ctx.textAlign = 'left';
  }

  function drawImagen(ctx, x, y, h, invertida, real) {
    const color = real ? '#a8ff3e' : 'rgba(255,107,53,0.7)';
    const yTop = invertida ? y + h : y - h;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, yTop);
    ctx.strokeStyle = color; ctx.lineWidth = real ? 2 : 1.5;
    if (!real) ctx.setLineDash([4,3]);
    ctx.stroke(); ctx.setLineDash([]);
    const dirArrow = invertida ? 1 : -1;
    drawArrowHead(ctx, x, yTop, 0, dirArrow, color);
    ctx.font = '500 8px Space Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(real ? 'IMG' : 'IMG*', x, y + 12);
    ctx.textAlign = 'left';
  }

  return { init, draw };
})();
