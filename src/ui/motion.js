/**
 * motion.js — 声明式的进场与文字动效。HTML 里写属性，这里统一接管。
 *
 *   data-reveal[="fade|up|mask|line|scale"]   进入视口时加上 .is-in（样式在 components.css）
 *   data-stagger                              其内部的 data-reveal 依次错开（--si）
 *   data-split                                把文字拆成单字 <span class="ch">，可逐字动画
 *   data-illuminate                           长段落随滚动逐字点亮（概述里的那段话）
 *   data-scramble                             进入视口时字符乱码后归位（只动英文与数字）
 *   data-count="3000"                         进入视口时从 0 数到目标值
 *
 * 无障碍：拆字后的文本对读屏不友好，所以拆字时会保留一份完整的隐藏文本给读屏，
 * 拆出来的单字标记为 aria-hidden。
 *
 * 「精简动效」模式下所有内容直接可见，不做任何进场动画。
 */

import { $$ } from '../core/dom.js';
import { clamp, ease } from '../core/math.js';
import { ticker } from '../core/ticker.js';
import { env } from '../core/env.js';

/** 元素第一次进入视口时回调一次。 */
export function whenVisible(el, fn, margin = '0px 0px -8% 0px') {
  if (!('IntersectionObserver' in window)) {
    fn(el);
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.disconnect();
      fn(el);
    }
  }, { rootMargin: margin, threshold: 0.01 });
  io.observe(el);
}

const segment = (text) => {
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    return Array.from(new Intl.Segmenter('zh', { granularity: 'grapheme' }).segment(text), (s) => s.segment);
  }
  return Array.from(text);
};

/**
 * 把元素内的文字逐字包进 <span class="ch" style="--i:序号">。
 * 保留原有的内联标签（例如高亮的 <strong>）。返回字数。
 */
export function splitChars(el) {
  if (el.dataset.splitDone) return Number(el.dataset.splitDone);
  const original = el.textContent;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let index = 0;
  for (const node of textNodes) {
    const fragment = document.createDocumentFragment();
    for (const ch of segment(node.nodeValue)) {
      if (ch === ' ' || ch === '\n') {
        fragment.appendChild(document.createTextNode(' '));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      span.style.setProperty('--i', String(index));
      fragment.appendChild(span);
      index += 1;
    }
    node.parentNode.replaceChild(fragment, node);
  }

  // 读屏读完整文本，视觉层逐字动画
  const visual = document.createElement('span');
  visual.setAttribute('aria-hidden', 'true');
  visual.className = 'split';
  while (el.firstChild) visual.appendChild(el.firstChild);
  const spoken = document.createElement('span');
  spoken.className = 'sr-only';
  spoken.textContent = original;
  el.append(spoken, visual);
  el.style.setProperty('--n', String(index));
  el.dataset.splitDone = String(index);
  return index;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/+=<>';

/** 乱码归位。 */
export function scramble(el, duration = 900) {
  const final = el.dataset.scrambleText || el.textContent;
  el.dataset.scrambleText = final;
  const chars = Array.from(final);
  const start = performance.now();
  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const settleAt = (i / chars.length) * 0.7 + 0.3;
      out += t >= settleAt || !/[A-Za-z0-9]/.test(ch) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    }
    el.textContent = out;
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** 打印时数字必须是最终值：打印期间暂停计数动画。 */
let printing = false;

function countUp(el) {
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target)) return;
  const duration = 1700;
  const start = performance.now();
  const frame = (now) => {
    const t = printing ? 1 : Math.min(1, (now - start) / duration);
    el.textContent = String(Math.round(target * ease.outExpo(t)));
    if (t < 1) requestAnimationFrame(frame);
    else el.textContent = String(target);
  };
  requestAnimationFrame(frame);
}

export function initMotion(root = document) {
  const lite = env.lite;

  // 错开序号
  for (const group of $$('[data-stagger]', root)) {
    $$('[data-reveal]', group).forEach((item, i) => item.style.setProperty('--si', String(i)));
  }

  // 拆字
  for (const el of $$('[data-split]', root)) splitChars(el);

  // 进场
  const reveals = $$('[data-reveal]', root);
  if (lite || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -9% 0px', threshold: 0.04 });
    reveals.forEach((el) => io.observe(el));
  }

  if (lite) return;

  window.addEventListener('beforeprint', () => {
    printing = true;
    for (const el of $$('[data-count]', root)) el.textContent = el.dataset.count;
  });
  window.addEventListener('afterprint', () => { printing = false; });

  for (const el of $$('[data-scramble]', root)) whenVisible(el, () => scramble(el));
  for (const el of $$('[data-count]', root)) whenVisible(el, () => countUp(el));

  // 随滚动逐字点亮
  const lit = $$('[data-illuminate]', root).map((el) => {
    const total = splitChars(el);
    $$('.ch', el).forEach((ch, i) => ch.style.setProperty('--i', (i / Math.max(total, 1) * 0.9).toFixed(4)));
    el.classList.add('is-illuminating');
    return { el, value: -1 };
  });
  if (lit.length) {
    ticker.add(() => {
      const vh = window.innerHeight;
      for (const item of lit) {
        const rect = item.el.getBoundingClientRect();
        if (rect.bottom < -vh || rect.top > vh * 2) continue;
        const p = clamp((vh * 0.86 - rect.top) / (rect.height + vh * 0.36));
        if (Math.abs(p - item.value) < 0.002) continue;
        item.value = p;
        item.el.style.setProperty('--p', p.toFixed(4));
      }
    });
  }
}
