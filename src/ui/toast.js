/**
 * toast.js — 屏幕底部的一行轻提示。
 */

import { el } from '../core/dom.js';

let node = null;
let timer = 0;

export function toast(message, duration = 2200) {
  if (!node) {
    node = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(node);
  }
  node.textContent = message;
  // 强制回流，让连续两次提示也能重新播放进场
  node.classList.remove('is-on');
  void node.offsetWidth;
  node.classList.add('is-on');
  clearTimeout(timer);
  timer = setTimeout(() => node.classList.remove('is-on'), duration);
}
