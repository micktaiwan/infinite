/* eslint-disable import/no-import-module-exports */
// const Layer = require('./layer');
import LinesBrush from '../brushes/lines';
import ShakyBrush from '../brushes/shaky';
import PaperBrush from '../brushes/paper';
import CalligraphyBrush from '../brushes/calligraphy';
import NebulaBrush from '../brushes/nebula';
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
      calligraphy: new CalligraphyBrush(),
      nebula: new NebulaBrush(),
    };
    this.brush = this.brushes.lines;
    this.color = '#000000';

    // Store autorun handles for cleanup
    this._autorunHandles = [];
    this._prefsAutorunHandle = null;

    this._autorunHandles.push(Tracker.autorun(() => {
      this.userId = Meteor.userId();
      if (this.userId) {
        this.brush.saveDrawings();
        this.loadPrefs();
      }
    }));

    this.selectionLayer = new SelectionLayer(this);
    this.currentLayer = 0;

    // disable right clicking
    this._originalContextMenu = document.oncontextmenu;
    document.oncontextmenu = () => false;

    this.initializing = true;
    const self = this;
    this.observeHandle = Layers.find({ bookId: this.bookId }).observeChanges({
      added: (_id, fields) => {
        self.dimOpacityForAllLayers();
        const layer = new BoardLayer(self, _id, fields);
        layer.color = self.color;
        self.layers.push(layer);
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

    // Store resize handler for cleanup
    this._resizeHandler = () => this.redraw();
    window.addEventListener('resize', this._resizeHandler);
  }

  delegate(method, drawing, ...args) {
    const brushType = drawing.style?.brush;
    const brush = this.brushes[brushType];
    if (!brush) {
      console.error(`LayerManager.delegate: Unknown brush type ${brushType}`);
      return undefined;
    }
    return brush[method](drawing, ...args);
  }

  setBrush(brush, options) {
    this.brush = brush;
    this.brush.setOptions(options);
    this.savePrefs();
  }

  setColor(color) {
    this.color = color;
    this.layers.forEach(layer => {
      layer.color = color;
    });
    this.savePrefs();
  }

  savePrefs() {
    if (!this.userId) return;
    const prefs = {
      brush: this.brush.type,
      brushOptions: this.brush.options,
      color: this.color,
    };
    Meteor.callAsync('savePrefs', prefs);
  }

  loadPrefs() {
    // Stop any previous prefs autorun to prevent accumulation
    if (this._prefsAutorunHandle) {
      this._prefsAutorunHandle.stop();
    }
    this._prefsAutorunHandle = Tracker.autorun(() => {
      const user = Meteor.user();
      if (!user?.profile?.prefs) return;
      const { prefs } = user.profile;
      const brush = this.brushForType(prefs.brush);
      if (brush) this.setBrush(brush, prefs.brushOptions);
      if (prefs.color) {
        this.setColor(prefs.color);
        Session.set('activeColor', prefs.color);
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
      case 'calligraphy':
        return this.brushes.calligraphy;
      case 'nebula':
        return this.brushes.nebula;
      default:
        console.error(`Unknown brush type: ${type}`);
        return undefined;
    }
  }

  toggleLayer() {
    this.layers[this.currentLayer].hidden = !this.layers[this.currentLayer].hidden;
    Meteor.callAsync('toggleLayer', this.layers[this.currentLayer]._id, this.layers[this.currentLayer].hidden);
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

    // Stop all autoruns
    this._autorunHandles.forEach(handle => handle.stop());
    this._autorunHandles = [];
    if (this._prefsAutorunHandle) {
      this._prefsAutorunHandle.stop();
      this._prefsAutorunHandle = null;
    }

    // Stop observe handle
    this.observeHandle.stop();

    // Remove resize listener
    window.removeEventListener('resize', this._resizeHandler);

    // Restore context menu
    document.oncontextmenu = this._originalContextMenu;

    // Destroy layers
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
    if (this.selectionLayer.hasSelection()) {
      this.selectionLayer.focusCanvas();
    } else {
      this.layers[this.currentLayer].focusCanvas();
    }
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
    Meteor.callAsync('addLayer', this.bookId, this.layers.length);
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
