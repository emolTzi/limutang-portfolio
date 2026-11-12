/**
 * math.js — 数值工具：插值、缓动、随机、矩阵。
 * 全部是无副作用的纯函数，任何模块都可以直接引用。
 */

export const TAU = Math.PI * 2;

export const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp(invLerp(a, b, v)));
export const smoothstep = (a, b, v) => {
  const t = clamp(invLerp(a, b, v));
  return t * t * (3 - 2 * t);
};

/** 与帧率无关的指数平滑：lambda 越大追得越快。 */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
};

/** 可复现的伪随机数发生器（同一个种子，每次生成的粒子编队完全一致）。 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 标准正态分布采样（Box–Muller）。 */
export function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand());
}

/** 4×4 矩阵（列主序 Float32Array，可直接传给 WebGL）。 */
export const mat4 = {
  create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },

  perspective(m, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    const nf = 1 / (near - far);
    m.fill(0);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (far + near) * nf;
    m[11] = -1;
    m[14] = 2 * far * near * nf;
    return m;
  },

  /** 相机矩阵，up 固定为 +Y。 */
  lookAt(m, ex, ey, ez, cx, cy, cz) {
    let zx = ex - cx;
    let zy = ey - cy;
    let zz = ez - cz;
    let l = Math.hypot(zx, zy, zz) || 1;
    zx /= l; zy /= l; zz /= l;
    let xx = zz;
    let xz = -zx;
    l = Math.hypot(xx, xz) || 1;
    xx /= l; xz /= l;
    const yx = zy * xz;
    const yy = zz * xx - zx * xz;
    const yz = -zy * xx;
    m[0] = xx; m[1] = yx; m[2] = zx; m[3] = 0;
    m[4] = 0; m[5] = yy; m[6] = zy; m[7] = 0;
    m[8] = xz; m[9] = yz; m[10] = zz; m[11] = 0;
    m[12] = -(xx * ex + xz * ez);
    m[13] = -(yx * ex + yy * ey + yz * ez);
    m[14] = -(zx * ex + zy * ey + zz * ez);
    m[15] = 1;
    return m;
  },

  /** 平移 · Rz · Rx · Ry · 等比缩放（先绕自身 Y 轴旋转，再倾斜）。 */
  compose(m, tx, ty, tz, rx, ry, rz, s) {
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    m[0] = (cz * cy - sz * sx * sy) * s;
    m[1] = (sz * cy + cz * sx * sy) * s;
    m[2] = -cx * sy * s;
    m[3] = 0;
    m[4] = -sz * cx * s;
    m[5] = cz * cx * s;
    m[6] = sx * s;
    m[7] = 0;
    m[8] = (cz * sy + sz * sx * cy) * s;
    m[9] = (sz * sy - cz * sx * cy) * s;
    m[10] = cx * cy * s;
    m[11] = 0;
    m[12] = tx; m[13] = ty; m[14] = tz; m[15] = 1;
    return m;
  },
};
