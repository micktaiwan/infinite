/* eslint-disable import/no-import-module-exports */
// const Layer = require('./layer');
import { Random } from 'meteor/random';
import SelectionLayer from './selectionLayer';
import BoardLayer from './boardLayer';
import { Layers } from '../api/books/collections';

// const imageTracer = require('./lib/imagetracer');

if (module.hot) {
  module.hot.decline();
}
export default class LayerManager {
  constructor() {
    this.id = Random.id();
  }

  init(bookId) {
    // console.log('LayerManager: init. bookId:', bookId, 'this.id:', this.id);
    this.bookId = bookId;
    this.cursorX = 0;
    this.cursorY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;
    this.leftMouseDown = false;
    this.rightMouseDown = false;

    this.layers = [];
    this.selectionLayer = new SelectionLayer(this);
    this.currentLayer = 0;

    // disable right clicking
    document.oncontextmenu = () => false;

    this.initializing = true;
    const self = this;
    this.observeHandle = Layers.find({ bookId: this.bookId }).observeChanges({
      added: (_id, fields) => {
        // console.log('LayerManager: added', id, fields);
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
    // console.log('LayerManager: focusCurrentLayerCanvas', this.currentLayer);
    this.layers[this.currentLayer].focusCanvas();
  }

  dimOpacityForAllLayers() {
    this.layers.forEach(layer => {
      layer.canvas.style.opacity = 0.4;
      layer.canvas.style.zIndex = 1;
    });
  }

  focus(index) {
    // console.log('LayerManager: focus', index);
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
    this.selectionLayer.redraw();
    this.layers.forEach(layer => {
      layer.redraw();
    });
  }
}
