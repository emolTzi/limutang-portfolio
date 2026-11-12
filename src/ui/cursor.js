/**
 * cursor.js — 自定义光标 + 智能体群的装配。
 *
 * 光标本体是一个紧贴指针的琥珀色小点（零延迟，保证点击精度），
 * 「跟随感」交给后面那支 20 个智能体的队伍（fx/flock.js）。
 *
 *   data-cursor="文字"       悬停时光标旁显示一个小标签
 *   data-agent-target        悬停时智能体群沿该元素的边框巡逻（链接和按钮默认就会）
 *
 * 只在「有鼠标 + 完整动效」时启用；触屏与精简模式保留系统光标。
 */

import { $ } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ticker } from '../core/ticker.js';
import { env } from '../core/env.js';
import { getTeam } from '../content/site.js';
import { Flock } from '../fx/flock.js';

const INTERACTIVE = 'a[href], button:not([disabled]), [role="button"], summary, [data-agent-target]';

export function initCursor(ctx) {
  const node = $('#cursor');
  const canvas = $('#fx-flock');
  if (!node || !canvas) return null;
  if (!env.finePointer || env.lite) {
    node.remove();
    canvas.remove();
    return null;
  }

  const root = document.documentElement;
  const label = $('.cursor__label', node);
  const flock = new Flock(canvas, { team: getTeam(), pointer: ctx.pointer, stage: ctx.stage });
  root.classList.add('has-cursor');

  // 位置直接在事件里更新，不等下一帧：光标必须跟手
  window.addEventListener('pointermove', (e) => {
    // ctx.pointer.seen 为假说明这次事件被判定为无头浏览器的合成事件（见 core/pointer.js）
    if (e.pointerType !== 'mouse' || !ctx.pointer.seen) return;
    node.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    node.classList.add('is-on');
  }, { passive: true });
  root.addEventListener('mouseleave', () => node.classList.remove('is-on'));

  let current = null;
  const setHover = (target) => {
    if (target === current) return;
    current = target;
    const hasLabel = target && target.closest('[data-cursor]');
    const text = hasLabel ? hasLabel.dataset.cursor : '';
    node.classList.toggle('is-link', Boolean(target));
    node.classList.toggle('has-label', Boolean(text));
    if (label && text) label.textContent = text;
    flock.setTarget(target ? target.closest('[data-agent-target]') || target : null);
  };

  document.addEventListener('pointerover', (e) => {
    const el = e.target instanceof Element ? e.target : null;
    setHover(el ? el.closest(INTERACTIVE) : null);
  }, { passive: true });

  bus.on('pointer:down', () => node.classList.add('is-down'));
  bus.on('pointer:up', () => node.classList.remove('is-down'));

  ticker.add((time, dt) => {
    // 悬停的元素在滚动中被移走了
    if (current && !current.isConnected) setHover(null);
    node.style.setProperty('--charge', ctx.stage.charge.toFixed(3));
    flock.update(time, dt);
  });

  return flock;
}
