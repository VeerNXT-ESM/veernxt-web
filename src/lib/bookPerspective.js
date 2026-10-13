import { toCanvas } from 'html-to-image';

/**
 * Rasterise a DOM node (the flat cover or spine) to a canvas.
 * Fonts must be loaded first or the first render falls back to a system face.
 */
export async function rasterize(node, { pixelRatio = 2, backgroundColor } = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  return toCanvas(node, { pixelRatio, backgroundColor, cacheBust: false });
}

/**
 * Perspective compositor: turns the flat front + spine canvases into a
 * 3D-looking book.
 *
 * The book is a box rotated about the vertical axis only, so every vertical
 * edge stays vertical and each face can be drawn exactly as 1px-wide source
 * strips scaled by their depth. Canvas 2D has no projective transform; this
 * is the cheap way to get a correct one without WebGL.
 *
 * Geometry (book centred on origin, +z toward the viewer):
 *   X' =  x cosθ + z sinθ
 *   Z' = -x sinθ + z cosθ
 *   screen = (X', y) * f / (f - Z')
 * With θ > 0 the left (spine) face turns toward the camera.
 */
export function composeBook3D(front, spine, opts = {}) {
  const {
    outW = 1024,
    outH = 1536,
    angle = 22,          // degrees of rotation about Y
    depth = 0.11,        // spine thickness as a fraction of cover width
    focal = 3.2,         // camera distance as a multiple of cover width
    margin = 0.08,       // empty border around the book, fraction of the canvas
    background = null,   // CSS colour, or null for a transparent PNG
    shadow = true,
  } = opts;

  const W = 1;
  const H = front.height / front.width;
  const D = depth;
  const th = (angle * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const f = focal;

  const proj = (x, z) => {
    const X = x * cos + z * sin;
    const Z = -x * sin + z * cos;
    return { X: X * (f / (f - Z)), s: f / (f - Z) };
  };

  // Corners that bound the book silhouette.
  const fl = proj(-W / 2, D / 2);   // front-left
  const fr = proj(W / 2, D / 2);    // front-right
  const sb = proj(-W / 2, -D / 2);  // spine back edge
  const minX = Math.min(fl.X, fr.X, sb.X);
  const maxX = Math.max(fl.X, fr.X, sb.X);
  const maxS = Math.max(fl.s, fr.s, sb.s);
  const bookW = maxX - minX;
  const bookH = H * maxS;

  const usableW = outW * (1 - margin * 2);
  const usableH = outH * (1 - margin * 2 - 0.04); // leave room for the ground shadow
  const k = Math.min(usableW / bookW, usableH / bookH);
  const cx = outW / 2 - ((minX + maxX) / 2) * k;
  const cy = outH / 2 - 0.01 * outH;

  const book = document.createElement('canvas');
  book.width = outW;
  book.height = outH;
  const b = book.getContext('2d');
  b.imageSmoothingQuality = 'high';

  // Draw one planar face as strips. `edge(u)` gives the projected {X,s} for
  // texture column u in [0,1].
  const drawFace = (img, edge) => {
    const N = img.width;
    for (let i = 0; i < N; i++) {
      const a = edge(i / N);
      const c = edge((i + 1) / N);
      const x0 = cx + a.X * k;
      const x1 = cx + c.X * k;
      const s = (a.s + c.s) / 2;
      const h = H * s * k;
      b.drawImage(img, i, 0, 1, img.height, x0, cy - h / 2, x1 - x0 + 0.6, h);
    }
  };

  const quad = (edge) => {
    const a = edge(0);
    const c = edge(1);
    return {
      x0: cx + a.X * k, x1: cx + c.X * k,
      h0: H * a.s * k, h1: H * c.s * k,
    };
  };

  const shade = (q, stops, dir = 'x') => {
    b.save();
    b.beginPath();
    b.moveTo(q.x0, cy - q.h0 / 2);
    b.lineTo(q.x1, cy - q.h1 / 2);
    b.lineTo(q.x1, cy + q.h1 / 2);
    b.lineTo(q.x0, cy + q.h0 / 2);
    b.closePath();
    b.clip();
    const g = dir === 'x'
      ? b.createLinearGradient(q.x0, 0, q.x1, 0)
      : b.createLinearGradient(q.x0, cy - q.h0 / 2, q.x1, cy + q.h1 / 2);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    b.fillStyle = g;
    b.fillRect(Math.min(q.x0, q.x1), cy - Math.max(q.h0, q.h1) / 2, Math.abs(q.x1 - q.x0), Math.max(q.h0, q.h1));
    b.restore();
  };

  // Spine: u=0 is the back edge (z=-D/2), u=1 the front edge (z=+D/2).
  const spineEdge = (u) => proj(-W / 2, -D / 2 + u * D);
  drawFace(spine, spineEdge);
  shade(quad(spineEdge), [
    [0, 'rgba(0,0,0,0.45)'],
    [0.35, 'rgba(255,255,255,0.14)'],
    [0.7, 'rgba(0,0,0,0.05)'],
    [1, 'rgba(0,0,0,0.38)'],
  ]);

  // Front cover.
  const frontEdge = (u) => proj(-W / 2 + u * W, D / 2);
  drawFace(front, frontEdge);
  const fq = quad(frontEdge);
  // Hinge groove near the spine, soft sheen across the board.
  shade(fq, [
    [0, 'rgba(0,0,0,0.34)'],
    [0.025, 'rgba(0,0,0,0.12)'],
    [0.04, 'rgba(255,255,255,0.16)'],
    [0.06, 'rgba(0,0,0,0.08)'],
    [0.14, 'rgba(0,0,0,0)'],
  ]);
  shade(fq, [
    [0, 'rgba(255,255,255,0.14)'],
    [0.4, 'rgba(255,255,255,0)'],
    [1, 'rgba(0,0,0,0.12)'],
  ], 'diag');

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const o = out.getContext('2d');
  if (background) {
    o.fillStyle = background;
    o.fillRect(0, 0, outW, outH);
  }
  if (shadow) {
    // Contact shadow on the "table", then the book's own drop shadow.
    const baseY = cy + (H * ((fl.s + fr.s) / 2) * k) / 2;
    const midX = cx + ((fl.X + fr.X) / 2) * k;
    o.save();
    o.filter = `blur(${Math.round(outW * 0.012)}px)`;
    o.fillStyle = 'rgba(15,23,42,0.35)';
    o.beginPath();
    o.ellipse(midX, baseY + outH * 0.006, (bookW * k) * 0.5, outH * 0.012, 0, 0, Math.PI * 2);
    o.fill();
    o.restore();
    o.shadowColor = 'rgba(15,23,42,0.35)';
    o.shadowBlur = outW * 0.025;
    o.shadowOffsetX = -outW * 0.012;
    o.shadowOffsetY = outW * 0.014;
  }
  o.drawImage(book, 0, 0);
  return out;
}

export const canvasToBlob = (canvas, type = 'image/png', quality) =>
  new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))), type, quality));
