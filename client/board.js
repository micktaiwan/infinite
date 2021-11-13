if (module.hot) {
  module.hot.decline();
}

const imageTracer = require('./lib/imagetracer');

export default class Board {
  constructor() {
    this.drawings = [];
    this.lines = [];
    this.pressure = 2;
    this.eraserSize = 20;

    // disable right clicking
    document.oncontextmenu = () => false;

    // coordinates of our cursor
    this.cursorX = 0;
    this.cursorY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;

    // distance from origin
    this.offsetX = 0;
    this.offsetY = 0;

    // zoom amount
    this.scale = 1;

    this.color = '#000';

    this.saveQueue = {};

    this.idb = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;

    const self = this;
    this.dbRequest = this.idb.open('infinite-db', 1);
    this.dbRequest.onsuccess = () => {
      self.db = self.dbRequest.result;
      const objectStore = self.db.transaction('infinite-db').objectStore('infinite-db');
      objectStore.openCursor().onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
          console.log('cursor', cursor.key);
          // populate drawings
          if (cursor.key === 'drawings') {
            self.drawings = cursor.value;
          } else if (cursor.key === 'position') {
            self.offsetX = cursor.value.offsetX;
            self.offsetY = cursor.value.offsetY;
            self.scale = cursor.value.scale;
          }
          self.redrawCanvas();
          cursor.continue();
        }
      };
    };

    this.dbRequest.onupgradeneeded = function (event) {
      console.log('onupgradeneeded');
      const db = event.target.result;
      db.onerror = function (e) { console.log(e); };
      db.createObjectStore('infinite-db');
    };

    // try {
    //   this.drawings = JSON.parse(localStorage.getItem('drawings'));
    //   const { scale, offsetX, offsetY } = JSON.parse(localStorage.getItem('position'));
    //   this.scale = scale || this.scale;
    //   this.offsetX = offsetX || this.offsetX;
    //   this.offsetY = offsetY || this.offsetY;
    //   console.log('loaded', this.scale, this.offsetX, this.offsetY);
    // } catch (e) {
    //   alert(`Error loading your drawings\n${e}`);
    // }

    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.globalAlpha = 0.5;
    this.selCanvas = document.getElementById('selection');
    this.selCtx = this.selCanvas.getContext('2d');
    this.selCtx.font = 'Calibri';
    this.selCtx.fillStyle = '#999';

    // this.ctx.lineCap = 'round';
    // this.ctx.lineJoin = 'round';

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    this.selCanvas.width = window.innerWidth;
    this.selCanvas.height = window.innerHeight;

    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this), false);
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointerout', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this), false);
    this.selCanvas.addEventListener('pointermove', this.onMouseMove.bind(this), false);
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    // this.redrawCanvas();

    // if the window changes size, redraw the canvas
    window.addEventListener('resize', () => {
      self.redrawCanvas();
    });
  }

  onKeyDown(event) {
    if (event.repeat) return;
    // console.log('down', event);
    if (event.key === 'z' && event.metaKey) this.undo();
    else if (event.key === 'z') this.startPan();
    else if (event.key === 'a') this.startZooming();
    else if (event.key === '&') this.reset();
    else if (event.key === 'e') this.startEraser();
    else if (event.key === 'd') this.startStraightLine();
    else if (event.key === 's') this.startRectSelection();
  }

  onKeyUp(event) {
    if (event.repeat) return;
    // console.log('up', event);
    if (event.key === 'z') this.stopPan();
    else if (event.key === '+') this.zoomStep(1.2);
    else if (event.key === 'a') this.stopZooming();
    else if (event.key === 'e') this.stopEraser();
    else if (event.key === 'd') this.stopStraightLine();
    else if (event.key === 's') this.stopRectSelection();
  }

  startPan() {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.hasMoved = false;
    this.canvas.style.cursor = 'move';
    this.panning = true;
  }

  savePosition() {
    // this.saveToLocalStorage('position', JSON.stringify({ scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY }));
    this.saveToIndexedDB('position', { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY });
  }

  stopPan() {
    this.canvas.style.cursor = 'default';
    this.panning = false;
    if (this.hasMoved) this.redrawCanvas();
    this.savePosition();
  }

  startZooming() {
    this.zooming = true;
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
  }

  stopZooming() {
    this.zooming = false;
    this.redrawCanvas();
    this.savePosition();
  }

  // eslint-disable-next-line class-methods-use-this
  // saveToLocalStorage(key, value) {
  //   // console.log('called', key);
  //   this.saveQueue[key] = value;
  //   if (this.handleSaveTimeout) Meteor.clearTimeout(this.handleSaveTimeout);
  //   const self = this;
  //   this.handleSaveTimeout = Meteor.setTimeout(() => {
  //     try {
  //       Object.keys(self.saveQueue).forEach(k => {
  //         if (self.saveQueue[k]) localStorage.setItem(k, self.saveQueue[k]);
  //         delete self.saveQueue[k];
  //         console.log('saved', k);
  //       });
  //     } catch (e) {
  //       alert(`Error saving to localstorage\n${e}`);
  //     }
  //   }, 2000);
  // }

  saveToIndexedDB(key, value) {
    // save to indexedDB
    const transaction = this.db.transaction(['infinite-db'], 'readwrite');
    const objectStore = transaction.objectStore('infinite-db');
    const request = objectStore.put(value, key);
    request.onerror = function (e) {
      console.log(e);
    };
  }

  saveDrawings(forceSave = false) {
    if (this.lines.length) forceSave = true;
    if (forceSave) {
      this.forceSave = false;
      this.drawings.push(this.lines);
      // this.toSVG(this.lines);
      // this.saveToLocalStorage('drawings', JSON.stringify(this.drawings));
      this.saveToIndexedDB('drawings', this.drawings);
    }
    this.lines = [];
  }

  startStraightLine() {
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.straightLine = true;
    this.selCtx.lineWidth = 2;
    this.selCtx.strokeStyle = '#000';
  }

  stopStraightLine() {
    this.straightLine = false;
    this.lines.push({
      scale: this.scale,
      pressure: 2,
      x0: this.toTrueX(this.startX),
      y0: this.toTrueY(this.startY),
      x1: this.toTrueX(this.cursorX),
      y1: this.toTrueY(this.cursorY),
      color: this.color,
      type: this.type,
    });
    this.saveDrawings();
    this.redrawCanvas();
    this.redrawSelCanvas();
  }

  startEraser() {
    this.eraser = true;
  }

  stopEraser() {
    this.eraser = false;
    this.redrawCanvas();
    this.saveDrawings(true);
  }

  startRectSelection() {
    // this.saveDrawings(true);
    this.redrawSelCanvas();
    this.rectSelection = true;
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.selCanvas.style.cursor = 'crosshair';
  }

  stopRectSelection() {
    this.rectSelection = false;
    this.selection = {
      type: 'rect',
      x: this.startX,
      y: this.startY,
      width: this.cursorX - this.startX,
      height: this.cursorY - this.startY,
    };
    this.selCanvas.style.cursor = 'default';
  }

  reset() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.redrawCanvas();
    this.savePosition();
  }

  clear() {
    this.drawings = [];
    this.reset();
  }

  undo() {
    this.drawings.pop();
    this.redrawCanvas();
  }

  updateCursorPos(event) {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;
  }

  onMouseDown(event) {
    this.updateCursorPos(event);
    this.lines = [];

    // detect left clicks
    if (event.button === 0) {
      this.leftMouseDown = true;
      this.rightMouseDown = false;
      this.type = 0;
    }
    // detect right clicks
    if (event.button === 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event);
    }
  }

  onMouseUp() {
    if (this.panning) this.stopPan();
    this.saveDrawings();
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.type = 2;
  }

  boundingBox() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].x0 < minX) minX = this.lines[i].x0;
      if (this.lines[i].y0 < minY) minY = this.lines[i].y0;
      if (this.lines[i].x1 > maxX) maxX = this.lines[i].x1;
      if (this.lines[i].y1 > maxY) maxY = this.lines[i].y1;
    }
    return { minX, minY, maxX, maxY };
  }

  toSVG() {
    const { minX, minY, maxX, maxY } = this.boundingBox();
    const data = this.ctx.getImageData(minX, minY, maxX - minX, maxY - minY);
    const svg = imageTracer.imagedataToTracedata(data);
    console.log(svg);
    // svg.data.forEach(d => {
    //   const path = d;
    //   this.drawings.push(path);
    // });
  }

  dist(x1, y1, x2, y2, atScale = true) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) * (atScale ? this.scale : 1);
  }

  onMouseMove(event) {
    // get mouse position
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;

    const scaledX = this.toTrueX(this.cursorX);
    const scaledY = this.toTrueY(this.cursorY);
    const prevScaledX = this.toTrueX(this.prevCursorX);
    const prevScaledY = this.toTrueY(this.prevCursorY);

    this.pressure = event.pressure * 3;

    const dist = this.dist(this.cursorX, this.cursorY, this.prevCursorX, this.prevCursorY, false);

    if (this.rectSelection) {
      this.hasMoved = true;
      this.redrawSelCanvas();
      this.selCtx.lineWidth = 1;
      this.selCtx.strokeStyle = '#f90';
      this.selCtx.strokeRect(this.startX, this.startY, this.cursorX - this.startX, this.cursorY - this.startY);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
      return;
    }

    if (this.zooming) {
      if (dist > 5) {
        this.mouseZoom(event);
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
      }
      return;
    }

    if (this.panning) {
      if (dist > 5) {
        this.hasMoved = true;
        this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
        this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
        this.redrawCanvas();
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
      }
      return;
    }

    // console.log(this.pressure);

    // if (event.pressure < 0.1) return;

    if (this.eraser) {
      this.drawEraser(this.cursorX, this.cursorY);
      for (let i = 0; i < this.drawings.length; i++) {
        const path = this.drawings[i];
        for (let j = 0; j < path.length; j++) {
          const line = path[j];
          if (this.dist(line.x0, line.y0, scaledX, scaledY) < this.eraserSize ||
            this.dist(line.x1, line.y1, scaledX, scaledY) < this.eraserSize) {
            path.splice(j, 1);
            j--;
          }
          if (path.length === 0) {
            this.drawings.splice(i, 1);
            i--;
          }
        }
      }
      // this.redrawCanvas();
      return;
    }

    if (this.straightLine) {
      this.redrawSelCanvas();
      this.drawLine(this.startX, this.startY, this.cursorX, this.cursorY, 2, this.color, this.selCtx);
      return;
    }

    // drawing
    if (this.leftMouseDown) {
      const color = '#000';

      // add the line to our drawing history
      this.lines.push({
        scale: this.scale,
        pressure: this.pressure,
        x0: prevScaledX,
        y0: prevScaledY,
        x1: scaledX,
        y1: scaledY,
        color,
        type: this.type,
      });
      this.type = 1;

      // draw a line
      this.drawLine(this.prevCursorX, this.prevCursorY, this.cursorX, this.cursorY, this.pressure, color);

      // console.log('move',cursorX, cursorY);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
    }
  }

  drawEraser(x, y) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.eraserSize, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.closePath();
  }

  onMouseWheel(event) {
    this.zoom(event);
  }

  zoomStep(step) {
    console.log(step);
    this.scale *= step;
    this.redrawCanvas();
  }

  mouseZoom() {
    const reverse = Math.sign(this.prevCursorY - this.cursorY);
    // const deltaX = Math.abs(this.startX - this.cursorX);
    const deltaY = Math.abs(this.startY - this.cursorY);
    const scaleAmount = reverse * deltaY / 1000;
    this.scale *= (1 + scaleAmount);

    const distX = this.startX / this.canvas.clientWidth;
    const distY = this.startY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redrawCanvas();
  }

  zoom(event) {
    const { deltaY } = event;
    const scaleAmount = -deltaY / 500;
    this.scale *= (1 + scaleAmount);

    const distX = event.pageX / this.canvas.clientWidth;
    const distY = event.pageY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redrawCanvas();
  }

  drawLine(x0, y0, x1, y1, lineWidth, color = '#000', ctx = this.ctx) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  toScreenX(xTrue) {
    return (xTrue + this.offsetX) * this.scale;
  }

  toScreenY(yTrue) {
    return (yTrue + this.offsetY) * this.scale;
  }

  toTrueX(xScreen) {
    return xScreen / this.scale - this.offsetX;
  }

  toTrueY(yScreen) {
    return yScreen / this.scale - this.offsetY;
  }

  trueHeight() {
    return this.canvas.clientHeight / this.scale;
  }

  trueWidth() {
    return this.canvas.clientWidth / this.scale;
  }

  drawSLine(index) {
    const segment = this.drawings[index];

    for (let j = 0; j < segment.length; j++) {
      const line = segment[j];
      const ratio = this.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        this.drawLine(
          this.toScreenX(line.x0),
          this.toScreenY(line.y0),
          this.toScreenX(line.x1),
          this.toScreenY(line.y1),
          // this.scale / line.scale > 1 ?
          //   line.pressure * Math.min(this.scale / line.scale, 2) :
          //   line.pressure * (this.scale / line.scale),
          line.pressure * ratio,
          line.color,
        );
      }
    }
  }

  drawPath(index) {
    const segment = this.drawings[index];

    // this.ctx.lineWidth = line.pressure * ratio;
    this.ctx.beginPath();
    this.ctx.moveTo(this.toScreenX(segment[0].x0), this.toScreenY(segment[0].y0));

    for (let j = 0; j < segment.length; j++) {
      const line = segment[j];
      const ratio = this.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        this.ctx.strokeStyle = this.color;
        if (this.notDrawing()) this.ctx.lineWidth = 1;
        else this.ctx.lineWidth = line.pressure * ratio;
        this.ctx.lineTo(this.toScreenX(line.x1), this.toScreenY(line.y1));
        this.ctx.stroke();
      }
    }
  }

  notDrawing() {
    return this.zooming || this.panning;
  }

  redrawCanvas(sync = false) {
    if (this.redrawing) return;
    this.redrawing = true;
    // console.log('redraw', sync);
    // const before = new Date();

    const self = this;
    const draw = function () {
      // self.ctx.fillStyle = '#fff';
      self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

      for (let i = 0; i < self.drawings.length; i++) {
        const line = self.drawings[i][0];
        if (!line) {
          self.drawings.splice(i, 1);
          i--;
          console.log('cleaned');
        } else {
          const ratio = self.scale / line.scale;
          if (self.notDrawing() || ratio > 2) self.drawPath(i);
          else self.drawSLine(i);
        }
      }

      self.redrawing = false;
      // console.log(new Date() - before);
    };
    if (sync) draw();
    else requestAnimationFrame(draw);
  }

  redrawSelCanvas() {
    const self = this;
    self.selCtx.clearRect(0, 0, self.selCanvas.width, self.selCanvas.height);
  }

  infos() {
    this.selCtx.fillText('Scale', 10, 10);
    this.selCtx.fillText(this.scale, 90, 10);
    this.selCtx.fillText('Lines', 10, 25);
    this.selCtx.fillText(this.drawings.length, 90, 25);
    this.selCtx.fillText('Size', 10, 40);
    this.selCtx.fillText(`${Math.round(JSON.stringify(this.drawings).length / 1024)} KB`, 90, 40);
  }
}
