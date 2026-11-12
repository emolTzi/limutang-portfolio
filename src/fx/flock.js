/**
 * flock.js — 跟随光标的「智能体群」。
 *
 * 这不是一个随便的拖尾特效：它的编制直接取自内容文件里的团队结构（getTeam()）。
 *   · 协调者（青色，稍大）围着光标转 —— 协调 bot 向人汇报
 *   · 执行者（暖白，稍小）只围着自己的协调者转 —— 执行 bot 只向协调 bot 汇报
 * 所以改了 site.js 里的团队结构，光标后面跟着的队形也会跟着变。
 *
 * 行为：
 *   · 悬停在链接 / 按钮 / [data-agent-target] 上：整队散开，沿着目标的边框巡逻
 *   · 点击：整队向外一震；蓄力释放：更强的一震 + 一圈涟漪
 *   · 光标静止：队形慢慢舒展开
 *
 * 画在最上层的一块 2D canvas 上（不拦截任何鼠标事件）。
 */

import { TAU, damp, mulberry32 } from '../core/math.js';
import { bus } from '../core/bus.js';

const TRAIL = 9;
const JADE = '143, 227, 214';
const PAPER = '242, 235, 224';
const AMBER = '255, 157, 46';

function agent(kind, line, parent, rand) {
  return {
    kind,
    line,
    parent,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    phase: rand() * TAU,
    radius: 11 + rand() * 15,
    speed: (rand() < 0.5 ? -1 : 1) * (1.1 + rand() * 1.7),
    slot: 0,
    trail: new Float32Array(TRAIL * 2),
  };
}

export class Flock {
  constructor(canvas, { team, pointer, stage }) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.pointer = pointer;
    this.stage = stage;
    this.agents = [];
    this.coordinators = [];
    this.alpha = 0;
    this.engage = 0;
    this.target = null;
    this.placed = false;
    this.ripples = [];
    this.width = 0;
    this.height = 0;
    this.dirty = false;

    const rand = mulberry32(487167344);
    const lines = team.lines;
    lines.forEach((line, li) => {
      const coordinator = agent('coord', li, null, rand);
      coordinator.phase = (li / lines.length) * TAU;
      this.agents.push(coordinator);
      this.coordinators.push(coordinator);
      for (let j = 0; j < line.executors; j++) this.agents.push(agent('exec', li, coordinator, rand));
    });
    this.agents.forEach((a, i) => { a.slot = i / this.agents.length; });

    this.resize();
    window.addEventListener('resize', () => this.resize());
    bus.on('pointer:down', (e) => { if (e.pointerType === 'mouse') this.kick(260, 0.5); });
    bus.on('burst', ({ power }) => this.kick(500 + power * 900, 1 + power));
  }

  get count() {
    return this.agents.length;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);
  }

  /** 指定要「包围」的元素（null = 回到跟随光标）。 */
  setTarget(el) {
    this.target = el;
  }

  /** 向外一震。 */
  kick(force, ripple) {
    const { x, y } = this.pointer;
    for (const a of this.agents) {
      const dx = a.x - x;
      const dy = a.y - y;
      const d = Math.hypot(dx, dy) || 1;
      a.vx += (dx / d) * force;
      a.vy += (dy / d) * force;
    }
    if (ripple) this.ripples.push({ x, y, t: 0, size: ripple });
  }

  update(time, dt) {
    const ptr = this.pointer;
    const g = this.g;
    const visible = ptr.seen && ptr.inside && ptr.type === 'mouse';
    this.alpha = damp(this.alpha, visible ? 1 : 0, visible ? 6 : 3, dt);

    if (this.alpha < 0.004) {
      if (this.dirty) {
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.dirty = false;
      }
      this.placed = false;
      return;
    }

    const lx = ptr.x;
    const ly = ptr.y;
    if (!this.placed) {
      for (const a of this.agents) {
        a.x = lx;
        a.y = ly;
        a.vx = a.vy = 0;
        for (let i = 0; i < TRAIL; i++) { a.trail[i * 2] = lx; a.trail[i * 2 + 1] = ly; }
      }
      this.placed = true;
    }

    // 目标元素的边框（悬停时沿它巡逻）
    let rect = null;
    if (this.target) {
      if (!this.target.isConnected) this.target = null;
      else {
        const r = this.target.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) rect = r;
      }
    }
    this.engage = damp(this.engage, rect ? 1 : 0, 7, dt);

    const charge = this.stage ? this.stage.charge : 0;
    const spread = (1 + Math.min(ptr.idle, 4) * 0.14) * (1 - charge * 0.6);
    const spin = 1 + charge * 4;

    for (const a of this.agents) {
      let tx;
      let ty;
      let stiffness;
      let damping;
      if (rect) {
        const pad = 9;
        const w = rect.width + pad * 2;
        const h = rect.height + pad * 2;
        const perimeter = 2 * (w + h);
        let s = (((time * 46) / perimeter + a.slot) % 1) * perimeter;
        const x0 = rect.left - pad;
        const y0 = rect.top - pad;
        if (s < w) { tx = x0 + s; ty = y0; }
        else if ((s -= w) < h) { tx = x0 + w; ty = y0 + s; }
        else if ((s -= h) < w) { tx = x0 + w - s; ty = y0 + h; }
        else { tx = x0; ty = y0 + h - (s - w); }
        stiffness = 120;
        damping = 16;
      } else if (a.kind === 'coord') {
        const angle = a.phase + time * 0.75 * spin;
        const R = 30 * spread;
        tx = lx + Math.cos(angle) * R;
        ty = ly + Math.sin(angle) * R;
        stiffness = 95;
        damping = 13;
      } else {
        const angle = a.phase + time * a.speed * spin;
        const R = a.radius * spread;
        tx = a.parent.x + Math.cos(angle) * R;
        ty = a.parent.y + Math.sin(angle) * R;
        stiffness = 58;
        damping = 9.5;
      }
      a.vx += ((tx - a.x) * stiffness - a.vx * damping) * dt;
      a.vy += ((ty - a.y) * stiffness - a.vy * damping) * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      // 轨迹：整体后移一格，最新位置放在末尾
      a.trail.copyWithin(0, 2);
      a.trail[TRAIL * 2 - 2] = a.x;
      a.trail[TRAIL * 2 - 1] = a.y;
    }

    /* ── 绘制 ─────────────────────────────────────────────────────────── */
    const dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, this.width, this.height);
    this.dirty = true;
    const alpha = this.alpha;
    const linkAlpha = alpha * (1 - this.engage);

    // 汇报关系：执行者 → 协调者 → 光标
    if (linkAlpha > 0.02) {
      g.lineWidth = 0.6;
      g.strokeStyle = `rgba(${JADE}, ${0.2 * linkAlpha})`;
      g.beginPath();
      for (const a of this.agents) {
        if (a.kind !== 'exec') continue;
        g.moveTo(a.x, a.y);
        g.lineTo(a.parent.x, a.parent.y);
      }
      g.stroke();
      g.strokeStyle = `rgba(${AMBER}, ${0.34 * linkAlpha})`;
      g.beginPath();
      for (const a of this.coordinators) {
        g.moveTo(a.x, a.y);
        g.lineTo(lx, ly);
      }
      g.stroke();
    }

    g.lineCap = 'round';
    for (const a of this.agents) {
      const isCoord = a.kind === 'coord';
      const color = isCoord ? JADE : PAPER;
      const width = isCoord ? 2.2 : 1.3;
      for (let i = 1; i < TRAIL; i++) {
        const k = i / (TRAIL - 1);
        g.strokeStyle = `rgba(${color}, ${k * k * 0.5 * alpha})`;
        g.lineWidth = width * k;
        g.beginPath();
        g.moveTo(a.trail[(i - 1) * 2], a.trail[(i - 1) * 2 + 1]);
        g.lineTo(a.trail[i * 2], a.trail[i * 2 + 1]);
        g.stroke();
      }
      if (isCoord) {
        g.fillStyle = `rgba(${JADE}, ${0.16 * alpha})`;
        g.beginPath();
        g.arc(a.x, a.y, 7, 0, TAU);
        g.fill();
      }
      g.fillStyle = `rgba(${color}, ${(isCoord ? 1 : 0.85) * alpha})`;
      g.beginPath();
      g.arc(a.x, a.y, isCoord ? 2.6 : 1.5, 0, TAU);
      g.fill();
    }

    // 涟漪
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.t += dt;
      const life = ripple.t / 0.9;
      if (life >= 1) {
        this.ripples.splice(i, 1);
        continue;
      }
      const eased = 1 - Math.pow(1 - life, 3);
      g.strokeStyle = `rgba(${AMBER}, ${(1 - life) * 0.6 * alpha})`;
      g.lineWidth = 1.2;
      g.beginPath();
      g.arc(ripple.x, ripple.y, 10 + eased * 90 * ripple.size, 0, TAU);
      g.stroke();
    }
  }
}
