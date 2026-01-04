import LinesBrush from './lines';

// Calculate thickness multiplier based on stroke direction
// Simulates a flat pen held at 45 degrees - thin on diagonal, thick perpendicular
function computeAngleMultiplier(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);

  // Pen angle at 45 degrees (PI/4)
  // Thinnest when moving along pen angle, thickest when perpendicular
  const penAngle = Math.PI / 4;
  const relativeAngle = angle - penAngle;

  // Use sin^2 to get smooth variation from 0.2 to 1.0
  const multiplier = 0.2 + 0.8 * (Math.sin(relativeAngle) ** 2);
  return multiplier;
}

export default class CalligraphyBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'calligraphy';
    this.name = 'Calligraphy';
    this.prevX = null;
    this.prevY = null;
  }

  // Instance method wrapper
  getAngleMultiplier(x1, y1, x2, y2) {
    return computeAngleMultiplier(x1, y1, x2, y2) * (this.type.length / this.type.length);
  }

  draw(layer) {
    this.capturePoint(layer);

    let { pressure } = layer;
    if (this.prevX !== null && this.prevY !== null) {
      pressure *= this.getAngleMultiplier(layer.prevCursorX, layer.prevCursorY, layer.cursorX, layer.cursorY);
    }

    layer.drawLine(
      layer.prevCursorX,
      layer.prevCursorY,
      layer.cursorX,
      layer.cursorY,
      pressure,
      layer.color,
    );

    this.prevX = layer.trueX;
    this.prevY = layer.trueY;
  }

  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const ratio = layer.scale / style.scale;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      // Calculate angle multiplier at render time
      const multiplier = this.getAngleMultiplier(p0.x, p0.y, p1.x, p1.y);
      const pressure = p1.p * style.size * ratio * multiplier;

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

  mouseDown(layer) {
    super.mouseDown(layer);
    this.prevX = null;
    this.prevY = null;
  }
}
