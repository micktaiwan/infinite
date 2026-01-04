import Brush from './brush';
import Helpers from '../helpers';

export default class LinesBrush extends Brush {
  constructor() {
    super();
    this.type = 'lines';
    this.name = 'Simple Brush';
  }

  draw(layer) {
    this.capturePoint(layer);
    layer.drawLine(
      layer.prevCursorX,
      layer.prevCursorY,
      layer.cursorX,
      layer.cursorY,
      layer.pressure,
      layer.color,
    );
  }

  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const ratio = layer.scale / style.scale;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const pressure = p1.p * style.size * ratio;

      if (pressure < 0.01 || pressure > 1000) continue;

      layer.drawLine(
        layer.toScreenX(p0.x),
        layer.toScreenY(p0.y),
        layer.toScreenX(p1.x),
        layer.toScreenY(p1.y),
        pressure,
        style.color,
      );
    }
  }

  async saveDrawings(layer) {
    if (!super.saveDrawings()) return;
    if (this.capturedPoints.length < 2) return;

    const doc = this.toDrawingDocument(layer);
    await Meteor.callAsync('saveDrawings', doc);
    this.capturedPoints = [];
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

  scaleAndSaveDrawing(drawing, from, dest) {
    const transformedPoints = drawing.points.map(p => ({
      x: dest.toTrueX(from.scale * (p.x + from.offsetX)),
      y: dest.toTrueY(from.scale * (p.y + from.offsetY)),
      p: p.p,
      t: p.t,
    }));

    for (let i = 0; i < transformedPoints.length; i += 100) {
      const chunk = transformedPoints.slice(i, Math.min(i + 100, transformedPoints.length));
      if (chunk.length >= 2) {
        this.capturedPoints = chunk;
        this.saveDrawings(dest);
      }
    }
  }

  changePressure(drawing, scaleAmount) {
    for (const point of drawing.points) {
      point.p *= scaleAmount;
      if (point.p < 0.01) point.p = 0.01;
      if (point.p > 1) point.p = 1;
    }
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
