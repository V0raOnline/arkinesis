/**
 * renderers/efecto_doppler.js
 * Vista A: fuente en movimiento real, frentes de onda acumulados
 * Vista B: comparativa f₀ vs f', longitudes de onda, caso
 *
 * Misma lógica que el preview del index — fuente se mueve, emite
 * frentes desde su posición real, observador fijo. Reset al llegar al borde.
 */

window.Renderers = window.Renderers || {};

window.Renderers.efecto_doppler = (() => {
  let c1, c2, ctx1, ctx2;
  let frame = 0;
  let modo = 'acerca'; // 'acerca' | 'aleja'

  // Estado de animación
  const frentes = [];
  let fuenteX = 0;
  let emitCount = 0;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d');
    ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', () => { resizeAll(); resetAnim(); });
    insertarToggle();
    resetAnim();
  }

  function resizeAll() {
    [c1, c2].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  function resetAnim() {
    frentes.length = 0;
    emitCount = 0;
    // acerca: arranca izquierda → va derecha
    // aleja:  arranca derecha  → va izquierda
    fuenteX = c1 ? (modo === 'acerca' ? c1.width * 0.08 : c1.width * 0.92) : 0;
  }

  // ── Toggle UI ─────────────────────────────────────────────────────────────
  function insertarToggle() {
    if (document.getElementById('doppler-toggle-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'doppler-toggle-wrap';
    wrap.style.cssText = `
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 1rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem;
    `;

    const btnA = document.createElement('button');
    btnA.id = 'btn-acerca';
    btnA.textContent = 'se acerca';
    btnA.style.cssText = estiloToggle(true);

    const btnL = document.createElement('button');
    btnL.id = 'btn-aleja';
    btnL.textContent = 'se aleja';
    btnL.style.cssText = estiloToggle(false);

    btnA.addEventListener('click', () => {
      modo = 'acerca';
      btnA.style.cssText = estiloToggle(true);
      btnL.style.cssText = estiloToggle(false);
      resetAnim();
    });

    btnL.addEventListener('click', () => {
      modo = 'aleja';
      btnA.style.cssText = estiloToggle(false);
      btnL.style.cssText = estiloToggle(true);
      resetAnim();
    });

    wrap.appendChild(btnA);
    wrap.appendChild(btnL);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);

    setTimeout(() => {
      const sl = document.getElementById('sl-modo');
      if (sl) {
        const row = sl.closest('.slider-row');
        if (row) row.style.display = 'none';
      }
    }, 100);
  }

  function estiloToggle(activo) {
    const base = `
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem;
      padding: 0.3rem 0.8rem;
      cursor: pointer;
      letter-spacing: 0.08em;
      border: 1px solid;
      background: transparent;
      transition: all 0.2s;
    `;
    return base + (activo
      ? 'border-color: #00e5ff; color: #00e5ff;'
      : 'border-color: #1a2540; color: #4a5a7a;');
  }

  // ── Draw principal ────────────────────────────────────────────────────────
  function draw(valores, resultados) {
    frame++;
    valores.modo = modo === 'acerca' ? 1 : -1;
    drawVista(valores, resultados);
    drawInfo(valores, resultados);
  }

  // ── Vista A ───────────────────────────────────────────────────────────────
  function drawVista(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const f0     = valores.f0;
    const vf     = valores.vf;
    const v      = 343;
    const fp     = resultados.fp;
    const acerca = modo === 'acerca';
    const oy     = H * 0.5;

    // Grid
    ctx1.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx1.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx1.beginPath(); ctx1.moveTo(x,0); ctx1.lineTo(x,H); ctx1.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx1.beginPath(); ctx1.moveTo(0,y); ctx1.lineTo(W,y); ctx1.stroke(); }

    // Observador siempre a la derecha
    const obsX = W * 0.88;

    // Velocidad fuente en px/frame — escalada para que sea visible
    // vf=0 → 0px/frame, vf=120 → ~2.5px/frame
    const vfPx = (vf / 120) * 2.5;

    // Velocidad frente de onda en px/frame — siempre mayor que fuente
    // Proporcional: v=343 m/s → ~4px/frame (fijo, independiente de vf)
    const vwavePx = 3.5;

    // Mover fuente: acerca → derecha, aleja → izquierda (ambas desde la izquierda)
    if (acerca) {
      fuenteX += vfPx;
      if (fuenteX > obsX - 20) resetAnim();
    } else {
      fuenteX -= vfPx;
      if (fuenteX < -W * 0.1) resetAnim();
    }

    // Si vf=0, fuente fija en el centro
    if (vf === 0) fuenteX = W * 0.5;

    // Período de emisión: cuantos frames entre frentes
    // A f0 alta → más frentes por segundo → período corto
    // Mapeamos f0 (100-2000 Hz) a PERIOD (30-5 frames)
    const PERIOD = Math.max(5, Math.round(30 - (f0 - 100) / 2000 * 25));

    emitCount++;
    if (emitCount >= PERIOD) {
      frentes.push({ x: fuenteX, y: oy, r: 0 });
      emitCount = 0;
    }

    // Expandir y limpiar
    for (let i = frentes.length - 1; i >= 0; i--) {
      frentes[i].r += vwavePx;
      if (frentes[i].r > W * 1.2) frentes.splice(i, 1);
    }

    // Dibujar frentes
    frentes.forEach(f => {
      const alpha = Math.max(0, 0.55 - f.r / (W * 0.95));
      ctx1.beginPath();
      ctx1.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx1.strokeStyle = `rgba(0,229,255,${alpha})`;
      ctx1.lineWidth = 1.2;
      ctx1.stroke();
    });

    // ── Observador ──
    ctx1.beginPath(); ctx1.arc(obsX, oy, 11, 0, Math.PI * 2);
    ctx1.fillStyle = 'rgba(168,255,62,0.1)'; ctx1.fill();
    ctx1.beginPath(); ctx1.arc(obsX, oy, 5, 0, Math.PI * 2);
    ctx1.fillStyle = '#a8ff3e';
    ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 8; ctx1.fill(); ctx1.shadowBlur = 0;
    ctx1.font = '500 8px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(168,255,62,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText('OBS', obsX, oy + 22);

    // ── Fuente ──
    ctx1.beginPath(); ctx1.arc(fuenteX, oy, 9, 0, Math.PI * 2);
    ctx1.fillStyle = 'rgba(0,229,255,0.1)'; ctx1.fill();
    ctx1.beginPath(); ctx1.arc(fuenteX, oy, 4.5, 0, Math.PI * 2);
    ctx1.fillStyle = '#00e5ff';
    ctx1.shadowColor = '#00e5ff'; ctx1.shadowBlur = 8; ctx1.fill(); ctx1.shadowBlur = 0;
    ctx1.fillStyle = 'rgba(0,229,255,0.7)';
    ctx1.fillText('FUENTE', fuenteX, oy + 22);

    // ── Flecha animada (solo si vf > 0) ──
    if (vf > 0) {
      const ARROW_CYCLE = 90;
      const af = frame % ARROW_CYCLE;
      // Flecha siempre apunta en la dirección de movimiento real
      const dir = acerca ? 1 : -1;
      const ARROW_LEN = 55;
      const arrowY = oy - 28;
      const arrowX0 = fuenteX + dir * 14;
      const arrowX1 = fuenteX + dir * (14 + ARROW_LEN);

      let progress, alpha;
      if (af < 60) {
        progress = af / 60;
        alpha = 0.7;
      } else {
        progress = 1;
        alpha = 0.7 * (1 - (af - 60) / 30);
      }

      const arrowXEnd = arrowX0 + (arrowX1 - arrowX0) * progress;

      if (alpha > 0.02) {
        ctx1.beginPath();
        ctx1.moveTo(arrowX0, arrowY);
        ctx1.lineTo(arrowXEnd, arrowY);
        ctx1.strokeStyle = `rgba(0,229,255,${alpha})`;
        ctx1.lineWidth = 1.5;
        ctx1.stroke();

        if (progress > 0.85) {
          const pAlpha = alpha * ((progress - 0.85) / 0.15);
          ctx1.beginPath();
          ctx1.moveTo(arrowXEnd, arrowY);
          ctx1.lineTo(arrowXEnd - dir * 7, arrowY - 4);
          ctx1.lineTo(arrowXEnd - dir * 7, arrowY + 4);
          ctx1.fillStyle = `rgba(0,229,255,${pAlpha})`;
          ctx1.fill();
        }
      }
    }

    ctx1.textAlign = 'left';

    // ── Labels esquina ──
    ctx1.textAlign = 'right';
    ctx1.font = '500 11px Space Mono, monospace';
    ctx1.fillStyle = acerca ? 'rgba(0,229,255,0.75)' : 'rgba(255,77,109,0.75)';
    ctx1.fillText(acerca ? 'FUENTE SE ACERCA' : 'FUENTE SE ALEJA', W - 10, 18);
    ctx1.font = '400 10px Outfit, sans-serif';
    ctx1.fillStyle = 'rgba(200,216,240,0.65)';
    ctx1.fillText(
      `f₀ = ${f0} Hz  →  f' = ${fp && isFinite(fp) ? fp.toFixed(1) : '—'} Hz`,
      W - 10, 34
    );
    ctx1.textAlign = 'left';
  }

  // ── Vista B ───────────────────────────────────────────────────────────────
  function drawInfo(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);

    const f0     = valores.f0;
    const vf     = valores.vf;
    const vo     = valores.vo;
    const v      = 343;
    const fp     = resultados.fp;
    const df     = resultados.df;
    const l0     = resultados.lambda_emit;
    const lp     = resultados.lambda_perc;
    const acerca = modo === 'acerca';

    // Grid
    ctx2.strokeStyle = 'rgba(26,37,64,0.4)';
    ctx2.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx2.beginPath(); ctx2.moveTo(x,0); ctx2.lineTo(x,H); ctx2.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx2.beginPath(); ctx2.moveTo(0,y); ctx2.lineTo(W,y); ctx2.stroke(); }

    ctx2.font = '500 12px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right';
    ctx2.fillText('COMPARATIVA', W - 10, 18);
    ctx2.textAlign = 'left';

    if (!fp || !isFinite(fp)) {
      ctx2.font = '400 10px Outfit, sans-serif';
      ctx2.fillStyle = 'rgba(255,77,109,0.8)';
      ctx2.textAlign = 'center';
      ctx2.fillText('vf ≥ v — velocidad supersónica', W/2, H/2);
      ctx2.textAlign = 'left';
      return;
    }

    const barY   = H * 0.22;
    const barH   = 16;
    const maxF   = Math.max(f0, fp) * 1.15;
    const barMax = W - 60;

    // Barra f0
    const bw0 = (f0 / maxF) * barMax;
    ctx2.fillStyle = 'rgba(0,229,255,0.12)';
    ctx2.fillRect(30, barY, bw0, barH);
    ctx2.fillStyle = 'rgba(0,229,255,0.7)';
    ctx2.fillRect(30, barY, bw0, 2);
    ctx2.font = '500 10px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(0,229,255,0.85)';
    ctx2.fillText(`f₀ = ${f0} Hz`, 30, barY - 5);

    // Barra f'
    const bwp  = (fp / maxF) * barMax;
    const barY2 = barY + barH + 20;
    const cp   = acerca ? 'rgba(168,255,62,' : 'rgba(255,77,109,';
    ctx2.fillStyle = cp + '0.12)';
    ctx2.fillRect(30, barY2, bwp, barH);
    ctx2.fillStyle = cp + '0.7)';
    ctx2.fillRect(30, barY2, bwp, 2);
    ctx2.fillStyle = cp + '0.85)';
    ctx2.fillText(`f' = ${fp.toFixed(1)} Hz`, 30, barY2 - 5);

    // Δf
    const dfStr = df !== null && isFinite(df)
      ? (df >= 0 ? `+${df.toFixed(1)}` : df.toFixed(1))
      : '—';
    const dfColor = (df !== null && df >= 0)
      ? 'rgba(168,255,62,0.9)'
      : 'rgba(255,77,109,0.9)';
    ctx2.font = '600 13px Space Mono, monospace';
    ctx2.fillStyle = dfColor;
    ctx2.fillText(`Δf = ${dfStr} Hz`, 30, barY2 + barH + 20);

    // Longitudes de onda
    const lyL = barY2 + barH + 46;
    ctx2.font = '400 10px Outfit, sans-serif';
    ctx2.fillStyle = 'rgba(200,216,240,0.7)';
    ctx2.fillText(`λ₀ = ${l0 ? l0.toFixed(3) : '—'} m  (emitida)`, 30, lyL);
    ctx2.fillText(`λ' = ${lp ? lp.toFixed(3) : '—'} m  (percibida)`, 30, lyL + 18);

    // Caso
    const caso = getCaso(vf, vo, modo, v);
    const lines = caso.split('\n');
    ctx2.font = '400 10px Outfit, sans-serif';
    ctx2.fillStyle = 'rgba(220,232,255,0.85)';
    lines.forEach((l, i) => ctx2.fillText(l, 30, H - 30 + i * 14));
  }

  function getCaso(vf, vo, modo, v) {
    const acerca = modo === 'acerca';
    if (vf >= v) return 'vf ≥ v → onda de choque (fórmula no válida)';
    if (vf === 0 && vo === 0) return 'Sin movimiento relativo — f\' = f₀';
    if (vf === 0) return acerca
      ? 'Solo observador se acerca → f\' > f₀'
      : 'Solo observador se aleja → f\' < f₀';
    if (vo === 0) return acerca
      ? 'Fuente se acerca → f\' > f₀\nsonido más agudo'
      : 'Fuente se aleja → f\' < f₀\nsonido más grave';
    return acerca
      ? 'Fuente y observador se aproximan\nf\' > f₀ — efecto máximo'
      : 'Fuente y observador se alejan\nf\' < f₀ — efecto máximo';
  }

  return { init, draw };
})();
