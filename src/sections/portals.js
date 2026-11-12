/**
 * portals.js — 06 传送门：通往作品与内容的入口。
 *
 * 卡片完全由链接注册表（site.links）生成，展示哪些、按什么顺序由 site.portals.items 决定。
 *   · url 已填 → 整张卡片可点击，新标签页打开（站内相对路径则在当前页打开）
 *   · url 为空 → 显示「待接入」，不可点击
 *   · children → 卡片内的一排子入口，各自独立接入
 */

import { esc, pad } from '../core/dom.js';
import { getLink } from '../content/site.js';
import { secHead, linkAttrs, prettyUrl } from './shared.js';

function card(key, i) {
  const link = getLink(key);
  if (!link) return '';
  const children = (link.children || [])
    .map((child) =>
      child.url
        ? `<li><a class="portal__child is-live" ${linkAttrs(child.url)}>${esc(child.title)}<i aria-hidden="true">↗</i></a></li>`
        : `<li><span class="portal__child">${esc(child.title)}</span></li>`)
    .join('');
  const liveChildren = (link.children || []).filter((c) => c.url).length;
  const state = link.live
    ? '已接入'
    : liveChildren
      ? `已接入 ${liveChildren} / ${link.children.length}`
      : '待接入';
  const title = `<h3 class="portal__title">${esc(link.title)}</h3>`;

  return `
    <li class="portal-cell" style="--span:${link.span || 1}" data-reveal>
      <article class="portal ${link.live ? 'is-live' : 'is-soon'}" data-tilt="5" data-agent-target data-cursor="${link.live ? '前往 ↗' : '待接入'}">
        <header class="portal__top mono">
          <span>G/${pad(i + 1)}</span>
          <span class="portal__state"><i></i>${esc(state)}</span>
        </header>
        <div class="portal__ring" aria-hidden="true"><i></i><i></i></div>
        <div class="portal__body">
          ${link.live ? `<a class="portal__hit" ${linkAttrs(link.url)} aria-label="前往 ${esc(link.title)}">${title}</a>` : title}
          <p class="portal__en" lang="en">${esc(link.en || '')}</p>
          <p class="portal__desc">${esc(link.desc || '')}</p>
          ${children ? `<ul class="portal__children">${children}</ul>` : ''}
        </div>
        <footer class="portal__foot mono">
          <span class="portal__url">${link.live ? esc(prettyUrl(link.url)) : '地址待填写'}</span>
          <span class="portal__arrow" aria-hidden="true">↗</span>
        </footer>
      </article>
    </li>`;
}

export default {
  id: 'portals',

  render({ site, chapter, index }) {
    const { lede, items } = site.portals;
    return `
    <section class="section portals" id="portals" aria-labelledby="portals-title">
      <div class="wrap portals-top" data-cue="portal">
        <div class="portals-top__slot" data-stage-anchor aria-hidden="true"></div>
        ${secHead(chapter, index, { lede })}
      </div>
      <ul class="portal-grid wrap" data-cue="portal" data-cue-mode="backdrop" data-stagger>
        ${items.map(card).join('')}
      </ul>
    </section>`;
  },
};
