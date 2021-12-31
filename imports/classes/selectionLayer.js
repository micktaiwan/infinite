import Layer from './layer';
import { Drawings } from '../api/books/collections';

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
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), { passive: true });
    // this.redraw();
  }

  onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) this.undo();
    else if (event.key === 'z') this.startPan();
    else if (event.key === 'a') this.startZooming();
  }

  onKeyUp(event) {
    if (this.hidden) return;
    if (event.repeat) return;
    // console.log('up', event);
    if (event.key === 'z') this.stopPan();
    else if (event.key === 'a') this.stopZooming();
    else if (event.key === 'e' && this.selection) this.clearSelection();
    else if (event.key === 'Escape') this.cancelSelection();
  }

  onMouseMove(event) {
    // get mouse position
    this.cursorX = event.clientX - this.marginLeft;
    this.cursorY = event.clientY;

    // with a pointer, move is triggered also with a tilt
    if (this.cursorX === this.prevCursorX && this.cursorY === this.prevCursorY) return;

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
      this.cancelSelection();
    } else if (event.button === 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event);
    }
  }

  clearSelection() {
    this.lines = [];
    this.selection = undefined;
    this.selectionOriginLayer.redraw();
    this.selectionOriginLayer = undefined;
    this.reset(false);
    this.redraw();
    Meteor.defer(() => { // without this, setting zIndex does not work
      this.manager.unfocusSelectionLayer();
    });
  }

  cancelSelection() {
    this.copyDrawingsToOriginLayer();
    this.clearSelection();
  }

  copyDrawingsToOriginLayer() {
    this.lines.forEach(line => {
      line.x0 = this.selectionOriginLayer.toTrueX(this.scale * (line.x0 + this.offsetX));
      line.y0 = this.selectionOriginLayer.toTrueY(this.scale * (line.y0 + this.offsetY));
      line.x1 = this.selectionOriginLayer.toTrueX(this.scale * (line.x1 + this.offsetX));
      line.y1 = this.selectionOriginLayer.toTrueY(this.scale * (line.y1 + this.offsetY));
      line.scale /= this.scale / this.selectionOriginLayer.scale;
    });

    // split lines by group of 100 and saveDrawings
    for (let i = 0; i < this.lines.length; i += 100) {
      this.selectionOriginLayer.lines = this.lines.slice(i, i + 100);
      this.selectionOriginLayer.saveDrawings();
    }
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
    this.drawSelectedDrawings();
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

  drawSelectedDrawings() {
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

  wheelZoom(event) {
    // zoom inside selection box
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

    this.scaleSelection();

    this.redraw();
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

    this.scaleSelection();

    this.redraw();
  }

  scaleSelection() {
    let minX = this.selection.x;
    let minY = this.selection.y;
    let maxX = this.selection.x + this.selection.width;
    let maxY = this.selection.y + this.selection.height;
    this.lines.forEach(line => {
      if (this.toScreenX(line.x0) < minX) minX = this.toScreenX(line.x0);
      if (this.toScreenX(line.x1) < minX) minX = this.toScreenX(line.x1);
      if (this.toScreenY(line.y0) < minY) minY = this.toScreenY(line.y0);
      if (this.toScreenY(line.y1) < minY) minY = this.toScreenY(line.y1);
      if (this.toScreenX(line.x0) > maxX) maxX = this.toScreenX(line.x0);
      if (this.toScreenX(line.x1) > maxX) maxX = this.toScreenX(line.x1);
      if (this.toScreenY(line.y0) > maxY) maxY = this.toScreenY(line.y0);
      if (this.toScreenY(line.y1) > maxY) maxY = this.toScreenY(line.y1);
    });
    this.selection.x = minX;
    this.selection.y = minY;
    this.selection.width = maxX - minX;
    this.selection.height = maxY - minY;
  }

  infos() {
    this.sel.fillText('Scale', 10, 10);
    this.sel.fillText(this.scale, 90, 10);
    this.sel.fillText('Drawings', 10, 25);
    this.sel.fillText(Drawings.find().count(), 90, 25);
    // this.sel.fillText('Size', 10, 40);
    // this.sel.fillText(`${Math.round(JSON.stringify(this.drawings).length / 1024)} KB`, 90, 40);
  }
}
