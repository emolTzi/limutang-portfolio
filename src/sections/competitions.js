/**
 * competitions.js — 04 竞赛。
 * 标题旁的占位框里是星系编队；往下读条目时它退到背后。
 */

import { esc, pad } from '../core/dom.js';
import { secHead, pill, chips, linkButton } from './shared.js';

function entry(c, i) {
  let work = '';
  if (c.work) {
    const [main, sub] = c.work.split('：');
    const flow = c.flow
      ? `<div class="flow">
           <p class="mono">${esc(c.flowLabel || '流程')}</p>
           <ol>${c.flow.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
         </div>`
      : '';
    work = `
      <div class="comp__work">
        <div class="comp__work-head">
          <p class="mono">参赛作品<i>·</i>${esc(c.mode || '')}</p>
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
    <li class="comp" data-reveal data-spot>
      <div class="comp__head">
        <span class="comp__no mono">C/${pad(i + 1)}</span>
        <div class="comp__title">
          <h3 class="comp__name">${esc(c.name)}</h3>
          <p class="comp__track mono">${esc(c.track)}</p>
        </div>
        ${pill({ text: c.status, tone: 'jade', live: true })}
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
      <div class="wrap comp-top" data-cue="galaxy">
        <div class="comp-top__head">${secHead(chapter, index, { lede })}</div>
        <div class="comp-top__slot" data-stage-anchor aria-hidden="true"></div>
      </div>
      <ol class="comps wrap" data-cue="galaxy" data-cue-mode="backdrop" data-stagger>
        ${items.map(entry).join('')}
      </ol>
    </section>`;
  },
};
