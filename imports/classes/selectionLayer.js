import Layer from './layer';
import { Lines } from '../api/books/collections';

export default class SelectionLayer extends Layer {
  constructor(manager) {
    super(manager, manager.bookId);
    this.canvas.id = 'selectionLayer';

    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this), { passive: true });
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), { passive: true });
    this.canvas.addEventListener('pointerout', this.onMouseUp.bind(this), { passive: true });
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this), { passive: true });
    this.canvas.addEventListener('keyup', this.onKeyUp.bind(this), { passive: true });
    this.canvas.addEventListener('keydown', this.onKeyDown.bind(this), { passive: true });

    this.redraw();
  }

  onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) this.undo();
    else if (event.key === 'z') this.startPan();
    else if (event.key === 'a') this.startZooming();
    else if (event.key === '&') this.reset();
  }

  onKeyUp(event) {
    if (this.hidden) return;
    if (event.repeat) return;
    // console.log('up', event);
    if (event.key === 'z') this.stopPan();
    else if (event.key === 'a') this.stopZooming();
  }

  onMouseMove(event) {
    // get mouse position
    this.cursorX = event.clientX - this.marginLeft;
    this.cursorY = event.clientY;

    // with a pointer, move is triggered also with a tilt
    if (this.cursorX === this.prevCursorX && this.cursorY === this.prevCursorY) return;

    const scaledX = this.toTrueX(this.cursorX);
    const scaledY = this.toTrueY(this.cursorY);
    // const prevScaledX = this.toTrueX(this.prevCursorX);
    // const prevScaledY = this.toTrueY(this.prevCursorY);

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
        const movedX = (this.cursorX - this.prevCursorX);
        const movedY = (this.cursorY - this.prevCursorY);
        this.offsetX += movedX / this.scale;
        this.offsetY += movedY / this.scale;
        this.selection.x += movedX;
        this.selection.y += movedY;
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
        Lines.find({ bookId: self.bookId, layerIndex: self.index }).forEach(entry => {
        // console.log('eraser', self.drawings.length);
          let changed = false;
          const { lines } = entry;
          for (let j = 0; j < lines.length; j++) {
            const line = lines[j];
            if (self.dist(line.x0, line.y0, scaledX, scaledY) < size ||
            self.dist(line.x1, line.y1, scaledX, scaledY) < size) {
              lines.splice(j, 1);
              j--;
              changed = true;
              // TODO: split into 2 drawings if needed
            }
          }
          if (changed) changes.push({ id: entry._id, lines });
        });
        if (changes.length > 0) Meteor.call('updateLinesBatch', changes);
        self.prevCursorX = self.cursorX;
        self.prevCursorY = self.cursorY;
      });

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

    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    // this.oldTimer = this.timer;
  }

  onMouseDown(event) {
    if (event.button === 0) {
      if (this.insideSelection(this.cursorX, this.cursorY)) {
        this.startPan(event);
        return;
      }
      this.copyLinesToOriginLayer();
      this.reset(false);
      Meteor.defer(() => { // without this, setting zIndex does not work
        this.manager.unfocusSelectionLayer();
      });
    } else if (event.button === 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event);
    }
  }

  copyLinesToOriginLayer() {
    this.lines.forEach(line => {
      line.x0 += (this.offsetX - this.selectionOriginLayer.offsetX);
      line.y0 += (this.offsetY - this.selectionOriginLayer.offsetY);
      line.x1 += (this.offsetX - this.selectionOriginLayer.offsetX);
      line.y1 += (this.offsetY - this.selectionOriginLayer.offsetY);
    });
    this.selectionOriginLayer.lines = this.lines;
    this.selectionOriginLayer.saveDrawings();
    this.selectionOriginLayer.redraw();
    this.lines = [];
    this.selectionOriginLayer = undefined;
    this.redraw();
  }

  onMouseUp() {
    if (this.panning) this.stopPan();
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.type = 2;
  }

  redraw() {
    // console.log('redraw selection');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.selectionOriginLayer) this.drawTemplate();
    this.drawSelectedLines();
    this.drawSelectionBoundaries();
  }

  drawTemplate() {
    // template (draw horizontal lines to guide the writing)
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < this.canvas.height; i += 30) {
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }

  drawSelectedLines() {
    if (!this.selectionOriginLayer) return;
    for (let j = 0; j < this.lines.length; j++) {
      const line = this.lines[j];
      const ratio = this.scale / line.scale;
      this.drawLine(
        this.toScreenX(line.x0),
        this.toScreenY(line.y0),
        this.toScreenX(line.x1),
        this.toScreenY(line.y1),
        line.pressure * ratio,
        '#f90',
        this.ctx,
      );
    }
  }

  drawSelectionBoundaries() {
    if (!this.selectionOriginLayer) return;
    this.ctx.strokeStyle = '#f90';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.selection.x, this.selection.y);
    this.ctx.lineTo(this.selection.x + this.selection.width, this.selection.y);
    this.ctx.lineTo(this.selection.x + this.selection.width, this.selection.y + this.selection.height);
    this.ctx.lineTo(this.selection.x, this.selection.y + this.selection.height);
    this.ctx.lineTo(this.selection.x, this.selection.y);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  infos() {
    this.sel.fillText('Scale', 10, 10);
    this.sel.fillText(this.scale, 90, 10);
    this.sel.fillText('Lines', 10, 25);
    this.sel.fillText(Lines.find().count(), 90, 25);
    // this.sel.fillText('Size', 10, 40);
    // this.sel.fillText(`${Math.round(JSON.stringify(this.drawings).length / 1024)} KB`, 90, 40);
  }
}
