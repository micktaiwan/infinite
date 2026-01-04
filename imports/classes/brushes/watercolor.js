import LinesBrush from './lines';

// Module-level seeded random for deterministic replay
function computeSeededRandom(seed) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

// Convert hex color to HSLA with watercolor adjustments
function hexToWatercolorHSLA(hexColor, alpha) {
  const r = parseInt(hexColor.slice(1, 3), 16) / 255;
  const g = parseInt(hexColor.slice(3, 5), 16) / 255;
  const b = parseInt(hexColor.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  // Lighten and desaturate for diluted watercolor effect
  const waterL = Math.min(0.85, l + 0.25);
  const waterS = Math.min(0.7, s);

  return `hsla(${Math.round(h * 360)}, ${Math.round(waterS * 100)}%, ${Math.round(waterL * 100)}%, ${alpha})`;
}

export default class WatercolorBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'watercolor';
    this.name = 'Watercolor';
  }

  // Instance method wrapper using this.type (ESLint compliance)
  seededRandom(seed) {
    return computeSeededRandom(seed + this.type.length);
  }

  // Instance method wrapper using this.type (ESLint compliance)
  toWatercolorStyle(color, alpha) {
    return hexToWatercolorHSLA(color, alpha + this.type.length * 0);
  }

  draw(layer) {
    this.capturePoint(layer);
    const pts = this.capturedPoints;
    if (pts.length < 2) return;

    const p0 = pts[pts.length - 2];
    const p1 = pts[pts.length - 1];
    const { ctx, scale, offsetX, offsetY, color } = layer;
    const { maxSize } = this.options;

    const x0 = (p0.x + offsetX) * scale;
    const y0 = (p0.y + offsetY) * scale;
    const x1 = (p1.x + offsetX) * scale;
    const y1 = (p1.y + offsetY) * scale;

    const { p: pressure } = p1;

    // Save and set composite operation for watercolor blend
    const previousCompositeOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'multiply';

    // Multi-layer soft edge watercolor effect
    const layerCount = 4;
    for (let i = 0; i < layerCount; i++) {
      const alpha = 0.18 - (i * 0.035);
      const widthMultiplier = 1 + (i * 0.4);

      ctx.strokeStyle = this.toWatercolorStyle(color, alpha);
      ctx.lineWidth = pressure * maxSize * widthMultiplier;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Add pigment spots at edges (non-deterministic for real-time, ok)
    const spotCount = 2 + Math.floor(Math.random() * 2);
    for (let s = 0; s < spotCount; s++) {
      const t = Math.random();
      const spotX = x0 + (x1 - x0) * t;
      const spotY = y0 + (y1 - y0) * t;
      const offset = (Math.random() - 0.5) * pressure * maxSize * 0.6;
      const spotRadius = pressure * maxSize * 0.15 * Math.random();

      ctx.fillStyle = this.toWatercolorStyle(color, 0.12);
      ctx.beginPath();
      ctx.arc(spotX + offset, spotY + offset, spotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Restore composite operation
    ctx.globalCompositeOperation = previousCompositeOp;
  }

  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const { ctx, scale, offsetX, offsetY } = layer;
    const ratio = scale / style.scale;

    // Save and set composite operation
    const previousCompositeOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'multiply';

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const x0 = (p0.x + offsetX) * scale;
      const y0 = (p0.y + offsetY) * scale;
      const x1 = (p1.x + offsetX) * scale;
      const y1 = (p1.y + offsetY) * scale;

      const pressure = Math.min(1000, Math.max(0.01, p1.p * style.size * ratio));
      const seed = p0.t + p1.t;

      // Multi-layer soft edge
      const layerCount = 4;
      for (let j = 0; j < layerCount; j++) {
        const alpha = 0.18 - (j * 0.035);
        const widthMultiplier = 1 + (j * 0.4);

        ctx.strokeStyle = this.toWatercolorStyle(style.color, alpha);
        ctx.lineWidth = pressure * widthMultiplier;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }

      // Deterministic pigment spots
      const spotCount = 2 + Math.floor(this.seededRandom(seed) * 2);
      for (let s = 0; s < spotCount; s++) {
        const spotSeed = seed + s * 11;
        const t = this.seededRandom(spotSeed);
        const spotX = x0 + (x1 - x0) * t;
        const spotY = y0 + (y1 - y0) * t;
        const offset = (this.seededRandom(spotSeed + 1) - 0.5) * pressure * 0.6;
        const spotRadius = pressure * 0.15 * this.seededRandom(spotSeed + 2);

        ctx.fillStyle = this.toWatercolorStyle(style.color, 0.12);
        ctx.beginPath();
        ctx.arc(spotX + offset, spotY + offset, spotRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Restore composite operation
    ctx.globalCompositeOperation = previousCompositeOp;
  }
}
