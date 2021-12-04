import Layer from './layer';
import { Lines } from '../api/books/collections';

export default class SelectionLayer extends Layer {
  constructor(manager) {
    super(manager, manager.bookId);

    // this.ctx.font = 'Calibri';
    // this.ctx.fillStyle = '#f00';

    this.canvas.addEventListener('keydown', () => console.log('selectionLayer keydown'), false);
    this.redraw();
  }

  redraw() {
    // console.log('redraw selection');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // template (draw horizontal lines to guide the writing)
    this.ctx.strokeStyle = '#ddd';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let i = 0; i < this.canvas.height; i += 40) {
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }

  infos() {
    this.selCtx.fillText('Scale', 10, 10);
    this.selCtx.fillText(this.scale, 90, 10);
    this.selCtx.fillText('Lines', 10, 25);
    this.selCtx.fillText(Lines.find().count(), 90, 25);
    // this.selCtx.fillText('Size', 10, 40);
    // this.selCtx.fillText(`${Math.round(JSON.stringify(this.drawings).length / 1024)} KB`, 90, 40);
  }
}
