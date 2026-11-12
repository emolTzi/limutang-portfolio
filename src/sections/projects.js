/**
 * projects.js — 03 项目。
 *
 * 项目数据里出现以下字段时，会自动挂上对应区块：
 *   demos    → 演示清单（每项的跳转地址取自 links 注册表里同名的 children）
 *   team     → 汇报结构 + 行为规范
 */

import { esc, pad } from '../core/dom.js';
import { getLink } from '../content/site.js';
import { secHead, pill, chips, linkButton, linkAttrs, blockHead } from './shared.js';

function facets(list) {
  return list
    .map((f, i) => `
      <li class="facet">
        <div class="facet__head">
          <span class="facet__no mono">${pad(i + 1)}</span>
          <h4 class="facet__label">${esc(f.label)}</h4>
          <span class="facet__en" lang="en">${esc(f.en)}</span>
        </div>
        <p class="facet__text">${esc(f.text)}</p>
        ${f.metric ? `<p class="facet__metric"><b>${esc(f.metric.value)}</b><span>${esc(f.metric.label)}</span></p>` : ''}
      </li>`)
    .join('');
}

function demos(project) {
  const registry = getLink(project.links[0]);
  const children = registry?.children || [];
  const items = project.demos
    .map((demo, i) => {
      const url = children.find((c) => c.title === demo.title)?.url || '';
      const inner = `
        <span class="demo__no mono">${pad(i + 1)}</span>
        <span class="demo__title">${esc(demo.title)}</span>
        <span class="demo__meta">${esc(demo.group)}${demo.tags.length ? ` · ${demo.tags.map(esc).join(' / ')}` : ''}</span>
        <span class="demo__state">${url ? '打开' : '待接入'}</span>`;
      return url
        ? `<li><a class="demo is-live" ${linkAttrs(url)}>${inner}</a></li>`
        : `<li><div class="demo is-soon">${inner}</div></li>`;
    })
    .join('');
  return `
    <div class="block">
      ${blockHead('演示清单', `${project.demos.length} 个主题 · 接入后可直接打开`)}
      <ul class="demos">${items}</ul>
    </div>`;
}

function team(project) {
  const t = project.team;
  const lines = t.lines
    .map((line) => {
      const roles = line.roles.length ? ` · ${esc(line.roles.join('、'))}` : '';
      return `<li>
        <p><strong>${esc(line.name)}</strong>${roles}</p>
        <p class="muted">执行 bot ${esc(line.executors)} 个（示意）</p>
      </li>`;
    })
    .join('');
  const rules = project.rules
    .map((r, i) => `
      <li class="rule">
        <span class="rule__no mono">${pad(i + 1)}</span>
        <b class="rule__title">${esc(r.title)}</b>
        <span class="rule__en" lang="en">${esc(r.en)}</span>
      </li>`)
    .join('');
  return `
    <div class="block">
      ${blockHead('汇报结构', t.note)}
      <div class="team">
        <p class="team__human"><strong>${esc(t.human.label)}</strong> · ${esc(t.human.sub)}</p>
        <ul>${lines}</ul>
      </div>
    </div>
    <div class="block">
      ${blockHead('统一行为规范', `${project.rules.length} 条`)}
      <ol class="rules">${rules}</ol>
    </div>`;
}

function project(p, i) {
  const title = p.titleLines.map((line) => `<span class="line">${esc(line)}</span>`).join('');
  const meta = p.meta.map((m) => `<div><dt>${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('');
  const buttons = p.links.map((key) => linkButton(key)).join('');
  return `
    <article class="project" id="project-${esc(p.id)}" aria-labelledby="project-${esc(p.id)}-title">
      <p class="project__kicker"><b>${pad(i + 1)}</b>${esc(p.kind)}${p.org ? `<i>·</i>${esc(p.org)}` : ''}</p>
      <h3 class="project__title" id="project-${esc(p.id)}-title">${title}</h3>
      <p class="project__en" lang="en">${esc(p.en)}</p>
      <p class="project__summary">${esc(p.summary)}</p>
      <dl class="project__meta">${meta}</dl>
      ${p.status.length ? `<p class="project__status">${p.status.map(pill).join('')}</p>` : ''}
      ${buttons ? `<div class="project__links">${buttons}</div>` : ''}
      <ol class="facets">${facets(p.facets)}</ol>
      ${p.demos ? demos(p) : ''}
      ${p.team ? team(p) : ''}
      ${p.stack.length ? `<div class="block">${blockHead('技术与工具')}${chips(p.stack)}</div>` : ''}
    </article>`;
}

export default {
  id: 'projects',

  render({ site, chapter, index }) {
    const { lede, items } = site.projects;
    const toc = items
      .map((p, i) => `<li><a href="#project-${esc(p.id)}"><span class="mono">${pad(i + 1)}</span><b>${esc(p.titleLines.join(''))}</b><span class="mono">${esc(p.kind)}</span></a></li>`)
      .join('');
    return `
    <section class="section projects" id="projects" aria-labelledby="projects-title">
      <div class="wrap">
        ${secHead(chapter, index, { lede })}
        <ol class="toc">${toc}</ol>
        ${items.map(project).join('')}
      </div>
    </section>`;
  },
};
