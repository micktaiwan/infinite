/* eslint-disable import/no-import-module-exports */
// const Layer = require('./layer');
import SelectionLayer from './selectionLayer';
import BoardLayer from './boardLayer';

// const imageTracer = require('./lib/imagetracer');

if (module.hot) {
  module.hot.decline();
}
export default class LayerManager {
  constructor() {
    this.cursorX = 0;
    this.cursorY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;
    this.leftMouseDown = false;
    this.rightMouseDown = false;

    this.idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    this.layers = [];
    this.selectionLayer = new SelectionLayer(this, -1);
    this.layers.push(new BoardLayer(this, 0));
    this.currentLayer = 0;

    // disable right clicking
    // document.oncontextmenu = () => false;
  }

  focusCurrentLayer() {
    this.layers[this.currentLayer].focus();
  }

  focus(index) {
    console.log('LayerManager', index);
    this.layers[this.currentLayer].canvas.style.zIndex = 1;
    this.layers[index].canvas.style.zIndex = 100;
    this.currentLayer = index;
    this.focusCurrentLayer();
  }

  getLayers() {
    return this.layers.map(l => l.index);
  }

  addLayer() {
    this.currentLayer = this.layers.length; // add one
    this.layers.push(new BoardLayer(this, this.currentLayer));
    this.focusCurrentLayer();
  }
}
