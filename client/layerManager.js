/* eslint-disable import/no-import-module-exports */
// const Layer = require('./layer');
import SelectionLayer from './selectionLayer';
import BoardLayer from './boardLayer';
import { Layers } from '../imports/api/books/collections';

// const imageTracer = require('./lib/imagetracer');

if (module.hot) {
  module.hot.decline();
}
export default class LayerManager {
  constructor(bookId) {
    console.log('LayerManager: constructor', bookId);
    this.bookId = bookId;
    this.cursorX = 0;
    this.cursorY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;
    this.leftMouseDown = false;
    this.rightMouseDown = false;

    this.idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    this.layers = [];
    this.selectionLayer = new SelectionLayer(this, -1);
    // this.layers.push(new BoardLayer(this, 0, this.bookId));
    this.currentLayer = 0;

    // disable right clicking
    document.oncontextmenu = () => false;

    this.initializing = true;
    const self = this;
    Layers.find({ bookId: this.bookId }).observeChanges({
      added: (id, fields) => {
        console.log('LayerManager: added', id, fields);
        this.dimOpacityForAllLayers();
        this.layers.push(new BoardLayer(this, fields.index, this.bookId, fields.positions));
        if (!self.initializing) {
          this.currentLayer = fields.index;
          this.focusCurrentLayer();
        }
      },
    });
    this.initializing = false;
  }

  focusCurrentLayer() {
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
}
