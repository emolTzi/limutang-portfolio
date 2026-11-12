/**
 * skills.js — 05 技能。
 *
 * 左侧粘性占位框里是「技术栈」编队：有几组技能就有几层粒子平面。
 * 悬停（或键盘聚焦）右侧某一组时，对应那一层粒子会亮起 —— DOM 与 WebGL 的一次联动。
 */

import { $$, esc, pad } from '../core/dom.js';
import { secHead, chips } from './shared.js';

export default {
  id: 'skills',

  render({ site, chapter, index }) {
    const { lede, groups } = site.skills;
    const list = groups
      .map((g, i) => `
        <li class="skill" data-reveal data-spot data-skill="${i}" tabindex="0">
          <div class="skill__head">
            <span class="skill__no mono">L${i + 1}</span>
            <h3 class="skill__title">${esc(g.title)}</h3>
            <span class="skill__en mono" lang="en">${esc(g.en)}</span>
          </div>
          <p class="skill__text">${esc(g.text)}</p>
          ${chips(g.items)}
        </li>`)
      .join('');

    // 跑马灯：所有技能条目去重后循环滚动
    const all = Array.from(new Set(groups.flatMap((g) => g.items)));
    const run = all.map((item) => `<span>${esc(item)}</span><i>✦</i>`).join('');

    return `
    <section class="section skills" id="skills" data-cue="stack" aria-labelledby="skills-title">
      <div class="wrap">
        ${secHead(chapter, index, { lede })}
        <div class="skills__grid">
          <div class="skills__visual">
            <div class="skills__slot" data-stage-anchor aria-hidden="true"></div>
            <p class="skills__hint mono">${pad(groups.length)} 层 · 指向右侧任意一组，对应的那一层会亮起</p>
          </div>
          <ol class="skills__list" data-stagger>${list}</ol>
        </div>
      </div>
      <div class="marquee" aria-hidden="true">
        <div class="marquee__track">${run}${run}</div>
      </div>
    </section>`;
  },

  mount(root, ctx) {
    for (const item of $$('[data-skill]', root)) {
      const group = Number(item.dataset.skill);
      const on = () => ctx.stage.focusGroup(group);
      const off = () => ctx.stage.focusGroup(-1);
      item.addEventListener('pointerenter', on);
      item.addEventListener('pointerleave', off);
      item.addEventListener('focus', on);
      item.addEventListener('blur', off);
    }
  },
};
