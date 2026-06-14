/**
 * renderers/optica_espejo.js
 * Vista A: espejo esferico con rayos canonicos y pantalla
 * Vista B: diagrama posicion objeto vs imagen (zonas caracteristicas)
 *
 * Toggle concavo / convexo se gestiona internamente.
 * El renderer expone window._espejo_tipo para que el toggle del HTML lo cambie.
 */

window.Renderers = window.Renderers || {};

window.Renderers.optica_espejo = (() => {
  let _F = 0;
  let c1, c2, ctx1, ctx2;
  let frame = 0;
  let tipo = 'concavo'; // 'concavo' | 'convexo'

  window._espejo_tipo = () => tipo;
  window._espejo_setTipo = (t) => { tipo = t; };

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d');
    ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    insertarToggle();
  }

  function resizeAll() {
    [c1, c2].forEach(c => {
      if (!c) return;
      c.width  = c.parentElement.clientWidth;
      c.height = c.parentElement.clientHeight;
    });
  }

  // ── Toggle UI ────────────────────────────────────────────────────────────
  function insertarToggle() {
    if (document.getElementById('espejo-toggle-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'espejo-toggle-wrap';
    wrap.style.cssText = `
      display: flex; align-items: center; gap: 0.5rem;
      margin-bottom: 1rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem;
    `;

    const btnC = document.createElement('button');
    btnC.id = 'btn-concavo';
    btnC.textContent = 'c\u00f3ncavo';
    btnC.style.cssText = estiloToggle(true);

    const btnX = document.createElement('button');
    btnX.id = 'btn-convexo';
    btnX.textContent = 'convexo';
    btnX.style.cssText = estiloToggle(false);

    btnC.addEventListener('click', () => {
      tipo = 'concavo';
      btnC.style.cssText = estiloToggle(true);
      btnX.style.cssText = estiloToggle(false);
    });

    btnX.addEventListener('click', () => {
      tipo = 'convexo';
      btnC.style.cssText = estiloToggle(false);
      btnX.style.cssText = estiloToggle(true);
    });

    wrap.appendChild(btnC);
    wrap.appendChild(btnX);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);
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

  // ── Draw principal ───────────────────────────────────────────────────────
  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;

    const so  = valores.so;
    const fAbs = valores.f;
    const ho  = valores.ho;
    const f   = tipo === 'concavo' ? fAbs : -fAbs;

    const si  = 1 / (1/f - 1/so);
    const A   = -si / so;
    const hi  = ho * A;

    drawEspejo(so, f, fAbs, si, ho, hi, A);
    drawDiagrama(so, f, fAbs, si, A);
  }

  // ── Vista A: espejo + rayos ──────────────────────────────────────────────
  function drawEspejo(so, f, fAbs, si, ho, hi, A) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const esConcavo = tipo === 'concavo';

    const ex = W * 0.72;
    const ey = H / 2;

    const maxDist = Math.max(so, Math.abs(si), fAbs * 2, 20);
    const scale   = Math.min((W * 0.62) / maxDist, 5);

    const R_px  = fAbs * 2 * scale;
    const espH = Math.min(H * 0.38, 80, R_px * 0.85);

    // Grid
    ctx1.strokeStyle = 'rgba(26,37,64,0.5)';
    ctx1.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx1.beginPath(); ctx1.moveTo(x,0); ctx1.lineTo(x,H); ctx1.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx1.beginPath(); ctx1.moveTo(0,y); ctx1.lineTo(W,y); ctx1.stroke(); }

    // Eje optico
    ctx1.beginPath(); ctx1.moveTo(0, ey); ctx1.lineTo(W, ey);
    ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([6,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // ── Dibujar espejo curvo ──────────────────────────────────────────────
    const R = fAbs * 2 * scale;
    drawEspejoShape(ex, ey, espH, R, esConcavo);

    // Focos y centro de curvatura
    const fPx  = fAbs * scale;

    // Foco
    ctx1.beginPath(); ctx1.arc(esConcavo ? ex - fPx : ex + fPx, ey, 4, 0, Math.PI*2);
    ctx1.fillStyle = 'rgba(0,229,255,0.3)'; ctx1.fill();
    ctx1.beginPath(); ctx1.arc(esConcavo ? ex - fPx : ex + fPx, ey, 2, 0, Math.PI*2);
    ctx1.fillStyle = '#00e5ff'; ctx1.fill();
    ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(0,229,255,0.6)';
    ctx1.textAlign = 'center';
    ctx1.fillText(esConcavo ? 'F' : 'F (v)', esConcavo ? ex - fPx : ex + fPx, ey + 14);

    // Centro de curvatura (concavo: real delante; convexo: virtual detras)
    {
      const cPos = esConcavo ? ex - fPx * 2 : ex + fPx * 2;
      ctx1.beginPath(); ctx1.arc(cPos, ey, 3, 0, Math.PI*2);
      ctx1.fillStyle = esConcavo ? 'rgba(168,255,62,0.3)' : 'rgba(168,255,62,0.15)'; ctx1.fill();
      ctx1.beginPath(); ctx1.arc(cPos, ey, 1.5, 0, Math.PI*2);
      ctx1.fillStyle = '#a8ff3e'; ctx1.fill();
      ctx1.fillStyle = esConcavo ? 'rgba(168,255,62,0.6)' : 'rgba(168,255,62,0.4)';
      ctx1.fillText(esConcavo ? 'C' : 'C (v)', cPos, ey + 14);
    }

    // ── Objeto ────────────────────────────────────────────────────────────
    const ox = ex - so * scale;
    const hoP = Math.min(ho * scale * 0.8, espH * 0.9);

    ctx1.strokeStyle = '#ff6b35'; ctx1.lineWidth = 2;
    ctx1.beginPath(); ctx1.moveTo(ox, ey); ctx1.lineTo(ox, ey - hoP); ctx1.stroke();
    ctx1.beginPath();
    ctx1.moveTo(ox, ey - hoP);
    ctx1.lineTo(ox - 4, ey - hoP + 8);
    ctx1.lineTo(ox + 4, ey - hoP + 8);
    ctx1.fillStyle = '#ff6b35'; ctx1.fill();

    ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(255,107,53,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText('O', ox, ey + 12);

    // ── Imagen ────────────────────────────────────────────────────────────
    let ix, hiP;
    if (esConcavo) {
      ix  = ex - si * scale;
    } else {
      ix  = ex + Math.abs(si) * scale;
    }
    hiP = Math.min(Math.abs(hi) * scale * 0.8, espH * 0.9);
    const imagenArriba = hi > 0;

    const imagenReal = esConcavo && si > 0;

    if (imagenReal && ix > 0 && ix < W) {
      ctx1.strokeStyle = 'rgba(168,255,62,0.15)';
      ctx1.lineWidth = 6;
      ctx1.beginPath(); ctx1.moveTo(ix, ey - espH - 10); ctx1.lineTo(ix, ey + espH + 10); ctx1.stroke();
      ctx1.strokeStyle = 'rgba(168,255,62,0.5)';
      ctx1.lineWidth = 2;
      ctx1.beginPath(); ctx1.moveTo(ix, ey - espH - 10); ctx1.lineTo(ix, ey + espH + 10); ctx1.stroke();
    }

    const imgColor = imagenReal ? '#a8ff3e' : 'rgba(168,255,62,0.45)';
    ctx1.strokeStyle = imgColor; ctx1.lineWidth = imagenReal ? 2 : 1.5;
    if (!imagenReal) { ctx1.setLineDash([4,3]); }
    ctx1.beginPath();
    ctx1.moveTo(ix, ey);
    ctx1.lineTo(ix, imagenArriba ? ey - hiP : ey + hiP);
    ctx1.stroke();
    ctx1.setLineDash([]);

    if (hiP > 3) {
      const tipY = imagenArriba ? ey - hiP : ey + hiP;
      const dir  = imagenArriba ? 1 : -1;
      ctx1.beginPath();
      ctx1.moveTo(ix, tipY);
      ctx1.lineTo(ix - 4, tipY + dir * 8);
      ctx1.lineTo(ix + 4, tipY + dir * 8);
      ctx1.fillStyle = imgColor; ctx1.fill();
    }

    ctx1.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = imgColor;
    ctx1.textAlign = 'center';
    ctx1.fillText(imagenReal ? "I'" : "I' (virtual)", ix, ey + 12);

    // ── Rayos canonicos ───────────────────────────────────────────────────
    const tipObjX = ox;
    const tipObjY = ey - hoP;
    const tipImgY = imagenArriba ? ey - hiP : ey + hiP;

    if (esConcavo) {
      drawRayosConcavo(tipObjX, tipObjY, tipImgY, ex, ey, fPx, ix, scale, imagenReal, espH, W);
    } else {
      drawRayosConvexo(tipObjX, tipObjY, tipImgY, ex, ey, fPx, ix, scale, espH);
    }

    // Label tipo
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#a8ff3e';
    ctx1.textAlign = 'right';
    ctx1.fillText(esConcavo ? 'C\u00d3NCAVO' : 'CONVEXO', W - 10, H - 12);
    ctx1.textAlign = 'left';
  }

  // ── Forma del espejo ─────────────────────────────────────────────────────
  function drawEspejoShape(ex, ey, espH, R, esConcavo) {
    const grosor = 6;

    if (esConcavo) {
      const angle = Math.asin(espH / Math.max(R, espH + 1));
      ctx1.beginPath();
      ctx1.arc(ex + Math.sqrt(R*R - espH*espH), ey, R, Math.PI - angle, Math.PI + angle);
      ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 2.5; ctx1.stroke();

      ctx1.beginPath();
      ctx1.arc(ex + Math.sqrt(R*R - espH*espH) + grosor, ey, R, Math.PI - angle, Math.PI + angle);
      ctx1.strokeStyle = 'rgba(0,229,255,0.15)'; ctx1.lineWidth = grosor; ctx1.stroke();
    } else {
      const angle = Math.asin(espH / Math.max(R, espH + 1));
      ctx1.beginPath();
      ctx1.arc(ex - Math.sqrt(R*R - espH*espH), ey, R, -angle, angle);
      ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 2.5; ctx1.stroke();

      ctx1.beginPath();
      ctx1.arc(ex - Math.sqrt(R*R - espH*espH) - grosor, ey, R, -angle, angle);
      ctx1.strokeStyle = 'rgba(0,229,255,0.15)'; ctx1.lineWidth = grosor; ctx1.stroke();
    }
  }

  // ── Rayos concavo ────────────────────────────────────────────────────────
  function drawRayosConcavo(ox, oy, iy, ex, ey, fPx, ix, scale, imagenReal, espH, W) {
    const fX = ex - fPx;
    const cX = ex - fPx * 2;

    // Rayo 1: paralelo al eje, refleja por el foco
    segmento(ox, oy, ex, oy, '#ff4d6d', 1.5);
    if (imagenReal) {
      segmento(ex, oy, ix, iy, '#ff4d6d', 1.5);
      extenderPunteado(ex, oy, ix, iy, W, '#ff4d6d');
    } else {
      segmento(ex, oy, 0, oy + (oy - iy) * (ex / (ex - ix)), '#ff4d6d', 1.5);
      punteadoHacia(ex, oy, fX, ey, '#ff4d6d');
    }

    // Rayo 2: viaja desde el objeto en direccion al foco F, refleja paralelo al eje
    segmento(ox, oy, fX, ey, '#00e5ff', 1, true);
    const r2eyEsp = ey + (oy - ey) / (ox - fX) * (ex - fX);
    segmento(ox, oy, ex, r2eyEsp, '#00e5ff', 1.5);
    if (imagenReal) {
      segmento(ex, r2eyEsp, ix, iy, '#00e5ff', 1.5);
      extenderPunteado(ex, r2eyEsp, ix, iy, W, '#00e5ff');
    } else {
      segmento(ex, r2eyEsp, 0, r2eyEsp, '#00e5ff', 1.5);
      punteadoHacia(ex, r2eyEsp, fX, ey, '#00e5ff');
    }

    // Rayo 3: pasa por el centro de curvatura, refleja sobre si mismo
    const r3eyEsp = ey + (oy - ey) / (ox - cX) * (ex - cX);
    segmento(ox, oy, ex, r3eyEsp, '#a8ff3e', 1.5);
    if (imagenReal) {
      segmento(ex, r3eyEsp, ix, iy, '#a8ff3e', 1.5);
      extenderPunteado(ex, r3eyEsp, ix, iy, W, '#a8ff3e');
    } else {
      const dx = ex - ox, dy = r3eyEsp - oy;
      segmento(ex, r3eyEsp, 0, r3eyEsp - dy * (ex / dx), '#a8ff3e', 1.5);
      punteadoHacia(ex, r3eyEsp, ix, iy, '#a8ff3e');
    }
  }

  // ── Rayos convexo ────────────────────────────────────────────────────────
  function drawRayosConvexo(ox, oy, iy, ex, ey, fPx, ix, scale, espH) {
    const fVX = ex + fPx;
    const cVX = ex + fPx * 2;

    // Rayo 1: paralelo al eje, diverge como si viniese de F virtual
    segmento(ox, oy, ex, oy, '#ff4d6d', 1.5);
    const r1dx = ex - fVX;
    const r1dy = oy - ey;
    const r1t  = ex / (-r1dx);
    segmento(ex, oy, 0, oy + r1dy * r1t, '#ff4d6d', 1.5);
    punteadoHacia(ex, oy, fVX, ey, '#ff4d6d');

    // Rayo 2: dirigido hacia F virtual, sale paralelo al eje
    const r2eyEsp = ey + (oy - ey) / (ox - fVX) * (ex - fVX);
    segmento(ox, oy, ex, r2eyEsp, '#00e5ff', 1.5);
    segmento(ex, r2eyEsp, 0, r2eyEsp, '#00e5ff', 1.5);
    punteadoHacia(ex, r2eyEsp, fVX, ey, '#00e5ff');

    // Rayo 3: dirigido hacia C virtual, refleja sobre si mismo
    const r3eyEsp = ey + (oy - ey) / (ox - cVX) * (ex - cVX);
    segmento(ox, oy, ex, r3eyEsp, '#a8ff3e', 1.5);
    const r3dx = ex - cVX;
    const r3dy = r3eyEsp - ey;
    const r3t  = ex / (-r3dx);
    segmento(ex, r3eyEsp, 0, r3eyEsp + r3dy * r3t, '#a8ff3e', 1.5);
    punteadoHacia(ex, r3eyEsp, cVX, ey, '#a8ff3e');

    // Punteados de convergencia hacia imagen virtual
    punteadoHacia(ex, oy,      ix, iy, '#ff4d6d');
    punteadoHacia(ex, r2eyEsp, ix, iy, '#00e5ff');
    punteadoHacia(ex, r3eyEsp, ix, iy, '#a8ff3e');
  }

  // ── Helpers de dibujo ────────────────────────────────────────────────────
  function segmento(x1, y1, x2, y2, color, lw, punteado) {
    ctx1.beginPath();
    ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2);
    ctx1.strokeStyle = color; ctx1.lineWidth = lw || 1;
    if (punteado) ctx1.setLineDash([4,3]);
    ctx1.stroke();
    ctx1.setLineDash([]);
  }

  function extenderPunteado(x1, y1, x2, y2, maxX, color) {
    const dx = x2 - x1, dy = y2 - y1;
    if (Math.abs(dx) < 0.01) return;
    const tMax = (maxX - x1) / dx;
    const xEnd = x1 + dx * tMax;
    const yEnd = y1 + dy * tMax;
    ctx1.beginPath(); ctx1.moveTo(x2, y2); ctx1.lineTo(xEnd, yEnd);
    ctx1.strokeStyle = `${color}55`; ctx1.lineWidth = 1;
    ctx1.setLineDash([4,4]); ctx1.stroke(); ctx1.setLineDash([]);
  }

  function punteadoHacia(x1, y1, x2, y2, color) {
    ctx1.beginPath(); ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2);
    ctx1.strokeStyle = `${color}66`; ctx1.lineWidth = 1;
    ctx1.setLineDash([3,4]); ctx1.stroke(); ctx1.setLineDash([]);
  }

  // ── Vista B: diagrama posicion ───────────────────────────────────────────
  function drawDiagrama(so, f, fAbs, si, A) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);

    const esConcavo = tipo === 'concavo';
    const cx = W * 0.5, cy = H * 0.5;

    // Grid
    ctx2.strokeStyle = 'rgba(26,37,64,0.5)';
    ctx2.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx2.beginPath(); ctx2.moveTo(x,0); ctx2.lineTo(x,H); ctx2.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx2.beginPath(); ctx2.moveTo(0,y); ctx2.lineTo(W,y); ctx2.stroke(); }

    // Ejes
    ctx2.strokeStyle = 'rgba(74,90,122,0.5)'; ctx2.lineWidth = 1;
    ctx2.setLineDash([5,3]);
    ctx2.beginPath(); ctx2.moveTo(20, cy); ctx2.lineTo(W-20, cy); ctx2.stroke();
    ctx2.beginPath(); ctx2.moveTo(cx, 20); ctx2.lineTo(cx, H-20); ctx2.stroke();
    ctx2.setLineDash([]);

    // Labels ejes
    ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right'; ctx2.fillText('s\u2092 \u2192', W-10, cy-6);
    ctx2.textAlign = 'center'; ctx2.fillText('s\u1d62', cx+14, 16);
    ctx2.textAlign = 'left';

    if (esConcavo) {
      // ── Diagrama concavo: zonas caracteristicas ────────────────────────
      const maxSo = fAbs * 4;
      const maxSi = fAbs * 3;
      const pxPerCm_x = (W * 0.42) / maxSo;
      const pxPerCm_y = (H * 0.38) / maxSi;

      // Linea de Gauss: 1/si = 1/f - 1/so
      ctx2.beginPath();
      let started = false;
      for (let soPlot = 1; soPlot <= maxSo * 1.5; soPlot += 0.5) {
        const siPlot = 1 / (1/fAbs - 1/soPlot);
        if (!isFinite(siPlot) || Math.abs(siPlot) > maxSi * 2) { started = false; continue; }
        const px = cx + soPlot * pxPerCm_x;
        const py = cy - siPlot * pxPerCm_y;
        if (!started) { ctx2.moveTo(px, py); started = true; }
        else ctx2.lineTo(px, py);
      }
      ctx2.strokeStyle = 'rgba(0,229,255,0.4)'; ctx2.lineWidth = 1.5; ctx2.stroke();

      // Linea si < 0 (imagen virtual)
      ctx2.beginPath(); started = false;
      for (let soPlot = 1; soPlot < fAbs; soPlot += 0.5) {
        const siPlot = 1 / (1/fAbs - 1/soPlot);
        if (!isFinite(siPlot) || Math.abs(siPlot) > maxSi * 2) { started = false; continue; }
        const px = cx + soPlot * pxPerCm_x;
        const py = cy - siPlot * pxPerCm_y;
        if (!started) { ctx2.moveTo(px, py); started = true; }
        else ctx2.lineTo(px, py);
      }
      ctx2.strokeStyle = 'rgba(168,255,62,0.35)'; ctx2.lineWidth = 1.5; ctx2.stroke();

      // Zonas
      const fPx = fAbs * pxPerCm_x;
      const zonas = [
        { x: 0,      label: 'O entre V y F',  color: 'rgba(168,255,62,0.06)' },
        { x: fPx,    label: 'O entre F y C',  color: 'rgba(0,229,255,0.06)' },
        { x: fPx*2,  label: 'O m\u00e1s all\u00e1 de C', color: 'rgba(255,77,109,0.06)' },
      ];
      zonas.forEach((z, i) => {
        const xStart = cx + z.x;
        const xEnd   = i < zonas.length - 1 ? cx + zonas[i+1].x : W - 10;
        ctx2.fillStyle = z.color;
        ctx2.fillRect(xStart, 0, xEnd - xStart, H);
        ctx2.font = `400 ${11 + _F}px Outfit, monospace`;
        ctx2.fillStyle = 'rgba(220,232,255,0.85)';
        ctx2.textAlign = 'center';
        ctx2.fillText(z.label, (xStart + xEnd) / 2, H - 12);
      });

      // Marcas F y C
      [fAbs, fAbs*2].forEach((val, i) => {
        const px = cx + val * pxPerCm_x;
        ctx2.beginPath(); ctx2.moveTo(px, cy-5); ctx2.lineTo(px, cy+5);
        ctx2.strokeStyle = i === 0 ? '#00e5ff' : '#a8ff3e'; ctx2.lineWidth = 1; ctx2.stroke();
        ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
        ctx2.fillStyle = i === 0 ? '#00e5ff' : '#a8ff3e';
        ctx2.textAlign = 'center';
        ctx2.fillText(i === 0 ? 'f' : '2f', px, cy + 16);
      });

      // Punto actual
      const soPx = cx + so * pxPerCm_x;
      const siPy = isFinite(si) ? cy - Math.max(-maxSi*1.5, Math.min(maxSi*1.5, si)) * pxPerCm_y : cy;

      ctx2.beginPath(); ctx2.arc(soPx, siPy, 7, 0, Math.PI*2);
      ctx2.fillStyle = 'rgba(255,107,53,0.2)'; ctx2.fill();
      ctx2.beginPath(); ctx2.arc(soPx, siPy, 4, 0, Math.PI*2);
      ctx2.fillStyle = '#ff6b35'; ctx2.shadowColor = '#ff6b35'; ctx2.shadowBlur = 10; ctx2.fill();
      ctx2.shadowBlur = 0;

      // si en eje y
      if (isFinite(si)) {
        ctx2.beginPath(); ctx2.moveTo(cx - 5, siPy); ctx2.lineTo(cx + 5, siPy);
        ctx2.strokeStyle = 'rgba(255,107,53,0.5)'; ctx2.lineWidth = 1; ctx2.stroke();
        ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
        ctx2.fillStyle = '#ff6b35';
        ctx2.textAlign = 'right';
        ctx2.fillText(si.toFixed(1) + ' cm', cx - 8, siPy + 4);
      }

      ctx2.textAlign = 'left';

    } else {
      // ── Diagrama convexo: imagen siempre virtual entre 0 y f ─────────────
      const maxSo = fAbs * 4;
      const pxPerCm_x = (W * 0.42) / maxSo;
      const pxPerCm_y = (H * 0.38) / fAbs;

      ctx2.beginPath(); let started = false;
      for (let soPlot = 1; soPlot <= maxSo; soPlot += 0.5) {
        const siPlot = 1 / (1/(-fAbs) - 1/soPlot);
        const px = cx + soPlot * pxPerCm_x;
        const py = cy - siPlot * pxPerCm_y;
        if (py < 10 || py > H - 10) { started = false; continue; }
        if (!started) { ctx2.moveTo(px, py); started = true; }
        else ctx2.lineTo(px, py);
      }
      ctx2.strokeStyle = 'rgba(168,255,62,0.5)'; ctx2.lineWidth = 1.5; ctx2.stroke();

      ctx2.fillStyle = 'rgba(168,255,62,0.05)';
      ctx2.fillRect(cx, 0, W - cx - 10, H);
      ctx2.font = `400 ${11 + _F}px Outfit, monospace`;
      ctx2.fillStyle = 'rgba(220,232,255,0.85)';
      ctx2.textAlign = 'center';
      ctx2.fillText('imagen siempre virtual', cx + (W - cx) / 2, H - 12);

      const fPx = fAbs * pxPerCm_x;
      ctx2.beginPath(); ctx2.moveTo(cx + fPx, cy-5); ctx2.lineTo(cx + fPx, cy+5);
      ctx2.strokeStyle = '#00e5ff'; ctx2.lineWidth = 1; ctx2.stroke();
      ctx2.font = `400 ${9 + _F}px Space Mono, monospace`;
      ctx2.fillStyle = '#00e5ff';
      ctx2.textAlign = 'center';
      ctx2.fillText('|f|', cx + fPx, cy + 16);

      const siConvexo = 1 / (1/(-fAbs) - 1/so);
      const soPx = cx + so * pxPerCm_x;
      const siPy = cy - Math.max(-fAbs * 2, Math.min(fAbs * 2, siConvexo)) * pxPerCm_y;

      ctx2.beginPath(); ctx2.arc(soPx, siPy, 7, 0, Math.PI*2);
      ctx2.fillStyle = 'rgba(255,107,53,0.2)'; ctx2.fill();
      ctx2.beginPath(); ctx2.arc(soPx, siPy, 4, 0, Math.PI*2);
      ctx2.fillStyle = '#ff6b35'; ctx2.shadowColor = '#ff6b35'; ctx2.shadowBlur = 10; ctx2.fill();
      ctx2.shadowBlur = 0;

      ctx2.textAlign = 'left';
    }

    // Label
    ctx2.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right';
    ctx2.fillText('s\u2092 vs s\u1d62', W - 10, 18);
    ctx2.textAlign = 'left';
  }

  return { init, draw };
})();
