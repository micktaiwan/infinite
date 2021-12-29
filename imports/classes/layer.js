export default class Layer {
  constructor(manager, _id, fields) {
    this._id = _id;
    this.manager = manager;
    this.index = fields?.index;
    this.bookId = manager.bookId;
    this.lines = [];
    this.userId = Meteor.userId();

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.tabIndex = this.index + 1;
    this.ctx = this.canvas.getContext('2d');
    this.el = document.getElementById('layers');
    this.el.appendChild(this.canvas);
    this.canvas.width = window.innerWidth - 51;
    this.canvas.height = window.innerHeight;

    this.ctx.lineCap = 'round';
    // this.ctx.lineJoin = 'round';

    // distance from origin
    this.offsetX = 0;
    this.offsetY = 0;

    this.marginLeft = 50;

    // this.selCanvas = document.getElementById('selection');
    // this.selCtx = this.selCanvas.getContext('2d');

    // if the window changes size, redraw the canvas
    window.addEventListener('resize', () => this.redraw());
  }

  destroy() {
    this.destroyed = true;
    this.el.removeChild(this.canvas);
  }

  toScreenX(xTrue) {
    return (xTrue + this.offsetX) * this.scale;
  }

  toScreenY(yTrue) {
    return (yTrue + this.offsetY) * this.scale;
  }

  toTrueX(xScreen) {
    return xScreen / this.scale - this.offsetX;
  }

  toTrueY(yScreen) {
    return yScreen / this.scale - this.offsetY;
  }

  trueHeight() {
    return this.canvas.clientHeight / this.scale;
  }

  trueWidth() {
    return this.canvas.clientWidth / this.scale;
  }

  dist(x1, y1, x2, y2, atScale = true) {
    return Layer.dist(x1, y1, x2, y2) * (atScale ? this.scale : 1);
  }

  // lineInsideSelection(line) {
  //   const { x, y, width, height } = this.selection;
  //   return line.x0 >= x && line.x0 <= x + width && line.y0 >= y && line.y0 <= y + height && line.x1 >= x && line.x1 <= x + width && line.y1 >= y && line.y1 <= y + height;
  // }

  insideSelection(px, py) {
    const { x, y, width, height } = this.selection;
    return px >= x && px <= x + width && py >= y && py <= y + height;
  }

  startPan() {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.hasMoved = false;
    this.canvas.style.cursor = 'move';
    this.panning = true;
  }

  stopPan() {
    this.canvas.style.cursor = 'default';
    this.panning = false;
    if (this.hasMoved) this.redraw();
  }

  focusCanvas() {
    this.canvas.focus();
  }

  drawLine(x0, y0, x1, y1, lineWidth, color = '#000', ctx = this.ctx) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = this.randomColor ? `#${Math.floor(Math.random() * 16777215).toString(16)}` : color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  reset(redraw = true) {
    if (this.destroyed) return;
    console.log('reset', this.canvas.id);
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    if (redraw) this.redraw();
  }

  copyPosition(layer) {
    this.offsetX = layer.offsetX;
    this.offsetY = layer.offsetY;
    this.scale = layer.scale;
  }

  updateCursorPos(event) {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.cursorX = event.clientX - this.marginLeft;
    this.cursorY = event.clientY;
  }

  boundingBox() {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < this.lines.length; i++) {
      if (this.lines[i].x0 < minX) minX = this.lines[i].x0;
      if (this.lines[i].y0 < minY) minY = this.lines[i].y0;
      if (this.lines[i].x1 > maxX) maxX = this.lines[i].x1;
      if (this.lines[i].y1 > maxY) maxY = this.lines[i].y1;
    }
    return { minX, minY, maxX, maxY };
  }

  // toSVG() {
  //   const { minX, minY, maxX, maxY } = this.boundingBox();
  //   const data = this.ctx.getImageData(minX, minY, maxX - minX, maxY - minY);
  //   const svg = imageTracer.imagedataToTracedata(data);
  //   console.log(svg);
  //   svg.data.forEach(d => {
  //   const path = d;
  //   this.drawings.push(path);
  //   });
  // }

  static dist(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }
}

if (module.hot) {
  module.hot.decline();
}
