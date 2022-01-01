export default class Brush {
  constructor() {
    this.type = 'generic';
    this.minSize = 0;
    this.maxSize = 3;
    this.minSensitivity = 0;
  }

  setOptions(options) {
    this.minSize = (options.minSize === 0 || options.minSize) ? options.minSize : this.minSize;
    this.maxSize = (options.maxSize === 0 || options.maxSize) ? options.maxSize : this.maxSize;
    this.minSensitivity = (options.minSensitivity === 0 || options.minSensitivity) ? options.minSensitivity : this.minSensitivity;
  }

  sensitivityOverflow(pressure) {
    return pressure < this.minSensitivity;
  }
}
