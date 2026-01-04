import LinesBrush from './lines';

export default class ShakyBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'shaky';
    this.name = 'Shaky';
  }

  capturePoint(layer) {
    const randX = Math.random() * this.options.maxSize / layer.scale;
    const randY = Math.random() * this.options.maxSize / layer.scale;
    const randPressure = Math.random() + 0.1;

    this.capturedPoints.push({
      x: layer.trueX + randX,
      y: layer.trueY + randY,
      p: (layer.pressure / this.options.maxSize) * randPressure,
      t: Date.now() - this.strokeStartTime,
    });
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
}
