/**
 * scroll.js — 惯性平滑滚动（自研，无依赖）。
 *
 * 原理：拦截滚轮，把增量累加到 target，再每帧用指数平滑把真实滚动位置追过去。
 * 页面依然是原生滚动（不是 transform 假滚动），所以 position: sticky、锚点、
 * 键盘翻页、浏览器查找、无障碍读屏全部照常工作。
 *
 * 触屏设备和「精简动效」模式下自动退回原生滚动。
 *
 * 对外：
 *   scroll.y / velocity / progress / limit / direction
 *   scroll.to(target, { offset, immediate })    target 可为数字 / 选择器 / 元素
 *   scroll.lock() / unlock()                    弹层打开时锁定
 *   给元素加 data-native-scroll                 其内部滚轮不被接管
 */

import { clamp, damp, ease, lerp } from './math.js';
import { ticker, ORDER } from './ticker.js';
import { env } from './env.js';
import { bus } from './bus.js';

const KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

class Scroll {
  constructor() {
    this.y = 0;
    this.target = 0;
    this.velocity = 0;
    this.progress = 0;
    this.limit = 0;
    this.direction = 1;
    this.smooth = false;
    this.locked = false;
    this._animating = false;
    this._tween = null;
    this._lastY = 0;
    this._onWheel = this._onWheel.bind(this);
  }

  init() {
    this.y = this.target = this._lastY = window.scrollY;
    this.measure();
    this.setSmooth(env.finePointer && !env.lite);

    window.addEventListener('scroll', () => {
      // 不是我们驱动的滚动（键盘、拖滚动条、触摸）→ 跟随原生位置
      if (!this._animating) this.y = this.target = window.scrollY;
    }, { passive: true });

    // 用户用别的方式滚动时，立刻交还控制权
    const yieldControl = () => {
      this._animating = false;
      this._tween = null;
      this.y = this.target = window.scrollY;
    };
    window.addEventListener('keydown', (e) => { if (KEYS.has(e.key)) yieldControl(); });
    window.addEventListener('touchstart', yieldControl, { passive: true });
    window.addEventListener('mousedown', (e) => {
      // 点在滚动条上
      if (e.clientX >= document.documentElement.clientWidth) yieldControl();
    });

    window.addEventListener('resize', () => this.measure());
    if ('ResizeObserver' in window) {
      new ResizeObserver(() => this.measure()).observe(document.body);
    }

    ticker.add((time, dt) => this._tick(dt), ORDER.SCROLL);
  }

  setSmooth(on) {
    if (on === this.smooth) return;
    this.smooth = on;
    document.documentElement.classList.toggle('has-smooth-scroll', on);
    if (on) window.addEventListener('wheel', this._onWheel, { passive: false });
    else window.removeEventListener('wheel', this._onWheel);
    this._animating = false;
    this._tween = null;
    this.y = this.target = window.scrollY;
  }

  measure() {
    const limit = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (limit !== this.limit) {
      this.limit = limit;
      this.target = clamp(this.target, 0, limit);
      bus.emit('layout');
    }
  }

  _onWheel(e) {
    if (e.ctrlKey) return; // 触控板捏合缩放
    const native = e.target instanceof Element ? e.target.closest('[data-native-scroll]') : null;
    if (native) return;
    e.preventDefault();
    if (this.locked) return;
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40;
    else if (e.deltaMode === 2) delta *= window.innerHeight;
    this._tween = null;
    this.target = clamp(this.target + delta, 0, this.limit);
    this._animating = true;
  }

  _tick(dt) {
    if (this._tween) {
      // 按真实时间推进：掉帧时跳转依然准时到达
      const tw = this._tween;
      tw.t = Math.min(1, (performance.now() - tw.start) / (tw.duration * 1000));
      this.y = this.target = lerp(tw.from, tw.to, ease.inOutCubic(tw.t));
      window.scrollTo(0, this.y);
      if (tw.t >= 1) {
        this._tween = null;
        this._animating = false;
      }
    } else if (this._animating) {
      this.y = damp(this.y, this.target, 8.5, dt);
      if (Math.abs(this.target - this.y) < 0.4) {
        this.y = this.target;
        this._animating = false;
      }
      window.scrollTo(0, this.y);
    } else {
      this.y = this.target = window.scrollY;
    }

    const v = (this.y - this._lastY) / dt;
    this._lastY = this.y;
    this.velocity = damp(this.velocity, v, 10, dt);
    if (Math.abs(v) > 1) this.direction = v > 0 ? 1 : -1;
    this.progress = this.limit > 0 ? clamp(this.y / this.limit) : 0;
  }

  /** 滚到指定位置。target：数字 / CSS 选择器 / 元素。 */
  to(target, { offset = 0, immediate = false } = {}) {
    let top = 0;
    if (typeof target === 'number') top = target;
    else {
      const el = typeof target === 'string' ? document.querySelector(target) : target;
      if (!el) return;
      top = el.getBoundingClientRect().top + window.scrollY;
    }
    top = clamp(top + offset, 0, this.limit);

    if (immediate || env.lite) {
      this._tween = null;
      this._animating = false;
      window.scrollTo({ top, behavior: 'instant' });
      this.y = this.target = top;
      return;
    }
    if (!this.smooth) {
      window.scrollTo({ top, behavior: 'smooth' });
      return;
    }
    const distance = Math.abs(top - this.y);
    this._tween = {
      from: this.y,
      to: top,
      t: 0,
      start: performance.now(),
      duration: clamp(0.6 + distance / 4200, 0.6, 1.9),
    };
    this._animating = true;
  }

  lock() {
    this.locked = true;
    document.documentElement.classList.add('is-locked');
  }

  unlock() {
    this.locked = false;
    document.documentElement.classList.remove('is-locked');
  }
}

export const scroll = new Scroll();
