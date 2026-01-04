# Analyse Architecturale - Infinite Canvas

Revue fonctionnelle du code - Janvier 2025

## Question: "L'aurais-je fait comme ca ?"

### Reponse courte: **Non, pas exactement.**

L'architecture actuelle est fonctionnelle et bien pensee pour un prototype, mais presente des choix qui limitent la scalabilite et la performance.

---

## 1. Modele de Donnees Actuel

### Structure MongoDB

```text
Books (1) <---> (N) Layers <---> (N) Drawings
```

**Drawings Collection (nommee 'lines'):**
```javascript
{
  _id: ObjectId,
  bookId: "...",
  layerIndex: 0,
  order: 42,           // Sequence pour undo
  userId: "...",
  type: "lines",       // ou "paper", "shaky"
  color: "#000",
  pressure: 2,
  scale: 1,
  lines: [             // Geometrie - VARIE selon le type
    { x0, y0, x1, y1, scale, pressure, color },  // lines/shaky
    // OU
    { point: {x,y}, in: {x,y}, out: {x,y} }      // paper (bezier)
  ]
}
```

### Ce qui fonctionne bien
- **Document-oriented** - correspond au modele MongoDB
- **Champ `order`** - permet l'undo par sequence
- **`positions[userId]`** - etat de vue par utilisateur (zoom, pan)
- **Type extensible** - facile d'ajouter des brushes

### Problemes architecturaux

1. **Duplication massive de donnees**
   - `scale`, `pressure`, `color` repetes sur CHAQUE segment
   - 1000 segments = 1000 copies de la meme valeur scale

2. **Format de ligne incoherent**
   - `lines` brush: `{x0, y0, x1, y1}`
   - `paper` brush: `{point, in, out}`
   - Le code doit router vers differentes methodes

3. **Pas de chunking intelligent**
   - Un trait long = un gros document
   - MongoDB limite a 16MB par document

---

## 2. Modele Optimise Propose

### Option A: Separation Header/Geometry

```javascript
// Collection: Strokes (header)
{
  _id: ObjectId,
  bookId: "...",
  layerIndex: 0,
  order: 42,
  userId: "...",
  type: "path",        // Type unifie
  color: "#000",
  pressure: 2,
  scale: 1,
  bounds: { minX, minY, maxX, maxY },  // Pour culling
  pointCount: 150
}

// Collection: StrokeGeometry (donnees)
{
  strokeId: ObjectId,  // Reference
  points: Float32Array // Binaire compact
}
```

**Avantages:**
- Headers legers pour les requetes
- Geometrie chargee a la demande
- Bounds pour le viewport culling

### Option B: Format unifie avec compression

```javascript
{
  _id: ObjectId,
  bookId: "...",
  type: "stroke",
  // Metadonnees une seule fois
  color: "#000",
  baseWidth: 2,

  // Points en format compact
  // [x, y, pressure] repete, delta-encoded
  points: "base64_encoded_binary",

  // Ou format simplifie pour lignes droites
  segments: [[x0,y0,x1,y1], ...]
}
```

---

## 3. Architecture de Rendu Actuelle

### Flow actuel
```
redraw()
  -> requestAnimationFrame()
  -> ctx.clearRect(0, 0, width, height)  // CLEAR TOUT
  -> Drawings.find({bookId, layerIndex}).forEach(drawing =>
      manager.delegate('drawing', drawing, layer)  // Redessine TOUT
    )
```

### Probleme majeur: **Full Redraw**
- Chaque `redraw()` efface et redessine TOUS les traits
- Avec 500 traits de 100 segments = 50,000 operations canvas
- Pas de dirty rectangles, pas de cache

### Alternative: Double Buffering + Cache

```javascript
class OptimizedLayer {
  constructor() {
    this.displayCanvas = document.createElement('canvas');
    this.cacheCanvas = document.createElement('canvas');   // Cache static
    this.dirtyRegion = null;
  }

  // Seul le nouveau trait est dessine
  addStroke(stroke) {
    const cacheCtx = this.cacheCanvas.getContext('2d');
    this.renderStroke(stroke, cacheCtx);
    this.compositeToDisplay();
  }

  // Full redraw seulement si pan/zoom
  onViewportChange() {
    this.rebuildCache();
  }

  // Composition rapide
  compositeToDisplay() {
    const ctx = this.displayCanvas.getContext('2d');
    ctx.drawImage(this.cacheCanvas, 0, 0);
  }
}
```

---

## 4. Probleme Paper.js

### Utilisation actuelle
```javascript
// paper.js brush
constructor() {
  paper.setup();  // Initialise Paper.js
}

draw(layer) {
  this.path.add(new paper.Point(x, y));
  // MAIS: utilise canvas directement pour afficher!
  layer.drawLine(prevX, prevY, x, y, ...);
}

saveDrawings() {
  this.path.simplify();  // Seule utilite reelle de Paper.js
  // Convertit en JSON et sauvegarde
}
```

### Le probleme
- Paper.js est inclus (250KB) juste pour `path.simplify()`
- Le rendu n'utilise PAS Paper.js
- Overhead de memoire pour chaque PaperBrush

### Alternative: Algorithme de simplification standalone
```javascript
import simplify from 'simplify-js';  // 2KB

// Ou implementer Ramer-Douglas-Peucker
function simplifyPath(points, tolerance) {
  // ~50 lignes de code
}
```

---

## 5. Collaboration Temps Reel

### Actuel: Naive Broadcast
```javascript
// Chaque modification -> redraw complet chez tous
observeChanges({
  added: () => self.redraw(),
  changed: () => self.redraw(),
  removed: () => self.redraw()
});
```

### Probleme
- Pas d'Operational Transform
- Pas de CRDT
- Conflits possibles sur undo concurrent

### Solution ideale: CRDT ou OT

```javascript
// Avec Yjs (CRDT)
import * as Y from 'yjs';

const ydoc = new Y.Doc();
const strokes = ydoc.getArray('strokes');

strokes.observe(event => {
  event.changes.delta.forEach(change => {
    if (change.insert) renderNewStroke(change.insert);
    if (change.delete) removeStroke(change.delete);
  });
});
```

---

## 6. Resume: Ce que je changerais

| Aspect | Actuel | Recommande |
|--------|--------|------------|
| **Stockage lignes** | Array de segments avec duplication | Header separe + geometry binaire |
| **Format brush** | 3 formats differents | Format unifie "stroke" |
| **Rendu** | Full redraw a chaque frame | Cache canvas + dirty rectangles |
| **Paper.js** | 250KB pour simplify() | Algorithme standalone (2KB) |
| **Collab** | Naive observeChanges | CRDT (Yjs) ou OT |
| **Undo** | Par ordre global | Par utilisateur + merge |
| **Performance** | O(n) tous les segments | Viewport culling + LOD |

---

## 7. Est-ce que l'architecture actuelle est "mauvaise" ?

**Non.** Elle est adaptee pour:
- Prototype / MVP
- Usage single-user
- < 1000 segments par layer
- Developpement rapide avec Meteor

Elle devient problematique pour:
- Collaboration intensive multi-utilisateurs
- Dessins complexes (> 10,000 segments)
- Mobile / low-end devices
- Offline-first

L'architecture reflete des choix pragmatiques de MVP. Les optimisations ci-dessus seraient du "premature optimization" sans metriques reelles de performance.

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
