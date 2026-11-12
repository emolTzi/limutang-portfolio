/**
 * loader.js — 开场加载动画。
 *
 * 加载层的 HTML 直接写在 index.html 里（脚本还没下载完就能显示）。
 * 这里只负责推进进度：七颗光点依次点亮，计数从 00 数到智能体总数。
 */

import { $, $$, pad } from '../core/dom.js';
import { clamp } from '../core/math.js';

const MIN_TIME = 1500; // 再快也让开场动画完整播完
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function createLoader({ total = 20, still = false } = {}) {
  const node = $('#loader');
  if (!node) return { set() {}, finish: async () => {} };
  if (still) {
    node.remove();
    return { set() {}, finish: async () => {} };
  }

  const countEl = $('[data-loader-count]', node);
  const totalEl = $('[data-loader-total]', node);
  const orbs = $$('.loader__orbs i', node);
  if (totalEl) totalEl.textContent = pad(total);

  const startedAt = performance.now();
  let target = 0.06;
  let shown = 0;
  let last = startedAt;
  let raf = 0;

  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    shown += (target - shown) * (1 - Math.exp(-dt * 4.5));
    if (countEl) countEl.textContent = pad(Math.round(shown * total));
    const lit = Math.round(shown * orbs.length);
    orbs.forEach((orb, i) => orb.classList.toggle('is-lit', i < lit));
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return {
    /** 进度只增不减。 */
    set(value) {
      target = Math.max(target, clamp(value));
    },
    async finish() {
      target = 1;
      const wait = MIN_TIME - (performance.now() - startedAt);
      if (wait > 0) await sleep(wait);
      while (shown < 0.985) await sleep(40);
      // 淡出一开始就返回，让粒子的汇聚和幕布的揭开同时发生
      node.classList.add('is-done');
      setTimeout(() => {
        cancelAnimationFrame(raf);
        node.remove();
      }, 1200);
    },
  };
}
