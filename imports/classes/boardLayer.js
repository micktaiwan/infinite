import Layer from './layer';
import { Drawings } from '../api/books/collections';
import LinesBrush from './brushes/lines';

import Helpers from './helpers';

export default class BoardLayer extends Layer {
  constructor(manager, _id, fields) {
    super(manager, _id, fields);
    this.hidden = false;
    this.brush = new LinesBrush(this);
    if (fields.positions) {
      const p = fields.positions[this.userId];
      if (p) {
        if (p.scale !== undefined) this.scale = p.scale;
        if (p.offsetX !== undefined) this.offsetX = p.offsetX;
        if (p.offsetY !== undefined) this.offsetY = p.offsetY;
        if (p.hidden !== undefined) this.hidden = p.hidden;
      }
    }

    this.sel = this.manager.selectionLayer;
    this.selCtx = this.manager.selectionLayer.ctx;

    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this), { passive: true });
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), { passive: true });
    this.canvas.addEventListener('pointerout', this.onMouseUp.bind(this), { passive: true });
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this), { passive: true });
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: true });
    this.canvas.addEventListener('keyup', this.onKeyUp.bind(this), { passive: true });
    this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), { passive: true });

    const self = this;
    this.observeChangesHandler = Drawings.find({ bookId: self.bookId, layerIndex: self.index }).observeChanges({
      added: (id, drawing) => {
        if (drawing.userId !== self.userId) self.redraw();
      },
      changed: (id, doc) => {
        const drawing = Drawings.findOne(id);
        if (drawing.userId !== self.userId && !self.notDrawingActionInProgress()) self.redraw();
      },
      removed: id => {
        if (!self.sel.selectionOriginLayer && !Drawings.findOne({ bookId: self.bookId, layerIndex: self.index })) self.reset(false);
        if (!self.notDrawingActionInProgress()) self.redraw();
      },
    });
  }

  remove() {
    this.observeChangesHandler.stop();
    Meteor.call('removeLayer', this._id);
  }

  onKeyDown(event) {
    if (this.hidden) return;
    if (event.repeat) return;
    // console.log('down', this.index);
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) this.undo();
    else if (event.key === 'z') this.startPan();
    else if (event.key === 'a') this.startZooming();
    else if (event.key === '&') this.reset();
    else if (event.key === 'e') this.startEraser();
    else if (event.key === 'd') this.startStraightLine();
    else if (event.key === 'r') this.startRectangle();
    else if (event.key === 's') this.startRectSelection();
  }

  onKeyUp(event) {
    if (this.hidden) return;
    if (event.repeat) return;
    // console.log('up', event);
    if (event.key === 'z') this.stopPan();
    else if (event.key === '+') this.zoomStep(1.2);
    else if (event.key === 'a') this.stopZooming();
    else if (event.key === 'e') this.stopEraser();
    else if (event.key === 'd') this.stopStraightLine();
    else if (event.key === 'r') this.stopRectangle();
    else if (event.key === 's') this.stopRectSelection();
  }

  onMouseMove(event) {
    if (this.hidden) return;

    // get mouse position
    this.cursorX = event.clientX - this.marginLeft;
    this.cursorY = event.clientY;

    // with a pointer, move is triggered also with a tilt
    if (this.cursorX === this.prevCursorX && this.cursorY === this.prevCursorY) return;
    // console.log('move', this.index);

    const scaledX = this.toTrueX(this.cursorX);
    const scaledY = this.toTrueY(this.cursorY);
    const prevScaledX = this.toTrueX(this.prevCursorX);
    const prevScaledY = this.toTrueY(this.prevCursorY);

    this.pressure = event.pressure * 3;

    const dist = this.dist(this.cursorX, this.cursorY, this.prevCursorX, this.prevCursorY, false);

    if (this.zooming) {
      if (dist > 5) {
        this.pointerZoom(event);
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

    if (this.erasing) {
      // console.log('erasing');
      this.drawEraser(this.cursorX, this.cursorY);
      if (!this.leftMouseDown) return;

      const self = this;
      Meteor.defer(() => {
        const size = self.pressure * self.eraserSize / 3;

        const changes = [];
        Drawings.find({ bookId: self.bookId, layerIndex: self.index }).forEach(drawing => {
          // TODO: depends on drawing.type
          this.brush.erase(drawing, scaledX, scaledY, size, changes);
        });
        if (changes.length > 0) Meteor.call('updateDrawingsBatch', changes);
      });
      self.prevCursorX = self.cursorX;
      self.prevCursorY = self.cursorY;

      return;
    }

    if (this.straightLine) {
      this.sel.redraw();
      this.drawLine(this.startX, this.startY, this.cursorX, this.cursorY, 2, this.color, this.selCtx);
      return;
    }

    if (this.rectangle) {
      this.sel.redraw();
      this.selCtx.strokeStyle = '#000';
      this.selCtx.strokeRect(this.startX, this.startY, this.cursorX - this.startX, this.cursorY - this.startY);
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
      this.type = 1;

      this.brush.draw();

      // console.log('move',cursorX, cursorY);
    }

    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    // this.oldTimer = this.timer;
  }

  onMouseDown(event) {
    // console.log('down', this);
    if (this.hidden) return;

    this.updateCursorPos(event);
    this.lines = [];

    if (event.button === 0) { // left
      this.leftMouseDown = true;
      this.rightMouseDown = false;
      this.type = 0;
    } else if (event.button === 2) { // right
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event);
    }
  }

  onMouseUp() {
    if (this.hidden) return;

    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.type = 2;
    this.saveDrawings();
    if (this.panning) this.stopPan();
  }

  notDrawingActionInProgress() {
    return this.zooming || this.panning || this.erasing || this.straightLine || this.rectSelection || this.sel.selection;
  }

  stopPan() {
    super.stopPan();
    this.savePosition();
  }

  stopZooming() {
    super.stopZooming();
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
      // type: this.type,
    });
    this.saveDrawings();
    this.redraw();
    this.sel.redraw();
  }

  startRectangle() {
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.rectangle = true;
    this.selCtx.lineWidth = 2;
    this.selCtx.strokeStyle = '#000';
  }

  stopRectangle() {
    this.rectangle = false;
    this.lines.push({
      scale: this.scale,
      pressure: 2,
      x0: this.toTrueX(this.startX),
      y0: this.toTrueY(this.startY),
      x1: this.toTrueX(this.cursorX),
      y1: this.toTrueY(this.startY),
      color: this.color,
    });
    this.lines.push({
      scale: this.scale,
      pressure: 2,
      x0: this.toTrueX(this.cursorX),
      y0: this.toTrueY(this.startY),
      x1: this.toTrueX(this.cursorX),
      y1: this.toTrueY(this.cursorY),
      color: this.color,
    });
    this.lines.push({
      scale: this.scale,
      pressure: 2,
      x0: this.toTrueX(this.cursorX),
      y0: this.toTrueY(this.cursorY),
      x1: this.toTrueX(this.startX),
      y1: this.toTrueY(this.cursorY),
      color: this.color,
    });
    this.lines.push({
      scale: this.scale,
      pressure: 2,
      x0: this.toTrueX(this.startX),
      y0: this.toTrueY(this.cursorY),
      x1: this.toTrueX(this.startX),
      y1: this.toTrueY(this.startY),
      color: this.color,
    });
    this.saveDrawings();
    this.sel.redraw();
    this.redraw();
  }

  startEraser() {
    this.erasing = true;
  }

  stopEraser() {
    this.erasing = false;
    this.saveDrawings(true);
    this.sel.redraw();
    this.redraw();
  }

  startRectSelection() {
    this.rectSelection = true;
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.canvas.style.cursor = 'crosshair';
    this.sel.lines = [];
  }

  stopRectSelection() {
    this.rectSelection = false;
    if (this.cursorX < this.startX) {
      const temp = this.startX;
      this.startX = this.cursorX;
      this.cursorX = temp;
    }
    if (this.cursorY < this.startY) {
      const temp = this.startY;
      this.startY = this.cursorY;
      this.cursorY = temp;
    }
    this.sel.selection = {
      type: 'rect',
      x: this.startX,
      y: this.startY,
      width: this.cursorX - this.startX,
      height: this.cursorY - this.startY,
    };
    this.canvas.style.cursor = 'default';
    this.copyDrawingsToSelection();
    this.manager.focusSelectionLayer();
  }

  copyDrawingsToSelection() {
    this.sel.copyPosition(this);
    this.sel.selectionOriginLayer = this;
    const { x, y, width, height } = this.sel.selection;
    const foundDrawings = [];
    const objs = Drawings.find({ bookId: this.bookId, layerIndex: this.index });
    objs.forEach(obj => {
      let changed = false;
      for (let i = 0; i < obj.lines.length; i++) {
        const line = obj.lines[i];
        if (this.toScreenX(line.x0) >= x && this.toScreenX(line.x0) <= x + width &&
            this.toScreenY(line.y0) >= y && this.toScreenY(line.y0) <= y + height) {
          foundDrawings.push(line);
          obj.lines.splice(i, 1);
          i--;
          changed = true;
        }
      }
      if (changed) Meteor.call('updateDrawings', obj._id, obj.lines);
    });
    this.sel.lines = foundDrawings;
    this.sel.redraw();
    this.redraw();
  }

  savePosition() {
    Meteor.call('savePosition', this.bookId, this.index, { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY, hidden: this.hidden });
  }

  saveDrawings(forceSave = false) {
    this.brush.saveDrawings(forceSave);
  }

  reset(redraw = true) {
    super.reset(redraw);
    this.savePosition();
  }

  clear() {
    // this.drawings = [];
    this.reset();
  }

  drawEraser(x, y) {
    const size = this.pressure / 3 * this.eraserSize;
    if (!this.leftMouseDown) {
      this.sel.redraw();
      this.selCtx.strokeStyle = '#555';
      this.selCtx.beginPath();
      this.selCtx.arc(x, y, this.eraserSize, 0, 2 * Math.PI);
      this.selCtx.stroke();
      this.selCtx.closePath();
    } else {
      this.sel.redraw();
      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.closePath();
    }
  }

  zoomStep(step) {
    console.log(step);
    this.scale *= step;
    this.redraw();
  }

  undo() {
    Meteor.call('undo', this.bookId, this.index);
  }

  wheelZoom(event) {
    const { deltaY } = event;
    const scaleAmount = -deltaY / 500;
    this.scale *= (1 + scaleAmount);

    const distX = (event.clientX - this.marginLeft) / this.canvas.clientWidth;
    const distY = event.clientY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redraw();
    const self = this;
    if (this.zoomTimerHandle) clearTimeout(this.zoomTimerHandle);
    this.zoomTimerHandle = Meteor.setTimeout(() => {
      self.savePosition();
    }, 200);
  }

  pointerZoom() {
    const reverse = Math.sign(this.prevCursorY - this.cursorY);
    // const deltaX = Math.abs(this.startX - this.cursorX);
    const deltaY = Math.abs(this.startY - this.cursorY);
    const scaleAmount = reverse * deltaY / 1000;
    this.scale *= (1 + scaleAmount);

    const distX = (this.startX - this.marginLeft) / this.canvas.clientWidth;
    const distY = this.startY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redraw();

    const self = this;
    if (this.zoomTimerHandle) clearTimeout(this.zoomTimerHandle);
    this.zoomTimerHandle = Meteor.setTimeout(() => {
      self.savePosition();
    }, 200);
  }

  draw() {
    // console.log('draw', this.index);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.hidden) return;

    Drawings.find({ bookId: this.bookId, layerIndex: this.index }).forEach(drawing => {
      if (drawing.type === 'lines') this.brush.drawing(drawing);
      else console.log('unknown drawing type', drawing.type);
    });
  }

  redraw() {
    if (this.destroyed) return;
    const self = this;
    requestAnimationFrame(self.draw.bind(self));
  }
}
