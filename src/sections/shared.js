/**
 * shared.js — 各区块模板共用的 HTML 片段。
 * 全部是「数据 → 字符串」的纯函数，在 Node 里也能跑（方便以后做预渲染）。
 */

import { esc, pad, isExternal } from '../core/dom.js';
import { site, getLink } from '../content/site.js';

/** 章节进度点：第 n 章就点亮前 n 颗。 */
export function orbs(n, total) {
  let html = '';
  for (let i = 0; i < total; i++) html += `<i${i < n ? ' class="is-lit"' : ''}></i>`;
  return `<span class="orbs" aria-hidden="true">${html}</span>`;
}

/** 章节标题。chapter 来自 site.chapters，index 从 0 开始。 */
export function secHead(chapter, index, { lede = '' } = {}) {
  const total = site.chapters.length;
  return `
    <header class="sec-head" data-stagger>
      <p class="sec-head__index mono" data-reveal>
        ${orbs(index + 1, total)}
        <span>${pad(index + 1)} <i>/</i> ${pad(total)}</span>
      </p>
      <h2 class="sec-head__title" id="${esc(chapter.id)}-title">
        <span class="sec-head__zh" data-split data-reveal="chars">${esc(chapter.zh)}</span>
        <span class="sec-head__en" data-reveal>${esc(chapter.en)}</span>
      </h2>
      <span class="sec-head__rule" data-reveal="line" aria-hidden="true"></span>
      ${lede ? `<p class="sec-head__lede" data-reveal>${esc(lede)}</p>` : ''}
    </header>`;
}

/** 状态胶囊。tone: amber | jade；live 为真时圆点会呼吸。 */
export function pill({ text, tone = 'jade', live = false }) {
  return `<span class="pill pill--${esc(tone)}${live ? ' is-live' : ''}"><i></i>${esc(text)}</span>`;
}

export function chips(list) {
  if (!list || !list.length) return '';
  return `<ul class="chips">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

/** 把 URL 变成适合展示的短形式。 */
export function prettyUrl(url) {
  return url.replace(/^(https?:)?\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
}

/** 链接的通用属性（站外链接新开标签页）。 */
export function linkAttrs(url) {
  return `href="${esc(url)}"${isExternal(url) && !url.startsWith('mailto:') ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
}

/**
 * 链接按钮：从链接注册表取地址。
 * 已接入 → 可点击的 <a>；待接入 → 不可点击的占位，文案自动变成「待接入」。
 */
export function linkButton(key, { label } = {}) {
  const link = getLink(key);
  if (!link) return '';
  const text = esc(label || link.title);
  if (!link.live) {
    return `<span class="btn is-soon" aria-disabled="true" data-cursor="待接入"><span class="btn__text">${text}</span><span class="btn__tag mono">待接入</span></span>`;
  }
  return `<a class="btn" ${linkAttrs(link.url)} data-magnetic="0.25"><span class="btn__text">${text}</span><span class="btn__arrow" aria-hidden="true">↗</span></a>`;
}

/** 小节标题（区块内部的二级分组）。 */
export function blockHead(title, note = '') {
  return `<header class="block-head" data-reveal><h4>${esc(title)}</h4>${note ? `<p class="mono">${esc(note)}</p>` : ''}</header>`;
}
