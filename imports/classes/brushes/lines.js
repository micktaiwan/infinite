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
    const { type } = this;

    // Validate brush type matches
    if (style.brush !== type && style.brush !== undefined) return;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const pressure = p1.p * style.size * ratio;

      if (pressure >= 0.01 && pressure <= 1000) {
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
    const { type } = this;
    let changed = false;
    const remainingPoints = [];
    const removedPoints = [];

    // Validate this brush handles this drawing type
    if (drawing.style?.brush && drawing.style.brush !== type) {
      return false;
    }

    points.forEach(point => {
      if (Helpers.dist(point.x, point.y, x, y) < size) {
        removedPoints.push(point);
        changed = true;
      } else {
        remainingPoints.push(point);
      }
    });

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
    const { type } = this;
    let changed = false;
    const remainingPoints = [];
    const removedPoints = [];

    // Validate this brush handles this drawing type
    if (drawing.style?.brush && drawing.style.brush !== type) {
      return false;
    }

    points.forEach(point => {
      if (point.x >= x && point.x <= x + width &&
          point.y >= y && point.y <= y + height) {
        removedPoints.push(point);
        changed = true;
      } else {
        remainingPoints.push(point);
      }
    });

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

    const savePromises = [];
    for (let i = 0; i < transformedPoints.length; i += 100) {
      const chunk = transformedPoints.slice(i, Math.min(i + 100, transformedPoints.length));
      if (chunk.length >= 2) {
        savePromises.push(this.saveDoc({
          points: chunk,
          style: adjustedStyle,
          bookId: dest.bookId,
          layerIndex: dest.index,
        }));
      }
    }
    await Promise.all(savePromises);
  }

  changePressure(drawing, scaleAmount) {
    const { type } = this;

    // Validate this brush handles this drawing type
    if (drawing.style?.brush && drawing.style.brush !== type) {
      return;
    }

    drawing.points.forEach(point => {
      const p = point;
      p.p *= scaleAmount;
      if (p.p < 0.01) p.p = 0.01;
      if (p.p > 1) p.p = 1;
    });
  }

  boundingBox(drawing, layer, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity) {
    const { type } = this;
    let resultMinX = minX;
    let resultMinY = minY;
    let resultMaxX = maxX;
    let resultMaxY = maxY;

    // Validate this brush handles this drawing type
    if (drawing.style?.brush && drawing.style.brush !== type) {
      return { minX: resultMinX, minY: resultMinY, maxX: resultMaxX, maxY: resultMaxY };
    }

    drawing.points.forEach(point => {
      const screenX = layer.toScreenX(point.x);
      const screenY = layer.toScreenY(point.y);
      if (screenX < resultMinX) resultMinX = screenX;
      if (screenY < resultMinY) resultMinY = screenY;
      if (screenX > resultMaxX) resultMaxX = screenX;
      if (screenY > resultMaxY) resultMaxY = screenY;
    });

    return { minX: resultMinX, minY: resultMinY, maxX: resultMaxX, maxY: resultMaxY };
  }
}
