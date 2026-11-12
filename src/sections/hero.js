/**
 * hero.js — 首屏：姓名、求职意向、院校与做事方式。
 */

import { esc } from '../core/dom.js';

export default {
  id: 'top',

  render({ site }) {
    const p = site.person;
    return `
    <section class="hero" id="top" aria-label="首屏">
      <div class="wrap">
        <p class="hero__eyebrow">${esc(site.hero.eyebrow)}</p>
        <h1 class="hero__name">${esc(p.name)}</h1>
        <p class="hero__latin" lang="en">${esc(p.latin)}</p>
        <div class="hero__role">
          <p class="hero__role-label">求职意向</p>
          <p class="hero__role-zh">${esc(p.intent)}</p>
          <p class="hero__role-alt">${esc(p.intentAlt)}<i>·</i><em lang="en">${esc(p.intentEn)}</em></p>
        </div>
        <dl class="hero__facts">
          <div>
            <dt>院校</dt>
            <dd>${esc(p.school)} · ${esc(p.college)}<br>${esc(p.major)} · ${esc(p.grade)}</dd>
          </div>
          <div>
            <dt>方向</dt>
            <dd>${p.focus.map(esc).join('<br>')}</dd>
          </div>
          <div class="hero__facts-wide">
            <dt>做事方式</dt>
            <dd>${esc(site.hero.tagline)}</dd>
          </div>
        </dl>
        <p class="hero__cta">
          <a class="btn" href="mailto:${esc(p.email)}">${esc(p.email)}</a>
          <a class="btn" href="#contact">联系</a>
        </p>
      </div>
    </section>`;
  },
};
