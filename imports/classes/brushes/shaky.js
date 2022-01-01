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
    const scaledX = layer.toTrueX(layer.cursorX) + Math.random() * this.options.maxSize / layer.scale;
    const scaledY = layer.toTrueY(layer.cursorY) + Math.random() * this.options.maxSize / layer.scale;
    const prevScaledX = layer.toTrueX(layer.prevCursorX);
    const prevScaledY = layer.toTrueY(layer.prevCursorY);
    layer.cursorX = layer.toScreenX(scaledX);
    layer.cursorY = layer.toScreenY(scaledY);

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
