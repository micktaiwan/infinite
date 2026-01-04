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

  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  mouseUp(layer) {
    // Simplification is handled in saveDrawings()
  }

  // create a new drawing
  draw(layer) {
    // console.log('draw', layer.trueX, layer.trueY);
    this.path.add(new paper.Point(layer.trueX, layer.trueY));
    // this.drawing(this.toDrawing(this.path, layer), layer);
    layer.drawLine(layer.prevCursorX, layer.prevCursorY, layer.cursorX, layer.cursorY, this.options.maxSize, this.color);
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
    c.strokeStyle = drawing.color;
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

  normalize() {
    if (!this.path || this.path.segments.length < 2) return { factor: 1, center: null };
    let maxDistance = 0;
    for (let i = 1; i < this.path.segments.length; i++) {
      const s = this.path.segments[i];
      const prev = this.path.segments[i - 1];
      const dist = Helpers.dist(s.point.x, s.point.y, prev.point.x, prev.point.y);
      if (dist > maxDistance) maxDistance = dist;
    }
    if (maxDistance > 0 && (maxDistance < 1 || maxDistance > 25)) {
      const factor = 10 / maxDistance;
      // Store the center point to scale from the same point when unnormalizing
      const center = this.path.bounds.center.clone();
      this.path.scale(factor, center);
      return { factor, center };
    }
    return { factor: 1, center: null };
  }

  unnormalize(factor, center) {
    if (center) {
      this.path.scale(1 / factor, center);
    }
  }

  simplify(x = 2.5) {
    if (!this.path || !this.path.simplify) return;
    const { factor, center } = this.normalize();
    this.path.simplify(x);
    this.unnormalize(factor, center);
  }

  toDrawing(path, layer) {
    return {
      type: this.type,
      pressure: this.options.maxSize,
      scale: layer.scale,
      lines: this.pathToSegments(path),
      color: this.color,
      layerIndex: layer.index,
      bookId: layer.bookId,
    };
  }

  pathToSegments(path) {
    return path.segments.map(s => ({ point: { x: s.point.x, y: s.point.y }, in: { x: s.handleIn.x, y: s.handleIn.y }, out: { x: s.handleOut.x, y: s.handleOut.y } }));
  }

  async saveDrawings(layer) {
    if (!super.saveDrawings()) return;
    if (!this.path) return;
    if (this.saving) return; // Prevent duplicate saves
    this.saving = true;
    this.simplify(0.1);
    const drawing = this.toDrawing(this.path, layer);
    this.path = undefined;
    this.saving = false;
    await Meteor.callAsync('saveDrawings', drawing);
  }

  eraseCircle(drawing, x, y, size, changes) {
    let changed = false;
    const { lines } = drawing;
    const foundLines = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (Helpers.dist(line.point.x, line.point.y, x, y) < size) {
        foundLines.push(line);
        // Reset handles of adjacent segments to avoid bezier curve loops
        if (i > 0) lines[i - 1].out = { x: 0, y: 0 };
        if (i < lines.length - 1) lines[i + 1].in = { x: 0, y: 0 };
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
      if (line.point.x >= x && line.point.x <= x + width &&
         line.point.y >= y && line.point.y <= y + height) {
        // Reset handles of adjacent segments to avoid bezier curve loops
        if (i > 0) lines[i - 1].out = { x: 0, y: 0 };
        if (i < lines.length - 1) lines[i + 1].in = { x: 0, y: 0 };
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
      line.point.x = dest.toTrueX(from.scale * (line.point.x + from.offsetX));
      line.point.y = dest.toTrueY(from.scale * (line.point.y + from.offsetY));
      line.handleIn = { x: line.in.x, y: line.in.y };
      line.handleOut = { x: line.out.x, y: line.out.y };
    });
    this.path = { segments: drawing.lines };
    this.saveDrawings(dest);
  }

  // TODO
  changePressure(drawing, scaleAmount) {
    drawing.lines.forEach(line => {
      line.pressure *= scaleAmount;
      if (line.pressure < 0.1) line.pressure = 0.1;
    });
  }

  boundingBox(drawing, layer, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
    drawing.lines.forEach(line => {
      const screenX = layer.toScreenX(line.point.x);
      const screenY = layer.toScreenY(line.point.y);
      if (screenX < minX) minX = screenX;
      if (screenY < minY) minY = screenY;
      if (screenX > maxX) maxX = screenX;
      if (screenY > maxY) maxY = screenY;
    });
    return { minX, minY, maxX, maxY };
  }
}
