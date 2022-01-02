import LinesBrush from './lines';
import { Drawings } from '../../api/books/collections';
import Helpers from '../helpers';

export default class ShakyBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'shaky';
    this.name = 'Shaky';
    this.lines = [];
  }

  // create a new drawing
  draw(layer) {
    const randX = Math.random() * this.options.maxSize / layer.scale;
    const randY = Math.random() * this.options.maxSize / layer.scale;
    const scaledX = layer.trueX + randX;
    const scaledY = layer.trueY + randY;
    layer.cursorX = layer.toScreenX(scaledX);
    layer.cursorY = layer.toScreenY(scaledY);
    const prevScaledX = layer.toTrueX(layer.prevCursorX);
    const prevScaledY = layer.toTrueY(layer.prevCursorY);

    this.straitLine(layer, {
      scale: layer.scale,
      pressure: layer.pressure * (Math.random() + 0.1),
      x0: prevScaledX,
      y0: prevScaledY,
      x1: scaledX,
      y1: scaledY,
      color: layer.color,
    });
  }
}
