export default class Layer {
  constructor(manager, index, bookId) {
    this.manager = manager;
    this.index = index;
    this.bookId = bookId;

    this.canvas = document.createElement('canvas');
    // this.canvas.style.zIndex = index + 1;
    this.canvas.tabIndex = index;
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

    // this.selCanvas = document.getElementById('selection');
    // this.selCtx = this.selCanvas.getContext('2d');

    // if the window changes size, redraw the canvas
    window.addEventListener('resize', () => this.redraw());
  }

  destroy() {
    this.el.removeChild(this.canvas);
  }

  focus() {
    this.canvas.focus();
  }

  redraw() {
    console.log('redraw base');
  }

  drawLine(x0, y0, x1, y1, lineWidth, color = '#000', ctx = this.ctx) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  updateCursorPos(event) {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;
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
