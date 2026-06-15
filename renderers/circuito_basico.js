window.Renderers = window.Renderers || {};

window.Renderers.circuito_basico = (() => {
  let c1, c2, ctx1, ctx2, frame = 0;
  let _F = 0;
  let componente = 'vacio';

  // Particulas de corriente (posicion normalizada 0..1 a lo largo del lazo)
  let particulas = [];
  const N_PART = 8;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d'); ctx2 = c2.getContext('2d');
    resizeAll();
    window.addEventListener('resize', resizeAll);
    insertarToggle();
    initParticulas();
  }

  function resizeAll() {
    [c1, c2].forEach(c => { if (!c) return; c.width = c.parentElement.clientWidth; c.height = c.parentElement.clientHeight; });
  }

  function initParticulas() {
    particulas = [];
    for (let i = 0; i < N_PART; i++) {
      particulas.push({ t: i / N_PART, stuck: false });
    }
  }

  // -- Toggle de componente central: columna con iconos SVG --
  // 'vacio' (sin interruptor) o 'interruptor' (alterna abierto/cerrado al click)
  let interruptorEstado = 'abierto'; // 'abierto' | 'cerrado'

  function insertarToggle() {
    if (document.getElementById('circuito-toggle-wrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'circuito-toggle-wrap';
    wrap.style.cssText = `
      display: flex; flex-direction: column; gap: 0.5rem;
      margin-bottom: 1rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.7rem;
    `;

    const btnVacio = document.createElement('button');
    btnVacio.id = 'btn-vacio';
    btnVacio.innerHTML = iconoVacio() + '<span>vacio</span>';
    btnVacio.style.cssText = estiloToggle(true);

    const btnInterruptor = document.createElement('button');
    btnInterruptor.id = 'btn-interruptor';
    btnInterruptor.innerHTML = iconoInterruptor('abierto') + '<span>interruptor abierto</span>';
    btnInterruptor.style.cssText = estiloToggle(false);

    function actualizarValor() {
      let nuevoValor;
      if (componente === 'vacio') {
        nuevoValor = 'vacio';
      } else {
        nuevoValor = interruptorEstado === 'cerrado' ? 'interruptor_cerrado' : 'interruptor_abierto';
      }
      if (window._State && window._State.valores) {
        window._State.valores.componente_hueco = nuevoValor;
        if (window._onCambio) window._onCambio();
      }
    }

    btnVacio.addEventListener('click', () => {
      componente = 'vacio';
      btnVacio.style.cssText = estiloToggle(true);
      btnInterruptor.style.cssText = estiloToggle(false);
      actualizarValor();
    });

    btnInterruptor.addEventListener('click', () => {
      if (componente !== 'interruptor') {
        // Primer click: seleccionar el interruptor (sin cambiar su estado)
        componente = 'interruptor';
        btnVacio.style.cssText = estiloToggle(false);
        btnInterruptor.style.cssText = estiloToggle(true);
      } else {
        // Ya seleccionado: alternar abierto/cerrado
        interruptorEstado = interruptorEstado === 'abierto' ? 'cerrado' : 'abierto';
      }
      btnInterruptor.innerHTML = iconoInterruptor(interruptorEstado) + '<span>interruptor ' + interruptorEstado + '</span>';
      actualizarValor();
    });

    wrap.appendChild(btnVacio);
    wrap.appendChild(btnInterruptor);

    const sliders = document.getElementById('sliders-container');
    if (sliders) sliders.parentElement.insertBefore(wrap, sliders);

    // Ocultar el select original generado por el motor para componente_hueco
    setTimeout(() => {
      const sl = document.getElementById('sl-componente_hueco');
      if (sl) {
        const row = sl.closest('.slider-row');
        if (row) row.style.display = 'none';
      }
      // Sincronizar estado inicial desde el valor del motor
      const val = (window._State && window._State.valores) ? window._State.valores.componente_hueco : 'vacio';
      if (val === 'interruptor_abierto' || val === 'interruptor_cerrado') {
        componente = 'interruptor';
        interruptorEstado = val === 'interruptor_cerrado' ? 'cerrado' : 'abierto';
        btnVacio.style.cssText = estiloToggle(false);
        btnInterruptor.style.cssText = estiloToggle(true);
      } else {
        componente = 'vacio';
        btnVacio.style.cssText = estiloToggle(true);
        btnInterruptor.style.cssText = estiloToggle(false);
      }
      btnInterruptor.innerHTML = iconoInterruptor(interruptorEstado) + '<span>interruptor ' + interruptorEstado + '</span>';
    }, 100);
  }

  function estiloToggle(activo) {
    const base = `
      display: flex; align-items: center; gap: 0.5rem;
      font-family: 'Space Mono', monospace;
      font-size: 0.65rem;
      padding: 0.4rem 0.8rem;
      cursor: pointer;
      letter-spacing: 0.04em;
      border: 1px solid;
      background: transparent;
      transition: all 0.2s;
      text-align: left;
    `;
    return base + (activo
      ? 'border-color: #00e5ff; color: #00e5ff;'
      : 'border-color: #1a2540; color: #4a5a7a;');
  }

  // Iconos SVG inline, coherentes con el simbolo dibujado en el circuito
  function iconoVacio() {
    return `<svg width="22" height="14" viewBox="0 0 22 14" style="flex-shrink:0"><line x1="1" y1="7" x2="8" y2="7" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="7" r="1.5" fill="currentColor"/><line x1="14" y1="7" x2="21" y2="7" stroke="currentColor" stroke-width="2"/><circle cx="14" cy="7" r="1.5" fill="currentColor"/></svg>`;
  }

  function iconoInterruptor(estado) {
    const palanca = estado === 'cerrado'
      ? '<line x1="4" y1="7" x2="18" y2="7" stroke="currentColor" stroke-width="2"/>'
      : '<line x1="4" y1="7" x2="16" y2="1" stroke="currentColor" stroke-width="2"/>';
    return `<svg width="22" height="14" viewBox="0 0 22 14" style="flex-shrink:0"><circle cx="4" cy="7" r="1.5" fill="currentColor"/><circle cx="18" cy="7" r="1.5" fill="currentColor"/>${palanca}</svg>`;
  }


  function draw(valores, resultados) {
    frame++;
    _F = window.AX_F || 2;
    // Mantener sincronizado el toggle si el valor cambia desde fuera (reset, URL)
    const valorActual = resolverValorComponente();
    if (valores.componente_hueco !== valorActual) {
      sincronizarBotones(valores.componente_hueco);
    }
    drawCircuito(valores, resultados);
    drawAnalisis(valores, resultados);
  }

  function resolverValorComponente() {
    if (componente === 'vacio') return 'vacio';
    return interruptorEstado === 'cerrado' ? 'interruptor_cerrado' : 'interruptor_abierto';
  }

  function sincronizarBotones(valorMotor) {
    const btnVacio = document.getElementById('btn-vacio');
    const btnInterruptor = document.getElementById('btn-interruptor');
    if (!btnVacio || !btnInterruptor) return;
    if (valorMotor === 'interruptor_abierto' || valorMotor === 'interruptor_cerrado') {
      componente = 'interruptor';
      interruptorEstado = valorMotor === 'interruptor_cerrado' ? 'cerrado' : 'abierto';
      btnVacio.style.cssText = estiloToggle(false);
      btnInterruptor.style.cssText = estiloToggle(true);
    } else {
      componente = 'vacio';
      btnVacio.style.cssText = estiloToggle(true);
      btnInterruptor.style.cssText = estiloToggle(false);
    }
    btnInterruptor.innerHTML = iconoInterruptor(interruptorEstado) + '<span>interruptor ' + interruptorEstado + '</span>';
  }


  // â”€â”€ Vista A: circuito (lazo cerrado) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawCircuito(valores, resultados) {
    const W = c1.width, H = c1.height;
    ctx1.clearRect(0, 0, W, H);
    drawGrid(ctx1, W, H);

    const circuitoCerrado = resultados.circuito_cerrado === 1;
    const materialConductor = resultados.material_conductor === 1;
    const encendida = resultados.bombilla_encendida === 1;
    const corrienteFluye = circuitoCerrado && materialConductor;

    // Rectangulo del circuito
    const margin = Math.min(W, H) * 0.12;
    const left = margin, right = W - margin;
    const top = H * 0.22, bottom = H * 0.82;
    const midY = (top + bottom) / 2;
    const midXLeft = left;
    const midXRight = right;

    // Color del cableado segun material
    const wireColor = materialConductor ? 'rgba(220,232,255,0.85)' : 'rgba(255,155,69,0.6)';
    const wireGlow = corrienteFluye ? '#a8ff3e' : null;

    // â”€â”€ Lado izquierdo (cable fijo, siempre presente) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawWireSegment(left, top, left, bottom, wireColor, corrienteFluye ? wireGlow : null);

    // â”€â”€ Lado superior (a la bombilla) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const bulbX = (left + right) / 2;
    drawWireSegment(left, top, bulbX - 22, top, wireColor, corrienteFluye ? wireGlow : null);
    drawWireSegment(bulbX + 22, top, right, top, wireColor, corrienteFluye ? wireGlow : null);

    // â”€â”€ Lado derecho (a la pila) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawWireSegment(right, top, right, bottom, wireColor, corrienteFluye ? wireGlow : null);

    // â”€â”€ Lado inferior: pila a la izquierda, hueco configurable a la derecha â”€
    const pilaX = left + (right - left) * 0.28;
    const huecoX0 = left + (right - left) * 0.5;
    const huecoX1 = left + (right - left) * 0.78;

    drawWireSegment(left, bottom, pilaX - 16, bottom, wireColor, corrienteFluye ? wireGlow : null);
    drawWireSegment(pilaX + 16, bottom, huecoX0, bottom, wireColor, corrienteFluye ? wireGlow : null);
    drawWireSegment(huecoX1, bottom, right, bottom, wireColor, corrienteFluye ? wireGlow : null);

    // â”€â”€ Pila â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawPila(pilaX, bottom);

    // â”€â”€ Bombilla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawBombilla(bulbX, top, encendida);

    // â”€â”€ Componente del hueco â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawHueco(huecoX0, huecoX1, bottom, valores.componente_hueco, wireColor, corrienteFluye ? wireGlow : null, materialConductor);

    // â”€â”€ Particulas de corriente â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (corrienteFluye) {
      drawParticulas(left, right, top, bottom, bulbX, pilaX, huecoX0, huecoX1);
    } else if (!materialConductor) {
      // Material aislante: electrones atascados en naranja, sin importar el interruptor
      drawParticulasAtascadas(huecoX0, bottom, '#ff9b45');
    } else {
      // Material conductor pero circuito abierto: electrones atascados en verde
      drawParticulasAtascadas(huecoX0, bottom, '#a8ff3e');
    }



    // â”€â”€ Label material â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = materialConductor ? '#a8ff3e' : '#ff9b45';
    ctx1.textAlign = 'center';
    ctx1.fillText('cableado: ' + materialLabel(valores.material), (left + right) / 2, bottom + 26);

    // â”€â”€ Titulo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ctx1.font = `400 ${12 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#00e5ff';
    ctx1.textAlign = 'right';
    ctx1.fillText('CIRCUITO ELECTRICO', W - 14, 20);
    ctx1.textAlign = 'left';
  }

  function materialLabel(m) {
    const labels = { cobre: 'cobre', aluminio: 'aluminio', plastico: 'plastico', madera: 'madera' };
    return labels[m] || m;
  }

  function drawWireSegment(x1, y1, x2, y2, color, glow) {
    if (glow) {
      ctx1.save();
      ctx1.shadowColor = glow; ctx1.shadowBlur = 6;
      ctx1.strokeStyle = glow + 'aa';
      ctx1.lineWidth = 3;
      ctx1.beginPath(); ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2); ctx1.stroke();
      ctx1.restore();
    }
    ctx1.strokeStyle = color;
    ctx1.lineWidth = 2.5;
    ctx1.beginPath(); ctx1.moveTo(x1, y1); ctx1.lineTo(x2, y2); ctx1.stroke();
  }

  function drawPila(x, y) {
    // Simbolo de pila: dos lineas verticales, una larga (+) y una corta (-)
    ctx1.save();
    ctx1.translate(x, y);
    ctx1.strokeStyle = 'rgba(220,232,255,0.9)';
    ctx1.lineWidth = 3;
    ctx1.beginPath(); ctx1.moveTo(-8, -14); ctx1.lineTo(-8, 14); ctx1.stroke();
    ctx1.lineWidth = 1.5;
    ctx1.beginPath(); ctx1.moveTo(8, -7); ctx1.lineTo(8, 7); ctx1.stroke();
    ctx1.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = '#ff4d6d';
    ctx1.textAlign = 'center';
    ctx1.fillText('+', -8, -22);
    ctx1.fillStyle = '#00e5ff';
    ctx1.fillText('-', 8, -22);
    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = 'rgba(220,232,255,0.7)';
    ctx1.fillText('PILA', 0, 30);
    ctx1.restore();
  }

  function drawBombilla(x, y, encendida) {
    const r = 14;
    ctx1.save();
    if (encendida) {
      ctx1.shadowColor = '#fff7d6'; ctx1.shadowBlur = 22;
      ctx1.fillStyle = 'rgba(255,247,214,0.35)';
      ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.fill();
      ctx1.shadowBlur = 12;
      ctx1.strokeStyle = '#fff7d6';
    } else {
      ctx1.strokeStyle = 'rgba(220,232,255,0.6)';
    }
    ctx1.lineWidth = 2;
    ctx1.beginPath(); ctx1.arc(x, y, r, 0, Math.PI * 2); ctx1.stroke();
    // Cruz interior (simbolo de bombilla / filamento)
    ctx1.beginPath();
    ctx1.moveTo(x - r * 0.6, y - r * 0.6); ctx1.lineTo(x + r * 0.6, y + r * 0.6);
    ctx1.moveTo(x + r * 0.6, y - r * 0.6); ctx1.lineTo(x - r * 0.6, y + r * 0.6);
    ctx1.stroke();
    ctx1.restore();

    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = encendida ? '#fff7d6' : 'rgba(220,232,255,0.6)';
    ctx1.textAlign = 'center';
    ctx1.fillText(encendida ? 'ENCENDIDA' : 'apagada', x, y - r - 10);
  }

  function drawHueco(x0, x1, y, comp, wireColor, glow, materialConductor) {
    const cx = (x0 + x1) / 2;

    if (comp === 'vacio') {
      // Gap visible: dos extremos de cable sin conectar
      ctx1.strokeStyle = wireColor;
      ctx1.lineWidth = 2.5;
      ctx1.beginPath(); ctx1.moveTo(x0, y); ctx1.lineTo(x0 + 10, y); ctx1.stroke();
      ctx1.beginPath(); ctx1.moveTo(x1 - 10, y); ctx1.lineTo(x1, y); ctx1.stroke();
      // Puntos en los extremos
      ctx1.fillStyle = wireColor;
      ctx1.beginPath(); ctx1.arc(x0 + 10, y, 2.5, 0, Math.PI * 2); ctx1.fill();
      ctx1.beginPath(); ctx1.arc(x1 - 10, y, 2.5, 0, Math.PI * 2); ctx1.fill();
      ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
      ctx1.fillStyle = 'rgba(255,77,109,0.7)';
      ctx1.textAlign = 'center';
      ctx1.fillText('circuito abierto', cx, y + 22);
      return;
    }

    if (comp === 'cable') {
      drawWireSegment(x0, y, x1, y, wireColor, glow);
      return;
    }

    // Interruptor abierto / cerrado
    const cerrado = comp === 'interruptor_cerrado';
    ctx1.strokeStyle = wireColor;
    ctx1.lineWidth = 2.5;
    // Tramo de entrada
    ctx1.beginPath(); ctx1.moveTo(x0, y); ctx1.lineTo(x0 + 10, y); ctx1.stroke();
    // Tramo de salida
    ctx1.beginPath(); ctx1.moveTo(x1 - 10, y); ctx1.lineTo(x1, y); ctx1.stroke();
    // Pivote
    ctx1.fillStyle = wireColor;
    ctx1.beginPath(); ctx1.arc(x0 + 10, y, 2.5, 0, Math.PI * 2); ctx1.fill();
    ctx1.beginPath(); ctx1.arc(x1 - 10, y, 2.5, 0, Math.PI * 2); ctx1.fill();
    // Palanca
    if (glow) {
      ctx1.save();
      ctx1.shadowColor = glow; ctx1.shadowBlur = 6;
      ctx1.strokeStyle = glow + 'aa'; ctx1.lineWidth = 3;
      if (cerrado) { ctx1.beginPath(); ctx1.moveTo(x0 + 10, y); ctx1.lineTo(x1 - 10, y); ctx1.stroke(); }
      else { ctx1.beginPath(); ctx1.moveTo(x0 + 10, y); ctx1.lineTo(x1 - 10, y - 14); ctx1.stroke(); }
      ctx1.restore();
    }
    ctx1.strokeStyle = wireColor;
    ctx1.lineWidth = 2.5;
    if (cerrado) {
      ctx1.beginPath(); ctx1.moveTo(x0 + 10, y); ctx1.lineTo(x1 - 10, y); ctx1.stroke();
    } else {
      ctx1.beginPath(); ctx1.moveTo(x0 + 10, y); ctx1.lineTo(x1 - 10, y - 14); ctx1.stroke();
    }

    ctx1.font = `400 ${10 + _F}px Space Mono, monospace`;
    ctx1.fillStyle = cerrado ? '#a8ff3e' : 'rgba(255,77,109,0.7)';
    ctx1.textAlign = 'center';
    ctx1.fillText(cerrado ? 'interruptor cerrado' : 'interruptor abierto', cx, y + 22);
  }

  // â”€â”€ Particulas de corriente recorriendo el lazo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Recorrido normalizado (sentido horario desde la esquina sup-izq)
  function loopPoint(t, left, right, top, bottom, bulbX, pilaX, huecoX0, huecoX1) {
    // Tramos del perimetro con longitudes relativas aproximadas
    const W = right - left, H = bottom - top;
    const segs = [
      { from: [left, top], to: [bulbX - 22, top] },
      { from: [bulbX + 22, top], to: [right, top] },
      { from: [right, top], to: [right, bottom] },
      { from: [right, bottom], to: [huecoX1, bottom] },
      { from: [huecoX0, bottom], to: [pilaX + 16, bottom] },
      { from: [pilaX - 16, bottom], to: [left, bottom] },
      { from: [left, bottom], to: [left, top] },
    ];
    const lengths = segs.map(s => Math.hypot(s.to[0]-s.from[0], s.to[1]-s.from[1]));
    const total = lengths.reduce((a,b) => a+b, 0);
    let d = ((t % 1) + 1) % 1 * total;
    for (let i = 0; i < segs.length; i++) {
      if (d <= lengths[i]) {
        const f = lengths[i] > 0 ? d / lengths[i] : 0;
        const s = segs[i];
        return [s.from[0] + (s.to[0]-s.from[0])*f, s.from[1] + (s.to[1]-s.from[1])*f];
      }
      d -= lengths[i];
    }
    return segs[0].from;
  }

  function drawParticulas(left, right, top, bottom, bulbX, pilaX, huecoX0, huecoX1) {
    particulas.forEach(p => {
      p.t -= 0.0035; // electrones reales: de - a + por el circuito externo
      const [px, py] = loopPoint(p.t, left, right, top, bottom, bulbX, pilaX, huecoX0, huecoX1);
      ctx1.beginPath();
      ctx1.arc(px, py, 3, 0, Math.PI * 2);
      ctx1.fillStyle = '#a8ff3e';
      ctx1.shadowColor = '#a8ff3e'; ctx1.shadowBlur = 6;
      ctx1.fill();
      ctx1.shadowBlur = 0;
    });
  }

  function drawParticulasAtascadas(huecoX0, y, color) {
    // Electrones vibrando sin avanzar: naranja = material aislante,
    // verde = material conductor pero circuito abierto (sin camino)
    for (let i = 0; i < 3; i++) {
      const wob = Math.sin(frame * 0.15 + i * 2) * 3;
      ctx1.beginPath();
      ctx1.arc(huecoX0 - 14 - i * 9, y + wob, 3, 0, Math.PI * 2);
      ctx1.fillStyle = color;
      ctx1.shadowColor = color; ctx1.shadowBlur = 5;
      ctx1.fill();
      ctx1.shadowBlur = 0;
    }
  }


  // â”€â”€ Vista B: tabla de analisis â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function drawAnalisis(valores, resultados) {
    const W = c2.width, H = c2.height;
    ctx2.clearRect(0, 0, W, H);
    drawGrid(ctx2, W, H);

    const circuitoCerrado = resultados.circuito_cerrado === 1;
    const materialConductor = resultados.material_conductor === 1;
    const encendida = resultados.bombilla_encendida === 1;

    ctx2.font = `400 ${11 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = '#a8ff3e'; ctx2.textAlign = 'right';
    ctx2.fillText('ANALISIS', W - 12, 18);
    ctx2.textAlign = 'left';

    const rows = [
      { label: 'Circuito', ok: circuitoCerrado, textOk: 'Cerrado', textBad: 'Abierto' },
      { label: 'Material', ok: materialConductor, textOk: 'Conductor', textBad: 'Aislante' },
      { label: 'Corriente', ok: circuitoCerrado && materialConductor, textOk: 'Si', textBad: 'No' },
      { label: 'Bombilla', ok: encendida, textOk: 'Encendida', textBad: 'Apagada' },
    ];

    const startY = H * 0.22;
    const rowH = Math.min(H * 0.16, 56);
    const labelX = 24;
    const valueX = W * 0.46;
    const iconX = W - 36;

    rows.forEach((row, i) => {
      const y = startY + i * rowH;
      const color = row.ok ? '#a8ff3e' : '#ff4d6d';

      ctx2.font = `400 ${12 + _F}px Space Mono, monospace`;
      ctx2.fillStyle = 'rgba(220,232,255,0.8)';
      ctx2.textAlign = 'left';
      ctx2.fillText(row.label + ':', labelX, y);

      ctx2.font = `400 ${12 + _F}px Space Mono, monospace`;
      ctx2.fillStyle = color;
      ctx2.fillText(row.ok ? row.textOk : row.textBad, valueX, y);

      // Icono check/cross
      ctx2.font = `400 ${14 + _F}px Space Mono, monospace`;
      ctx2.textAlign = 'center';
      ctx2.fillStyle = color;
      ctx2.fillText(row.ok ? '\u2713' : '\u2717', iconX, y);
      ctx2.textAlign = 'left';

      // Linea separadora
      if (i < rows.length - 1) {
        ctx2.strokeStyle = 'rgba(26,37,64,0.6)';
        ctx2.lineWidth = 1;
        ctx2.beginPath(); ctx2.moveTo(labelX - 4, y + rowH * 0.45); ctx2.lineTo(W - 16, y + rowH * 0.45); ctx2.stroke();
      }
    });

    // Resumen final
    const finalY = startY + rows.length * rowH + 16;
    ctx2.font = `400 ${13 + _F}px Space Mono, monospace`;
    ctx2.fillStyle = encendida ? '#fff7d6' : 'rgba(220,232,255,0.5)';
    ctx2.textAlign = 'center';
    ctx2.fillText(encendida ? '\u2728 La bombilla se enciende' : 'La bombilla no se enciende', W / 2, finalY);
    ctx2.textAlign = 'left';
  }

  function drawGrid(ctx, W, H) {
    ctx.strokeStyle = 'rgba(26,37,64,0.55)'; ctx.lineWidth = 0.5;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  }

  return { init, draw };
})();

