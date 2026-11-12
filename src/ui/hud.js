/**
 * hud.js — 页面上的实时读数（都是真实数值，不是装饰）。
 *
 *   data-hud="particles"   GPU 正在模拟的粒子数
 *   data-hud="fps"         当前帧率
 *   data-hud="agents"      跟随光标的智能体数量
 *   data-hud="clock"       北京时间
 *   data-hud="travel"      本次访问光标累计移动的距离（米，按 96 px/英寸换算）
 */

import { $$ } from '../core/dom.js';
import { getTeam } from '../content/site.js';

export function initHud(ctx) {
  const { stage, ticker, pointer } = ctx;
  const nodes = {};
  for (const el of $$('[data-hud]')) (nodes[el.dataset.hud] ||= []).push(el);
  const write = (key, text) => {
    for (const el of nodes[key] || []) if (el.textContent !== text) el.textContent = text;
  };

  write('agents', String(getTeam().total));

  let clock = null;
  try {
    clock = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    clock = null;
  }

  let elapsed = 1;
  ticker.add((time, dt) => {
    elapsed += dt;
    if (elapsed < 0.5) return;
    elapsed = 0;
    if (stage.enabled) {
      write('particles', stage.stats().particles.toLocaleString('en-US'));
      write('fps', String(Math.round(ticker.fps)));
    } else {
      write('particles', '已关闭');
      write('fps', String(Math.round(ticker.fps)));
    }
    if (clock) write('clock', clock.format(new Date()));
    write('travel', ((pointer.travel / 96) * 0.0254).toFixed(1));
  });
}
