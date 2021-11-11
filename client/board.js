export class Board {
  constructor() {
    this.drawings = [];
    this.pressure = 2;

    // disable right clicking
    document.oncontextmenu = () => {
      return false;
    };

    // coordinates of our cursor
    this.cursorX;
    this.cursorY;
    this.prevCursorX;
    this.prevCursorY;

    // distance from origin
    this.offsetX = 0;
    this.offsetY = 0;

    // zoom amount
    this.scale = 1;

    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.canvas.addEventListener(
      'pointerdown',
      this.onMouseDown.bind(this),
      false
    );
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener(
      'pointerout',
      this.onMouseUp.bind(this),
      false
    );
    this.canvas.addEventListener(
      'pointermove',
      this.onMouseMove.bind(this),
      false
    );
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    document.addEventListener('keyup', this.onKeyUp.bind(this), false);
    document.addEventListener('keydown', this.onKeyDown.bind(this), false);
    this.redrawCanvas();

    const self = this;
    // if the window changes size, redraw the canvas
    window.addEventListener('resize', (event) => {
      self.redrawCanvas();
    });
  }

  onKeyDown(event) {
    if(event.repeat) return;
    // console.log('down', event);
    if (event.key === 'z' && event.metaKey) this.undo();
    else if (event.key === 'z') this.startPan(event);
    else if (event.key === 'a') this.startZooming();
    else if (event.key === 'e') this.reset();
    return false;
  }

  onKeyUp(event) {
    if(event.repeat) return;
    // console.log('up', event);
    if (event.keyCode === 27) this.clear();
    else if (event.key === 'z') this.stopPan(event);
    else if (event.key === '+') this.zoomStep(1.2);
    else if (event.key === 'a') this.stopZooming();
    return false;
  }

  startPan(event) {
    this.updateCursorPos(event);
    this.panning = true;
  }

  stopPan(event) {
    this.panning = false;
    this.updateCursorPos(event);
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
    // update the cursor coordinates
    this.updateCursorPos(event);

    // detect left clicks
    if (event.button == 0) {
      this.leftMouseDown = true;
      this.rightMouseDown = false;
      this.type = 0;
    }
    // detect right clicks
    if (event.button == 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
      this.type = 3;
      this.startPan(event)
    }
  }

  onMouseUp(event) {
    this.leftMouseDown = false;
    this.rightMouseDown = false;
    this.type = 2;
    this.stopPan(event);
  }

  dist(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
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

    const dist = this.dist(
      this.cursorX,
      this.cursorY,
      this.prevCursorX,
      this.prevCursorY
    );

    if(this.zooming && dist > 2) {
      this.mouseZoom(event);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
      return;
    }

    if (this.panning && dist > 2) {
      this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
      this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
      this.redrawCanvas();
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
      return;
    }

    // console.log(this.pressure);

    if (this.leftMouseDown && dist > 2) {
      const color = '#000';

      // add the line to our drawing history
      this.drawings.push({
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
      this.drawLine(
        this.prevCursorX,
        this.prevCursorY,
        this.cursorX,
        this.cursorY,
        this.pressure,
        color
      );
      // console.log('move',cursorX, cursorY);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
    }
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
    const deltaX = Math.abs(this.startX - this.cursorX);
    const deltaY = Math.abs(this.startY - this.cursorY);
    const scaleAmount = reverse * deltaY / 5000;
    this.scale = this.scale * (1 + scaleAmount);

    var distX = this.startX / canvas.clientWidth;
    var distY = this.startY / canvas.clientHeight;

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
    const deltaY = event.deltaY;
    const scaleAmount = -deltaY / 500;
    this.scale = this.scale * (1 + scaleAmount);

    var distX = event.pageX / canvas.clientWidth;
    var distY = event.pageY / canvas.clientHeight;

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
    return canvas.clientHeight / this.scale;
  }

  trueWidth() {
    return canvas.clientWidth / this.scale;
  }

  redrawCanvas() {
    // console.log('redraw');
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < this.drawings.length; i+=this.panning ? 2 : 1) {
      const line = this.drawings[i];
      const p = this.scale / line.scale;

      if (p > 0.005 && p < 400)
        this.drawLine(
          this.toScreenX(line.x0),
          this.toScreenY(line.y0),
          this.toScreenX(line.x1),
          this.toScreenY(line.y1),
          this.scale / line.scale > 1
            ? line.pressure * Math.min(this.scale / line.scale, 2)
            : line.pressure * (this.scale / line.scale),
          line.color
        );
    }

    this.infos();
  }

  infos() {
    this.ctx.font = 'Calibri';
    this.ctx.fillStyle = '#999';
    this.ctx.fillText('Scale', 10, 10);
    this.ctx.fillText(this.scale, 90, 10);
    this.ctx.fillText('Points', 10, 25);
    this.ctx.fillText(this.drawings.length, 90, 25);
  }
}
