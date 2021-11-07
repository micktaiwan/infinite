export class Board {
  constructor() {

    this.drawings = [];
    this.pressure = 2;

    // disable right clicking
    document.oncontextmenu = () => {
      return false;
    }

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
    this.canvas.addEventListener('pointerdown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('pointerup', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointerout', this.onMouseUp.bind(this), false);
    this.canvas.addEventListener('pointermove', this.onMouseMove.bind(this), false);
    this.canvas.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    this.redrawCanvas();

    const self = this;
    // if the window changes size, redraw the canvas
    window.addEventListener("resize", (event) => {
      self.redrawCanvas();
    });

  }

  onMouseDown(event) {
    // console.log('down');
    // console.log(event);
    // detect left clicks
    if (event.button == 0) {
      this.leftMouseDown = true;
      this.rightMouseDown = false;
    }
    // detect right clicks
    if (event.button == 2) {
      this.rightMouseDown = true;
      this.leftMouseDown = false;
    }

    // update the cursor coordinates
    this.cursorX = event.pageX;
    this.cursorY = event.pageY;
    this.prevCursorX = event.pageX;
    this.prevCursorY = event.pageY;
    // console.log('down',cursorX, cursorY);
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
    // console.log(this.pressure);

    const dist = this.dist(this.cursorX, this.cursorY, this.prevCursorX, this.prevCursorY);

    if (this.leftMouseDown && dist > 2) {
      // console.log(event.tiltX, event.tiltY, event.twist, event.azimuthAngle);

      // add the line to our drawing history
      this.drawings.push({
        scale: this.scale,
        pressure: this.pressure,
        x0: prevScaledX,
        y0: prevScaledY,
        x1: scaledX,
        y1: scaledY
      })
      // draw a line
      this.drawLine(this.pressure, this.prevCursorX, this.prevCursorY, this.cursorX, this.cursorY);
      // console.log('move',cursorX, cursorY);
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
    }
    if (this.rightMouseDown) {
      // move the screen
      this.offsetX += (this.cursorX - this.prevCursorX) / this.scale;
      this.offsetY += (this.cursorY - this.prevCursorY) / this.scale;
      this.redrawCanvas();
      this.prevCursorX = this.cursorX;
      this.prevCursorY = this.cursorY;
    }
  }

  onMouseUp() {
    // console.log('up');
    this.leftMouseDown = false;
    this.rightMouseDown = false;
  }

  onMouseWheel(event) {
    this.zoom(event);
  }

  zoom(event) {
    const deltaY = event.deltaY;
    const scaleAmount = -deltaY / 500;
    this.scale = this.scale * (1 + scaleAmount);
    // console.log(this.scale);

    // zoom the page based on where the cursor is
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

  drawLine(pressure, x0, y0, x1, y1) {
    this.ctx.beginPath();
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = pressure;
    this.ctx.stroke();
  }

  toScreenX(xTrue) {
    return (xTrue + this.offsetX) * this.scale;
  }

  toScreenY(yTrue) {
    return (yTrue + this.offsetY) * this.scale;
  }

  toTrueX(xScreen) {
    return (xScreen / this.scale) - this.offsetX;
  }

  toTrueY(yScreen) {
    return (yScreen / this.scale) - this.offsetY;
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
    let skipped = 0;
    for (let i = 0; i < this.drawings.length; i++) {
      const line = this.drawings[i];
      if (this.scale / line.scale > 0.005)
        this.drawLine(line.pressure, this.toScreenX(line.x0), this.toScreenY(line.y0), this.toScreenX(line.x1), this.toScreenY(line.y1));
      else
        skipped++;
    }
    // console.log(skipped);
  }


};
