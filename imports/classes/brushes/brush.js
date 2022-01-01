export default class Brush {
  constructor() {
    this.type = 'generic';
    this.minSize = 0;
    this.maxSize = 3;
    this.minSensitivity = 0.1;
  }

  setOptions(options) {
    this.minSize = options.minSize || this.minSize;
    this.maxSize = options.maxSize || this.maxSize;
    this.minSensitivity = options.minSensitivity || this.minSensitivity;
  }
}
