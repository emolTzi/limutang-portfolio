/**
 * interact.js — 鼠标微交互：磁吸、3D 倾斜、聚光。
 *
 *   data-magnetic[="0.35"]   元素被光标「吸」过去一点（数值 = 力度）
 *   data-tilt[="6"]          卡片随光标位置做 3D 倾斜（数值 = 最大角度）
 *   data-spot                只更新聚光位置（--mx / --my），不倾斜
 *
 * 实现要点：
 *   · 位移用独立的 CSS `translate` 属性，不会和元素自身的 transform / 进场动画打架
 *   · 倾斜与聚光只写 CSS 变量，具体长什么样完全由样式决定
 */

import { $$ } from '../core/dom.js';
import { damp } from '../core/math.js';
import { ticker } from '../core/ticker.js';
import { env } from '../core/env.js';

export function initInteract(ctx, root = document) {
  if (!env.finePointer || env.lite) return;
  const { pointer } = ctx;

  /* ── 磁吸 ─────────────────────────────────────────────────────────────── */
  const magnets = $$('[data-magnetic]', root).map((el) => {
    const item = { el, x: 0, y: 0, cx: 0, cy: 0, active: false, strength: parseFloat(el.dataset.magnetic) || 0.35 };
    el.addEventListener('pointerenter', () => {
      const rect = el.getBoundingClientRect();
      item.cx = rect.left + rect.width / 2 - item.x;
      item.cy = rect.top + rect.height / 2 - item.y;
      item.active = true;
    });
    el.addEventListener('pointerleave', () => { item.active = false; });
    return item;
  });

  /* ── 倾斜 / 聚光 ──────────────────────────────────────────────────────── */
  const tilts = $$('[data-tilt], [data-spot]', root).map((el) => {
    const item = {
      el,
      max: el.hasAttribute('data-tilt') ? parseFloat(el.dataset.tilt) || 6 : 0,
      rx: 0, ry: 0, tx: 0, ty: 0, hover: 0, active: false, settled: true,
    };
    el.addEventListener('pointerenter', () => { item.active = true; item.settled = false; });
    el.addEventListener('pointerleave', () => { item.active = false; });
    return item;
  });

  let lastScroll = window.scrollY;

  ticker.add((time, dt) => {
    // 滚动时元素在动，中心点要跟着修正
    const scrolled = window.scrollY - lastScroll;
    lastScroll = window.scrollY;

    for (const m of magnets) {
      if (m.active) m.cy -= scrolled;
      const tx = m.active ? (pointer.x - m.cx) * m.strength : 0;
      const ty = m.active ? (pointer.y - m.cy) * m.strength : 0;
      if (!m.active && Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05) {
        if (m.x !== 0 || m.y !== 0) {
          m.x = m.y = 0;
          m.el.style.translate = '';
        }
        continue;
      }
      m.x = damp(m.x, tx, m.active ? 10 : 6, dt);
      m.y = damp(m.y, ty, m.active ? 10 : 6, dt);
      m.el.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
    }

    for (const t of tilts) {
      if (t.settled) continue;
      if (t.active) {
        const rect = t.el.getBoundingClientRect();
        const px = (pointer.x - rect.left) / rect.width;
        const py = (pointer.y - rect.top) / rect.height;
        t.tx = (0.5 - py) * t.max;
        t.ty = (px - 0.5) * t.max;
        t.el.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        t.el.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      } else {
        t.tx = 0;
        t.ty = 0;
      }
      t.rx = damp(t.rx, t.tx, 8, dt);
      t.ry = damp(t.ry, t.ty, 8, dt);
      t.hover = damp(t.hover, t.active ? 1 : 0, 7, dt);
      t.el.style.setProperty('--rx', `${t.rx.toFixed(2)}deg`);
      t.el.style.setProperty('--ry', `${t.ry.toFixed(2)}deg`);
      t.el.style.setProperty('--hover', t.hover.toFixed(3));
      if (!t.active && t.hover < 0.004 && Math.abs(t.rx) < 0.01 && Math.abs(t.ry) < 0.01) {
        t.settled = true;
        t.el.style.setProperty('--hover', '0');
        t.el.style.setProperty('--rx', '0deg');
        t.el.style.setProperty('--ry', '0deg');
      }
    }
  });
}
