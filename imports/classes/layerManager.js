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

    this.idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    this.layers = [];
    this.selectionLayer = new SelectionLayer(this);
    this.currentLayer = 0;

    // disable right clicking
    document.oncontextmenu = () => false;

    this.initializing = true;
    const self = this;
    this.observeHandle = Layers.find({ bookId: this.bookId }).observeChanges({
      added: (id, fields) => {
        if (this.findLayer(id) > -1) { console.log('why?'); return; }
        console.log('LayerManager: added', id, fields, this.id);
        this.dimOpacityForAllLayers();
        this.layers.push(new BoardLayer(this, id, fields));
        if (!self.initializing) {
          this.currentLayer = fields.index;
          this.focusCurrentLayer();
        }
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
    this.layers[index].remove();
    this.layers.splice(index, 1);
    this.currentLayer = index - 1;
    this.focusCurrentLayer();
    this.redraw();
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
    return this.layers.find(layer => layer.id === id);
  }

  focusCurrentLayer() {
    if (this.currentLayer === -1) return;
    this.layers[this.currentLayer].focus();
  }

  dimOpacityForAllLayers() {
    this.layers.forEach(layer => {
      layer.canvas.style.opacity = 0.4;
    });
  }

  focus(index) {
    console.log('LayerManager: focus', index);
    this.dimOpacityForAllLayers();
    this.layers[this.currentLayer].canvas.style.zIndex = 1;
    this.layers[index].canvas.style.zIndex = 100;
    this.layers[index].canvas.style.opacity = 1;
    this.currentLayer = index;
    this.focusCurrentLayer();
    if (this.layers[index].hidden) this.toggleLayer(index);
  }

  getLayers() {
    return this.layers.map(l => l.index);
  }

  addLayer() {
    this.dimOpacityForAllLayers();
    Meteor.call('addLayer', this.bookId, this.layers.length);
  }

  getActiveLayer() {
    return this.currentLayer;
  }

  redraw() {
    this.layers.forEach(layer => {
      layer.redraw();
    });
  }
}
