/**
 * ticker.js — 全站唯一的 requestAnimationFrame 循环。
 *
 * 所有逐帧逻辑都通过 ticker.add(fn, order) 注册，避免每个模块各开一个 rAF。
 * order 越小越先执行：输入 → 滚动 → 逻辑 → 渲染。
 */

export const ORDER = { INPUT: -100, SCROLL: -50, LOGIC: 0, RENDER: 100 };

class Ticker {
  constructor() {
    this.time = 0;
    this.dt = 1 / 60;
    this.frame = 0;
    this.fps = 60;
    this._tasks = [];
    this._raf = 0;
    this._last = 0;
    this._loop = this._loop.bind(this);
  }

  /** 注册逐帧任务，返回取消函数。fn(time, dt)，单位秒。 */
  add(fn, order = ORDER.LOGIC) {
    const task = { fn, order };
    this._tasks.push(task);
    this._tasks.sort((a, b) => a.order - b.order);
    return () => {
      const i = this._tasks.indexOf(task);
      if (i >= 0) this._tasks.splice(i, 1);
    };
  }

  start() {
    if (this._raf) return;
    this._last = performance.now();
    this._raf = requestAnimationFrame(this._loop);
  }

  stop() {
    cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _loop(now) {
    this._raf = requestAnimationFrame(this._loop);
    const raw = (now - this._last) / 1000;
    this._last = now;
    // 切到后台再回来时 raw 会很大，夹住它，物理模拟才不会炸
    const dt = Math.min(Math.max(raw, 0.001), 0.05);
    this.dt = dt;
    this.time += dt;
    this.frame += 1;
    if (raw > 0 && raw < 0.5) this.fps += (1 / raw - this.fps) * 0.04;
    const tasks = this._tasks;
    for (let i = 0; i < tasks.length; i++) {
      try {
        tasks[i].fn(this.time, dt);
      } catch (err) {
        console.error('[ticker] 任务出错，已移除', err);
        tasks.splice(i, 1);
        i -= 1;
      }
    }
  }
}

export const ticker = new Ticker();
