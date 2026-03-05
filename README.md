# Física Interactiva — BACH

Visualizador interactivo de fenómenos físicos para Bachillerato.  
Motor genérico alimentado por YAML. Sin backend. GitHub Pages.

## Estructura

```
/
├── index.html              ← shell principal
├── motor.js                ← motor genérico (parsea YAML, genera UI, gestiona URL)
├── formulas/
│   ├── campo_magnetico.yaml
│   ├── gravedad_newton.yaml
│   └── [nueva_formula].yaml
└── renderers/
    ├── campo_magnetico.js
    ├── gravedad_newton.js
    └── [nueva_formula].js
```

## Cómo funciona

1. El YAML define la física: variables, rangos, constantes, fórmulas
2. El motor genera los sliders automáticamente
3. El renderer dibuja la visualización
4. La URL refleja el estado actual → se puede compartir

## Compartir un ejercicio concreto

Mueve los sliders a los valores del enunciado y pulsa **⎘ copiar enlace**.  
La URL generada carga la herramienta con esos valores precargados.

Ejemplo:
```
https://[usuario].github.io/fisica-interactiva/?formula=campo_magnetico&B=0.5&v=2&theta=60
```

## Añadir una nueva fórmula

### 1. Crear el YAML en `/formulas/`

```yaml
id: mi_formula
titulo: Nombre del fenómeno
renderer: mi_formula
descripcion: Descripción breve para el alumno.

variables:
  x:
    label: Variable X
    unidad: m
    min: 0
    max: 10
    step: 0.1
    default: 5

constantes:
  k:
    label: Constante
    valor: 9e9
    unidad: N·m²/C²

formulas:
  - id: resultado
    label: Nombre del resultado
    expr: "k * x * x"   # expresión JS válida, usar · para multiplicar
    unidad: J
    destacado: true
```

### 2. Crear el renderer en `/renderers/mi_formula.js`

```javascript
window.Renderers = window.Renderers || {};

window.Renderers.mi_formula = (() => {
  let c1, c2, ctx1, ctx2;

  function init(canvas1, canvas2) {
    c1 = canvas1; c2 = canvas2;
    ctx1 = c1.getContext('2d');
    ctx2 = c2.getContext('2d');
  }

  function draw(valores, resultados, formula) {
    // valores: { x: 5, ... }  (valor del slider, sin escala)
    // resultados: { resultado: 225000000000, ... }
    // Dibujar en ctx1 (vista principal) y ctx2 (vista secundaria)
  }

  return { init, draw };
})();
```

### 3. Registrar en motor.js

En `FORMULAS_DISPONIBLES`:
```javascript
{ id: 'mi_formula', label: 'Nombre en el selector' },
```

## Versionado del temario

Usa tags de git para versiones por año:
```
git tag BACH.2.26
git tag BACH.1.26
```

## Deploy en GitHub Pages

1. Fork o crea el repo
2. Settings → Pages → Branch: main, carpeta: / (root)
3. Listo. La URL será `https://[usuario].github.io/[repo]/`

No necesita build, no necesita servidor, funciona con ficheros estáticos.
