/**
 * shared.js — 各区块模板共用的 HTML 片段。全部是「数据 → 字符串」的纯函数。
 */

import { esc, pad, isExternal } from '../core/dom.js';
import { site, getLink } from '../content/site.js';

/** 章节标题。chapter 来自 site.chapters，index 从 0 开始。 */
export function secHead(chapter, index, { lede = '' } = {}) {
  const total = site.chapters.length;
  return `
    <header class="sec-head">
      <p class="sec-head__index">${pad(index + 1)} <i>/</i> ${pad(total)}</p>
      <h2 class="sec-head__title" id="${esc(chapter.id)}-title">
        <span class="sec-head__zh">${esc(chapter.zh)}</span>
        <span class="sec-head__en" lang="en">${esc(chapter.en)}</span>
      </h2>
      ${lede ? `<p class="sec-head__lede">${esc(lede)}</p>` : ''}
    </header>`;
}

/** 状态标签。tone 仅作轻微区分，不再使用呼吸动画。 */
export function pill({ text, tone = '' }) {
  const extra = tone === 'amber' ? ' pill--amber' : '';
  return `<span class="pill${extra}">${esc(text)}</span>`;
}

export function chips(list) {
  if (!list || !list.length) return '';
  return `<ul class="chips">${list.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

export function prettyUrl(url) {
  return url.replace(/^(https?:)?\/\//, '').replace(/^mailto:/, '').replace(/\/$/, '');
}

export function linkAttrs(url) {
  return `href="${esc(url)}"${isExternal(url) && !url.startsWith('mailto:') ? ' target="_blank" rel="noopener noreferrer"' : ''}`;
}

export function linkButton(key, { label } = {}) {
  const link = getLink(key);
  if (!link) return '';
  const text = esc(label || link.title);
  if (!link.live) {
    return `<span class="btn is-soon" aria-disabled="true"><span class="btn__text">${text}</span><span class="btn__tag">待接入</span></span>`;
  }
  const arrow = isExternal(link.url) && !link.url.startsWith('mailto:') ? '<span class="btn__arrow" aria-hidden="true">↗</span>' : '';
  return `<a class="btn" ${linkAttrs(link.url)}><span class="btn__text">${text}</span>${arrow}</a>`;
}

export function blockHead(title, note = '') {
  return `<header class="block-head"><h4>${esc(title)}</h4>${note ? `<p>${esc(note)}</p>` : ''}</header>`;
}
