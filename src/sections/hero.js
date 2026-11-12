/**
 * hero.js — 首屏。
 *
 * 名字本身由粒子拼成：<h1> 是它在页面里的占位框（data-stage-anchor），
 * 导演会把 glyphs 编队严丝合缝地装进去。h1 里的文字在 WebGL 可用时隐藏（读屏仍然能读到），
 * WebGL 不可用时直接以大号衬线字显示。
 */

import { esc } from '../core/dom.js';

export default {
  id: 'top',

  render({ site }) {
    const p = site.person;
    return `
    <section class="hero" id="top" data-cue="hero" aria-label="首屏">
      <div class="hero__top" data-intro style="--d:0.5s">
        <p class="mono"><span data-scramble>PORTFOLIO</span> <i>/</i> ${esc(site.meta.year)}</p>
        <p class="mono hero__clock"><span data-hud="clock">--:--:--</span> <i>/</i> UTC+8</p>
      </div>

      <div class="hero__center">
        <p class="hero__latin mono" data-intro style="--d:0.7s" aria-hidden="true">${esc(p.latin)}</p>
        <h1 class="hero__name" data-stage-anchor><span>${esc(p.name)}</span></h1>
        <div class="hero__role" data-intro style="--d:1.1s">
          <p class="hero__role-label mono">求职意向</p>
          <p class="hero__role-zh">${esc(p.intent)}</p>
          <p class="hero__role-alt">${esc(p.intentAlt)}<i>·</i><em lang="en">${esc(p.intentEn)}</em></p>
        </div>
      </div>

      <div class="hero__foot">
        <dl class="hero__facts" data-intro style="--d:1.4s">
          <div>
            <dt class="mono">院校</dt>
            <dd>${esc(p.school)} · ${esc(p.college)}<br>${esc(p.major)} · ${esc(p.grade)}</dd>
          </div>
          <div>
            <dt class="mono">方向</dt>
            <dd>${p.focus.map(esc).join('<br>')}</dd>
          </div>
          <div class="hero__facts-wide">
            <dt class="mono">做事方式</dt>
            <dd>${esc(site.hero.tagline)}</dd>
          </div>
        </dl>

        <div class="hero__aside" data-intro style="--d:1.7s">
          <ul class="hud mono" aria-label="实时读数">
            <li><span>GPU 粒子</span><b data-hud="particles">—</b></li>
            <li><span>帧率</span><b data-hud="fps">—</b></li>
            <li class="hud__agents"><span>跟随你的智能体</span><b data-hud="agents">—</b></li>
          </ul>
          <p class="hero__hint mono">按住鼠标 · 聚能<i>/</i>松开 · 释放</p>
          <a class="hero__scroll" href="#about" aria-label="向下滚动到概述">
            <span class="mono">向下滚动</span><i aria-hidden="true"></i>
          </a>
        </div>
      </div>
    </section>`;
  },
};
