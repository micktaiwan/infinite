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
  draw(layer) {
    const scaledX = layer.toTrueX(layer.cursorX);
    const scaledY = layer.toTrueY(layer.cursorY);
    const prevScaledX = layer.toTrueX(layer.prevCursorX);
    const prevScaledY = layer.toTrueY(layer.prevCursorY);

    // add the line to our drawing history
    this.lines.push({
      scale: layer.scale,
      pressure: layer.pressure,
      x0: prevScaledX,
      y0: prevScaledY,
      x1: scaledX,
      y1: scaledY,
      color: layer.color,
    });

    // draw a line
    layer.drawLine(layer.prevCursorX, layer.prevCursorY, layer.cursorX, layer.cursorY, layer.pressure, layer.color);
  }

  // draw a previous drawing
  drawing(drawing, layer) {
    // const ratio = layer.scale / drawing.scale;
    // if ((layer.notDrawingActionInProgress() && !layer.sel.selection) || ratio > 2) this.drawPath(drawing, layer);
    // else this.drawSLine(drawing, layer);
    this.drawSLine(drawing, layer);
  }

  drawSLine(drawing, layer) {
    for (let j = 0; j < drawing.lines.length; j++) {
      const line = drawing.lines[j];
      const ratio = layer.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        layer.drawLine(
          layer.toScreenX(line.x0),
          layer.toScreenY(line.y0),
          layer.toScreenX(line.x1),
          layer.toScreenY(line.y1),
          line.pressure * ratio,
          drawing.color || line.color,
        );
      }
    }
  }

  drawPath(drawing, layer) {
    if (drawing.lines.length === 0) return;
    // this.ctx.lineWidth = line.pressure * ratio;
    layer.ctx.beginPath();
    layer.ctx.moveTo(layer.toScreenX(drawing.lines[0].x0), layer.toScreenY(drawing.lines[0].y0));

    for (let j = 0; j < drawing.lines.length; j++) {
      const line = drawing.lines[j];
      const ratio = layer.scale / line.scale;
      if (ratio > 0.05 && ratio < 100) {
        layer.ctx.strokeStyle = this.color;
        layer.ctx.lineWidth = 1;
        if (j > 1 && Helpers.dist(drawing.lines[j - 1].x0, drawing.lines[j - 1].y0, line.x0, line.y0) < 20) {
          layer.ctx.lineTo(layer.toScreenX(line.x1), layer.toScreenY(line.y1));
        } else {
          layer.ctx.moveTo(layer.toScreenX(line.x0), layer.toScreenY(line.y0));
        }
        layer.ctx.stroke();
      }
    }
    layer.ctx.closePath();
  }

  saveDrawings(layer) {
    if (!this.lines.length) return;
    Meteor.call('saveDrawings', { type: this.type, lines: this.lines, layerIndex: layer.index, bookId: layer.bookId });
    this.lines = [];
  }

  eraseCircle(drawing, x, y, size, changes) {
    let changed = false;
    const { lines } = drawing;
    const foundLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (Helpers.dist(line.x0, line.y0, x, y) < size ||
          Helpers.dist(line.x1, line.y1, x, y) < size) {
        foundLines.push(line);
        lines.splice(i, 1);
        i--;
        changed = true;
      }
    }
    if (changed) {
      const drawings = { type: this.type, lines: foundLines };
      if (lines.length === 0) changes.push({ id: drawing._id, type: 'removed', drawings });
      else changes.push({ id: drawing._id, $set: { lines }, drawings });
    }
    return changed;
  }

  eraseRectangle(drawing, x, y, width, height, changes) {
    let changed = false;
    const { lines } = drawing;
    const foundLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.x0 >= x && line.x0 <= x + width &&
          line.y0 >= y && line.y0 <= y + height) {
        lines.splice(i, 1);
        foundLines.push(line);
        i--;
        changed = true;
      }
    }
    if (changed) {
      const drawings = { type: this.type, lines: foundLines };
      if (lines.length === 0) changes.push({ id: drawing._id, type: 'removed', drawings });
      else changes.push({ id: drawing._id, $set: { lines }, drawings });
    }
    return changed;
  }
}
