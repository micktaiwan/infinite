export default class Brush {
  constructor() {
    this.type = 'generic';
    this.options = {
      maxSize: 3,
      minSensitivity: 0,
    };
  }

  setOptions(options) {
    _.extend(this.options, options);
  }

  sensitivityOverflow(pressure) {
    return pressure < this.options.minSensitivity;
  }

  saveDrawings() {
    return Meteor.userId();
  }

  mouseDown(layer) {
    // console.log('Brush: mouse down');
  }

  mouseUp(layer) {
    // console.log('Brush: mouse up');
  }
}
