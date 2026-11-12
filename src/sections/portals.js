/**
 * portals.js — 06 传送门：通往作品与内容的入口。
 * 卡片完全由链接注册表（site.links）生成，顺序由 site.portals.items 决定。
 */

import { esc } from '../core/dom.js';
import { getLink } from '../content/site.js';
import { secHead, linkAttrs, prettyUrl } from './shared.js';

function card(key) {
  const link = getLink(key);
  if (!link) return '';
  const children = (link.children || [])
    .map((child) =>
      child.url
        ? `<li><a class="portal__child" ${linkAttrs(child.url)}>${esc(child.title)}</a></li>`
        : `<li><span class="portal__child">${esc(child.title)}</span></li>`)
    .join('');
  const liveChildren = (link.children || []).filter((c) => c.url).length;
  const state = link.live
    ? '已接入'
    : liveChildren
      ? `已接入 ${liveChildren} / ${link.children.length}`
      : '待接入';
  const title = link.live
    ? `<h3 class="portal__title"><a ${linkAttrs(link.url)}>${esc(link.title)}</a></h3>`
    : `<h3 class="portal__title">${esc(link.title)}</h3>`;

  return `
    <li class="portal">
      <header class="portal__top">
        <span class="mono">${esc(link.en || '')}</span>
        <span class="mono">${esc(state)}</span>
      </header>
      ${title}
      <p class="portal__desc">${esc(link.desc || '')}</p>
      ${children ? `<ul class="portal__children">${children}</ul>` : ''}
      <p class="portal__url mono">${link.live ? esc(prettyUrl(link.url)) : '地址待填写'}</p>
    </li>`;
}

export default {
  id: 'portals',

  render({ site, chapter, index }) {
    const { lede, items } = site.portals;
    return `
    <section class="section portals" id="portals" aria-labelledby="portals-title">
      <div class="wrap">
        ${secHead(chapter, index, { lede })}
        <ul class="portal-list">${items.map(card).join('')}</ul>
      </div>
    </section>`;
  },
};
