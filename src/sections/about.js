/**
 * about.js — 01 概述：一段随滚动逐字点亮的自述 + 四个关键数字。
 */

import { esc, rich } from '../core/dom.js';
import { secHead } from './shared.js';

export default {
  id: 'about',

  render({ site, chapter, index }) {
    const { statement, stats } = site.about;
    const items = stats
      .map((s) => `
        <li class="stat" data-reveal>
          <p class="stat__value">
            ${s.prefix ? `<span class="stat__affix">${esc(s.prefix)}</span>` : ''}<span data-count="${esc(s.value)}">${esc(s.value)}</span>${s.suffix ? `<span class="stat__affix">${esc(s.suffix)}</span>` : ''}
          </p>
          <p class="stat__label">${esc(s.label)}</p>
          <p class="stat__note mono">${esc(s.note)}</p>
        </li>`)
      .join('');

    return `
    <section class="section about" id="about" data-cue="about" aria-labelledby="about-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <p class="about__lead" data-illuminate>${rich(statement)}</p>
        <ul class="stats" data-stagger>${items}</ul>
      </div>
    </section>`;
  },
};
