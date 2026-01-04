import Brush from './brush';
import Helpers from '../helpers';

const paper = require('paper');

export default class PaperBrush extends Brush {
  constructor() {
    super();
    this.type = 'paper';
    this.name = 'Ball Pen';
    this.saving = false;
    paper.setup();
  }

  mouseDown(layer) {
    super.mouseDown(layer);
  }

  draw(layer) {
    this.capturePoint(layer);
    layer.drawLine(
      layer.prevCursorX,
      layer.prevCursorY,
      layer.cursorX,
      layer.cursorY,
      this.options.maxSize,
      layer.color,
    );
  }

  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const path = new paper.Path({
      segments: points.map(p => new paper.Point(p.x, p.y)),
    });

    const tolerance = Math.max(0.1, 2.5 / layer.scale);
    this.simplifyPath(path, tolerance);

    const c = layer.ctx;
    const segments = path.segments;

    c.beginPath();
    c.moveTo(
      layer.toScreenX(segments[0].point.x),
      layer.toScreenY(segments[0].point.y),
    );

    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1];
      const curr = segments[i];

      c.bezierCurveTo(
        layer.toScreenX(prev.point.x + prev.handleOut.x),
        layer.toScreenY(prev.point.y + prev.handleOut.y),
        layer.toScreenX(curr.point.x + curr.handleIn.x),
        layer.toScreenY(curr.point.y + curr.handleIn.y),
        layer.toScreenX(curr.point.x),
        layer.toScreenY(curr.point.y),
      );
    }

    const ratio = layer.scale / style.scale;
    c.lineWidth = style.size * ratio;
    c.strokeStyle = style.color;
    c.stroke();
    c.closePath();

    path.remove();
  }

  simplifyPath(path, tolerance) {
    if (!path || path.segments.length < 2) return;

    let maxDistance = 0;
    for (let i = 1; i < path.segments.length; i++) {
      const s = path.segments[i];
      const prev = path.segments[i - 1];
      const dist = Helpers.dist(s.point.x, s.point.y, prev.point.x, prev.point.y);
      if (dist > maxDistance) maxDistance = dist;
    }

    if (maxDistance > 0 && (maxDistance < 1 || maxDistance > 25)) {
      const factor = 10 / maxDistance;
      const center = path.bounds.center.clone();
      path.scale(factor, center);
      path.simplify(tolerance);
      path.scale(1 / factor, center);
    } else {
      path.simplify(tolerance);
    }
  }

  async saveDrawings(layer) {
    if (!super.saveDrawings()) return;
    if (this.capturedPoints.length < 2) return;
    if (this.saving) return;

    this.saving = true;
    const doc = this.toDrawingDocument(layer);
    this.capturedPoints = [];
    this.saving = false;
    await Meteor.callAsync('saveDrawings', doc);
  }

  eraseCircle(drawing, x, y, size, changes) {
    const { points } = drawing;
    let changed = false;
    const remainingPoints = [];
    const removedPoints = [];

    for (const point of points) {
      if (Helpers.dist(point.x, point.y, x, y) < size) {
        removedPoints.push(point);
        changed = true;
      } else {
        remainingPoints.push(point);
      }
    }

    if (changed) {
      const drawings = { style: drawing.style, points: removedPoints };
      if (remainingPoints.length < 2) {
        changes.push({ id: drawing._id, type: 'removed', drawings });
      } else {
        changes.push({ id: drawing._id, $set: { points: remainingPoints }, drawings });
      }
    }
    return changed;
  }

  eraseRectangle(drawing, x, y, width, height, changes) {
    const { points } = drawing;
    let changed = false;
    const remainingPoints = [];
    const removedPoints = [];

    for (const point of points) {
      if (point.x >= x && point.x <= x + width &&
          point.y >= y && point.y <= y + height) {
        removedPoints.push(point);
        changed = true;
      } else {
        remainingPoints.push(point);
      }
    }

    if (changed) {
      const drawings = { style: drawing.style, points: removedPoints };
      if (remainingPoints.length < 2) {
        changes.push({ id: drawing._id, type: 'removed', drawings });
      } else {
        changes.push({ id: drawing._id, $set: { points: remainingPoints }, drawings });
      }
    }
    return changed;
  }

  async scaleAndSaveDrawing(drawing, from, dest) {
    const transformedPoints = drawing.points.map(p => ({
      x: dest.toTrueX(from.scale * (p.x + from.offsetX)),
      y: dest.toTrueY(from.scale * (p.y + from.offsetY)),
      p: p.p,
      t: p.t,
    }));

    const adjustedStyle = {
      ...drawing.style,
      scale: dest.scale * drawing.style.scale / from.scale,
    };

    await this.saveDoc({
      points: transformedPoints,
      style: adjustedStyle,
      bookId: dest.bookId,
      layerIndex: dest.index,
    });
  }

  changePressure(drawing, scaleAmount) {
    drawing.style.size *= scaleAmount;
    if (drawing.style.size < 0.5) drawing.style.size = 0.5;
  }

  boundingBox(drawing, layer, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
    for (const point of drawing.points) {
      const screenX = layer.toScreenX(point.x);
      const screenY = layer.toScreenY(point.y);
      if (screenX < minX) minX = screenX;
      if (screenY < minY) minY = screenY;
      if (screenX > maxX) maxX = screenX;
      if (screenY > maxY) maxY = screenY;
    }
    return { minX, minY, maxX, maxY };
  }
}
