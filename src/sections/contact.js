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
      .map((link) => `<li><a ${linkAttrs(link.url)} data-magnetic="0.2"><span>${esc(link.title)}</span><i aria-hidden="true">↗</i></a></li>`)
      .join('');

    return `
    <section class="section contact" id="contact" data-cue="contact" aria-labelledby="contact-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <div class="contact__grid">
          <div class="contact__body" data-stagger>
            <p class="contact__headline" data-reveal="mask">${headline.map((line) => `<span class="line"><span>${esc(line)}</span></span>`).join('')}</p>
            <p class="contact__text" data-reveal>${esc(text)}</p>
            <div class="contact__mail" data-reveal>
              <a class="mail" href="mailto:${esc(p.email)}" data-cursor="写邮件" data-agent-target>
                <span class="mono">邮箱</span>
                <b>${esc(p.email)}</b>
              </a>
              <button type="button" class="btn" data-copy="${esc(p.email)}" data-magnetic="0.25">
                <span class="btn__text">复制邮箱</span>
              </button>
            </div>
            ${live ? `<ul class="contact__links" data-reveal>${live}</ul>` : ''}
          </div>
          <div class="contact__slot" data-stage-anchor aria-hidden="true"></div>
        </div>
      </div>

      <footer class="footer wrap">
        <div class="footer__row">
          <p class="footer__sign"><span class="nav__orb" aria-hidden="true"></span>${esc(p.name)}<i>·</i>${esc(p.intent)}</p>
          <a class="footer__top mono" href="#top">回到顶部 ↑</a>
        </div>
        <div class="footer__row footer__meta mono">
          <p>© ${esc(site.meta.year)} ${esc(p.name)}</p>
          <p class="footer__travel">本次访问，智能体随你的光标移动了 <b data-hud="travel">0.0</b> 米</p>
          <p>以 AI 驱动开发构建 · 手写 WebGL2 粒子引擎 · 零依赖</p>
        </div>
      </footer>
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
