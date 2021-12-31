import Brush from './brush';
import { Drawings } from '../../api/books/collections';
import Helpers from '../helpers';

export default class LinesBrush extends Brush {
  constructor(layer) {
    super(layer);
    this.type = 'lines';
    this.name = 'Simple Brush';
    this.lines = [];
  }

  // create a new drawing
  draw() {
    const scaledX = this.layer.toTrueX(this.layer.cursorX);
    const scaledY = this.layer.toTrueY(this.layer.cursorY);
    const prevScaledX = this.layer.toTrueX(this.layer.prevCursorX);
    const prevScaledY = this.layer.toTrueY(this.layer.prevCursorY);

    // add the line to our drawing history
    this.lines.push({
      scale: this.layer.scale,
      pressure: this.layer.pressure,
      x0: prevScaledX,
      y0: prevScaledY,
      x1: scaledX,
      y1: scaledY,
      color: this.layer.color,
    });

    // draw a line
    this.layer.drawLine(this.layer.prevCursorX, this.layer.prevCursorY, this.layer.cursorX, this.layer.cursorY, this.layer.pressure, this.layer.color);
  }

  // draw a previous drawing
  drawing(drawing) {
    // console.log('drawing', drawing);
    // console.trace();
    const ratio = this.layer.scale / drawing.scale;
    if ((this.layer.notDrawingActionInProgress() && !this.layer.sel.selection) || ratio > 2) this.drawPath(drawing);
    else this.drawSLine(drawing);
  }

  drawSLine(drawing) {
    for (let j = 0; j < drawing.lines.length; j++) {
      const line = drawing.lines[j];
      const ratio = this.layer.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        this.layer.drawLine(
          this.layer.toScreenX(line.x0),
          this.layer.toScreenY(line.y0),
          this.layer.toScreenX(line.x1),
          this.layer.toScreenY(line.y1),
          line.pressure * ratio,
          line.color,
        );
      }
    }
  }

  drawPath(drawing) {
    if (drawing.lines.length === 0) return;
    // this.ctx.lineWidth = line.pressure * ratio;
    this.layer.ctx.beginPath();
    this.layer.ctx.moveTo(this.layer.toScreenX(drawing.lines[0].x0), this.layer.toScreenY(drawing.lines[0].y0));

    for (let j = 0; j < drawing.lines.length; j++) {
      const line = drawing.lines[j];
      const ratio = this.layer.scale / line.scale;
      if (ratio > 0.05 && ratio < 100) {
        this.layer.ctx.strokeStyle = this.color;
        this.layer.ctx.lineWidth = 1;
        if (j > 1 && Helpers.dist(drawing.lines[j - 1].x0, drawing.lines[j - 1].y0, line.x0, line.y0) < 20) {
          this.layer.ctx.lineTo(this.layer.toScreenX(line.x1), this.layer.toScreenY(line.y1));
        } else {
          this.layer.ctx.moveTo(this.layer.toScreenX(line.x0), this.layer.toScreenY(line.y0));
        }
        this.layer.ctx.stroke();
      }
    }
  }

  saveDrawings() {
    if (!this.lines.length) return;
    Meteor.call('saveDrawings', { type: this.type, lines: this.lines, layerIndex: this.layer.index, bookId: this.layer.bookId });
    this.lines = [];
  }

  erase(entry, x, y, size, changes) {
    let changed = false;
    const { lines } = entry;
    for (let j = 0; j < lines.length; j++) {
      const line = lines[j];
      if (this.layer.dist(line.x0, line.y0, x, y) < size ||
      this.layer.dist(line.x1, line.y1, x, y) < size) {
        lines.splice(j, 1);
        j--;
        changed = true;
        // TODO: split into 2 drawings if needed
      }
    }
    if (changed) changes.push({ id: entry._id, obj: { lines } });
  }
}
