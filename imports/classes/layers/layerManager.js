/* eslint-disable import/no-import-module-exports */
// const Layer = require('./layer');
import LinesBrush from '../brushes/lines';
import ShakyBrush from '../brushes/shaky';
import PaperBrush from '../brushes/paper';
import SelectionLayer from './selectionLayer';
import BoardLayer from './boardLayer';
import { Layers } from '../../api/books/collections';

// const imageTracer = require('./lib/imagetracer');

// if (module.hot) {
//   module.hot.decline();
// }
export default class LayerManager {
  constructor(bookId) {
    this.bookId = bookId;
    this.cursorX = 0;
    this.cursorY = 0;
    this.trueX = 0;
    this.trueY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;
    this.leftMouseDown = false;
    this.rightMouseDown = false;

    this.layers = [];
    this.brushes = {
      lines: new LinesBrush(),
      shaky: new ShakyBrush(),
      paper: new PaperBrush(),
    };
    this.brush = this.brushes.lines;

    Tracker.autorun(() => {
      this.userId = Meteor.userId();
      if (this.userId) {
        this.brush.saveDrawings();
        this.loadPrefs();
      }
    });

    this.selectionLayer = new SelectionLayer(this);
    this.currentLayer = 0;

    // disable right clicking
    document.oncontextmenu = () => false;

    this.initializing = true;
    const self = this;
    this.observeHandle = Layers.find({ bookId: this.bookId }).observeChanges({
      added: (_id, fields) => {
        self.dimOpacityForAllLayers();
        self.layers.push(new BoardLayer(self, _id, fields));
        if (!self.initializing) self.focus(fields.index);
      },
      removed: _id => {
        const layer = self.findLayer(_id);
        layer.destroy();
        self.layers.splice(layer.index, 1);
        if (self.currentLayer >= layer.index) self.focus(self.layers.length - 1);
        self.redraw();
      },
    });
    this.initializing = false;

    window.addEventListener('resize', () => this.redraw());
  }

  delegate(method, drawing, ...args) {
    if (drawing.type === 'lines') return this.brushes.lines[method](drawing, ...args);
    else if (drawing.type === 'shaky') return this.brushes.shaky[method](drawing, ...args);
    else if (drawing.type === 'paper') return this.brushes.paper[method](drawing, ...args);
    else console.error(`LayerManager.delegate: Unknown drawing type ${drawing.type}`);
    return undefined;
  }

  setBrush(brush, options) {
    this.brush = brush;
    this.brush.setOptions(options);
    this.savePrefs();
  }

  savePrefs() {
    if (!this.userId) return;
    const prefs = {
      brush: this.brush.type,
      brushOptions: this.brush.options,
    };
    Meteor.call('savePrefs', prefs);
  }

  loadPrefs() {
    Tracker.autorun(() => { // why is this needed ???
      const user = Meteor.user();
      if (!user) return;
      const { prefs } = user.profile;
      if (prefs) {
        this.setBrush(this.brushForType(prefs.brush), prefs.brushOptions);
      }
    });
  }

  brushForType(type) {
    switch (type) {
      case 'lines':
        return this.brushes.lines;
      case 'shaky':
        return this.brushes.shaky;
      case 'paper':
        return this.brushes.paper;
      default:
        console.error(`Unknown brush type: ${type}`);
        return undefined;
    }
  }

  toggleLayer() {
    this.layers[this.currentLayer].hidden = !this.layers[this.currentLayer].hidden;
    Meteor.call('toggleLayer', this.layers[this.currentLayer]._id, this.layers[this.currentLayer].hidden);
    this.redraw();
  }

  removeLayer() {
    const index = this.layers.length - 1;
    this.layers[index].remove(); // will trigger observeChanges
    if (this.currentLayer >= index) return this.layers.length - 1;
    else return this.currentLayer;
  }

  destroy() {
    this.destroyed = true;
    console.log('LayerManager: destroy');
    this.observeHandle.stop();
    this.layers.forEach(layer => {
      layer.destroy();
    });
    this.layers = [];
    this.selectionLayer.destroy();
    this.selectionLayer = null;
  }

  findLayer(id) {
    return this.layers.find(layer => layer._id === id);
  }

  focusCurrentLayerCanvas() {
    this.layers[this.currentLayer].focusCanvas();
  }

  dimOpacityForAllLayers() {
    this.layers.forEach(layer => {
      layer.canvas.style.opacity = 0.4;
      layer.canvas.style.zIndex = 1;
    });
  }

  focus(index) {
    if (index < 0) return;
    this.currentLayer = index;
    this.dimOpacityForAllLayers();
    this.layers[index].canvas.style.opacity = 1;
    this.layers[index].canvas.style.zIndex = 100;
    this.focusCurrentLayerCanvas();
  }

  focusSelectionLayer() {
    this.layers[this.currentLayer].canvas.style.zIndex = this.currentLayer;
    this.selectionLayer.canvas.style.zIndex = 100;
    this.selectionLayer.focusCanvas();
  }

  unfocusSelectionLayer() {
    this.selectionLayer.canvas.style.zIndex = 0;
    this.focus(this.currentLayer);
  }

  getLayers() {
    return this.layers.map(l => l.index);
  }

  addLayer() {
    Meteor.call('addLayer', this.bookId, this.layers.length);
  }

  getActiveLayer() {
    return this.currentLayer;
  }

  redraw() {
    if (this.destroyed) return;
    this.selectionLayer.redraw();
    this.layers.forEach(layer => {
      layer.redraw();
    });
  }
}
