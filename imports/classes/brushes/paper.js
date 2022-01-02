import Brush from './brush';
import Helpers from '../helpers';

const paper = require('paper');

export default class PaperBrush extends Brush {
  constructor() {
    super();
    this.type = 'paper';
    this.name = 'Ball Pen';
    paper.setup();
  }

  mouseDown(layer) {
    this.path = new paper.Path({
      segments: [new paper.Point(layer.trueX, layer.trueY)],
      strokeColor: 'black',
      strokeWidth: this.options.maxSize,
    });
  }

  mouseUp(layer) {
    // console.log('mouse up');
  }

  // create a new drawing
  draw(layer) {
    // console.log('draw', layer.trueX, layer.trueY);
    this.path.add(new paper.Point(layer.trueX, layer.trueY));
    // this.drawing(this.toDrawing(this.path, layer), layer);
    layer.ctx.beginPath();
    layer.ctx.moveTo(layer.toScreenX(this.path.segments[this.path.segments.length - 2].point.x), layer.toScreenY(this.path.segments[this.path.segments.length - 2].point.y));
    layer.ctx.lineTo(layer.toScreenX(this.path.segments[this.path.segments.length - 1].point.x), layer.toScreenY(this.path.segments[this.path.segments.length - 1].point.y));
    layer.ctx.strokeStyle = 'black';
    layer.ctx.lineWidth = this.options.maxSize;
    layer.ctx.stroke();
    layer.ctx.closePath();
  }

  // draw a previous drawing
  drawing(drawing, layer) {
    const c = layer.ctx;
    c.beginPath();
    c.moveTo(layer.toScreenX(drawing.lines[0].point.x), layer.toScreenY(drawing.lines[0].point.y));
    for (let i = 1; i < drawing.lines.length; i++) {
      const segment = drawing.lines[i];
      c.bezierCurveTo(
        layer.toScreenX(drawing.lines[i - 1].point.x + drawing.lines[i - 1].out.x),
        layer.toScreenY(drawing.lines[i - 1].point.y + drawing.lines[i - 1].out.y),
        layer.toScreenX(drawing.lines[i].point.x + drawing.lines[i].in.x),
        layer.toScreenY(drawing.lines[i].point.y + drawing.lines[i].in.y),
        layer.toScreenX(segment.point.x),
        layer.toScreenY(segment.point.y),
      );
    }
    c.lineWidth = drawing.pressure * (layer.scale / drawing.scale);
    c.strokeStyle = 'black';
    c.stroke();
    c.closePath();
  }

  drawHelpers(drawing, layer) {
    const c = layer.ctx;
    for (let i = 0; i < drawing.lines.length; i++) {
      const segment = drawing.lines[i];
      c.beginPath();
      c.arc(layer.toScreenX(segment.point.x), layer.toScreenY(segment.point.y), layer.scale, 0, 2 * Math.PI);
      c.strokeStyle = 'blue';
      c.stroke();
      c.closePath();
      c.beginPath();
      c.moveTo(layer.toScreenX(segment.point.x), layer.toScreenY(segment.point.y));
      c.lineTo(layer.toScreenX(segment.point.x + segment.in.x), layer.toScreenY(segment.point.y + segment.in.y));
      c.strokeStyle = 'red';
      c.stroke();
      c.beginPath();
      c.moveTo(layer.toScreenX(segment.point.x), layer.toScreenY(segment.point.y));
      c.lineTo(layer.toScreenX(segment.point.x + segment.out.x), layer.toScreenY(segment.point.y + segment.out.y));
      c.strokeStyle = 'green';
      c.stroke();
    }
  }

  simplify(x) {
    const segmentCount = this.path.segments.length;
    this.path.simplify(x);
    // this.path.smooth();

    const newSegmentCount = this.path.segments.length;
    const difference = segmentCount - newSegmentCount;
    const percentage = 100 - Math.round(newSegmentCount / segmentCount * 100);
    console.log(`${difference} of the ${segmentCount} segments were removed. Saving ${percentage}%`);
  }

  toDrawing(path, layer) {
    return {
      type: this.type,
      pressure: this.options.maxSize,
      scale: layer.scale,
      lines: this.pathToSegments(path),
      layerIndex: layer.index,
      bookId: layer.bookId,
    };
  }

  pathToSegments(path) {
    return path.segments.map(s => ({ point: { x: s.point.x, y: s.point.y }, in: { x: s.handleIn.x, y: s.handleIn.y }, out: { x: s.handleOut.x, y: s.handleOut.y } }));
  }

  saveDrawings(layer) {
    if (!super.saveDrawings()) return;
    if (!this.path) return;
    this.simplify(2.5);
    Meteor.call('saveDrawings', this.toDrawing(this.path, layer));
    this.path = undefined;
  }

  eraseCircle(drawing, x, y, size, changes) {
    let changed = false;
    const { segments } = drawing;
    const foundLines = [];
    for (let i = 0; i < segments.length; i++) {
      const line = segments[i];
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

  scaleAndSaveDrawing(drawing, from, dest) {
    drawing.lines.forEach(line => {
      line.x0 = dest.toTrueX(from.scale * (line.x0 + from.offsetX));
      line.y0 = dest.toTrueY(from.scale * (line.y0 + from.offsetY));
      line.x1 = dest.toTrueX(from.scale * (line.x1 + from.offsetX));
      line.y1 = dest.toTrueY(from.scale * (line.y1 + from.offsetY));
      line.scale /= from.scale / dest.scale;
    });
    // split lines by group of 100
    for (let i = 0; i < drawing.lines.length; i += 100) {
      this.lines = drawing.lines.slice(i, i + 100);
      this.saveDrawings(dest);
    }
  }

  changePressure(drawing, scaleAmount) {
    drawing.lines.forEach(line => {
      line.pressure *= scaleAmount;
      if (line.pressure < 0.1) line.pressure = 0.1;
    });
  }

  boundingBox(drawing, layer, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
    drawing.lines.forEach(line => {
      if (layer.toScreenX(line.x0) < minX) minX = layer.toScreenX(line.x0);
      if (layer.toScreenX(line.x1) < minX) minX = layer.toScreenX(line.x1);
      if (layer.toScreenY(line.y0) < minY) minY = layer.toScreenY(line.y0);
      if (layer.toScreenY(line.y1) < minY) minY = layer.toScreenY(line.y1);
      if (layer.toScreenX(line.x0) > maxX) maxX = layer.toScreenX(line.x0);
      if (layer.toScreenX(line.x1) > maxX) maxX = layer.toScreenX(line.x1);
      if (layer.toScreenY(line.y0) > maxY) maxY = layer.toScreenY(line.y0);
      if (layer.toScreenY(line.y1) > maxY) maxY = layer.toScreenY(line.y1);
    });
    return { minX, minY, maxX, maxY };
  }
}
