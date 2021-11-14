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
    this.selectionLayer = new SelectionLayer(this, 0);
    this.layers.push(this.selectionLayer);
    this.layers.push(new BoardLayer(this, 1));
    this.currentLayer = 1;

    // disable right clicking
    // document.oncontextmenu = () => false;
  }

  focusCurrentLayer() {
    this.layers[this.currentLayer].focus();
  }
}
