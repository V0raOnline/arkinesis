/**
 * renderers/optica_lente.js
 * Vista 1: diagrama de rayos (eje óptico, lente, 3 rayos característicos)
 * Vista 2: casos según posición del objeto
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

  // ── Vista 1: diagrama de rayos ────────────────────────────────────────────
  function drawDiagrama(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const f  = valores.f;
    const so = valores.so;
    const ho = valores.ho;
    const si = resultados.si;
    const hi = resultados.hi;
    const A  = resultados.A;

    // Layout: lente en el centro, objeto a la izquierda
    const lx = W * 0.5;  // posicion x de la lente
    const oy = H * 0.5;  // eje optico (y)

    // Escala: pixels por cm
    // El objeto está a so cm de la lente, cabe en 40% del ancho
    const maxDist = Math.max(Math.abs(so), Math.abs(si || 1), Math.abs(f)) * 1.4;
    const scale = Math.min((W * 0.42) / maxDist, 6); // px/cm, max 6

    // Grid suave
    ctx1.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx1.lineWidth = 0.5;
    for (let i = -10; i <= 10; i++) {
      ctx1.beginPath(); ctx1.moveTo(lx + i * scale * 10, 0); ctx1.lineTo(lx + i * scale * 10, H); ctx1.stroke();
    }

    // Eje óptico
    ctx1.beginPath(); ctx1.moveTo(0, oy); ctx1.lineTo(W, oy);
    ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([6,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // Focos F y F'
    const fxRight = lx + f * scale;
    const fxLeft  = lx - f * scale;

    drawFoco(ctx1, fxRight, oy, f > 0 ? "F'" : "F'");
    drawFoco(ctx1, fxLeft,  oy, f > 0 ? "F"  : "F");

    // Lente (flecha doble)
    const lh = Math.min(H * 0.38, 120);
    drawLente(ctx1, lx, oy, lh, f > 0);

    // Objeto
    const ox = lx - so * scale;
    const oh = ho * scale * 0.8; // altura visual del objeto
    drawObjeto(ctx1, ox, oy, oh);

    // Imagen (si existe y es finita)
    if (si !== null && isFinite(si) && Math.abs(si) < 1e6) {
      const ix = lx + si * scale;
      const ih = Math.abs(hi) * scale * 0.8;
      const invertida = hi < 0;
      drawImagen(ctx1, ix, oy, ih, invertida, si > 0);
    }

    // 3 rayos característicos
    if (si !== null && isFinite(si)) {
      drawRayos(ctx1, lx, oy, ox, oy - oh, f, so, si, hi, scale);
    }

    // Labels
    ctx1.font = '500 9px Space Mono, monospace';

    // Label so
    ctx1.fillStyle = 'rgba(200,216,240,0.4)';
    ctx1.textAlign = 'center';
    ctx1.fillText('s_o = ' + so.toFixed(0) + ' cm', (ox + lx) / 2, oy + 18);

    // Label si
    if (si !== null && isFinite(si) && Math.abs(si) < 1e6) {
      const ix = lx + si * scale;
      const color = si > 0 ? 'rgba(168,255,62,0.6)' : 'rgba(255,107,53,0.6)';
      ctx1.fillStyle = color;
      ctx1.fillText('s_i = ' + si.toFixed(1) + ' cm', (lx + ix) / 2, oy + 30);
    }

    // Tipo lente + imagen
    const tipoLente = f > 0 ? 'CONVERGENTE' : 'DIVERGENTE';
    const tipoImg   = si === null || !isFinite(si) ? 'SIN IMAGEN' :
                      si > 0 ? 'IMAGEN REAL' : 'IMAGEN VIRTUAL';

    ctx1.textAlign = 'right';
    ctx1.fillStyle = f > 0 ? 'rgba(0,229,255,0.6)' : 'rgba(255,107,53,0.5)';
    ctx1.fillText(tipoLente, W - 10, 18);
    ctx1.fillStyle = si > 0 ? 'rgba(168,255,62,0.6)' : 'rgba(255,107,53,0.5)';
    ctx1.fillText(tipoImg, W - 10, 32);
    ctx1.textAlign = 'left';

    // Ampliacion
    if (A !== null && isFinite(A)) {
      const Astr = A >= 0 ? '+' + A.toFixed(2) : A.toFixed(2);
      ctx1.fillStyle = 'rgba(200,216,240,0.35)';
      ctx1.fillText('A = ' + Astr + (Math.abs(A) > 1 ? '  (amplía)' : '  (reduce)'), 10, H - 10);
    }
  }

  // ── 3 rayos característicos ───────────────────────────────────────────────
  function drawRayos(ctx, lx, oy, ox, topObj, f, so, si, hi, scale) {
    // Punta del objeto
    const py = topObj;

    // Imagen
    const ix = lx + si * scale;
    const iy = oy - hi * scale * 0.8;

    const fxRight = lx + f * scale;
    const fxLeft  = lx - f * scale;

    // Rayo 1: paralelo al eje → pasa por F' después de la lente
    drawRayo(ctx, ox, py, lx, py, ix, iy, '#ff4d6d', f, lx, oy, scale, 1);

    // Rayo 2: pasa por el centro de la lente → no se desvía
    drawRayo(ctx, ox, py, lx, oy + (py - oy) * (lx - ox) / (lx - ox), ix, iy, '#00e5ff', f, lx, oy, scale, 2);

    // Rayo 3: pasa por F antes de la lente → sale paralelo al eje
    drawRayo(ctx, ox, py, lx, py, ix, iy, '#a8ff3e', f, lx, oy, scale, 3);
  }

  function drawRayo(ctx, ox, oy_obj, lx, ly, ix, iy, color, f, axisY, scale, tipo) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;

    const fxRight = lx + f * scale;
    const fxLeft  = lx - f * scale;

    if (tipo === 1) {
      // Paralelo al eje → refracta por F'
      ctx.beginPath(); ctx.moveTo(ox, oy_obj); ctx.lineTo(lx, oy_obj);
      ctx.stroke();
      // Después de la lente: hacia imagen (o diverge si virtual)
      if (f > 0) {
        extenderRayo(ctx, lx, oy_obj, ix, iy, color);
      } else {
        // divergente: sale como si viniera de F' virtual
        const slope = (oy_obj - axisY) / (lx - fxRight);
        extenderRayo(ctx, lx, oy_obj, lx + 300, oy_obj + slope * 300, color);
        // línea virtual punteada
        ctx.setLineDash([3,3]);
        ctx.strokeStyle = color + '55';
        ctx.beginPath(); ctx.moveTo(lx, oy_obj); ctx.lineTo(fxRight, axisY); ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (tipo === 2) {
      // Por el centro → recto
      ctx.beginPath(); ctx.moveTo(ox, oy_obj); ctx.lineTo(lx, axisY + (oy_obj - axisY) * (lx - ox) / (lx - ox));
      // Punto en la lente (proporcional)
      const yLente = axisY + (oy_obj - axisY) * 0; // en lx, pasa por centro
      ctx.beginPath(); ctx.moveTo(ox, oy_obj); ctx.lineTo(ix + (ix > lx ? 60 : -60), iy + (iy - oy_obj) / (ix - ox) * (ix - ox + (ix > lx ? 60 : -60)));
      ctx.strokeStyle = color; ctx.stroke();
    } else if (tipo === 3) {
      // Hacia F antes de la lente → sale paralelo
      if (f > 0) {
        ctx.beginPath(); ctx.moveTo(ox, oy_obj); ctx.lineTo(lx, axisY + (oy_obj - axisY) * 0.15);
        ctx.stroke();
        // Sale paralelo al eje
        extenderRayo(ctx, lx, axisY + (oy_obj - axisY) * 0.15, lx + 300, axisY + (oy_obj - axisY) * 0.15, color);
      } else {
        ctx.beginPath(); ctx.moveTo(ox, oy_obj); ctx.lineTo(lx, oy_obj * 0.6 + axisY * 0.4);
        ctx.stroke();
        extenderRayo(ctx, lx, oy_obj * 0.6 + axisY * 0.4, lx + 300, oy_obj * 0.6 + axisY * 0.4, color);
      }
    }
  }

  function extenderRayo(ctx, x1, y1, x2, y2, color) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = color; ctx.stroke();
  }

  // ── Vista 2: resumen de casos ─────────────────────────────────────────────
  function drawInfo(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);

    const f  = valores.f;
    const so = valores.so;
    const si = resultados.si;
    const A  = resultados.A;
    const hi = resultados.hi;
    const P  = resultados.P;

    // Fondo grid
    ctx2.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx2.lineWidth = 0.5;
    for (let i = 0; i < W; i += 40) { ctx2.beginPath(); ctx2.moveTo(i,0); ctx2.lineTo(i,H); ctx2.stroke(); }
    for (let i = 0; i < H; i += 40) { ctx2.beginPath(); ctx2.moveTo(0,i); ctx2.lineTo(W,i); ctx2.stroke(); }

    // Tabla de resultados visual
    const cx = W / 2, cy = H / 2;
    const items = [
      { label: 'Distancia imagen s_i', val: si, unit: 'cm', color: si > 0 ? '#a8ff3e' : '#ff6b35' },
      { label: 'Altura imagen h_i',    val: resultados.hi, unit: 'cm', color: '#00e5ff' },
      { label: 'Ampliación A',         val: A,  unit: '',   color: '#00e5ff' },
      { label: 'Potencia P',           val: P,  unit: 'D',  color: '#a8ff3e' },
    ];

    // Diagrama de zona del objeto mini
    drawZonasMini(ctx2, W, H, f, so, si);

    // Descripción del caso
    const desc = getCaso(f, so, si, A);
    ctx2.font = '500 10px Outfit, sans-serif';
    ctx2.fillStyle = 'rgba(200,216,240,0.7)';
    ctx2.textAlign = 'center';
    const lines = desc.split('\n');
    lines.forEach((l, i) => ctx2.fillText(l, cx, H - 28 + i * 14));

    // Leyenda de zonas (solo convergente)
    if (f > 0) {
      const leyenda = [
        { color: 'rgba(168,255,62,0.6)',  label: 'so > 2F   imagen real, reducida' },
        { color: 'rgba(0,229,255,0.6)',   label: 'F < so < 2F   imagen real, ampliada' },
        { color: 'rgba(255,107,53,0.6)',  label: 'so < F   imagen virtual (lupa)' },
      ];
      const ly = H * 0.62;
      ctx2.font = '400 11px Outfit, sans-serif';
      leyenda.forEach((item, i) => {
        const y = ly + i * 22;
        ctx2.beginPath();
        ctx2.arc(12, y, 4, 0, Math.PI * 2);
        ctx2.fillStyle = item.color;
        ctx2.fill();
        ctx2.fillStyle = 'rgba(200,216,240,0.6)';
        ctx2.textAlign = 'left';
        ctx2.fillText(item.label, 22, y + 4);
      });
    }

    ctx2.fillStyle = 'rgba(74,90,122,0.7)';
    ctx2.font = '500 12px Space Mono, monospace';
    ctx2.textAlign = 'right';
    ctx2.fillText('RESUMEN', W - 10, 18);
    ctx2.textAlign = 'left';
  }

  function drawZonasMini(ctx, W, H, f, so, si) {
    // Mini diagrama de zonas en la parte superior
    const lx = W / 2, oy = H * 0.38;
    const scale = Math.min(W * 0.35 / Math.max(Math.abs(f) * 2, 10), 3.5);
    const lh = 55;

    // Eje
    ctx.beginPath(); ctx.moveTo(20, oy); ctx.lineTo(W - 20, oy);
    ctx.strokeStyle = 'rgba(74,90,122,0.4)'; ctx.lineWidth = 1;
    ctx.setLineDash([4,3]); ctx.stroke(); ctx.setLineDash([]);

    // Zonas coloreadas (solo convergente)
    if (f > 0) {
      const f2x = lx - 2 * f * scale;
      const fx  = lx - f * scale;
      const fRx = lx + f * scale;

      // Zona s_o > 2f → imagen invertida real reducida
      ctx.fillStyle = 'rgba(168,255,62,0.04)';
      ctx.fillRect(20, oy - 30, f2x - 20, 60);
      // Zona f < s_o < 2f → imagen invertida real ampliada
      ctx.fillStyle = 'rgba(0,229,255,0.04)';
      ctx.fillRect(f2x, oy - 30, fx - f2x, 60);
      // Zona s_o < f → imagen virtual derecha ampliada
      ctx.fillStyle = 'rgba(255,107,53,0.04)';
      ctx.fillRect(fx, oy - 30, lx - fx, 60);
    }

    // Focos
    drawFoco(ctx, lx + f * scale, oy, "F'");
    drawFoco(ctx, lx - f * scale, oy, "F");
    if (f > 0) drawFoco(ctx, lx - 2 * f * scale, oy, "2F");

    // Lente mini
    drawLente(ctx, lx, oy, lh, f > 0);

    // Objeto (marca)
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

  // ── Helpers de dibujo ─────────────────────────────────────────────────────
  function drawLente(ctx, x, cy, h, convergente) {
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, cy - h); ctx.lineTo(x, cy + h); ctx.stroke();

    // Flechas
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
    ctx.strokeStyle = color;
    ctx.lineWidth = real ? 2 : 1.5;
    if (!real) ctx.setLineDash([4,3]);
    ctx.stroke();
    ctx.setLineDash([]);

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
