/**
 * projects.js — 03 项目。
 *
 * 每个项目由两段组成：
 *   · 标题屏（poster）：大标题 + 元信息，旁边的占位框里是它专属的粒子编队
 *   · 正文（detail）：分面表格（标签 / 说明 / 关键数字）+ 技术栈 + 可选的专属小部件
 *     此时粒子退到背后当氛围（data-cue-mode="backdrop"）
 *
 * 项目数据里出现以下字段时，会自动挂上对应小部件：
 *   demos    → 演示清单（每项的跳转地址取自 links 注册表里同名的 children）
 *   wavelab  → 波动实验台
 *   team     → 汇报结构图 + 行为规范
 */

import { esc, pad } from '../core/dom.js';
import { getLink } from '../content/site.js';
import { secHead, pill, chips, linkButton, linkAttrs, blockHead } from './shared.js';
import { mountOrgchart } from './widgets/orgchart.js';
import { mountWavelab } from './widgets/wavelab.js';

function facets(list) {
  return list
    .map((f, i) => `
      <li class="facet" data-reveal data-spot>
        <div class="facet__head">
          <span class="facet__no mono">${pad(i + 1)}</span>
          <h4 class="facet__label">${esc(f.label)}</h4>
          <span class="facet__en mono" lang="en">${esc(f.en)}</span>
        </div>
        <p class="facet__text">${esc(f.text)}</p>
        ${f.metric ? `<p class="facet__metric"><b>${esc(f.metric.value)}</b><span class="mono">${esc(f.metric.label)}</span></p>` : ''}
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
        <span class="demo__no mono">D/${pad(i + 1)}</span>
        <span class="demo__title">${esc(demo.title)}</span>
        <span class="demo__meta mono">${esc(demo.group)}${demo.tags.length ? ` · ${demo.tags.map(esc).join(' / ')}` : ''}</span>
        <span class="demo__state mono">${url ? '打开 ↗' : '待接入'}</span>`;
      return url
        ? `<li data-reveal><a class="demo is-live" ${linkAttrs(url)} data-spot data-cursor="打开 ↗">${inner}</a></li>`
        : `<li data-reveal><div class="demo is-soon" data-spot>${inner}</div></li>`;
    })
    .join('');
  return `
    <div class="block">
      ${blockHead('演示清单', `${project.demos.length} 个主题 · 接入后可直接打开`)}
      <ul class="demos" data-stagger>${items}</ul>
    </div>`;
}

function wavelab() {
  return `
    <div class="block">
      ${blockHead('波动实验台', '本站即兴重绘，并非教材原页 · 把鼠标移进去')}
      <div class="labs" data-stagger>
        <figure class="lab" data-lab="doppler" data-reveal data-no-charge>
          <canvas aria-label="多普勒效应演示：移动的波源向四周发出波面"></canvas>
          <figcaption>
            <b>多普勒效应</b>
            <span>光标就是波源。移动得越快，前方的波面挤得越紧。</span>
            <output class="mono" data-lab-readout>Ma 0.00</output>
          </figcaption>
        </figure>
        <figure class="lab" data-lab="lissajous" data-reveal data-no-charge>
          <canvas aria-label="简谐振动的合成演示：两个相互垂直的简谐振动合成李萨如图形"></canvas>
          <figcaption>
            <b>简谐振动的合成</b>
            <span>两个相互垂直的简谐振动。左右移动改变频率比，上下移动改变相位差。</span>
            <output class="mono" data-lab-readout>ωx : ωy = 2 : 3</output>
          </figcaption>
        </figure>
      </div>
    </div>`;
}

function team(project) {
  const rules = project.rules
    .map((r, i) => `
      <li class="rule" data-reveal data-spot>
        <span class="rule__no mono">规范 ${pad(i + 1)}</span>
        <b class="rule__title">${esc(r.title)}</b>
        <span class="rule__en mono" lang="en">${esc(r.en)}</span>
      </li>`)
    .join('');
  return `
    <div class="block orgchart">
      ${blockHead('汇报结构', project.team.note)}
      <div class="orgchart__canvas" data-orgchart-canvas data-reveal></div>
      <p class="orgchart__legend" data-reveal>
        <span class="orgchart__key orgchart__key--amber"></span>指令自上而下
        <span class="orgchart__key orgchart__key--jade"></span>汇报自下而上
        <span class="orgchart__tip">你光标后面跟着的那支队伍，就是照这张图编的队：协调者围着你，执行者只跟随各自的协调者。</span>
      </p>
    </div>
    <div class="block">
      ${blockHead('统一行为规范', `${project.rules.length} 条`)}
      <ol class="rules" data-stagger>${rules}</ol>
    </div>`;
}

function project(p, i) {
  const title = p.titleLines.map((line) => `<span class="line"><span>${esc(line)}</span></span>`).join('');
  const meta = p.meta.map((m) => `<div><dt class="mono">${esc(m.k)}</dt><dd>${esc(m.v)}</dd></div>`).join('');
  const buttons = p.links.map((key) => linkButton(key)).join('');
  return `
    <article class="project${i % 2 ? ' project--flip' : ''}" id="project-${esc(p.id)}" aria-labelledby="project-${esc(p.id)}-title">
      <div class="project__poster wrap" data-cue="${esc(p.visual)}">
        <div class="project__intro" data-stagger>
          <p class="project__kicker mono" data-reveal><b>P/${pad(i + 1)}</b>${esc(p.kind)}${p.org ? `<i>·</i>${esc(p.org)}` : ''}</p>
          <h3 class="project__title" id="project-${esc(p.id)}-title" data-reveal="mask">${title}</h3>
          <p class="project__en" lang="en" data-reveal>${esc(p.en)}</p>
          <p class="project__summary" data-reveal>${esc(p.summary)}</p>
          <dl class="project__meta" data-reveal>${meta}</dl>
          ${p.status.length ? `<p class="project__status" data-reveal>${p.status.map(pill).join('')}</p>` : ''}
          ${buttons ? `<div class="project__links" data-reveal>${buttons}</div>` : ''}
        </div>
        <div class="project__slot" data-stage-anchor aria-hidden="true"></div>
      </div>

      <div class="project__detail wrap" data-cue="${esc(p.visual)}" data-cue-mode="backdrop">
        <ol class="facets" data-stagger>${facets(p.facets)}</ol>
        ${p.demos ? demos(p) : ''}
        ${p.wavelab ? wavelab() : ''}
        ${p.team ? team(p) : ''}
        ${p.stack.length ? `<div class="block">${blockHead('技术与工具')}<div data-reveal>${chips(p.stack)}</div></div>` : ''}
      </div>
    </article>`;
}

export default {
  id: 'projects',

  render({ site, chapter, index }) {
    const { lede, items } = site.projects;
    const toc = items
      .map((p, i) => `<li data-reveal><a href="#project-${esc(p.id)}"><span class="mono">P/${pad(i + 1)}</span><b>${esc(p.titleLines.join(''))}</b><span class="mono">${esc(p.kind)}</span><i aria-hidden="true">↓</i></a></li>`)
      .join('');
    return `
    <section class="section projects" id="projects" aria-labelledby="projects-title">
      <div class="wrap" data-cue="about">
        ${secHead(chapter, index, { lede })}
        <ol class="toc" data-stagger>${toc}</ol>
      </div>
      ${items.map(project).join('')}
    </section>`;
  },

  mount(root, ctx) {
    mountOrgchart(root, ctx);
    mountWavelab(root, ctx);
  },
};
