/**
 * about.js — 01 概述：自述与关键数字。
 */

import { esc, rich } from '../core/dom.js';
import { secHead } from './shared.js';

export default {
  id: 'about',

  render({ site, chapter, index }) {
    const { statement, stats } = site.about;
    const items = stats
      .map((s) => `
        <li class="stat">
          <p class="stat__value">
            ${s.prefix ? `<span class="stat__affix">${esc(s.prefix)}</span>` : ''}${esc(s.value)}${s.suffix ? `<span class="stat__affix">${esc(s.suffix)}</span>` : ''}
          </p>
          <p class="stat__label">${esc(s.label)}</p>
          <p class="stat__note">${esc(s.note)}</p>
        </li>`)
      .join('');

    return `
    <section class="section about" id="about" aria-labelledby="about-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <p class="about__lead">${rich(statement)}</p>
        <ul class="stats">${items}</ul>
      </div>
    </section>`;
  },
};
