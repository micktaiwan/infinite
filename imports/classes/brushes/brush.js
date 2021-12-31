export default class Brush {
  constructor(layer) {
    this.layer = layer;
    this.type = 'generic';
    this.minSize = 0;
    this.maxSize = 3;
    this.minSensitivity = 0.1;
  }

  draw() {
    console.log('Brush: draw', this.name);
  }
}
