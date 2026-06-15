/**
 * motor.js
 * Arkinesis Ã¢â‚¬â€ fisica y tecnologia interactiva
 */

const State = {
  formula:  null,
  valores:  {},
  renderer: null,
  animId:   null,
};

function normalizarFormulaConfig(raw) {
  const formula = { ...raw };
  formula.titulo           = formula.titulo || formula.title || formula.id;
  formula.descripcion      = formula.descripcion || formula.description || '';
  formula.descripcion_corta= formula.descripcion_corta || formula.description_short || '';
  formula.formula_simbolica= formula.formula_simbolica || formula.symbolic_formula || '';
  formula.formula_resuelta = formula.formula_resuelta || formula.resolved_formula || '';
  formula.ax0_facts        = formula.ax0_facts || formula.ax0Facts || [];
  formula.insights         = formula.insights || [];
  formula.connections      = formula.connections || [];

  const normalizedVariables = {};
  for (const [key, config] of Object.entries(formula.variables || {})) {
    const tipo = config.type || config.tipo || (config.options || config.opciones ? 'select' : 'range');
    normalizedVariables[key] = {
      ...config,
      tipo,
      unidad:  config.unidad || config.unit || '',
      opciones: config.opciones || config.options || null,
    };
  }
  formula.variables = normalizedVariables;

  const rawConstantes = formula.constantes || formula.constants || {};
  const normalizedConstantes = {};
  for (const [key, c] of Object.entries(rawConstantes)) {
    normalizedConstantes[key] = {
      ...c,
      valor: c.valor !== undefined ? c.valor : c.value,
      unidad: c.unidad || c.unit || '',
    };
  }
  formula.constantes = normalizedConstantes;

  let rawFormulas = formula.formulas || [];
  if (!Array.isArray(rawFormulas)) {
    rawFormulas = Object.entries(rawFormulas).map(([id, item]) => ({ id, ...item }));
  }
  formula.formulas = rawFormulas.map((item) => ({
    ...item,
    expr:      item.expr || item.expression || '',
    unidad:    item.unidad || item.unit || '',
    destacado: item.destacado ?? item.highlighted ?? false,
  }));

  return formula;
}

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

async function cargarFormula(id) {
  const res = await fetch(`formulas/${id}.yaml`);
  if (!res.ok) throw new Error(`No se encontro la formula: ${id}`);
  const text = await res.text();
  return normalizarFormulaConfig(jsyaml.load(text));
}

function inicializarValores(formula, urlParams) {
  const valores = {};
  for (const [key, config] of Object.entries(formula.variables)) {
    const fromURL = urlParams[key];
    if (config.tipo === 'select') {
      const defaultVal = config.default || config.opciones?.[0]?.id || '';
      valores[key] = fromURL !== undefined ? fromURL : defaultVal;
    } else {
      valores[key] = fromURL !== undefined ? parseFloat(fromURL) : config.default;
    }
  }
  return valores;
}

function evaluarFormulas(formula, valores) {
  const scope = {
    PI: Math.PI, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow,
  };
  for (const [key, c] of Object.entries(formula.constantes || {})) {
    scope[key] = c.valor;
  }
  for (const [key, config] of Object.entries(formula.variables)) {
    scope[key] = config.tipo === 'select'
      ? valores[key]
      : valores[key] * (config.escala || config.scale || 1);
  }
  const resultados = {};
  for (const f of formula.formulas) {
    try {
      const expr = String(f.expr).replace(/Ã‚Â·/g, '*').trim();
      const fn   = new Function(...Object.keys(scope), 'return (' + expr + ');');
      const res  = fn(...Object.values(scope));
      if (isFinite(res)) { resultados[f.id] = res; scope[f.id] = res; }
      else               { resultados[f.id] = null; }
    } catch (e) {
      resultados[f.id] = null;
      console.warn('[arkinesis] Error evaluando ' + f.id + ': ' + e.message);
    }
  }
  return resultados;
}

function formatNum(n) {
  if (n === null || isNaN(n)) return '\u2014';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  const exp = Math.floor(Math.log10(abs));
  if (Math.abs(exp) >= 3) {
    const m   = (n / Math.pow(10, exp)).toFixed(2);
    const sup = String(exp).split('').map(c => '\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079\u207b'['\u00b00123456789-'.indexOf(c)] || c).join('');
    return `${m} \u00d7 10${sup}`;
  }
  return n.toPrecision(3);
}

function generarSliders(formula, valores, onCambio) {
  const container = document.getElementById('sliders-container');
  container.innerHTML = '';
  for (const [key, config] of Object.entries(formula.variables)) {
    const row = document.createElement('div');
    row.className = 'slider-row';
    if (config.tipo === 'select') {
      const optionsHTML = (config.opciones || []).map(op =>
        `<option value="${op.id}" ${op.id === valores[key] ? 'selected' : ''}>${op.label}</option>`
      ).join('');
      row.innerHTML = `
        <div class="slider-header"><span class="slider-name">${config.label}</span></div>
        <select id="sl-${key}" class="select-control">${optionsHTML}</select>
      `;
      container.appendChild(row);
      row.querySelector('select').addEventListener('change', (e) => {
        valores[key] = e.target.value; onCambio();
      });
    } else {
      row.innerHTML = `
        <div class="slider-header">
          <span class="slider-name">${config.label}</span>
          <span class="slider-val" id="val-${key}">${valores[key]} ${config.unidad}</span>
        </div>
        <input type="range" id="sl-${key}"
          min="${config.min}" max="${config.max}" step="${config.step}" value="${valores[key]}">
      `;
      container.appendChild(row);
      row.querySelector('input').addEventListener('input', (e) => {
        valores[key] = parseFloat(e.target.value);
        document.getElementById(`val-${key}`).textContent = `${e.target.value} ${config.unidad}`;
        onCambio();
      });
    }
  }
}

function evaluarCondicion(condicion, scope) {
  try {
    const fn = new Function(...Object.keys(scope), 'return (' + condicion + ');');
    return Boolean(fn(...Object.values(scope)));
  } catch (e) {
    console.warn('[arkinesis] Error evaluando condicion: "' + condicion + '" -> ' + e.message);
    return false;
  }
}

function buildScope(formula, resultados) {
  const scope = {
    PI: Math.PI, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sqrt: Math.sqrt, abs: Math.abs, pow: Math.pow,
    ...State.valores, ...resultados,
  };
  for (const [key, c] of Object.entries(formula.constantes || {})) {
    scope[key] = c.valor;
  }
  return scope;
}

function actualizarInsights(formula, resultados) {
  const container = document.getElementById('nota-container');
  if (!container) return;
  const scope  = buildScope(formula, resultados);
  const bloques = [];
  if (formula.nota) bloques.push('<div class="nota-info">' + formula.nota + '</div>');
  for (const insight of formula.insights || []) {
    if (insight.when && insight.text && evaluarCondicion(insight.when, scope)) {
      bloques.push('<div class="nota-info">' + insight.text + '</div>');
    }
  }
  container.innerHTML = bloques.join('');
  const section = document.getElementById('insights-section');
  if (section) section.style.display = bloques.length > 0 ? 'block' : 'none';
}

function evaluarConnections(formula, resultados) {
  if (!formula.connections || !formula.connections.length) return [];
  const scope = buildScope(formula, resultados);
  return formula.connections
    .filter(c => c.when && c.text && evaluarCondicion(c.when, scope))
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 3)
    .map(c => c.text.trim());
}

function actualizarAX0(formula, resultados) {
  if (window._actualizarAX0) {
    const connections = evaluarConnections(formula, resultados);
    window._actualizarAX0(connections);
  }
}

function actualizarResultados(formula, resultados) {
  const container = document.getElementById('resultados-container');
  if (!container) return;
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

function actualizarHeader(formula) {
  document.getElementById('formula-titulo').textContent = formula.titulo;
  const descEl = document.getElementById('formula-desc');
  if (descEl) descEl.textContent = formula.descripcion || '';
}

async function cargarRenderer(id) {
  if (window.Renderers && window.Renderers[id]) return window.Renderers[id];
  await new Promise((resolve, reject) => {
    const script   = document.createElement('script');
    script.src     = `renderers/${id}.js`;
    script.onload  = resolve;
    script.onerror = () => reject(new Error(`Renderer no encontrado: ${id}`));
    document.head.appendChild(script);
  });
  return window.Renderers?.[id] || null;
}

function tick() {
  if (!State.renderer) return;
  const resultados = evaluarFormulas(State.formula, State.valores);
  window._debug_resultados = resultados;
  State.renderer.draw(State.valores, resultados, State.formula);
  State.animId = requestAnimationFrame(tick);
}

function onCambio() {
  const res = evaluarFormulas(State.formula, State.valores);
  actualizarInsights(State.formula, res);
  actualizarResultados(State.formula, res);
  actualizarAX0(State.formula, res);
  if (window._actualizarCajaInfo) {
    window._mostrarFormulaSim && window._mostrarFormulaSim();
    window._actualizarCajaInfo(State.formula, res);
  }
  updateURL();
}
window._onCambio = onCambio;

async function init() {
  const urlParams = getURLParams();
  const formulaId = urlParams.formula || 'campo_magnetico';
  try {
    State.formula = await cargarFormula(formulaId);
    State.valores = inicializarValores(State.formula, urlParams);
    actualizarHeader(State.formula);
    if (window._cargarAX0Fact) window._cargarAX0Fact();
    generarSliders(State.formula, State.valores, onCambio);
    const res = evaluarFormulas(State.formula, State.valores);
    actualizarInsights(State.formula, res);
    actualizarResultados(State.formula, res);
    actualizarAX0(State.formula, res);
    State.renderer = await cargarRenderer(State.formula.renderer);
    if (State.renderer) {
      State.renderer.init(
        document.getElementById('canvas-main'),
        document.getElementById('canvas-secondary')
      );
    }
    updateURL();
    tick();
    poblarSelector(formulaId);
    setTimeout(() => {
      const resInit = evaluarFormulas(State.formula, State.valores);
      if (window._actualizarCajaInfo) window._actualizarCajaInfo(State.formula, resInit);
    }, 0);
  } catch (e) {
    console.error('Error iniciando motor:', e);
    document.getElementById('formula-titulo').textContent = 'Error cargando formula';
  }
}

const FORMULAS_DISPONIBLES = [
  { id: 'campo_magnetico',    label: 'Electromag. \u2014 Campo magn\u00e9tico' },
  { id: 'efecto_doppler',     label: 'Ondas \u2014 Efecto Doppler' },
  { id: 'gravedad_newton',    label: 'Gravitaci\u00f3n \u2014 Ley de Newton' },
  { id: 'induccion_magnetica',label: 'Electromag. \u2014 Inducci\u00f3n magn\u00e9tica' },
  { id: 'onda_armonica',      label: 'Ondas \u2014 Onda arm\u00f3nica' },
  { id: 'optica_espejo',      label: '\u00d3ptica \u2014 Espejo esf\u00e9rico' },
  { id: 'optica_lente',       label: '\u00d3ptica \u2014 Lente delgada' },
  { id: 'palancas',           label: 'Tecnolog\u00eda \u2014 Palancas' },
  { id: 'poleas',             label: 'Tecnolog\u00eda \u2014 Poleas' },
  { id: 'engranajes',         label: 'Tecnolog\u00eda \u2014 Engranajes' },
  { id: 'correas',            label: 'Tecnolog\u00eda \u2014 Correas' },
  { id: 'triangulacion',      label: 'Tecnolog\u00eda \u2014 Triangulaci\u00f3n' },
  { id: 'flujo_electrico',    label: 'Electromag. \u2014 Flujo el\u00e9ctrico' },
  { id: 'conductores_aislantes', label: 'Electromag. \u2014 Conductores y aislantes' },
  { id: 'circuito_basico',    label: 'Electromag. \u2014 Circuito basico' },
];

function poblarSelector(activo) {
  const sel = document.getElementById('formula-selector');
  sel.innerHTML = '';
  for (const f of FORMULAS_DISPONIBLES) {
    const opt = document.createElement('option');
    opt.value   = f.id;
    opt.innerHTML = f.label;
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

function exportState() {
  if (!State.formula) return null;
  const formula    = State.formula;
  const valores    = State.valores;
  const resultados = evaluarFormulas(formula, valores);
  const inputs = {};
  for (const [key, config] of Object.entries(formula.variables)) {
    inputs[key] = { label: config.label, value: valores[key], unit: config.unidad || '' };
  }
  const outputs = {};
  for (const f of formula.formulas) {
    const val = resultados[f.id];
    if (val !== null && val !== undefined) {
      outputs[f.id] = { label: f.label, value: val, unit: f.unidad || '' };
    }
  }
  const scope = buildScope(formula, resultados);
  const activeInsights = (formula.insights || [])
    .filter(i => i.when && i.text && evaluarCondicion(i.when, scope))
    .map(i => i.text.trim());
  const activeConnections = evaluarConnections(formula, resultados);
  const physicsIds = ['campo_magnetico','efecto_doppler','gravedad_newton','induccion_magnetica','onda_armonica'];
  return {
    module:     formula.id.startsWith('optica') || physicsIds.includes(formula.id) ? 'physics' : 'technology',
    simulation: formula.titulo || formula.id,
    inputs,
    outputs,
    activeInsights,
    activeConnections,
  };
}

window.exportState = exportState;



