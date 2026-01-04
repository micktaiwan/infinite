# How to Create a New Brush

This guide explains how to add a new brush to the Infinite canvas application.

## Architecture Overview

```
Brush (base class)
├── LinesBrush (default, pressure-sensitive lines)
│   ├── ShakyBrush (random perturbation effect)
│   ├── CalligraphyBrush (angle-dependent thickness)
│   └── NebulaBrush (rainbow glow + particles)
└── PaperBrush (Bezier curves, fixed width)
```

## Files to Modify

| File | Action |
|------|--------|
| `imports/classes/brushes/<name>.js` | **CREATE** - New brush class |
| `imports/classes/layers/layerManager.js` | **MODIFY** - Register brush |
| `client/book.html` | **MODIFY** - Add menu items |
| `client/book.js` | **MODIFY** - Add click/hover handlers |

## Step 1: Create Brush Class

Create `imports/classes/brushes/<name>.js`:

```js
import LinesBrush from './lines';

// Module-level helper functions (to satisfy ESLint class-methods-use-this)
function computeEffect(value) {
  return value * 2;
}

export default class MyBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'mybrush';      // Unique identifier (used in DB)
    this.name = 'My Brush';     // Display name
  }

  // Instance wrapper that uses this (required by ESLint)
  applyEffect(value) {
    return computeEffect(value + this.type.length);
  }

  // Called in real-time while drawing (for immediate visual feedback)
  draw(layer) {
    this.capturePoint(layer);
    const pts = this.capturedPoints;
    if (pts.length < 2) return;

    const p0 = pts[pts.length - 2];
    const p1 = pts[pts.length - 1];
    const { ctx, scale, offsetX, offsetY } = layer;
    const { maxSize } = this.options;

    // Convert to screen coordinates
    const x0 = (p0.x + offsetX) * scale;
    const y0 = (p0.y + offsetY) * scale;
    const x1 = (p1.x + offsetX) * scale;
    const y1 = (p1.y + offsetY) * scale;

    const { p: pressure, t: time } = p1;

    // Your drawing logic here
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = pressure * maxSize;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }

  // Called when rendering saved drawings (must be deterministic!)
  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const { ctx, scale, offsetX, offsetY } = layer;
    const ratio = scale / style.scale;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const x0 = (p0.x + offsetX) * scale;
      const y0 = (p0.y + offsetY) * scale;
      const x1 = (p1.x + offsetX) * scale;
      const y1 = (p1.y + offsetY) * scale;

      const pressure = Math.min(1000, Math.max(0.01, p1.p * style.size * ratio));

      // Use this.applyEffect() to satisfy ESLint
      const effect = this.applyEffect(pressure);

      // Your rendering logic (must match draw() output)
      ctx.strokeStyle = style.color;
      ctx.lineWidth = effect;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  }
}
```

## Step 2: Register in LayerManager

Edit `imports/classes/layers/layerManager.js`:

```js
// Add import at top
import MyBrush from '../brushes/mybrush';

// Add to this.brushes in constructor (~line 30)
this.brushes = {
  lines: new LinesBrush(),
  shaky: new ShakyBrush(),
  paper: new PaperBrush(),
  calligraphy: new CalligraphyBrush(),
  nebula: new NebulaBrush(),
  mybrush: new MyBrush(),  // <-- ADD
};

// Add case in brushForType() (~line 145)
case 'mybrush':
  return this.brushes.mybrush;
```

## Step 3: Add UI Menu Items

Edit `client/book.html` (after last brush entry, before `</ul>`):

```html
<li class="sep"></li>
<li class="js-mybrush-1 {{activeBrushClass 'mybrush' 5}}"><i class="fas fa-fire"></i> MyBrush 5</li>
<li class="js-mybrush-2 {{activeBrushClass 'mybrush' 15}}"><i class="fas fa-fire"></i> MyBrush 15</li>
<li class="js-mybrush-3 {{activeBrushClass 'mybrush' 30}}"><i class="fas fa-fire"></i> MyBrush 30</li>
```

## Step 4: Add Event Handlers

Edit `client/book.js`:

### Click handlers (after other brush handlers):

```js
'click .js-mybrush-1'(e, tpl) {
  const sel = tpl.manager.selectionLayer;
  if (sel?.hasSelection()) sel.applyStyle({ brush: 'mybrush', brushSize: 5 });
  tpl.manager.setBrush(tpl.manager.brushes.mybrush, { maxSize: 5 });
  Session.set('activeBrush', 'mybrush');
  Session.set('activeBrushSize', 5);
},
'click .js-mybrush-2'(e, tpl) {
  const sel = tpl.manager.selectionLayer;
  if (sel?.hasSelection()) sel.applyStyle({ brush: 'mybrush', brushSize: 15 });
  tpl.manager.setBrush(tpl.manager.brushes.mybrush, { maxSize: 15 });
  Session.set('activeBrush', 'mybrush');
  Session.set('activeBrushSize', 15);
},
'click .js-mybrush-3'(e, tpl) {
  const sel = tpl.manager.selectionLayer;
  if (sel?.hasSelection()) sel.applyStyle({ brush: 'mybrush', brushSize: 30 });
  tpl.manager.setBrush(tpl.manager.brushes.mybrush, { maxSize: 30 });
  Session.set('activeBrush', 'mybrush');
  Session.set('activeBrushSize', 30);
},
```

### Hover handlers (for selection preview):

```js
'mouseenter .js-mybrush-1, mouseenter .js-mybrush-2, mouseenter .js-mybrush-3'(e, tpl) {
  const sel = tpl.manager.selectionLayer;
  if (!sel?.hasSelection()) return;

  const classList = e.currentTarget.className;
  let brushSize;
  if (classList.includes('js-mybrush-1')) brushSize = 5;
  else if (classList.includes('js-mybrush-2')) brushSize = 15;
  else if (classList.includes('js-mybrush-3')) brushSize = 30;

  sel.previewStyle({ brush: 'mybrush', brushSize });
},
```

## Available Data in draw()

| Property | Description |
|----------|-------------|
| `layer.ctx` | Canvas 2D context |
| `layer.scale` | Current zoom level |
| `layer.offsetX/Y` | Pan offset |
| `layer.cursorX/Y` | Current cursor screen position |
| `layer.prevCursorX/Y` | Previous cursor screen position |
| `layer.trueX/Y` | World coordinates |
| `layer.pressure` | Pen pressure (0-1) × maxSize |
| `layer.color` | Current color |
| `this.options.maxSize` | Brush size setting |
| `this.capturedPoints` | Array of captured points |

## Point Data Structure

```js
{
  x: number,    // World X coordinate
  y: number,    // World Y coordinate
  p: number,    // Normalized pressure (0-1)
  t: number     // Time offset from stroke start (ms)
}
```

## Tips for Creative Effects

### Rainbow colors (time-based):
```js
const hue = ((time * 0.15) + offset) % 360;
ctx.strokeStyle = `hsla(${hue}, 85%, 55%, 0.5)`;
```

### Multi-layer glow:
```js
for (let i = 0; i < 5; i++) {
  ctx.globalAlpha = 0.3 - (i * 0.05);
  ctx.lineWidth = pressure * (1 + i * 0.3);
  // draw...
}
```

### Particles:
```js
if (Math.random() < pressure * 0.3) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}
```

### Deterministic random (for drawing() replay):
```js
function seededRandom(seed) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}
// Use point timestamps as seeds: seededRandom(p0.t + p1.t)
```

### Wave/oscillation effects:
```js
const wave = Math.sin(time * 0.01 + i) * amplitude;
```

## FontAwesome Icons

Common icons for brushes:
- `fa-paint-brush` - Standard brush
- `fa-pen` - Pen/stylus
- `fa-pen-nib` - Calligraphy
- `fa-star` - Special effects
- `fa-fire` - Fire/energy
- `fa-snowflake` - Ice/crystal
- `fa-bolt` - Electric
- `fa-cloud` - Smoke/cloud
