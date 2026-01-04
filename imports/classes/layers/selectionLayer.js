import Layer from './layer';
import { Drawings } from '../../api/books/collections';

export default class SelectionLayer extends Layer {
  constructor(manager) {
    super(manager, manager.bookId);
    this.canvas.id = 'selectionLayer';

    // Store bound handlers for cleanup
    this._boundHandlers = {
      onMouseDown: this.onMouseDown.bind(this),
      onMouseUp: this.onMouseUp.bind(this),
      onMouseMove: this.onMouseMove.bind(this),
      onMouseWheel: this.onMouseWheel.bind(this),
      onKeyUp: this.onKeyUp.bind(this),
      onKeyDown: this.onKeyDown.bind(this),
    };

    this.canvas.addEventListener('pointerdown', this._boundHandlers.onMouseDown, { passive: true });
    this.canvas.addEventListener('pointerup', this._boundHandlers.onMouseUp, { passive: true });
    this.canvas.addEventListener('pointerout', this._boundHandlers.onMouseUp, { passive: true });
    this.canvas.addEventListener('pointermove', this._boundHandlers.onMouseMove, { passive: true });
    this.canvas.addEventListener('keyup', this._boundHandlers.onKeyUp, { passive: true });
    this.canvas.addEventListener('keydown', this._boundHandlers.onKeyDown, { passive: true });
    this.canvas.addEventListener('wheel', this._boundHandlers.onMouseWheel, { passive: true });
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._boundHandlers.onMouseDown);
    this.canvas.removeEventListener('pointerup', this._boundHandlers.onMouseUp);
    this.canvas.removeEventListener('pointerout', this._boundHandlers.onMouseUp);
    this.canvas.removeEventListener('pointermove', this._boundHandlers.onMouseMove);
    this.canvas.removeEventListener('wheel', this._boundHandlers.onMouseWheel);
    this.canvas.removeEventListener('keyup', this._boundHandlers.onKeyUp);
    this.canvas.removeEventListener('keydown', this._boundHandlers.onKeyDown);
    super.destroy();
  }

  onKeyDown(event) {
    if (event.repeat) return;
    if (event.key === 'z' && (event.metaKey || event.ctrlKey)) this.undo();
    else if (event.key === 'z') this.startPan();
    else if (event.key === 'a') this.startZooming();
    else if (event.key === 'r') this.startWeight();
  }

  onKeyUp(event) {
    if (this.hidden) return;
    if (event.repeat) return;
    if (event.key === 'z') this.stopPan();
    else if (event.key === 'a') this.stopZooming();
    else if (event.key === 'e' && this.selection) this.clearSelection();
    else if (event.key === 'r') this.stopWeight();
    else if (event.key === 'Escape') this.cancelSelection();
    else if (event.key === 's' && this.selection) this.cancelSelection();
  }

  startWeight() {
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.weighting = true;
  }

  stopWeight() {
    this.weighting = false;
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

    if (this.weighting) {
      this.weight(event);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
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

    if (this.rectSelection) {
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
    if (!this.selection) return;
    if (event.button === 0) {
      if (this.insideSelection(this.cursorX, this.cursorY)) {
        this.startPan(event);
      } else {
        this.cancelSelection();
      }
    } else if (event.button === 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.startPan(event);
    }
  }

  clearSelection() {
    this.drawings = [];
    this.selection = undefined;
    const originLayer = this.selectionOriginLayer;
    originLayer.redraw();
    this.selectionOriginLayer = undefined;
    this.reset(false);
    this.redraw();
    Meteor.defer(() => { // without this, setting zIndex does not work
      this.manager.unfocusSelectionLayer();
      originLayer.redraw();
    });
  }

  cancelSelection() {
    this.copyDrawingsToOriginLayer();
    this.clearSelection();
  }

  copyDrawingsToOriginLayer() {
    this.drawings.forEach(drawing => {
      this.manager.delegate('scaleAndSaveDrawing', drawing, this, this.selectionOriginLayer);
    });
  }

  onMouseUp() {
    if (this.panning) this.stopPan();
    this.leftMouseDown = false;
    this.rightMouseDown = false;
  }

  redraw() {
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
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  drawSelectedDrawings() {
    if (!this.selectionOriginLayer) return;
    this.drawings.forEach(drawing => {
      const originalColor = drawing.color;
      drawing.color = '#f90';
      this.manager.delegate('drawing', drawing, this);
      drawing.color = originalColor;
    });
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

  weight() {
    const reverse = Math.sign(this.prevCursorY - this.cursorY);
    let deltaY = Math.abs(this.startY - this.cursorY);
    if (deltaY > 20) deltaY = 20;
    const scaleAmount = (1 + reverse * deltaY / 1000);

    this.drawings.forEach(drawing => {
      this.manager.delegate('changePressure', drawing, scaleAmount);
    });

    this.redraw();
  }

  scaleSelection() {
    let minX = this.selection.x;
    let minY = this.selection.y;
    let maxX = this.selection.x + this.selection.width;
    let maxY = this.selection.y + this.selection.height;
    this.drawings.forEach(drawing => {
      ({ minX, minY, maxX, maxY } = this.manager.delegate('boundingBox', drawing, this, minX, minY, maxX, maxY));
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
