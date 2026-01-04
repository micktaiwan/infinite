# Analyse Architecturale - Infinite Canvas

Revue fonctionnelle du code - Janvier 2026

## Modele de Donnees

### Structure MongoDB

```text
Books (1) <---> (N) Layers <---> (N) Drawings
```

### Format de document actuel

Le format unifie separe les donnees brutes capturees (points) du style de rendu:

```javascript
{
  _id: ObjectId,
  bookId: "...",
  layerIndex: 0,
  order: 42,           // Sequence pour undo
  userId: "...",

  // Points bruts captures (meme format pour tous les brushes)
  points: [
    { x, y, p, t },    // position, pressure normalisee (0-1), timestamp relatif (ms)
    ...
  ],

  // Style de rendu (stocke une seule fois)
  style: {
    brush: "lines",    // ou "paper", "shaky"
    color: "#000",
    size: 2,           // taille de base
    scale: 1           // scale au moment du dessin
  },

  // Bounding box pre-calculee (pour viewport culling)
  bounds: { minX, minY, maxX, maxY }
}
```

### Points cles de cette architecture

1. **Separation donnees/style** - Les points bruts sont independants du rendu
   - Permet de changer le brush/couleur apres coup
   - Pas de duplication (style stocke une seule fois)

2. **Format unifie** - Tous les brushes utilisent le meme format de points
   - Le type de brush dans `style.brush` determine le rendu
   - Simplification Paper.js appliquee a la lecture (pas au stockage)

3. **Bounds pre-calcules** - Pour le viewport culling futur
   - Calcules a la sauvegarde via `computeBounds()`

4. **Pressure normalisee** - `p` stockee entre 0-1
   - Multipliee par `style.size * ratio` au rendu

### Pipeline de rendu

```
Stockage (points bruts)  -->  Lecture  -->  Rendu specifique au brush
     {x, y, p, t}                          - lines: segments droits
                                           - paper: simplify() + bezier
                                           - shaky: segments droits
```

Le brush `paper` utilise Paper.js pour simplifier les points en courbes bezier **a chaque rendu**, permettant d'adapter la tolerance au niveau de zoom.

---

## Optimisations futures possibles

### Rendu: Double Buffering + Cache

Actuellement, chaque `redraw()` efface et redessine tous les traits. Pour des dessins complexes:

```javascript
class OptimizedLayer {
  constructor() {
    this.displayCanvas = document.createElement('canvas');
    this.cacheCanvas = document.createElement('canvas');
    this.dirtyRegion = null;
  }

  addStroke(stroke) {
    const cacheCtx = this.cacheCanvas.getContext('2d');
    this.renderStroke(stroke, cacheCtx);
    this.compositeToDisplay();
  }

  onViewportChange() {
    this.rebuildCache();
  }
}
```

### Viewport Culling (implemente)

Filtrage cote client des drawings hors ecran dans `boardLayer.draw()`:

```javascript
const b = drawing.bounds;
if (b && (b.maxX < vMinX || b.minX > vMaxX || b.maxY < vMinY || b.minY > vMaxY)) return;
```

Gain: ~17ms sur 430 objets quand la majorite est hors ecran.

---

## Paper.js

### Utilisation actuelle

Paper.js est utilise uniquement pour la simplification des courbes dans le brush `paper`:

```javascript
// Au rendu (pas a la sauvegarde)
drawing(drawing, layer) {
  const path = new paper.Path({
    segments: points.map(p => new paper.Point(p.x, p.y)),
  });

  const tolerance = Math.max(0.1, 2.5 / layer.scale);
  this.simplifyPath(path, tolerance);

  // Rendu bezier avec les handles generes
  c.bezierCurveTo(prev.handleOut, curr.handleIn, curr.point);
}
```

### Avantages de simplifier au rendu
- Points bruts preserves en base (reversible)
- Tolerance adaptee au zoom (plus de details quand on zoome)
- Meme format de stockage que les autres brushes

### Alternative future: simplify-js
```javascript
import simplify from 'simplify-js';  // 2KB vs 250KB pour Paper.js
```

---

## Collaboration Temps Reel

### Actuel: Meteor DDP
```javascript
observeChanges({
  added: () => self.redraw(),
  changed: () => self.redraw(),
  removed: () => self.redraw()
});
```

### Amelioration future: CRDT
```javascript
import * as Y from 'yjs';
const strokes = ydoc.getArray('strokes');
```

---

## Resume

| Aspect | Implementation |
|--------|----------------|
| **Stockage** | Points bruts + style separe (pas de duplication) |
| **Format brush** | Format unifie pour tous les brushes |
| **Bounds** | Pre-calcules a la sauvegarde |
| **Viewport culling** | Filtrage cote client (gain ~17ms sur 430 objets) |
| **Paper.js** | Simplification au rendu (tolerance adaptative) |
| **Rendu** | Full redraw (cache canvas a implementer) |
| **Collab** | Meteor DDP (CRDT a considerer) |

---

## Fichiers cles de l'architecture

| Fichier | Role |
|---------|------|
| `imports/api/books/collections.js` | Definition des collections MongoDB |
| `imports/api/books/methods.js` | Methodes Meteor (CRUD) |
| `imports/api/books/publish.js` | Publications temps reel |
| `imports/classes/layers/layer.js` | Classe de base canvas |
| `imports/classes/layers/boardLayer.js` | Layer principal de dessin |
| `imports/classes/layers/layerManager.js` | Orchestrateur des layers |
| `imports/classes/brushes/lines.js` | Brush lignes simples |
| `imports/classes/brushes/paper.js` | Brush avec bezier (Paper.js) |
