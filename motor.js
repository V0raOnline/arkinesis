/**
 * motor.js
 * Física Interactiva — BACH
 * 
 * Responsabilidades:
 *  1. Leer parámetros de la URL
 *  2. Cargar y parsear el YAML de la fórmula
 *  3. Generar sliders dinámicamente
 *  4. Evaluar fórmulas
 *  5. Actualizar URL en tiempo real
 *  6. Llamar al renderer correspondiente
 */

// ─── YAML parser mínimo (sin dependencias) ───────────────────────────────────
// Usamos js-yaml vía CDN en index.html

// ─── Estado global ────────────────────────────────────────────────────────────
const State = {
  formula: null,      // config YAML parseado
  valores: {},        // valores actuales de las variables
  renderer: null,     // instancia del renderer activo
  animId: null,
};

// ─── URL utils ────────────────────────────────────────────────────────────────
function getURLParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function updateURL() {
  const params = new URLSearchParams();
  params.set('formula', State.formula.id);
  for (const [key, val] of Object.entries(State.valores)) {
    params.set(key, val);
  }
  history.replaceState(null, '', '?' + params.toString());
}

// ─── Cargar YAML ──────────────────────────────────────────────────────────────
async function cargarFormula(id) {
  const res = await fetch(`formulas/${id}.yaml`);
  if (!res.ok) throw new Error(`No se encontró la fórmula: ${id}`);
  const text = await res.text();
  return jsyaml.load(text);
}

// ─── Inicializar valores ──────────────────────────────────────────────────────
function inicializarValores(formula, urlParams) {
  const valores = {};
  for (const [key, config] of Object.entries(formula.variables)) {
    // Prioridad: URL > default del YAML
    const fromURL = urlParams[key];
    valores[key] = fromURL !== undefined ? parseFloat(fromURL) : config.default;
  }
  return valores;
}

// ─── Evaluar fórmulas ─────────────────────────────────────────────────────────
function evaluarFormulas(formula, valores) {
  const scope = {
    PI: Math.PI,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    sqrt: Math.sqrt,
    abs: Math.abs,
    pow: Math.pow,
  };

  for (const [key, c] of Object.entries(formula.constantes || {})) {
    scope[key] = c.valor;
  }

  for (const [key, config] of Object.entries(formula.variables)) {
    scope[key] = valores[key] * (config.escala || 1);
  }

  const resultados = {};
  for (const f of formula.formulas) {
    try {
      const expr = f.expr.replace(/·/g, '*').trim();
      const nombres = Object.keys(scope);
      const vals    = Object.values(scope);
      const fn      = new Function(...nombres, 'return (' + expr + ');');
      const resultado = fn(...vals);

      if (isFinite(resultado)) {
        resultados[f.id] = resultado;
        scope[f.id] = resultado;
      } else {
        resultados[f.id] = null;
      }
    } catch (e) {
      resultados[f.id] = null;
      console.warn('[arkinesis] Error evaluando ' + f.id + ': "' + f.expr + '" -> ' + e.message);
    }
  }

  return resultados;
}

// ─── Formatear número ─────────────────────────────────────────────────────────
function formatNum(n) {
  if (n === null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  const exp = Math.floor(Math.log10(abs));
  if (Math.abs(exp) >= 3) {
    const m = (n / Math.pow(10, exp)).toFixed(2);
    const sup = String(exp).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹⁻'['0123456789-'.indexOf(c)] || c).join('');
    return `${m} × 10${sup}`;
  }
  return n.toPrecision(3);
}

// ─── Generar UI de sliders ────────────────────────────────────────────────────
function generarSliders(formula, valores, onCambio) {
  const container = document.getElementById('sliders-container');
  container.innerHTML = '';

  for (const [key, config] of Object.entries(formula.variables)) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <div class="slider-header">
        <span class="slider-name">${config.label}</span>
        <span class="slider-val" id="val-${key}">${valores[key]} ${config.unidad}</span>
      </div>
      <input type="range"
        id="sl-${key}"
        min="${config.min}"
        max="${config.max}"
        step="${config.step}"
        value="${valores[key]}"
      >
    `;
    container.appendChild(row);

    const input = row.querySelector('input');
    input.addEventListener('input', () => {
      valores[key] = parseFloat(input.value);
      document.getElementById(`val-${key}`).textContent = `${input.value} ${config.unidad}`;
      onCambio();
    });
  }
}

// ─── Generar resultados ───────────────────────────────────────────────────────
function actualizarNota(formula) {
  const container = document.getElementById('nota-container');
  if (!container) return;
  if (formula.nota) {
    container.innerHTML = '<div class="nota-info">' + formula.nota + '</div>';
  } else {
    container.innerHTML = '';
  }
}

function actualizarResultados(formula, resultados) {
  const container = document.getElementById('resultados-container');
  container.innerHTML = '';

  for (const f of formula.formulas) {
    const val = resultados[f.id];
    const div = document.createElement('div');
    div.className = `result-item${f.destacado ? ' highlight' : ''}`;
    div.innerHTML = `
      <div class="result-name">${f.label}</div>
      <div class="result-value">${formatNum(val)} <span class="result-unit">${f.unidad}</span></div>
    `;
    container.appendChild(div);
  }
}

// ─── Actualizar título ────────────────────────────────────────────────────────
function actualizarHeader(formula) {
  document.getElementById('formula-titulo').textContent = formula.titulo;
  const descEl = document.getElementById('formula-desc');
  if (descEl) descEl.textContent = formula.descripcion || '';
}

// ─── Cargar renderer dinámicamente ───────────────────────────────────────────
async function cargarRenderer(id) {
  // Cada renderer exporta window.Renderers[id]
  if (window.Renderers && window.Renderers[id]) return window.Renderers[id];
  
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `renderers/${id}.js`;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Renderer no encontrado: ${id}`));
    document.head.appendChild(script);
  });

  return window.Renderers?.[id] || null;
}

// ─── Loop principal ───────────────────────────────────────────────────────────
function tick() {
  if (!State.renderer) return;
  const resultados = evaluarFormulas(State.formula, State.valores);
  window._debug_r = resultados.r;
  window._debug_resultados = resultados;
  State.renderer.draw(State.valores, resultados, State.formula);
  State.animId = requestAnimationFrame(tick);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────
async function init() {
  const urlParams = getURLParams();
  const formulaId = urlParams.formula || 'campo_magnetico';

  try {
    // 1. Cargar fórmula
    State.formula = await cargarFormula(formulaId);

    // 2. Inicializar valores
    State.valores = inicializarValores(State.formula, urlParams);

    // 3. Header
    actualizarHeader(State.formula);

    // 4. Sliders
    generarSliders(State.formula, State.valores, () => {
      const res = evaluarFormulas(State.formula, State.valores);
      actualizarResultados(State.formula, res);
      if (window._actualizarCajaInfo) {
        window._mostrarFormulaSim && window._mostrarFormulaSim();
        window._actualizarCajaInfo(State.formula, res);
      }
      updateURL();
    });

    // 5. Resultados iniciales
    actualizarNota(State.formula);
    const res = evaluarFormulas(State.formula, State.valores);
    actualizarResultados(State.formula, res);

    // 6. Cargar renderer
    State.renderer = await cargarRenderer(State.formula.renderer);
    if (State.renderer) {
      State.renderer.init(
        document.getElementById('canvas-main'),
        document.getElementById('canvas-secondary')
      );
    }

    // 7. URL inicial
    updateURL();

    // 8. Arrancar loop
    tick();

    // 9. Poblar selector de fórmulas
    poblarSelector(formulaId);

    // 10. Inicializar caja info
    setTimeout(() => {
      const resInit = evaluarFormulas(State.formula, State.valores);
      if (window._actualizarCajaInfo) window._actualizarCajaInfo(State.formula, resInit);
    }, 0);

  } catch (e) {
    console.error('Error iniciando motor:', e);
    document.getElementById('formula-titulo').textContent = 'Error cargando fórmula';
  }
}

// ─── Selector de fórmulas disponibles ────────────────────────────────────────
const FORMULAS_DISPONIBLES = [
  { id: 'campo_magnetico',  label: 'Campo magnético' },
  { id: 'gravedad_newton',  label: 'Gravitación universal' },
  { id: 'optica_lente',     label: 'Óptica — Lente delgada' },
  { id: 'onda_armonica',    label: 'Onda armónica' },
  // añadir aquí nuevas fórmulas
];

function poblarSelector(activo) {
  const sel = document.getElementById('formula-selector');
  sel.innerHTML = '';
  for (const f of FORMULAS_DISPONIBLES) {
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = f.label;
    if (f.id === activo) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener('change', () => {
    if (State.animId) cancelAnimationFrame(State.animId);
    window.location.search = `?formula=${sel.value}`;
  });
}

document.addEventListener('DOMContentLoaded', init);
window._State = State;
