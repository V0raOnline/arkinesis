/**
 * renderers/optica_espejo.js
 * Vista A: espejo esférico con rayos canónicos y pantalla
 * Vista B: diagrama posición objeto vs imagen (zonas características)
 *
 * Toggle cóncavo / convexo se gestiona internamente.
 * El renderer expone window._espejo_tipo para que el toggle del HTML lo cambie.
 */

window.Renderers = window.Renderers || {};

window.Renderers.optica_espejo = (() => {
  let c1, c2, ctx1, ctx2;
  let frame = 0;
  let tipo = 'concavo'; // 'concavo' | 'convexo'

  // Exponer para toggle externo
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

  // ── Toggle UI ─────────────────────────────────────────────────────────────
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
    btnC.textContent = 'cóncavo';
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

    // Insertar al inicio del panel de parámetros
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

  // ── Draw principal ────────────────────────────────────────────────────────
  function draw(valores, resultados) {
    frame++;

    const so  = valores.so;
    const fAbs = valores.f;
    const ho  = valores.ho;
    const f   = tipo === 'concavo' ? fAbs : -fAbs;

    const si  = 1 / (1/f - 1/so);
    const A   = -si / so;
    const hi  = ho * A;

    // Tipo de imagen para la fórmula
    const esReal    = si > 0;
    const esVirtual = si < 0;
    const tipoStr   = esReal ? 'real, invertida' : 'virtual, derecha';

    // Actualizar resultado tipo_imagen (hack: motor no evalúa strings)
    // Lo dejamos como info en la caja fórmula vía _actualizarCajaInfo

    drawEspejo(so, f, fAbs, si, ho, hi, A);
    drawDiagrama(so, f, fAbs, si, A);
  }

  // ── Vista A: espejo + rayos ───────────────────────────────────────────────
  function drawEspejo(so, f, fAbs, si, ho, hi, A) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);

    const esConcavo = tipo === 'concavo';

    // Espejo: centrado a la derecha
    const ex = W * 0.72; // posición x del vértice del espejo
    const ey = H / 2;    // eje óptico

    // Escala px/cm — so tiene que caber
    const maxDist = Math.max(so, Math.abs(si), fAbs * 2, 20);
    const scale   = Math.min((W * 0.62) / maxDist, 5);

    const espH = Math.min(H * 0.38, 80); // semialtura del espejo

    // Grid
    ctx1.strokeStyle = 'rgba(26,37,64,0.5)';
    ctx1.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx1.beginPath(); ctx1.moveTo(x,0); ctx1.lineTo(x,H); ctx1.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx1.beginPath(); ctx1.moveTo(0,y); ctx1.lineTo(W,y); ctx1.stroke(); }

    // Eje óptico
    ctx1.beginPath(); ctx1.moveTo(0, ey); ctx1.lineTo(W, ey);
    ctx1.strokeStyle = 'rgba(74,90,122,0.5)'; ctx1.lineWidth = 1;
    ctx1.setLineDash([6,3]); ctx1.stroke(); ctx1.setLineDash([]);

    // ── Dibujar espejo curvo ──────────────────────────────────────────────
    const R = fAbs * 2 * scale; // radio de curvatura en px
    drawEspejoShape(ex, ey, espH, R, esConcavo);

    // Focos y centro de curvatura
    const fPx  = fAbs * scale;
    const fPos = esConcavo ? ex - fPx : ex + fPx; // foco real (concavo: frente) o virtual (convexo: detrás)

    // Foco
    ctx1.beginPath(); ctx1.arc(esConcavo ? ex - fPx : ex + fPx, ey, 4, 0, Math.PI*2);
    ctx1.fillStyle = 'rgba(0,229,255,0.3)'; ctx1.fill();
    ctx1.beginPath(); ctx1.arc(esConcavo ? ex - fPx : ex + fPx, ey, 2, 0, Math.PI*2);
    ctx1.fillStyle = '#00e5ff'; ctx1.fill();
    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(0,229,255,0.6)';
    ctx1.textAlign = 'center';
    ctx1.fillText(esConcavo ? 'F' : 'F (v)', esConcavo ? ex - fPx : ex + fPx, ey + 14);

    // Centro de curvatura (cóncavo: real delante; convexo: virtual detrás)
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
    // flecha
    ctx1.beginPath();
    ctx1.moveTo(ox, ey - hoP);
    ctx1.lineTo(ox - 4, ey - hoP + 8);
    ctx1.lineTo(ox + 4, ey - hoP + 8);
    ctx1.fillStyle = '#ff6b35'; ctx1.fill();

    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = 'rgba(255,107,53,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText('O', ox, ey + 12);

    // ── Imagen ────────────────────────────────────────────────────────────
    const esReal = si > 0 && esConcavo;
    const esVirtualEnFrente = si < 0; // imagen virtual: detrás del espejo (si < 0 en cóncavo, o si > 0 en convexo... normalizar)

    // Para convexo: si siempre > 0 (virtual, detrás espejo) → en px va a la derecha de ex
    let ix, hiP;
    if (esConcavo) {
      ix  = ex - si * scale; // si > 0 → delante espejo (izquierda de ex)
    } else {
      ix  = ex + Math.abs(si) * scale; // imagen detrás del espejo (derecha de ex)
    }
    hiP = Math.min(Math.abs(hi) * scale * 0.8, espH * 0.9);
    const imagenArriba = hi > 0; // imagen derecha o invertida

    const imagenReal = esConcavo && si > 0;

    // Pantalla (solo imagen real)
    if (imagenReal && ix > 0 && ix < W) {
      ctx1.strokeStyle = 'rgba(168,255,62,0.15)';
      ctx1.lineWidth = 6;
      ctx1.beginPath(); ctx1.moveTo(ix, ey - espH - 10); ctx1.lineTo(ix, ey + espH + 10); ctx1.stroke();
      ctx1.strokeStyle = 'rgba(168,255,62,0.5)';
      ctx1.lineWidth = 2;
      ctx1.beginPath(); ctx1.moveTo(ix, ey - espH - 10); ctx1.lineTo(ix, ey + espH + 10); ctx1.stroke();
    }

    // Imagen
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

    ctx1.font = '500 9px Space Mono, monospace';
    ctx1.fillStyle = imgColor;
    ctx1.textAlign = 'center';
    ctx1.fillText(imagenReal ? "I'" : "I' (virtual)", ix, ey + 12);

    // ── Rayos canónicos ───────────────────────────────────────────────────
    const tipObjX = ox;
    const tipObjY = ey - hoP;
    const tipImgY = imagenArriba ? ey - hiP : ey + hiP;

    if (esConcavo) {
      drawRayosConcavo(tipObjX, tipObjY, tipImgY, ex, ey, fPx, ix, scale, imagenReal, espH, W);
    } else {
      drawRayosConvexo(tipObjX, tipObjY, tipImgY, ex, ey, fPx, ix, scale, espH);
    }

    // Label tipo
    ctx1.font = '600 10px Space Mono, monospace';
    ctx1.fillStyle = '#a8ff3e';
    ctx1.textAlign = 'right';
    ctx1.fillText(esConcavo ? 'CÓNCAVO' : 'CONVEXO', W - 10, H - 12);
    ctx1.textAlign = 'left';
  }

  // ── Forma del espejo ──────────────────────────────────────────────────────
  function drawEspejoShape(ex, ey, espH, R, esConcavo) {
    const grosor = 6;

    if (esConcavo) {
      // Arco que abre hacia la izquierda (refleja hacia la izquierda)
      const angle = Math.asin(espH / Math.max(R, espH + 1));
      ctx1.beginPath();
      ctx1.arc(ex + Math.sqrt(R*R - espH*espH), ey, R, Math.PI - angle, Math.PI + angle);
      ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 2.5; ctx1.stroke();

      // Grosor (lado oscuro)
      ctx1.beginPath();
      ctx1.arc(ex + Math.sqrt(R*R - espH*espH) + grosor, ey, R, Math.PI - angle, Math.PI + angle);
      ctx1.strokeStyle = 'rgba(0,229,255,0.15)'; ctx1.lineWidth = grosor; ctx1.stroke();
    } else {
      // Arco que abre hacia la derecha
      const angle = Math.asin(espH / Math.max(R, espH + 1));
      ctx1.beginPath();
      ctx1.arc(ex - Math.sqrt(R*R - espH*espH), ey, R, -angle, angle);
      ctx1.strokeStyle = '#00e5ff'; ctx1.lineWidth = 2.5; ctx1.stroke();

      // Grosor
      ctx1.beginPath();
      ctx1.arc(ex - Math.sqrt(R*R - espH*espH) - grosor, ey, R, -angle, angle);
      ctx1.strokeStyle = 'rgba(0,229,255,0.15)'; ctx1.lineWidth = grosor; ctx1.stroke();
    }
  }

  // ── Rayos cóncavo ─────────────────────────────────────────────────────────
  function drawRayosConcavo(ox, oy, iy, ex, ey, fPx, ix, scale, imagenReal, espH, W) {
    const fX = ex - fPx;
    const cX = ex - fPx * 2;

    // Rayo 1: paralelo al eje → refleja por el foco
    // Objeto → espejo (paralelo)
    segmento(ox, oy, ex, oy, '#ff4d6d', 1.5);
    // Espejo → imagen (o hacia el foco)
    if (imagenReal) {
      segmento(ex, oy, ix, iy, '#ff4d6d', 1.5);
      // Extensión punteada más allá de la imagen
      extenderPunteado(ex, oy, ix, iy, W, '#ff4d6d');
    } else {
      segmento(ex, oy, 0, oy + (oy - iy) * (ex / (ex - ix)), '#ff4d6d', 1.5);
      punteadoHacia(ex, oy, fX, ey, '#ff4d6d');
    }

    // Rayo 2: viaja desde el objeto en dirección al foco F → llega al espejo → refleja paralelo al eje
    // Guía punteada O→F: no es rayo físico, es la línea de orientación geométrica
    segmento(ox, oy, fX, ey, '#00e5ff', 1, true);
    // Punto real de incidencia en el espejo (sobre la línea O→F extrapolada hasta x=ex)
    const r2eyEsp = ey + (oy - ey) / (ox - fX) * (ex - fX);
    segmento(ox, oy, ex, r2eyEsp, '#00e5ff', 1.5);
    if (imagenReal) {
      segmento(ex, r2eyEsp, ix, iy, '#00e5ff', 1.5);
      extenderPunteado(ex, r2eyEsp, ix, iy, W, '#00e5ff');
    } else {
      // Sale paralelo al eje (izquierda)
      segmento(ex, r2eyEsp, 0, r2eyEsp, '#00e5ff', 1.5);
      // Punteado hacia F para mostrar la procedencia virtual del rayo reflejado
      punteadoHacia(ex, r2eyEsp, fX, ey, '#00e5ff');
    }

    // Rayo 3: pasa por el centro de curvatura → refleja sobre sí mismo
    const r3eyEsp = ey + (oy - ey) / (ox - cX) * (ex - cX);
    segmento(ox, oy, ex, r3eyEsp, '#a8ff3e', 1.5);
    if (imagenReal) {
      segmento(ex, r3eyEsp, ix, iy, '#a8ff3e', 1.5);
      extenderPunteado(ex, r3eyEsp, ix, iy, W, '#a8ff3e');
    } else {
      // Imagen virtual: el rayo reflejado vuelve por la misma línea (pasa por C)
      // Rayo reflejado visible hacia la izquierda
      const dx = ex - ox, dy = r3eyEsp - oy;
      segmento(ex, r3eyEsp, 0, r3eyEsp - dy * (ex / dx), '#a8ff3e', 1.5);
      // Punteado hacia imagen virtual
      punteadoHacia(ex, r3eyEsp, ix, iy, '#a8ff3e');
    }
  }

  // ── Rayos convexo ─────────────────────────────────────────────────────────
  function drawRayosConvexo(ox, oy, iy, ex, ey, fPx, ix, scale, espH) {
    // F virtual: detrás del espejo (derecha de ex)
    // C virtual: 2f detrás del espejo
    const fVX = ex + fPx;
    const cVX = ex + fPx * 2;

    // Rayo 1: paralelo al eje → incide en espejo en (ex, oy)
    // Reflejo: diverge como si viniese de F virtual (fVX, ey)
    // Dirección correcta: vector de (fVX,ey) a (ex,oy), extrapolado hacia la izquierda
    segmento(ox, oy, ex, oy, '#ff4d6d', 1.5);
    const r1dx = ex - fVX;          // negativo (fVX está a la derecha)
    const r1dy = oy - ey;
    const r1t  = ex / (-r1dx);      // escalar para llegar a x=0
    segmento(ex, oy, 0, oy + r1dy * r1t, '#ff4d6d', 1.5);
    punteadoHacia(ex, oy, fVX, ey, '#ff4d6d');  // detrás del espejo

    // Rayo 2: dirigido hacia F virtual → sale paralelo al eje
    const r2eyEsp = ey + (oy - ey) / (ox - fVX) * (ex - fVX);
    segmento(ox, oy, ex, r2eyEsp, '#00e5ff', 1.5);
    segmento(ex, r2eyEsp, 0, r2eyEsp, '#00e5ff', 1.5);
    punteadoHacia(ex, r2eyEsp, fVX, ey, '#00e5ff');  // indica de dónde "venía"

    // Rayo 3: dirigido hacia C virtual → refleja sobre sí mismo (vuelve por el mismo camino)
    // Dirección de retorno: vector de (cVX,ey) a (ex,r3eyEsp), extrapolado a x=0
    const r3eyEsp = ey + (oy - ey) / (ox - cVX) * (ex - cVX);
    segmento(ox, oy, ex, r3eyEsp, '#a8ff3e', 1.5);
    const r3dx = ex - cVX;          // negativo
    const r3dy = r3eyEsp - ey;
    const r3t  = ex / (-r3dx);
    segmento(ex, r3eyEsp, 0, r3eyEsp + r3dy * r3t, '#a8ff3e', 1.5);
    punteadoHacia(ex, r3eyEsp, cVX, ey, '#a8ff3e');

    // Punteados de convergencia hacia imagen virtual (detrás del espejo)
    punteadoHacia(ex, oy,      ix, iy, '#ff4d6d');
    punteadoHacia(ex, r2eyEsp, ix, iy, '#00e5ff');
    punteadoHacia(ex, r3eyEsp, ix, iy, '#a8ff3e');
  }

  // ── Helpers de dibujo ─────────────────────────────────────────────────────
  function segmento(x1, y1, x2, y2, color, lw, punteado) {
    ctx1.beginPath();
    ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2);
    ctx1.strokeStyle = color; ctx1.lineWidth = lw || 1;
    if (punteado) ctx1.setLineDash([4,3]);
    ctx1.stroke();
    ctx1.setLineDash([]);
  }

  function extenderPunteado(x1, y1, x2, y2, maxX, color) {
    // Extiende la línea más allá de x2 hasta el borde
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

  // ── Vista B: diagrama posición ────────────────────────────────────────────
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
    ctx2.beginPath(); ctx2.moveTo(20, cy); ctx2.lineTo(W-20, cy); ctx2.stroke(); // eje sₒ
    ctx2.beginPath(); ctx2.moveTo(cx, 20); ctx2.lineTo(cx, H-20); ctx2.stroke(); // eje sᵢ
    ctx2.setLineDash([]);

    // Labels ejes
    ctx2.font = '500 9px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right'; ctx2.fillText('sₒ →', W-10, cy-6);
    ctx2.textAlign = 'center'; ctx2.fillText('sᵢ', cx+14, 16);
    ctx2.textAlign = 'left';

    if (esConcavo) {
      // ── Diagrama cóncavo: zonas características ─────────────────────────
      // Escala: eje sₒ va de 0 a 4f, eje sᵢ va de -3f a +3f
      const maxSo = fAbs * 4;
      const maxSi = fAbs * 3;
      const pxPerCm_x = (W * 0.42) / maxSo;
      const pxPerCm_y = (H * 0.38) / maxSi;

      // Línea de Gauss: 1/sᵢ = 1/f - 1/sₒ → curva hiperbólica
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

      // Línea si < 0 (imagen virtual)
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
        { x: fPx*2,  label: 'O más allá de C', color: 'rgba(255,77,109,0.06)' },
      ];
      zonas.forEach((z, i) => {
        const xStart = cx + z.x;
        const xEnd   = i < zonas.length - 1 ? cx + zonas[i+1].x : W - 10;
        ctx2.fillStyle = z.color;
        ctx2.fillRect(xStart, 0, xEnd - xStart, H);
        ctx2.font = '600 11px Outfit, sans-serif';
        ctx2.fillStyle = 'rgba(220,232,255,0.85)';
        ctx2.textAlign = 'center';
        ctx2.fillText(z.label, (xStart + xEnd) / 2, H - 12);
      });

      // Marcas F y C
      [fAbs, fAbs*2].forEach((val, i) => {
        const px = cx + val * pxPerCm_x;
        ctx2.beginPath(); ctx2.moveTo(px, cy-5); ctx2.lineTo(px, cy+5);
        ctx2.strokeStyle = i === 0 ? '#00e5ff' : '#a8ff3e'; ctx2.lineWidth = 1; ctx2.stroke();
        ctx2.font = '500 9px Space Mono, monospace';
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

      // sᵢ en eje y
      if (isFinite(si)) {
        ctx2.beginPath(); ctx2.moveTo(cx - 5, siPy); ctx2.lineTo(cx + 5, siPy);
        ctx2.strokeStyle = 'rgba(255,107,53,0.5)'; ctx2.lineWidth = 1; ctx2.stroke();
        ctx2.font = '500 9px Space Mono, monospace';
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

      // Curva: sᵢ = 1/(1/(-f) - 1/so) → siempre negativo (virtual)
      ctx2.beginPath(); let started = false;
      for (let soPlot = 1; soPlot <= maxSo; soPlot += 0.5) {
        const siPlot = 1 / (1/(-fAbs) - 1/soPlot); // negativo siempre
        const px = cx + soPlot * pxPerCm_x;
        const py = cy - siPlot * pxPerCm_y;
        if (py < 10 || py > H - 10) { started = false; continue; }
        if (!started) { ctx2.moveTo(px, py); started = true; }
        else ctx2.lineTo(px, py);
      }
      ctx2.strokeStyle = 'rgba(168,255,62,0.5)'; ctx2.lineWidth = 1.5; ctx2.stroke();

      // Zona única (imagen virtual siempre)
      ctx2.fillStyle = 'rgba(168,255,62,0.05)';
      ctx2.fillRect(cx, 0, W - cx - 10, H);
      ctx2.font = '600 11px Outfit, sans-serif';
      ctx2.fillStyle = 'rgba(220,232,255,0.85)';
      ctx2.textAlign = 'center';
      ctx2.fillText('imagen siempre virtual', cx + (W - cx) / 2, H - 12);

      // Marca f
      const fPx = fAbs * pxPerCm_x;
      ctx2.beginPath(); ctx2.moveTo(cx + fPx, cy-5); ctx2.lineTo(cx + fPx, cy+5);
      ctx2.strokeStyle = '#00e5ff'; ctx2.lineWidth = 1; ctx2.stroke();
      ctx2.font = '500 9px Space Mono, monospace';
      ctx2.fillStyle = '#00e5ff';
      ctx2.textAlign = 'center';
      ctx2.fillText('|f|', cx + fPx, cy + 16);

      // Punto actual
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
    ctx2.font = '500 10px Space Mono, monospace';
    ctx2.fillStyle = 'rgba(200,216,240,0.75)';
    ctx2.textAlign = 'right';
    ctx2.fillText('sₒ vs sᵢ', W - 10, 18);
    ctx2.textAlign = 'left';
  }

  return { init, draw };
})();
