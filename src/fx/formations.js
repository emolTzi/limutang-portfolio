/**
 * formations.js — 粒子编队：把「一个形状」描述成 n 个目标点。
 *
 * 新增一个编队只需要三步（完全不用碰 WebGL）：
 *   1. 在这里 defineFormation('名字', (n, ctx) => ({ data, size }))
 *   2. 在 cues.js 里加一个引用它的预设（摆放、亮度、配色）
 *   3. 在某个区块的元素上写 data-cue="预设名"
 *
 * 生成器约定：
 *   · data  Float32Array(n × 4)，每个粒子 [x, y, z, 分组号]
 *   · size  [宽, 高]：这个形状在预设旋转下投影到屏幕的大致包围盒（世界单位）。
 *           导演用它把编队「装进」页面里的 DOM 占位框。
 *   · 第 i 个粒子落在形状的哪一部分必须是随机的——引擎做 LOD 时只画前 k 个粒子，
 *     随机分布才能保证少画一些粒子时形状依然完整。
 *   · 分组号用于局部高亮（stage.focusGroup(i)）；不参与高亮的粒子填 GROUP_NONE。
 *   · ctx = { rand, site, team, text, font, weight, vertical }，rand 是带种子的随机函数。
 */

import { TAU, gaussian } from '../core/math.js';

export const GROUP_NONE = 99;

const registry = new Map();

export function defineFormation(name, generator) {
  registry.set(name, generator);
}

export function buildFormation(name, n, ctx) {
  const generator = registry.get(name);
  if (!generator) throw new Error(`未知编队：${name}`);
  return generator(n, ctx);
}

export const formationNames = () => Array.from(registry.keys());

/* ── 辅助 ────────────────────────────────────────────────────────────────── */

function put(data, i, x, y, z, group = 0) {
  const o = i * 4;
  data[o] = x;
  data[o + 1] = y;
  data[o + 2] = z;
  data[o + 3] = group;
}

/** 单位球面上的均匀随机点。 */
function onSphere(rand, out) {
  const u = rand() * 2 - 1;
  const a = rand() * TAU;
  const s = Math.sqrt(1 - u * u);
  out[0] = s * Math.cos(a);
  out[1] = u;
  out[2] = s * Math.sin(a);
  return out;
}

function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 2D 值噪声，0…1。 */
function noise2(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let fx = x - xi;
  let fy = y - yi;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** 山脊噪声：多层叠加并折出尖峰。 */
function ridge(x, y) {
  let sum = 0;
  let amp = 0.55;
  let freq = 1;
  for (let o = 0; o < 4; o++) {
    const v = 1 - Math.abs(noise2(x * freq + o * 17.1, y * freq - o * 9.3) * 2 - 1);
    sum += v * v * amp;
    amp *= 0.5;
    freq *= 2.05;
  }
  return sum;
}

const tmp = [0, 0, 0];

/* ── 1. glyphs：把文字采样成粒子（首屏的名字） ─────────────────────────────── */

defineFormation('glyphs', (n, { rand, text = '字', font = 'serif', weight = 900, vertical = false }) => {
  const data = new Float32Array(n * 4);
  const chars = Array.from(text);
  const fs = 300;
  const gap = fs * (vertical ? 0.04 : 0.1);
  const pad = Math.ceil(fs * 0.25);

  const canvas = document.createElement('canvas');
  let c = canvas.getContext('2d', { willReadFrequently: true });
  c.font = `${weight} ${fs}px ${font}`;
  const widths = chars.map((ch) => c.measureText(ch).width || fs);
  const lineW = Math.max(...widths);
  const W = Math.ceil((vertical ? lineW : widths.reduce((a, b) => a + b, 0) + gap * (chars.length - 1)) + pad * 2);
  const H = Math.ceil((vertical ? chars.length * fs + gap * (chars.length - 1) : fs) + pad * 2 + fs * 0.2);
  canvas.width = W;
  canvas.height = H;
  c = canvas.getContext('2d', { willReadFrequently: true });
  c.font = `${weight} ${fs}px ${font}`;
  c.textBaseline = 'alphabetic';
  c.fillStyle = '#fff';

  // 逐字绘制并记录每个字的范围，分组号 = 第几个字
  const bounds = [];
  let cursor = pad;
  chars.forEach((ch, i) => {
    if (vertical) {
      const x = pad + (lineW - widths[i]) / 2;
      const top = pad + i * (fs + gap);
      c.fillText(ch, x, top + fs * 0.88);
      bounds.push(top + fs + gap / 2);
    } else {
      c.fillText(ch, cursor, pad + fs * 0.88);
      cursor += widths[i] + gap;
      bounds.push(cursor - gap / 2);
    }
  });

  const img = c.getImageData(0, 0, W, H).data;
  const fill = [];
  const edge = [];
  let minX = W, maxX = 0, minY = H, maxY = 0;
  const alpha = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : img[(y * W + x) * 4 + 3]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (alpha(x, y) < 128) continue;
      const index = y * W + x;
      fill.push(index);
      if (alpha(x - 1, y) < 128 || alpha(x + 1, y) < 128 || alpha(x, y - 1) < 128 || alpha(x, y + 1) < 128) {
        edge.push(index);
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  // 字体没加载出来等极端情况：退化成一条横带，页面不至于空白
  if (fill.length < 50) {
    for (let i = 0; i < n; i++) put(data, i, (rand() - 0.5) * 3, (rand() - 0.5) * 0.4, gaussian(rand) * 0.05, 0);
    return { data, size: [3, 1] };
  }

  const inkW = maxX - minX + 1;
  const inkH = maxY - minY + 1;
  const unit = vertical ? 1 / inkW : 1 / inkH; // 短边归一
  const cx0 = (minX + maxX) / 2;
  const cy0 = (minY + maxY) / 2;
  const w = inkW * unit;
  const h = inkH * unit;

  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.06) {
      // 环绕文字的微尘：给景深留出前后景
      put(data, i, gaussian(rand) * w * 0.48, gaussian(rand) * h * 0.6, gaussian(rand) * 0.55 - 0.1, GROUP_NONE);
      continue;
    }
    const onEdge = r < 0.42 && edge.length > 0;
    const list = onEdge ? edge : fill;
    const index = list[Math.floor(rand() * list.length)];
    const px = index % W;
    const py = (index - px) / W;
    const along = vertical ? py : px;
    let group = 0;
    while (group < bounds.length - 1 && along > bounds[group]) group += 1;
    put(
      data,
      i,
      (px + rand() - 0.5 - cx0) * unit,
      -(py + rand() - 0.5 - cy0) * unit,
      gaussian(rand) * (onEdge ? 0.006 : 0.012),
      group,
    );
  }
  return { data, size: [w, h] };
});

/* ── 2. dust：稀疏的星尘，带一点丝状结构（留白时的背景） ─────────────────────── */

defineFormation('dust', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0;
    for (let attempt = 0; attempt < 4; attempt++) {
      x = (rand() * 2 - 1) * 3.0;
      y = (rand() * 2 - 1) * 1.7;
      z = -2.8 + rand() * 3.6;
      const density = noise2(x * 0.9 + z * 0.4, y * 1.3 - z * 0.3);
      if (rand() < 0.18 + 0.82 * density * density) break;
    }
    put(data, i, x, y, z, GROUP_NONE);
  }
  return { data, size: [6, 3.4] };
});

/* ── 3. terrain：层层叠叠的山脊剪影、缠在山腰的云（教育 · 云南） ─────────── */

defineFormation('terrain', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  const ROWS = 7;
  // 近处的山脊更实：按「远疏近密」分配粒子
  const weights = Array.from({ length: ROWS }, (_, j) => 0.45 + j / (ROWS - 1));
  const total = weights.reduce((a, b) => a + b, 0);

  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.05) {
      // 天上的星
      put(data, i, (rand() * 2 - 1) * 7, 0.42 + rand() * 0.5, -2.2 + rand() * 1.2, GROUP_NONE);
      continue;
    }
    if (r < 0.13) {
      // 云带：被拉得很长的薄云，横在山腰
      const band = Math.floor(rand() * 3);
      const cx = [-2.4, 1.2, 3.4][band];
      const cy = [0.02, 0.2, -0.26][band];
      const cz = [-1.7, -2.0, -0.9][band];
      put(data, i, cx + gaussian(rand) * 1.1, cy + gaussian(rand) * 0.014, cz + gaussian(rand) * 0.1, 1);
      continue;
    }

    let pick = rand() * total;
    let row = 0;
    while (row < ROWS - 1 && (pick -= weights[row]) > 0) row += 1;
    const t = row / (ROWS - 1); // 0 = 最远的一道，1 = 最近的一道

    const z = -2.0 + t * 2.3;
    const x = (rand() * 2 - 1) * 4.6 * (1 + (1 - t) * 0.6); // 远处更宽，抵消透视收窄
    // 远山高而缓，近丘低而碎
    const freq = 0.34 + t * 0.5;
    const massif = 0.5 + 0.5 * Math.exp(-Math.pow((x - 0.9) / 2.4, 2));
    const crest = 0.06 - t * 0.86 + ridge(x * freq + row * 5.3, row * 2.1) * (0.6 - t * 0.42) * massif;
    // 八成粒子压在山脊线上，其余向下淡出，成为山体
    const body = rand() < 0.8 ? 0 : rand() * rand() * 0.14;
    put(data, i, x, crest - body + gaussian(rand) * 0.0015, z + gaussian(rand) * 0.003, 0);
  }
  return { data, size: [9.2, 1.9] };
});

/* ── 4. orbs：七颗光球围成一圈（祈愿龙珠） ─────────────────────────────────── */

defineFormation('orbs', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  const COUNT = 7;
  const R = 0.92;
  const r0 = 0.2;
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.1) {
      // 串起七颗球的细环
      const a = rand() * TAU;
      put(data, i, Math.cos(a) * R + gaussian(rand) * 0.008, gaussian(rand) * 0.008, Math.sin(a) * R + gaussian(rand) * 0.008, GROUP_NONE);
      continue;
    }
    if (r < 0.15) {
      put(data, i, gaussian(rand) * 0.5, gaussian(rand) * 0.3, gaussian(rand) * 0.5, GROUP_NONE);
      continue;
    }
    const k = Math.floor(rand() * COUNT);
    const a = (k / COUNT) * TAU;
    const cx = Math.cos(a) * R;
    const cz = Math.sin(a) * R;
    const part = rand();
    if (part < 0.6) {
      onSphere(rand, tmp);
      const rr = r0 * (1 + gaussian(rand) * 0.012);
      put(data, i, cx + tmp[0] * rr, tmp[1] * rr, cz + tmp[2] * rr, k);
    } else if (part < 0.82) {
      onSphere(rand, tmp);
      const rr = r0 * Math.cbrt(rand()) * 0.92;
      put(data, i, cx + tmp[0] * rr, tmp[1] * rr, cz + tmp[2] * rr, k);
    } else {
      // 球心的小亮点：第 k 颗球里有 k+1 个
      const stars = k + 1;
      const s = Math.floor(rand() * stars);
      const sa = (s / stars) * TAU + k;
      const sr = stars === 1 ? 0 : 0.085;
      put(
        data,
        i,
        cx + Math.cos(sa) * sr + gaussian(rand) * 0.011,
        Math.sin(sa) * sr + gaussian(rand) * 0.011,
        cz + gaussian(rand) * 0.011,
        k,
      );
    }
  }
  return { data, size: [2.45, 1.35] };
});

/* ── 5. wave：一张网格水面，波纹由着色器实时叠加（数字教材） ───────────────── */

defineFormation('wave', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  const rows = 64;
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.05) {
      put(data, i, (rand() * 2 - 1) * 1.7, 0.15 + rand() * 0.5, (rand() * 2 - 1) * 1.2, GROUP_NONE);
      continue;
    }
    if (r < 0.11) {
      // 两个波源：小亮点
      const sx = rand() < 0.5 ? -0.55 : 0.55;
      put(data, i, sx + gaussian(rand) * 0.014, gaussian(rand) * 0.014, gaussian(rand) * 0.014, sx < 0 ? 1 : 2);
      continue;
    }
    if (r < 0.72) {
      const row = Math.floor(rand() * rows);
      put(data, i, (rand() * 2 - 1) * 1.55, 0, (row / (rows - 1)) * 2.3 - 1.15, 0);
    } else {
      const col = Math.floor(rand() * rows);
      put(data, i, (col / (rows - 1)) * 3.1 - 1.55, 0, (rand() * 2 - 1) * 1.15, 0);
    }
  }
  return { data, size: [3.0, 1.45] };
});

/* ── 6. network：1 个人 → 协调 bot → 执行 bot（多智能体团队） ───────────────── */

defineFormation('network', (n, { rand, team }) => {
  const data = new Float32Array(n * 4);
  const lines = team && team.lines.length ? team.lines : [{ nodes: new Array(6).fill({}) }];
  const L = lines.length;

  // 节点：像一盏吊灯，根在顶，三条线向下散开
  const nodes = [{ x: 0, y: 0.82, z: 0, r: 0.085, group: 0, weight: 3 }];
  const edges = [];
  lines.forEach((line, li) => {
    const phi = (li / L) * TAU + 0.6;
    const coordinator = { x: Math.cos(phi) * 0.72, y: 0.16, z: Math.sin(phi) * 0.72, r: 0.06, group: li + 1, weight: 2 };
    nodes.push(coordinator);
    edges.push([nodes[0], coordinator, li + 1]);
    const m = line.nodes.length;
    const step = Math.min(0.36, 1.7 / Math.max(m, 1));
    line.nodes.forEach((_, j) => {
      const a = phi + (j - (m - 1) / 2) * step;
      const far = j % 2;
      const rr = 1.12 + far * 0.14;
      const node = { x: Math.cos(a) * rr, y: -0.52 - far * 0.16, z: Math.sin(a) * rr, r: 0.034, group: li + 1, weight: 1 };
      nodes.push(node);
      edges.push([coordinator, node, li + 1]);
    });
  });
  const weightSum = nodes.reduce((sum, node) => sum + node.weight, 0);

  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.08) {
      put(data, i, gaussian(rand) * 0.9, gaussian(rand) * 0.6, gaussian(rand) * 0.9, GROUP_NONE);
    } else if (r < 0.54) {
      let pick = rand() * weightSum;
      let node = nodes[0];
      for (const candidate of nodes) {
        pick -= candidate.weight;
        if (pick <= 0) { node = candidate; break; }
      }
      onSphere(rand, tmp);
      const rr = node.r * (rand() < 0.7 ? 1 : Math.cbrt(rand()));
      put(data, i, node.x + tmp[0] * rr, node.y + tmp[1] * rr, node.z + tmp[2] * rr, node.group);
    } else {
      // 连线：略微下垂的二次曲线
      const [a, b, group] = edges[Math.floor(rand() * edges.length)];
      const t = rand();
      const sag = Math.sin(t * Math.PI) * 0.06;
      put(
        data,
        i,
        a.x + (b.x - a.x) * t + gaussian(rand) * 0.004,
        a.y + (b.y - a.y) * t - sag + gaussian(rand) * 0.004,
        a.z + (b.z - a.z) * t + gaussian(rand) * 0.004,
        group,
      );
    }
  }
  return { data, size: [2.75, 1.85] };
});

/* ── 7. galaxy：三旋臂星系（创世纪元 · 竞赛） ──────────────────────────────── */

defineFormation('galaxy', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  const ARMS = 3;
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.16) {
      put(data, i, gaussian(rand) * 0.1, gaussian(rand) * 0.06, gaussian(rand) * 0.1, 0);
    } else if (r < 0.9) {
      const radius = 0.1 + 1.2 * Math.pow(rand(), 0.72);
      const arm = Math.floor(rand() * ARMS);
      const spread = gaussian(rand) * 0.3 * (1 - (radius / 1.3) * 0.55);
      const a = (arm / ARMS) * TAU + 2.7 * Math.log(1 + radius * 3.1) + spread;
      put(data, i, Math.cos(a) * radius, gaussian(rand) * 0.036 * (1.35 - radius), Math.sin(a) * radius, 0);
    } else {
      onSphere(rand, tmp);
      const rr = 0.5 + rand() * 1.1;
      put(data, i, tmp[0] * rr, tmp[1] * rr * 0.6, tmp[2] * rr, GROUP_NONE);
    }
  }
  return { data, size: [2.7, 1.55] };
});

/* ── 8. stack：几层悬浮的网格平面（技术栈；层数 = 技能分组数，分组号 = 层号） ── */

defineFormation('stack', (n, { rand, site }) => {
  const data = new Float32Array(n * 4);
  const layers = Math.max(2, site?.skills?.groups?.length || 4);
  const half = 0.74;
  const cells = 8;
  const gapY = 0.52;
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.05) {
      // 贯穿各层的立柱
      const cxn = rand() < 0.5 ? -half : half;
      const czn = rand() < 0.5 ? -half : half;
      const y = (rand() - 0.5) * gapY * (layers - 1);
      put(data, i, cxn + gaussian(rand) * 0.004, y, czn + gaussian(rand) * 0.004, GROUP_NONE);
      continue;
    }
    const layer = Math.floor(rand() * layers);
    const y = ((layers - 1) / 2 - layer) * gapY; // 第 0 组在最上层
    const part = rand();
    if (part < 0.52) {
      const lineIndex = Math.floor(rand() * (cells + 1));
      const fixed = (lineIndex / cells) * 2 * half - half;
      const free = (rand() * 2 - 1) * half;
      if (rand() < 0.5) put(data, i, fixed, y, free, layer);
      else put(data, i, free, y, fixed, layer);
    } else if (part < 0.8) {
      const gx = (Math.floor(rand() * (cells + 1)) / cells) * 2 * half - half;
      const gz = (Math.floor(rand() * (cells + 1)) / cells) * 2 * half - half;
      put(data, i, gx + gaussian(rand) * 0.009, y + gaussian(rand) * 0.009, gz + gaussian(rand) * 0.009, layer);
    } else {
      put(data, i, (rand() * 2 - 1) * half, y + gaussian(rand) * 0.003, (rand() * 2 - 1) * half, layer);
    }
  }
  return { data, size: [2.25, 0.75 + gapY * (layers - 1)] };
});

/* ── 9. portal：一道环形的门，内部是向深处旋进的涡流（传送门） ─────────────── */

defineFormation('portal', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.44) {
      const a = rand() * TAU;
      const rr = 1 + gaussian(rand) * 0.016;
      put(data, i, Math.cos(a) * rr, Math.sin(a) * rr, gaussian(rand) * 0.02, 0);
    } else if (r < 0.54) {
      // 外圈刻度环：分成一段一段
      const seg = Math.floor(rand() * 48);
      const a = ((seg + rand() * 0.55) / 48) * TAU;
      put(data, i, Math.cos(a) * 1.17, Math.sin(a) * 1.17, gaussian(rand) * 0.01, 0);
    } else if (r < 0.9) {
      const radius = 0.12 + 0.82 * Math.pow(rand(), 0.8);
      const arm = Math.floor(rand() * 5);
      const a = (arm / 5) * TAU + radius * 4.2 + gaussian(rand) * 0.14;
      const depth = -Math.pow(1 - radius, 1.6) * 1.5;
      put(data, i, Math.cos(a) * radius, Math.sin(a) * radius, depth, 0);
    } else {
      const a = rand() * TAU;
      const rr = 1.05 + rand() * 0.7;
      put(data, i, Math.cos(a) * rr, Math.sin(a) * rr, gaussian(rand) * 0.3, GROUP_NONE);
    }
  }
  return { data, size: [2.5, 2.5] };
});

/* ── 10. orb：一颗带轨道环的光球（收尾 · 联系） ────────────────────────────── */

defineFormation('orb', (n, { rand }) => {
  const data = new Float32Array(n * 4);
  const R = 0.6;
  const rings = [
    { radius: 0.9, tilt: 0.5, roll: 0.3 },
    { radius: 1.06, tilt: -0.35, roll: -0.5 },
  ];
  for (let i = 0; i < n; i++) {
    const r = rand();
    if (r < 0.5) {
      onSphere(rand, tmp);
      const rr = R * (1 + gaussian(rand) * 0.006);
      put(data, i, tmp[0] * rr, tmp[1] * rr, tmp[2] * rr, 0);
    } else if (r < 0.72) {
      put(data, i, gaussian(rand) * 0.17, gaussian(rand) * 0.17, gaussian(rand) * 0.17, 0);
    } else if (r < 0.92) {
      const ring = rings[rand() < 0.5 ? 0 : 1];
      const a = rand() * TAU;
      const x = Math.cos(a) * ring.radius;
      const z = Math.sin(a) * ring.radius;
      const y1 = -z * Math.sin(ring.tilt);
      const z1 = z * Math.cos(ring.tilt);
      const x2 = x * Math.cos(ring.roll) - y1 * Math.sin(ring.roll);
      const y2 = x * Math.sin(ring.roll) + y1 * Math.cos(ring.roll);
      put(data, i, x2 + gaussian(rand) * 0.006, y2 + gaussian(rand) * 0.006, z1 + gaussian(rand) * 0.006, 1);
    } else {
      onSphere(rand, tmp);
      const rr = 0.9 + rand() * 0.9;
      put(data, i, tmp[0] * rr, tmp[1] * rr, tmp[2] * rr, GROUP_NONE);
    }
  }
  return { data, size: [2.2, 2.0] };
});
