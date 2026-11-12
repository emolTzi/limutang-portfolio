/**
 * director.js — 导演：把「页面状态」翻译成「粒子引擎参数」。
 *
 * 每帧做五件事：
 *   1. 找出视口中线落在哪个 [data-cue] 元素上 → 决定当前预设，必要时开始变形
 *   2. 更新相机（随指针有轻微视差）并算出指针在世界空间的射线
 *   3. 计算新旧两个编队各自的摆放矩阵（装进 DOM 占位框，或固定在视口）
 *   4. 把当前预设的数值平滑过渡后写进 field.params
 *   5. 处理「按住蓄力 → 松开爆发」
 *
 * 想让某段页面有专属的粒子表现：在元素上写 data-cue，然后去 cues.js 配预设即可。
 */

import { $$ } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { clamp, damp, mat4 } from '../core/math.js';
import { CAMERA } from './field.js';
import { resolveCue } from './cues.js';

/** 逐帧平滑的标量参数。 */
const SMOOTH = ['spring', 'damp', 'turb', 'breath', 'arc', 'dim', 'aperture', 'exposure', 'bloom', 'decay'];
const COLORS = [
  ['colA', 'a'],
  ['colB', 'b'],
  ['colHot', 'hot'],
  ['hazeA', 'hazeA'],
  ['hazeB', 'hazeB'],
];

const NO_CHARGE = 'a, button, input, textarea, select, summary, label, [role="button"], [data-no-charge]';
const BASE_SIZE = 0.0021;

export class Director {
  constructor(field, { pointer, scroll, env }) {
    this.field = field;
    this.pointer = pointer;
    this.scroll = scroll;
    this.env = env;

    this.entries = [];
    this.cur = this._virtual('intro');
    this.prev = this.cur;
    this.morph = 1;
    this.duration = 1.7;
    this.live = false;

    this.camX = 0;
    this.camY = 0;
    this.world = [0, 0];
    this.vel = [0, 0];
    this.hadPointer = false;

    this.pressing = false;
    this.pressTime = 0;
    this.charge = 0;
    this.focusTarget = -1;

    field.setPair('dust', 'dust');
    this._applyInstant(this.cur.cfg);

    bus.on('pointer:down', (e) => {
      if (this.env.lite || e.pointerType !== 'mouse') return;
      const target = e.target instanceof Element ? e.target : null;
      if (target && target.closest(NO_CHARGE)) return;
      this.pressing = true;
      this.pressTime = 0;
    });
    bus.on('pointer:up', () => this._release());
  }

  get narrow() {
    return window.innerWidth < 860;
  }

  _virtual(name) {
    return { el: null, name, mode: '', anchor: null, top: 0, bottom: 0, cfg: resolveCue(name, '', this.narrow) };
  }

  /** 扫描页面上的所有 [data-cue]。内容渲染完、或增删区块后调用。 */
  scan(root = document) {
    this.entries = $$('[data-cue]', root).map((el) => {
      const name = el.dataset.cue;
      const mode = el.dataset.cueMode || '';
      const cfg = resolveCue(name, mode, this.narrow);
      const anchor = cfg.anchored ? (el.matches('[data-stage-anchor]') ? el : el.querySelector('[data-stage-anchor]')) : null;
      return { el, name, mode, cfg, anchor, top: 0, bottom: 0 };
    });
    this.measure();
  }

  /** 重新读取各 cue 元素在文档中的位置（布局变化后调用）。 */
  measure() {
    const narrow = this.narrow;
    const offset = window.scrollY;
    for (const entry of this.entries) {
      const rect = entry.el.getBoundingClientRect();
      entry.top = rect.top + offset;
      entry.bottom = rect.bottom + offset;
      entry.cfg = resolveCue(entry.name, entry.mode, narrow);
    }
    if (this.cur && !this.cur.el) this.cur.cfg = resolveCue(this.cur.name, '', narrow);
  }

  /** 开场：从此刻起跟随滚动位置（第一次会从星尘汇聚成当前编队）。 */
  start() {
    this.live = true;
  }

  /** 高亮某个分组（-1 取消）。 */
  focus(group) {
    this.focusTarget = group;
  }

  _pick() {
    const line = window.scrollY + window.innerHeight * 0.5;
    let best = null;
    for (const entry of this.entries) {
      if (entry.top <= line) {
        if (line < entry.bottom) return entry;
        best = entry;
      } else if (!best) {
        best = entry;
      }
    }
    return best;
  }

  _enter(entry) {
    this.prev = this.cur || entry;
    this.cur = entry;
    this.morph = 0;
    // 减少动态效果时改为瞬时交叉淡化；正常情况仍按预设时长做「淡出再渐显」
    this.duration = this.env.lite ? 0.16 : entry.cfg.duration;
    this.field.setPair(this.prev.cfg.formation, entry.cfg.formation);
    bus.emit('cue', { name: entry.name, mode: entry.mode });
  }

  _applyInstant(cfg) {
    const p = this.field.params;
    for (const key of SMOOTH) p[key] = cfg[key];
    for (const [param, key] of COLORS) p[param] = cfg.colors[key].slice();
    p.size = BASE_SIZE * cfg.size;
  }

  _release() {
    if (!this.pressing) return;
    this.pressing = false;
    document.documentElement.classList.remove('is-charging');
    if (this.charge > 0.12) {
      const p = this.field.params;
      p.burst = [p.ptrPos[0], p.ptrPos[1], p.ptrPos[2], this.charge];
      p.burstAge = 0;
      p.flash = this.charge;
      bus.emit('burst', { power: this.charge });
    }
  }

  /** 把一个 cue 的编队摆进世界：对齐 DOM 占位框，或固定在视口。 */
  _place(out, entry, time) {
    const field = this.field;
    const cfg = entry.cfg;
    const formation = field.formations.get(cfg.formation);
    const unit = 2 / field.cssHeight; // 每 CSS 像素对应的世界单位
    let x;
    let y;
    let scale;
    const z = cfg.pos[2] || 0;

    if (entry.anchor && formation) {
      const rect = entry.anchor.getBoundingClientRect();
      x = (rect.left + rect.width / 2 - field.cssWidth / 2) * unit;
      y = -(rect.top + rect.height / 2 - field.cssHeight / 2) * unit;
      const sw = (rect.width * unit) / formation.size[0];
      const sh = (rect.height * unit) / formation.size[1];
      scale = (cfg.fitMode === 'height' ? sh : cfg.fitMode === 'width' ? sw : Math.min(sw, sh)) * cfg.fit;
      // 显示面积比设计稿小多少，粒子就按同样的比例缩小（亮度 ∝ 粒子面积，于是观感保持一致）
      const area = formation.size[0] * formation.size[1] * scale * scale;
      entry.grain = clamp(Math.sqrt(area / cfg.area), 0.42, 1.15);
    } else {
      x = cfg.pos[0] * (field.cssWidth / field.cssHeight);
      y = cfg.pos[1];
      scale = cfg.scale;
      entry.grain = 1;
    }

    const sway = this.env.lite ? 0 : 1;
    mat4.compose(
      out,
      x,
      y,
      z,
      cfg.rot[0] + cfg.spin[0] * time - this.camY * cfg.sway[1] * sway,
      cfg.rot[1] + cfg.spin[1] * time + this.camX * cfg.sway[0] * sway,
      cfg.rot[2] + cfg.spin[2] * time,
      scale,
    );
  }

  update(time, dt) {
    const field = this.field;
    const p = field.params;
    const ptr = this.pointer;
    const lite = this.env.lite;
    p.time = time;
    p.lite = lite ? 1 : 0;

    /* 1 ── 当前预设 */
    if (this.live) {
      const entry = this._pick();
      if (entry && entry !== this.cur) this._enter(entry);
    }
    if (this.morph < 1) this.morph = Math.min(1, this.morph + dt / this.duration);
    p.morph = this.morph;
    const cfg = this.cur.cfg;

    /* 2 ── 相机与指针射线 */
    const active = ptr.seen && ptr.inside && !lite;
    const mouse = active && ptr.type === 'mouse';
    const nx = clamp((ptr.x / field.cssWidth) * 2 - 1, -1, 1);
    const ny = clamp(1 - (ptr.y / field.cssHeight) * 2, -1, 1);
    this.camX = damp(this.camX, mouse ? nx : 0, 2.2, dt);
    this.camY = damp(this.camY, mouse ? ny : 0, 2.2, dt);

    const ex = this.camX * 0.2;
    const ey = this.camY * 0.12;
    const ez = CAMERA.distance;
    const view = mat4.lookAt(p.view, ex, ey, ez, 0, 0, 0);

    const tanHalf = Math.tan(CAMERA.fov / 2);
    const dx = nx * (field.cssWidth / field.cssHeight) * tanHalf;
    const dy = ny * tanHalf;
    let rx = view[0] * dx + view[1] * dy - view[2];
    let ry = view[4] * dx + view[5] * dy - view[6];
    let rz = view[8] * dx + view[9] * dy - view[10];
    const rl = Math.hypot(rx, ry, rz) || 1;
    rx /= rl; ry /= rl; rz /= rl;
    const hit = -ez / rz;
    const wx = ex + rx * hit;
    const wy = ey + ry * hit;

    if (active) {
      if (!this.hadPointer) {
        this.world[0] = wx;
        this.world[1] = wy;
        this.vel[0] = this.vel[1] = 0;
      }
      const vx = clamp((wx - this.world[0]) / dt, -9, 9);
      const vy = clamp((wy - this.world[1]) / dt, -9, 9);
      this.vel[0] = damp(this.vel[0], vx, 14, dt);
      this.vel[1] = damp(this.vel[1], vy, 14, dt);
      this.world[0] = wx;
      this.world[1] = wy;
      p.rayO[0] = ex; p.rayO[1] = ey; p.rayO[2] = ez;
      p.rayD[0] = rx; p.rayD[1] = ry; p.rayD[2] = rz;
      p.ptrPos[0] = wx; p.ptrPos[1] = wy; p.ptrPos[2] = 0;
    } else {
      this.vel[0] = damp(this.vel[0], 0, 8, dt);
      this.vel[1] = damp(this.vel[1], 0, 8, dt);
    }
    this.hadPointer = active;
    p.ptrVel[0] = this.vel[0];
    p.ptrVel[1] = this.vel[1];
    const speed = Math.hypot(this.vel[0], this.vel[1]);
    p.ptrPush = damp(p.ptrPush, active ? cfg.push * (1.3 + Math.min(speed, 5) * 1.5) : 0, 10, dt);
    p.follow = damp(p.follow, mouse ? cfg.follow : 0, 3.5, dt);
    p.wind = lite ? 0 : clamp(-this.scroll.velocity * 0.0007, -2.2, 2.2);

    /* 3 ── 摆放 */
    this._place(p.modelFrom, this.prev, time);
    this._place(p.modelTo, this.cur, time);
    const pw = this.prev.cfg.wave;
    const cw = cfg.wave;
    p.waveFrom[0] = pw[0]; p.waveFrom[1] = pw[1]; p.waveFrom[2] = pw[2];
    p.waveTo[0] = cw[0]; p.waveTo[1] = cw[1]; p.waveTo[2] = cw[2];

    /* 4 ── 数值平滑 */
    const rate = 3.2;
    for (const key of SMOOTH) p[key] = damp(p[key], cfg[key], rate, dt);
    for (const [param, key] of COLORS) {
      const from = p[param];
      const to = cfg.colors[key];
      from[0] = damp(from[0], to[0], rate, dt);
      from[1] = damp(from[1], to[1], rate, dt);
      from[2] = damp(from[2], to[2], rate, dt);
    }
    p.size = damp(p.size, BASE_SIZE * cfg.size * (this.cur.grain || 1), rate, dt);
    if (lite) {
      p.turb *= 0.35;
      p.decay = 0;
    }

    if (this.focusTarget >= 0) {
      p.group = this.focusTarget;
      p.groupAmt = damp(p.groupAmt, 1, 6, dt);
    } else {
      p.groupAmt = damp(p.groupAmt, 0, 5, dt);
      if (p.groupAmt < 0.01) p.group = -1;
    }

    /* 5 ── 蓄力与爆发 */
    if (this.pressing) {
      this.pressTime += dt;
      const selection = window.getSelection ? String(window.getSelection()) : '';
      if (selection.length > 0 || !ptr.down) {
        // 用户其实是在选文字：让路
        this.pressing = false;
        document.documentElement.classList.remove('is-charging');
      } else if (this.pressTime > 0.2) {
        if (this.charge === 0) document.documentElement.classList.add('is-charging');
        this.charge = Math.min(1, this.charge + dt / 1.25);
      }
    }
    if (!this.pressing) this.charge = damp(this.charge, 0, 9, dt);
    if (this.charge < 0.002) this.charge = 0;
    p.charge = this.charge;
    p.ptrRadius = 0.16 + this.charge * 0.12;
    p.burstAge += dt;
    if (p.burstAge > 3) p.burst[3] = 0;
    p.flash = damp(p.flash, 0, 4.5, dt);
  }
}
