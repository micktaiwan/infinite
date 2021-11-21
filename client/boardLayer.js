import Layer from './layer';
import { Lines } from '../imports/api/books/collections';

export default class BoardLayer extends Layer {
  constructor(board, index, bookId) {
    super(board, index, bookId);
    // this.drawings = [];
    this.lines = [];

    this.scale = 1;
    this.pressure = 2;
    this.eraserSize = 20;
    this.color = '#000';

    this.sel = this.manager.selectionLayer;
    this.selCtx = this.manager.selectionLayer.ctx;

    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this), false);
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointerout', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this), false);
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    this.canvas.addEventListener('keyup', this.onKeyUp.bind(this), false);
    this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), false);

    Lines.find({ bookId: this.bookId, layerIndex: this.index }).observeChanges({
      added: (id, line) => {
        this.redraw();
      },
      changed: (id, line) => {
        // this.redraw();
      },
      removed: id => {
        this.redraw();
      },
    });

    // const self = this;
    // this.dbRequest = this.manager.idb.open('infinite-db', 1);
    // this.dbRequest.onsuccess = () => {
    //   self.db = self.dbRequest.result;
    //   const objectStore = self.db.transaction('infinite-db').objectStore('infinite-db');
    //   objectStore.openCursor().onsuccess = function (event) {
    //     const cursor = event.target.result;
    //     if (cursor) {
    //       // console.log('cursor', cursor.key);
    //       // populate drawings
    //       if (cursor.key === `drawings-${self.index}`) {
    //         self.drawings = cursor.value;
    //       } else if (cursor.key === `position-${self.index}`) {
    //         self.offsetX = cursor.value.offsetX;
    //         self.offsetY = cursor.value.offsetY;
    //         self.scale = cursor.value.scale;
    //       }
    //       self.redraw();
    //       cursor.continue();
    //     }
    //   };
    // };

    // this.dbRequest.onupgradeneeded = function (event) {
    //   console.log('onupgradeneeded');
    //   const db = event.target.result;
    //   db.onerror = function (e) { console.log(e); };
    //   db.createObjectStore('infinite-db');
    // };
  }

  onKeyDown(event) {
    if (event.repeat) return;
    // console.log('down', this.index);
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

  onMouseWheel(event) {
    this.zoom(event);
  }

  onMouseMove(event) {
    // console.log('move', this.index);

    // get mouse position
    this.cursorX = event.clientX - 50;
    this.cursorY = event.clientY;

    const scaledX = this.toTrueX(this.cursorX);
    const scaledY = this.toTrueY(this.cursorY);
    const prevScaledX = this.toTrueX(this.prevCursorX);
    const prevScaledY = this.toTrueY(this.prevCursorY);

    this.pressure = event.pressure * 3;

    const dist = this.dist(this.cursorX, this.cursorY, this.prevCursorX, this.prevCursorY, false);

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
        this.redraw();
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
      }
      return;
    }

    // console.log(this.pressure);

    // if (event.pressure < 0.1) return;

    if (this.eraser) {
      this.drawEraser(this.cursorX, this.cursorY);
      const nb = 0;
      Lines.find({ bookId: this.bookId, layerIndex: this.index }).forEach(entry => {
        // console.log('eraser', this.drawings.length);
        let changed = false;
        const { lines } = entry;
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j];
          if (this.dist(line.x0, line.y0, scaledX, scaledY) < this.eraserSize ||
            this.dist(line.x1, line.y1, scaledX, scaledY) < this.eraserSize) {
            lines.splice(j, 1);
            j--;
            changed = true;
            // TODO: split into 2 drawings if needed
          }
          // if (drawing.length === 0) {
          //   this.drawings.splice(i, 1);
          //   i--;
          //   nb++;
          // }
        }
        if (changed) {
          Meteor.call('updateLines', entry._id, lines);
        }
      });
      if (nb && !this.drawings.length) this.reset(false);
      return;
    }

    if (this.straightLine) {
      this.sel.redraw();
      this.drawLine(this.startX, this.startY, this.cursorX, this.cursorY, 2, this.color, this.selCtx);
      return;
    }

    if (this.rectSelection) {
      // console.log('sel');
      // this.hasMoved = true;
      this.sel.redraw();
      this.selCtx.lineWidth = 1;
      this.selCtx.strokeStyle = '#f90';
      this.selCtx.strokeRect(this.startX, this.startY, this.cursorX - this.startX, this.cursorY - this.startY);
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

  drawSLine(segment) {
    for (let j = 0; j < segment.lines.length; j++) {
      const line = segment.lines[j];
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

  drawPath(segment) {
    if (segment.lines.length === 0) return;
    // this.ctx.lineWidth = line.pressure * ratio;
    this.ctx.beginPath();
    this.ctx.moveTo(this.toScreenX(segment.lines[0].x0), this.toScreenY(segment.lines[0].y0));

    for (let j = 1; j < segment.lines.length; j++) {
      const line = segment.lines[j];
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

  startPan() {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.hasMoved = false;
    this.canvas.style.cursor = 'move';
    this.panning = true;
  }

  stopPan() {
    this.canvas.style.cursor = 'default';
    this.panning = false;
    if (this.hasMoved) this.redraw();
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
    this.redraw();
    this.savePosition();
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
    this.redraw();
    this.sel.redraw();
  }

  startEraser() {
    this.eraser = true;
  }

  stopEraser() {
    this.eraser = false;
    this.redraw();
    this.saveDrawings(true);
  }

  startRectSelection() {
    // this.saveDrawings(true);
    // this.redraw();
    // this.sel.redraw();
    this.rectSelection = true;
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.canvas.style.cursor = 'crosshair';
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
    this.canvas.style.cursor = 'default';
  }

  saveToIndexedDB(key, value) {
    // save to indexedDB
    const transaction = this.db.transaction(['infinite-db'], 'readwrite');
    const objectStore = transaction.objectStore('infinite-db');
    const request = objectStore.put(value, `${key}-${this.index}`);
    request.onerror = function (e) {
      console.log(e);
    };
  }

  savePosition() {
    // this.saveToIndexedDB('position', { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY });
  }

  saveDrawings(forceSave = false) {
    if (this.lines.length) forceSave = true;
    if (forceSave) {
      this.forceSave = false;
      // this.drawings.push(this.lines);
      // this.toSVG(this.lines);
      // this.saveToIndexedDB('drawings', this.drawings);
      Meteor.call('saveLines', { lines: this.lines, layerIndex: this.index, bookId: this.bookId });
    }
    this.lines = [];
  }

  reset(redraw = true) {
    console.log('reset');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    if (redraw) this.redraw();
    this.savePosition();
  }

  clear() {
    // this.drawings = [];
    this.reset();
  }

  dist(x1, y1, x2, y2, atScale = true) {
    return Layer.dist(x1, y1, x2, y2) * (atScale ? this.scale : 1);
  }

  drawEraser(x, y) {
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.eraserSize, 0, 2 * Math.PI);
    this.ctx.fill();
    this.ctx.closePath();
  }

  zoomStep(step) {
    console.log(step);
    this.scale *= step;
    this.redraw();
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

    this.redraw();
  }

  zoom(event) {
    const { deltaY } = event;
    const scaleAmount = -deltaY / 500;
    this.scale *= (1 + scaleAmount);

    const distX = event.clientX / this.canvas.clientWidth;
    const distY = event.clientY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redraw();
  }

  undo() {
    // const one = this.drawings.pop();
    // if (one && !this.drawings.length) this.reset(false);
    // this.redraw();
  }

  draw() {
    // console.log('draw');
    // self.ctx.fillStyle = '#fff';
    const self = this;
    self.ctx.clearRect(0, 0, self.canvas.width, self.canvas.height);

    Lines.find({ bookId: this.bookId, layerIndex: this.index }).forEach(line => {
      const ratio = self.scale / line.scale;
      if (self.notDrawing() || ratio > 2) self.drawPath(line);
      else self.drawSLine(line);
    });

    self.redrawing = false;
    // console.log(new Date() - before);
  }

  redraw() {
    if (this.redrawing) return;
    this.redrawing = true;
    // console.log('redraw board', this.index, Lines.find().count());
    // const before = new Date();

    // this.draw();
    requestAnimationFrame(this.draw.bind(this));
  }
}
