const imageTracer = require('./lib/imagetracer');

export default class Board {
  constructor() {
    this.drawings = [];
    const storage = localStorage.getItem('drawings');
    if (storage) this.drawings = JSON.parse(storage);
    this.lines = [];
    this.pressure = 2;
    this.eraserSize = 20;

    // disable right clicking
    document.oncontextmenu = () => false;

    // coordinates of our cursor
    this.cursorX = 0;
    this.cursorY = 0;
    this.prevCursorX = 0;
    this.prevCursorY = 0;

    // distance from origin
    this.offsetX = 0;
    this.offsetY = 0;

    // zoom amount
    this.scale = 1;

    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    // this.ctx.lineCap = 'round';
    // this.ctx.lineJoin = 'round';

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.addEventListener(
      'pointerdown',
      this.onMouseDown.bind(this),
      false,
    );
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener(
      'pointerout',
      this.onMouseUp.bind(this),
      false,
    );
    this.canvas.addEventListener(
      'pointermove',
      this.onMouseMove.bind(this),
      false,
    );
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    this.redrawCanvas();

    const self = this;
    // if the window changes size, redraw the canvas
    window.addEventListener('resize', () => {
      self.redrawCanvas();
    });
  }

  onKeyDown(event) {
    if (event.repeat) return;
    // console.log('down', event);
    if (event.key === 'z' && event.metaKey) this.undo();
    else if (event.key === 'z') this.startPan(event);
    else if (event.key === 'a') this.startZooming();
    else if (event.key === 'e') this.reset();
    else if (event.key === 'r') this.startEraser();
    else if (event.key === 'd') this.startStraightLine(event);
  }

  onKeyUp(event) {
    if (event.repeat) return;
    // console.log('up', event);
    if (event.keyCode === 27) this.clear();
    else if (event.key === 'z') this.stopPan(event);
    else if (event.key === '+') this.zoomStep(1.2);
    else if (event.key === 'a') this.stopZooming();
    else if (event.key === 'r') this.stopEraser(event);
    else if (event.key === 'd') this.stopStraightLine();
  }

  startPan(event) {
    this.updateCursorPos(event);
    this.panning = true;
  }

  stopPan() {
    this.panning = false;
    this.redrawCanvas();
  }

  startZooming() {
    this.zooming = true;
    this.startX = this.cursorX;
    this.startY = this.cursorY;
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
  }

  stopZooming() {
    this.zooming = false;
    this.redrawCanvas();
  }

  saveLines() {
    if (this.lines.length) {
      this.drawings.push(this.lines);
      // this.toSVG(this.lines);
      localStorage.setItem('drawings', JSON.stringify(this.drawings));
    }
    this.lines = [];
  }

  startStraightLine(event) {
    this.saveLines();
    this.updateCursorPos(event);
    this.pressure = 2;
    this.straightLine = true;
  }

  stopStraightLine() {
    this.straightLine = false;
    this.redrawCanvas();
  }

  startEraser() {
    this.saveLines();
    this.eraser = true;
  }

  stopEraser(event) {
    this.eraser = false;
    this.updateCursorPos(event);
    this.redrawCanvas();
  }

  reset() {
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.redrawCanvas();
  }

  clear() {
    this.drawings = [];
    this.reset();
  }

  undo() {
    this.drawings.pop();
    this.redrawCanvas();
  }

  updateCursorPos(event) {
    this.prevCursorX = this.cursorX;
    this.prevCursorY = this.cursorY;
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;
  }

  onMouseDown(event) {
    this.updateCursorPos(event);
    this.lines = [];

    // detect left clicks
    if (event.button === 0) {
      this.leftMouseDown = true;
      this.rightMouseDown = false;
      this.type = 0;
    }
    // detect right clicks
    if (event.button === 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event);
    }
  }

  onMouseUp() {
    this.saveLines();
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.type = 2;
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

  toSVG() {
    const { minX, minY, maxX, maxY } = this.boundingBox();
    const data = this.ctx.getImageData(minX, minY, maxX - minX, maxY - minY);
    const svg = imageTracer.imagedataToTracedata(data);
    console.log(svg);
    // svg.data.forEach(d => {
    //   const path = d;
    //   this.drawings.push(path);
    // });
  }

  dist(x1, y1, x2, y2, atScale = true) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2) * (atScale ? this.scale : 1);
  }

  onMouseMove(event) {
    // get mouse position
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;

    const scaledX = this.toTrueX(this.cursorX);
    const scaledY = this.toTrueY(this.cursorY);
    const prevScaledX = this.toTrueX(this.prevCursorX);
    const prevScaledY = this.toTrueY(this.prevCursorY);

    this.pressure = event.pressure * 5;

    const dist = this.dist(this.cursorX, this.cursorY, this.prevCursorX, this.prevCursorY, false);

    if (this.zooming) {
      if (dist > 10) {
        this.mouseZoom(event);
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
      }
      return;
    }

    if (this.panning) {
      if (dist > 10) {
        this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
        this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
        this.redrawCanvas();
        this.prevCursorX = this.cursorX;
        this.prevCursorY = this.cursorY;
      }
      return;
    }

    // console.log(this.pressure);

    // if (event.pressure < 0.1) return;

    if (this.eraser) {
      this.drawEraser(this.cursorX, this.cursorY);
      for (let i = 0; i < this.drawings.length; i++) {
        const path = this.drawings[i];
        for (let j = 0; j < path.length; j++) {
          const line = path[j];
          if (this.dist(line.x0, line.y0, scaledX, scaledY) < this.eraserSize ||
            this.dist(line.x1, line.y1, scaledX, scaledY) < this.eraserSize) {
            path.splice(j, 1);
            j--;
          }
          if (path.length === 0) {
            this.drawings.splice(i, 1);
            i--;
          }
        }
      }
      // this.redrawCanvas();
      return;
    }

    if (this.straightLine) {
      if (this.leftMouseDown) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.prevCursorX, this.prevCursorY);
        this.ctx.lineTo(this.cursorX, this.cursorY);
        this.ctx.stroke();
        this.ctx.closePath();
      }
      return;
    }

    // drawing
    if (this.leftMouseDown) {
      // if (dist < 3) return;
      const color = '#000';

      // add the line to our drawing history
      this.lines.push({
        scale: this.scale,
        pressure: this.pressure,
        x0: prevScaledX,
        y0: prevScaledY,
        x1: scaledX,
        y1: scaledY,
        color,
        type: this.type,
      });
      this.type = 1;

      // draw a line
      this.drawLine(this.prevCursorX, this.prevCursorY, this.cursorX, this.cursorY, this.pressure, color);

      // console.log('move',cursorX, cursorY);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
    }
  }

  drawEraser(x, y) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, this.eraserSize, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fill();
    this.ctx.closePath();
  }

  onMouseWheel(event) {
    this.zoom(event);
  }

  zoomStep(step) {
    console.log(step);
    this.scale *= step;
    this.redrawCanvas();
  }

  mouseZoom() {
    const reverse = Math.sign(this.prevCursorY - this.cursorY);
    // const deltaX = Math.abs(this.startX - this.cursorX);
    const deltaY = Math.abs(this.startY - this.cursorY);
    const scaleAmount = reverse * deltaY / 5000;
    this.scale *= (1 + scaleAmount);

    const distX = this.startX / this.canvas.clientWidth;
    const distY = this.startY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redrawCanvas();
  }

  zoom(event) {
    const { deltaY } = event;
    const scaleAmount = -deltaY / 500;
    this.scale *= (1 + scaleAmount);

    const distX = event.pageX / this.canvas.clientWidth;
    const distY = event.pageY / this.canvas.clientHeight;

    // calculate how much we need to zoom
    const unitsZoomedX = this.trueWidth() * scaleAmount;
    const unitsZoomedY = this.trueHeight() * scaleAmount;

    const unitsAddLeft = unitsZoomedX * distX;
    const unitsAddTop = unitsZoomedY * distY;

    this.offsetX -= unitsAddLeft;
    this.offsetY -= unitsAddTop;

    this.redrawCanvas();
  }

  drawLine(x0, y0, x1, y1, lineWidth, color = '#000') {
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.stroke();
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

  drawSLine(index) {
    const segment = this.drawings[index];

    for (let j = 0; j < segment.length; j++) {
      const line = segment[j];
      const ratio = this.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        this.drawLine(
          this.toScreenX(line.x0),
          this.toScreenY(line.y0),
          this.toScreenX(line.x1),
          this.toScreenY(line.y1),
          // this.scale / line.scale > 1 ?
          //   line.pressure * Math.min(this.scale / line.scale, 2) :
          //   line.pressure * (this.scale / line.scale),
          line.pressure * ratio,
          line.color,
        );
      }
    }
  }

  drawPath(index) {
    const segment = this.drawings[index];

    // this.ctx.lineWidth = line.pressure * ratio;
    this.ctx.beginPath();
    this.ctx.moveTo(this.toScreenX(segment[0].x0), this.toScreenY(segment[0].y0));

    for (let j = 0; j < segment.length; j++) {
      const line = segment[j];
      const ratio = this.scale / line.scale;
      if (ratio > 0.005 && ratio < 400) {
        this.ctx.strokeStyle = this.color;
        if (this.notDrawing()) this.ctx.lineWidth = 1;
        else this.ctx.lineWidth = line.pressure * ratio;
        this.ctx.lineTo(this.toScreenX(line.x1), this.toScreenY(line.y1));
        this.ctx.stroke();
      }
    }
    this.ctx.closePath();
  }

  notDrawing() {
    return this.zooming || this.panning;
  }

  redrawCanvas() {
    if (this.redrawing) return;
    this.redrawing = true;
    // console.log('redraw');

    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.drawings.length; i++) {
      const line = this.drawings[i][0];
      const ratio = this.scale / line.scale;
      if (this.notDrawing() || ratio > 2) this.drawPath(i);
      else this.drawSLine(i);
    }

    this.infos();
    this.redrawing = false;
  }

  infos() {
    this.ctx.font = 'Calibri';
    this.ctx.fillStyle = '#999';
    this.ctx.fillText('Scale', 10, 10);
    this.ctx.fillText(this.scale, 90, 10);
    this.ctx.fillText('Lines', 10, 25);
    this.ctx.fillText(this.drawings.length, 90, 25);
  }
}
