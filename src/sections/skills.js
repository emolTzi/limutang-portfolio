/**
 * skills.js — 05 技能。
 */

import { esc } from '../core/dom.js';
import { secHead, chips } from './shared.js';

export default {
  id: 'skills',

  render({ site, chapter, index }) {
    const { lede, groups } = site.skills;
    const list = groups
      .map((g, i) => `
        <li class="skill">
          <div class="skill__head">
            <span class="skill__no mono">0${i + 1}</span>
            <h3 class="skill__title">${esc(g.title)}</h3>
            <span class="skill__en" lang="en">${esc(g.en)}</span>
          </div>
          <p class="skill__text">${esc(g.text)}</p>
          ${chips(g.items)}
        </li>`)
      .join('');

    return `
    <section class="section skills" id="skills" aria-labelledby="skills-title">
      <div class="wrap">
        ${secHead(chapter, index, { lede })}
        <ol class="skills__list">${list}</ol>
      </div>
    </section>`;
  },
};
