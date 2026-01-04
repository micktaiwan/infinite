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
    return Meteor.userId();
  }

  mouseDown(layer) {
    this.capturedPoints = [];
    this.strokeStartTime = Date.now();
    this.capturePoint(layer);
  }

  mouseUp(layer) {
    // Handled in subclasses for saveDrawings
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

  // eslint-disable-next-line class-methods-use-this
  async saveDoc(doc) {
    if (!Meteor.userId()) return;
    await Meteor.callAsync('saveDrawings', doc);
  }
}
