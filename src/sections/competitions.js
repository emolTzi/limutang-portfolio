/**
 * competitions.js — 04 竞赛。
 */

import { esc } from '../core/dom.js';
import { secHead, pill, chips, linkButton } from './shared.js';

function entry(c) {
  let work = '';
  if (c.work) {
    const [main, sub] = c.work.split('：');
    const flow = c.flow
      ? `<div class="flow">
           <p>${esc(c.flowLabel || '流程')}</p>
           <ol>${c.flow.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
         </div>`
      : '';
    work = `
      <div class="comp__work">
        <div class="comp__work-head">
          <p>参赛作品${c.mode ? ` · ${esc(c.mode)}` : ''}</p>
          <h4 class="comp__work-title">《${esc(main)}》${sub ? `<small>${esc(sub)}</small>` : ''}</h4>
          ${c.link ? `<div class="comp__work-link">${linkButton(c.link, { label: '查看作品' })}</div>` : ''}
        </div>
        <div class="comp__work-body">
          <p>${esc(c.text)}</p>
          ${flow}
          ${chips(c.stack)}
        </div>
      </div>`;
  }
  return `
    <li class="comp">
      <div class="comp__head">
        <div class="comp__title">
          <h3 class="comp__name">${esc(c.name)}</h3>
          <p class="comp__track">${esc(c.track)}</p>
        </div>
        ${pill({ text: c.status })}
      </div>
      ${work}
    </li>`;
}

export default {
  id: 'competitions',

  render({ site, chapter, index }) {
    const { lede, items } = site.competitions;
    return `
    <section class="section competitions" id="competitions" aria-labelledby="competitions-title">
      <div class="wrap">
        ${secHead(chapter, index, { lede })}
        <ol class="comps">${items.map(entry).join('')}</ol>
      </div>
    </section>`;
  },
};
