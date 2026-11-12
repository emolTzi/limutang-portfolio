/**
 * contact.js — 07 联系 + 页脚。
 * 已接入的链接会自动列在邮箱下面（取自链接注册表）。
 */

import { $$, esc, copyText } from '../core/dom.js';
import { secHead, linkAttrs } from './shared.js';
import { toast } from '../ui/toast.js';

export default {
  id: 'contact',

  render({ site, chapter, index }) {
    const p = site.person;
    const { headline, text } = site.contact;
    const live = Object.values(site.links)
      .filter((link) => link.url)
      .map((link) => `<li><a ${linkAttrs(link.url)}>${esc(link.title)}</a></li>`)
      .join('');

    return `
    <section class="section contact" id="contact" aria-labelledby="contact-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <p class="contact__headline">${headline.map((line) => `<span class="line">${esc(line)}</span>`).join('')}</p>
        <p class="contact__text">${esc(text)}</p>
        <div class="contact__mail">
          <a class="mail" href="mailto:${esc(p.email)}">
            <span class="mono">邮箱</span>
            <b>${esc(p.email)}</b>
          </a>
          <button type="button" class="btn" data-copy="${esc(p.email)}">复制邮箱</button>
        </div>
        ${live ? `<ul class="contact__links">${live}</ul>` : ''}
        <footer class="footer">
          <p>© ${esc(site.meta.year)} ${esc(p.name)} · ${esc(p.intent)}</p>
          <a href="#top">回到顶部</a>
        </footer>
      </div>
    </section>`;
  },

  mount(root) {
    for (const button of $$('[data-copy]', root)) {
      button.addEventListener('click', async () => {
        const value = button.dataset.copy;
        const ok = await copyText(value);
        toast(ok ? '邮箱已复制' : `复制失败，请手动复制：${value}`);
      });
    }
  },
};
