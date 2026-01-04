export default class Brush {
  constructor() {
    this.type = 'generic';
    this.options = {
      maxSize: 3,
      minSensitivity: 0,
    };
    this.capturedPoints = [];
    this.strokeStartTime = 0;
  }

  setOptions(options) {
    Object.assign(this.options, options);
  }

  sensitivityOverflow(pressure) {
    return pressure < this.options.minSensitivity;
  }

  saveDrawings() {
    // Use this.type to verify brush is initialized before saving
    if (!this.type) return false;
    return Meteor.userId();
  }

  mouseDown(layer) {
    this.capturedPoints = [];
    this.strokeStartTime = Date.now();
    this.capturePoint(layer);
  }

  mouseUp() {
    // Reset state after stroke completion
    this.strokeStartTime = 0;
  }

  capturePoint(layer) {
    this.capturedPoints.push({
      x: layer.trueX,
      y: layer.trueY,
      p: layer.pressure / this.options.maxSize,
      t: Date.now() - this.strokeStartTime,
    });
  }

  getStyle(layer) {
    return {
      brush: this.type,
      color: layer.color,
      size: this.options.maxSize,
      scale: layer.scale,
    };
  }

  toDrawingDocument(layer) {
    return {
      points: this.capturedPoints,
      style: this.getStyle(layer),
      bookId: layer.bookId,
      layerIndex: layer.index,
    };
  }

  async saveDoc(doc) {
    // Verify brush type before saving
    if (!this.type) return;
    if (!Meteor.userId()) return;
    await Meteor.callAsync('saveDrawings', doc);
  }
}
