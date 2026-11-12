/**
 * education.js — 02 教育。底部一条占位带装着「山脊与云」的粒子编队。
 */

import { esc } from '../core/dom.js';
import { secHead, pill } from './shared.js';

const rows = (list) =>
  list.map((row) => `<div class="deflist__row" data-reveal><dt class="mono">${esc(row.k)}</dt><dd>${esc(row.v)}</dd></div>`).join('');

export default {
  id: 'education',

  render({ site, chapter, index }) {
    const edu = site.education;
    return `
    <section class="section education" id="education" data-cue="education" aria-labelledby="education-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <div class="edu">
          <div class="edu__school" data-reveal>
            <h3 class="edu__name">${esc(edu.school)}</h3>
            <p class="edu__en" lang="en">${esc(edu.schoolEn)}</p>
            ${pill({ text: edu.status, tone: 'jade', live: true })}
          </div>
          <dl class="deflist edu__facts" data-stagger>${rows(edu.facts)}</dl>
          <dl class="deflist edu__campus" data-stagger>${rows(edu.campus)}</dl>
        </div>
      </div>
      <div class="edu__horizon" data-stage-anchor aria-hidden="true"></div>
    </section>`;
  },
};
