import LinesBrush from './lines';

export default class ShakyBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'shaky';
    this.name = 'Shaky';
  }

  // Simple PRNG for deterministic results
  seededRandom(seed) {
    const x = Math.sin(seed * 9999) * 10000;
    return x - Math.floor(x);
  }

  draw(layer) {
    this.capturePoint(layer);

    const randX = Math.random() * this.options.maxSize / layer.scale;
    const randY = Math.random() * this.options.maxSize / layer.scale;

    layer.drawLine(
      layer.prevCursorX,
      layer.prevCursorY,
      layer.cursorX + randX * layer.scale,
      layer.cursorY + randY * layer.scale,
      layer.pressure * (Math.random() + 0.1),
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

      // Seeded PRNG based on timestamp for deterministic offsets
      const seed0 = p0.t || i - 1;
      const seed1 = p1.t || i;
      const rand0X = this.seededRandom(seed0) * style.size / layer.scale;
      const rand0Y = this.seededRandom(seed0 + 1000) * style.size / layer.scale;
      const rand1X = this.seededRandom(seed1) * style.size / layer.scale;
      const rand1Y = this.seededRandom(seed1 + 1000) * style.size / layer.scale;
      const randPressure = this.seededRandom(seed1 + 2000) + 0.1;

      const pressure = p1.p * style.size * ratio * randPressure;
      if (pressure < 0.01 || pressure > 1000) continue;

      layer.drawLine(
        layer.toScreenX(p0.x + rand0X),
        layer.toScreenY(p0.y + rand0Y),
        layer.toScreenX(p1.x + rand1X),
        layer.toScreenY(p1.y + rand1Y),
        pressure,
        style.color,
      );
    }
  }
}
