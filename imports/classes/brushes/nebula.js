import LinesBrush from './lines';

// Base seeded random function
function computeSeededRandom(seed) {
  return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1;
}

// Map hue to warm colors only (excludes blue 180-280)
function warmHue(rawHue) {
  const normalized = rawHue % 180;
  if (normalized < 60) return normalized; // 0-60 (red-yellow)
  return normalized + 220; // 280-360 (violet-magenta-pink)
}

export default class NebulaBrush extends LinesBrush {
  constructor() {
    super();
    this.type = 'nebula';
    this.name = 'Nebula Brush';
  }

  // Instance method wrapper that uses this.type for type-specific randomness
  seededRandom(seed) {
    return computeSeededRandom(seed + this.type.length);
  }

  draw(layer) {
    this.capturePoint(layer);
    const pts = this.capturedPoints;
    if (pts.length < 2) return;

    const p0 = pts[pts.length - 2];
    const p1 = pts[pts.length - 1];
    const { ctx, scale, offsetX, offsetY } = layer;
    const { maxSize } = this.options;

    const x0 = (p0.x + offsetX) * scale;
    const y0 = (p0.y + offsetY) * scale;
    const x1 = (p1.x + offsetX) * scale;
    const y1 = (p1.y + offsetY) * scale;

    const { p: pressure, t: time } = p1;
    const layerCount = Math.floor(3 + pressure * 4);

    // Multi-layer glow with warm colors gradient
    for (let i = 0; i < layerCount; i++) {
      const hue = warmHue((time * 0.03) + i * 50);
      const alpha = 0.35 - (i * 0.05);
      const wave = Math.sin(time * 0.008 + i * 1.5) * (4 + i * 3);

      ctx.strokeStyle = `hsla(${hue}, 85%, 55%, ${alpha})`;
      ctx.lineWidth = pressure * maxSize * (1.2 + i * 0.25);
      ctx.beginPath();
      ctx.moveTo(x0 + wave, y0 - wave * 0.6);
      ctx.lineTo(x1 + wave, y1 - wave * 0.6);
      ctx.stroke();
    }

    // Paint spots with drips
    const spotCount = 2 + Math.floor(Math.random() * 3);
    const spread = Math.sqrt(maxSize) / 4;
    for (let s = 0; s < spotCount; s++) {
      const spotX = x1 + (Math.random() - 0.5) * 50 * spread;
      const spotY = y1 + (Math.random() - 0.5) * 50 * spread;
      const spotHue = warmHue((time * 0.03) + Math.random() * 180);
      const spotSize = (2 + Math.random() * 5) * pressure;

      // Spot
      ctx.fillStyle = `hsla(${spotHue}, 85%, 55%, 0.8)`;
      ctx.beginPath();
      ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
      ctx.fill();

      // Drip
      const dripLength = spotSize * (3 + Math.random() * 4);
      const gradient = ctx.createLinearGradient(spotX, spotY, spotX, spotY + dripLength);
      gradient.addColorStop(0, `hsla(${spotHue}, 85%, 55%, 0.7)`);
      gradient.addColorStop(1, `hsla(${spotHue}, 85%, 55%, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(spotX, spotY + dripLength / 2, spotSize * 0.4, dripLength / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawing(drawing, layer) {
    const { points, style } = drawing;
    if (!points || points.length < 2) return;

    const { ctx, scale, offsetX, offsetY } = layer;
    const ratio = scale / style.scale;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const x0 = (p0.x + offsetX) * scale;
      const y0 = (p0.y + offsetY) * scale;
      const x1 = (p1.x + offsetX) * scale;
      const y1 = (p1.y + offsetY) * scale;

      const pressure = Math.min(1000, Math.max(0.01, p1.p * style.size * ratio));
      const { t: time } = p1;
      const seed = p0.t + p1.t;
      const layerCount = Math.floor(3 + (p1.p * 4));

      // Multi-layer glow with warm colors gradient
      for (let j = 0; j < layerCount; j++) {
        const hue = warmHue((time * 0.03) + j * 50);
        const alpha = 0.35 - (j * 0.05);
        const wave = Math.sin(time * 0.008 + j * 1.5) * (4 + j * 3) * ratio;

        ctx.strokeStyle = `hsla(${hue}, 85%, 55%, ${alpha})`;
        ctx.lineWidth = pressure * (1.2 + j * 0.25);
        ctx.beginPath();
        ctx.moveTo(x0 + wave, y0 - wave * 0.6);
        ctx.lineTo(x1 + wave, y1 - wave * 0.6);
        ctx.stroke();
      }

      // Deterministic paint spots with drips
      const spotCount = 2 + Math.floor(this.seededRandom(seed) * 3);
      const spread = Math.sqrt(style.size) / 4 * ratio;
      for (let s = 0; s < spotCount; s++) {
        const spotSeed = seed + s * 10;
        const spotX = x1 + (this.seededRandom(spotSeed + 1) - 0.5) * 50 * spread;
        const spotY = y1 + (this.seededRandom(spotSeed + 2) - 0.5) * 50 * spread;
        const spotHue = warmHue((time * 0.03) + this.seededRandom(spotSeed + 3) * 180);
        const spotSize = (2 + this.seededRandom(spotSeed + 4) * 5) * p1.p * ratio;

        // Spot
        ctx.fillStyle = `hsla(${spotHue}, 85%, 55%, 0.8)`;
        ctx.beginPath();
        ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
        ctx.fill();

        // Drip
        const dripLength = spotSize * (3 + this.seededRandom(spotSeed + 5) * 4);
        const gradient = ctx.createLinearGradient(spotX, spotY, spotX, spotY + dripLength);
        gradient.addColorStop(0, `hsla(${spotHue}, 85%, 55%, 0.7)`);
        gradient.addColorStop(1, `hsla(${spotHue}, 85%, 55%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(spotX, spotY + dripLength / 2, spotSize * 0.4, dripLength / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
