import Layer from './layer';
import { Lines } from '../api/books/collections';

export default class SelectionLayer extends Layer {
  constructor(manager, index) {
    super(manager, index);

    // this.ctx.font = 'Calibri';
    // this.ctx.fillStyle = '#f00';

    this.canvas.addEventListener('keydown', () => console.log('selectionLayer keydown'), false);
  }

  redraw() {
    // console.log('redraw selection');
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
