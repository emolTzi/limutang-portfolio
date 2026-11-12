/**
 * wavelab.js — 「波动实验台」：两块可以用鼠标玩的小画布。
 *
 * 说明：这是本站为呼应数字教材主题即兴重绘的演示，并非教材原页。
 *   · doppler    多普勒效应：光标是波源，等时间间隔发出等速扩散的波面
 *   · lissajous  简谐振动的合成：两个相互垂直的简谐振动合成李萨如图形
 *
 * 只有画布在视口内时才计算与绘制。没有鼠标悬停时自动巡航。
 * 新增一个实验：往 LABS 里加一个 (canvas, readout) => ({ update(dt, input), draw(g, w, h) })。
 */

import { $, $$ } from '../../core/dom.js';
import { TAU, clamp, damp } from '../../core/math.js';
import { env } from '../../core/env.js';

const JADE = '143, 227, 214';
const AMBER = '255, 157, 46';
const PAPER = '242, 235, 224';

/* ── 多普勒效应 ─────────────────────────────────────────────────────────── */

function doppler(readout) {
  const C = 110; // 波速 px/s
  const PERIOD = 0.17; // 发射周期 s
  const fronts = [];
  let sx = 0;
  let sy = 0;
  let vx = 0;
  let vy = 0;
  let timer = 0;
  let time = 0;
  let started = false;
  let lastText = '';

  return {
    update(dt, input, w, h) {
      time += dt;
      // 目标点：悬停时跟随光标，否则沿一条横向的 8 字巡航（始终低于波速）
      let tx;
      let ty;
      if (input.hover) {
        tx = input.x;
        ty = input.y;
      } else {
        tx = w * (0.5 + 0.34 * Math.sin(time * 0.3));
        ty = h * (0.5 + 0.2 * Math.sin(time * 0.6));
      }
      if (!started) {
        // 从巡航轨迹上起步，免得一开场先来一段「追赶」
        sx = tx;
        sy = ty;
        started = true;
      }
      const ox = sx;
      const oy = sy;
      const rate = input.hover ? 7 : 4;
      sx = damp(sx, tx, rate, dt);
      sy = damp(sy, ty, rate, dt);
      // 限速 1.6 倍波速：允许超声速，能看到马赫锥
      let dx = sx - ox;
      let dy = sy - oy;
      const step = Math.hypot(dx, dy);
      const maxStep = C * 1.6 * dt;
      if (step > maxStep) {
        dx *= maxStep / step;
        dy *= maxStep / step;
        sx = ox + dx;
        sy = oy + dy;
      }
      vx = damp(vx, dx / dt, 10, dt);
      vy = damp(vy, dy / dt, 10, dt);

      timer += dt;
      while (timer >= PERIOD) {
        timer -= PERIOD;
        fronts.push({ x: sx, y: sy, age: timer });
      }
      const maxR = Math.hypot(w, h);
      for (let i = fronts.length - 1; i >= 0; i--) {
        fronts[i].age += dt;
        if (fronts[i].age * C > maxR) fronts.splice(i, 1);
      }

      const mach = Math.hypot(vx, vy) / C;
      let text;
      if (mach >= 1) text = `Ma ${mach.toFixed(2)} · 超声速，波面叠成马赫锥`;
      else text = `Ma ${mach.toFixed(2)} · 前方 f′ = ${(1 / (1 - mach)).toFixed(2)} f · 后方 f′ = ${(1 / (1 + mach)).toFixed(2)} f`;
      if (readout && text !== lastText) {
        readout.textContent = text;
        lastText = text;
      }
    },
    draw(g, w, h) {
      const maxR = Math.hypot(w, h) * 0.75;
      g.lineWidth = 1;
      for (const front of fronts) {
        const r = front.age * C;
        const fade = clamp(1 - r / maxR);
        if (fade <= 0) continue;
        g.strokeStyle = `rgba(${JADE}, ${0.5 * fade * fade})`;
        g.beginPath();
        g.arc(front.x, front.y, r, 0, TAU);
        g.stroke();
      }
      g.fillStyle = `rgba(${AMBER}, 0.22)`;
      g.beginPath();
      g.arc(sx, sy, 9, 0, TAU);
      g.fill();
      g.fillStyle = `rgb(${AMBER})`;
      g.beginPath();
      g.arc(sx, sy, 3.2, 0, TAU);
      g.fill();
    },
  };
}

/* ── 简谐振动的合成（李萨如图形） ───────────────────────────────────────── */

function lissajous(readout) {
  const RATIOS = [[1, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 5]];
  let ratio = 2;
  let phase = Math.PI / 2;
  let t = 0;
  let cruise = 0;
  let lastText = '';

  return {
    update(dt, input, w, h) {
      t += dt * 1.1;
      if (input.hover) {
        ratio = clamp(Math.floor((input.x / w) * RATIOS.length), 0, RATIOS.length - 1);
        phase = damp(phase, clamp(input.y / h) * Math.PI, 10, dt);
      } else {
        cruise += dt;
        phase = (Math.PI / 2) * (1 + Math.sin(cruise * 0.35));
        ratio = Math.floor(cruise / 7) % RATIOS.length;
      }
      const [a, b] = RATIOS[ratio];
      const text = `ωx : ωy = ${a} : ${b} · Δφ = ${Math.round((phase * 180) / Math.PI)}°`;
      if (readout && text !== lastText) {
        readout.textContent = text;
        lastText = text;
      }
    },
    draw(g, w, h) {
      const [a, b] = RATIOS[ratio];
      const pad = 26;
      const A = Math.min(w - pad * 2 - 20, h - pad * 2 - 20) / 2;
      const cx = w / 2 + 8;
      const cy = h / 2 - 8;
      const px = (s) => cx + A * Math.sin(a * s + phase);
      const py = (s) => cy - A * Math.sin(b * s);

      // 坐标轴
      g.strokeStyle = `rgba(${PAPER}, 0.14)`;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(cx - A, cy + A + 14); g.lineTo(cx + A, cy + A + 14);
      g.moveTo(cx - A - 14, cy - A); g.lineTo(cx - A - 14, cy + A);
      g.stroke();

      // 完整的合成轨迹
      g.strokeStyle = `rgba(${JADE}, 0.6)`;
      g.lineWidth = 1.2;
      g.beginPath();
      const STEPS = 420;
      for (let i = 0; i <= STEPS; i++) {
        const s = (i / STEPS) * TAU;
        if (i === 0) g.moveTo(px(s), py(s));
        else g.lineTo(px(s), py(s));
      }
      g.stroke();

      // 当前质点 + 它在两条轴上的分振动
      const x = px(t);
      const y = py(t);
      g.strokeStyle = `rgba(${AMBER}, 0.32)`;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(x, y); g.lineTo(x, cy + A + 14);
      g.moveTo(x, y); g.lineTo(cx - A - 14, y);
      g.stroke();
      g.setLineDash([]);

      g.fillStyle = `rgba(${PAPER}, 0.85)`;
      g.beginPath(); g.arc(x, cy + A + 14, 2.6, 0, TAU); g.fill();
      g.beginPath(); g.arc(cx - A - 14, y, 2.6, 0, TAU); g.fill();

      g.fillStyle = `rgba(${AMBER}, 0.22)`;
      g.beginPath(); g.arc(x, y, 9, 0, TAU); g.fill();
      g.fillStyle = `rgb(${AMBER})`;
      g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
    },
  };
}

const LABS = { doppler, lissajous };

export function mountWavelab(root, ctx) {
  for (const figure of $$('[data-lab]', root)) {
    const canvas = $('canvas', figure);
    const make = LABS[figure.dataset.lab];
    if (!canvas || !make) continue;
    const lab = make($('[data-lab-readout]', figure));
    const g = canvas.getContext('2d');
    const input = { x: 0, y: 0, hover: false };
    let width = 0;
    let height = 0;
    let dpr = 1;
    let visible = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    };
    resize();
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);

    const track = (e) => {
      const rect = canvas.getBoundingClientRect();
      input.x = e.clientX - rect.left;
      input.y = e.clientY - rect.top;
      input.hover = true;
    };
    canvas.addEventListener('pointermove', track);
    canvas.addEventListener('pointerdown', track);
    canvas.addEventListener('pointerleave', () => { input.hover = false; });
    canvas.addEventListener('pointercancel', () => { input.hover = false; });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { rootMargin: '80px' }).observe(canvas);
    } else {
      visible = true;
    }

    const paint = (dt) => {
      if (!width || !height) return;
      lab.update(dt, input, width, height);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, width, height);
      lab.draw(g, width, height);
    };

    if (env.lite) {
      // 精简动效：只画一帧静态图
      for (let i = 0; i < 90; i++) lab.update(1 / 30, input, width || 300, height || 200);
      paint(1 / 60);
      continue;
    }
    ctx.ticker.add((time, dt) => { if (visible) paint(dt); });
  }
}
