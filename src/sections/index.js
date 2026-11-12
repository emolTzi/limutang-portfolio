/**
 * sections/index.js — 区块注册表。
 *
 * 一个区块 = 一个模块，导出：
 *   id                         对应 site.chapters 里的 id（首屏固定为 'top'）
 *   render({ site, chapter, index })   纯函数：数据 → HTML 字符串（不碰 DOM，Node 里也能跑）
 *   mount(root, ctx)           可选：绑定这个区块专属的交互
 *
 * 新增一个章节：
 *   1. 在 site.js 的 chapters 里加一项 { id, zh, en }，并放好它的数据
 *   2. 新建 sections/<id>.js，按上面的约定导出
 *   3. 在下面的 registry 里登记
 *   4. 样式写进 styles/sections.css；需要粒子表现就给元素加 data-cue（见 fx/cues.js）
 */

import hero from './hero.js';
import about from './about.js';
import education from './education.js';
import projects from './projects.js';
import competitions from './competitions.js';
import skills from './skills.js';
import portals from './portals.js';
import contact from './contact.js';

const registry = { about, education, projects, competitions, skills, portals, contact };

/** 按 site.chapters 的顺序渲染整页。 */
export function renderSections(site) {
  const parts = [hero.render({ site })];
  site.chapters.forEach((chapter, index) => {
    const section = registry[chapter.id];
    if (!section) {
      console.warn(`[sections] 章节 "${chapter.id}" 没有对应的模块，已跳过`);
      return;
    }
    parts.push(section.render({ site, chapter, index }));
  });
  return parts.join('\n');
}

/** 绑定各区块的专属交互。 */
export function mountSections(root, ctx) {
  for (const section of [hero, ...Object.values(registry)]) {
    if (typeof section.mount !== 'function') continue;
    try {
      section.mount(root, ctx);
    } catch (err) {
      console.error(`[sections] "${section.id}" 挂载失败`, err);
    }
  }
}
