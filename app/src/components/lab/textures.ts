import * as THREE from 'three';
import { mulberry32 } from '@/services/util/random';

/**
 * Procedural PBR-style textures drawn on 2D canvases at startup (no downloads).
 * Each texture is created once and shared.
 */

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function toTexture(c: HTMLCanvasElement, repeat: [number, number], srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function noise(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number, seed: number, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const r = mulberry32(seed);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amount;
    img.data[i] += n;
    img.data[i + 1] += mono ? n : (r() - 0.5) * amount;
    img.data[i + 2] += mono ? n : (r() - 0.5) * amount;
  }
  ctx.putImageData(img, 0, 0);
}

/** Large polished resin floor tiles with grout and subtle variation. 1 texture repeat = 2.4 m. */
function floorTextures() {
  const S = 512;
  const [c, ctx] = canvas(S, S);
  const [rc, rctx] = canvas(S, S);
  const rand = mulberry32(7);
  const tiles = 4;
  const ts = S / tiles;
  for (let y = 0; y < tiles; y++)
    for (let x = 0; x < tiles; x++) {
      const v = 44 + rand() * 8;
      ctx.fillStyle = `rgb(${v},${v + 6},${v + 12})`;
      ctx.fillRect(x * ts, y * ts, ts, ts);
      const rv = 90 + rand() * 40;
      rctx.fillStyle = `rgb(${rv},${rv},${rv})`;
      rctx.fillRect(x * ts, y * ts, ts, ts);
    }
  noise(ctx, S, S, 10, 3);
  noise(rctx, S, S, 30, 4);
  ctx.strokeStyle = 'rgba(10,14,20,0.9)';
  rctx.strokeStyle = 'rgb(220,220,220)';
  ctx.lineWidth = rctx.lineWidth = 3;
  for (let i = 0; i <= tiles; i++) {
    for (const g of [ctx, rctx]) {
      g.beginPath();
      g.moveTo(i * ts, 0);
      g.lineTo(i * ts, S);
      g.moveTo(0, i * ts);
      g.lineTo(S, i * ts);
      g.stroke();
    }
  }
  return { map: toTexture(c, [10, 9]), roughnessMap: toTexture(rc, [10, 9], false) };
}

/** Composite wall cladding: tall panels with seams, a dado rail and rivets. 1 repeat = 2.4 m wide. */
function wallTexture() {
  const W = 512, H = 512;
  const [c, ctx] = canvas(W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#c3ccd5');
  g.addColorStop(0.62, '#b4bec9');
  g.addColorStop(0.63, '#59636f');
  g.addColorStop(1, '#4b5561');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  noise(ctx, W, H, 8, 11);
  ctx.fillStyle = 'rgba(30,38,48,0.55)';
  for (let x = 0; x <= W; x += W / 2) ctx.fillRect(x - 2, 0, 4, H);
  ctx.fillRect(0, H * 0.62 - 3, W, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(0, H * 0.62 + 3, W, 2);
  ctx.fillStyle = 'rgba(30,38,48,0.5)';
  for (let x = 16; x < W; x += W / 2)
    for (const y of [16, H * 0.6, H - 16]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.arc(x + W / 2 - 32, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  return toTexture(c, [1, 1]);
}

/** Acoustic ceiling grid. */
function ceilingTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#7e8892';
  ctx.fillRect(0, 0, S, S);
  noise(ctx, S, S, 14, 21);
  ctx.strokeStyle = '#4b545e';
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, S, S);
  return toTexture(c, [20, 18]);
}

/** Brushed metal streaks. */
function brushedTexture() {
  const S = 256;
  const [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#9aa4ae';
  ctx.fillRect(0, 0, S, S);
  const r = mulberry32(5);
  for (let i = 0; i < 900; i++) {
    const y = r() * S;
    const a = r() * 0.12;
    ctx.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    ctx.fillRect(0, y, S, 1);
  }
  return toTexture(c, [2, 2]);
}

/** Painted floor-marking stripes (hazard / work-area border). */
function hazardTexture() {
  const [c, ctx] = canvas(128, 32);
  ctx.fillStyle = '#d9a91e';
  ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = '#15191f';
  for (let x = -32; x < 160; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 32);
    ctx.lineTo(x + 16, 0);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 16, 32);
    ctx.fill();
  }
  return toTexture(c, [8, 1]);
}

let cache: ReturnType<typeof build> | null = null;
function build() {
  return { floor: floorTextures(), wall: wallTexture(), ceiling: ceilingTexture(), brushed: brushedTexture(), hazard: hazardTexture() };
}

/** Lazily builds all textures (requires a DOM). */
export function getTextures() {
  if (!cache) cache = build();
  return cache;
}
