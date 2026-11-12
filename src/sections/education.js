/**
 * education.js — 02 教育。
 */

import { esc } from '../core/dom.js';
import { secHead, pill } from './shared.js';

const rows = (list) =>
  list.map((row) => `<div class="deflist__row"><dt>${esc(row.k)}</dt><dd>${esc(row.v)}</dd></div>`).join('');

export default {
  id: 'education',

  render({ site, chapter, index }) {
    const edu = site.education;
    return `
    <section class="section education" id="education" aria-labelledby="education-title">
      <div class="wrap">
        ${secHead(chapter, index)}
        <div class="edu">
          <div class="edu__school">
            <h3 class="edu__name">${esc(edu.school)}</h3>
            <p class="edu__en" lang="en">${esc(edu.schoolEn)}</p>
            ${pill({ text: edu.status })}
          </div>
          <dl class="deflist edu__facts">${rows(edu.facts)}</dl>
          <dl class="deflist edu__campus">${rows(edu.campus)}</dl>
        </div>
      </div>
    </section>`;
  },
};
