/**
 * sections/index.js — 区块注册表。
 *
 * 一个区块导出：
 *   id                                 对应 site.chapters 里的 id（首屏固定为 'top'）
 *   render({ site, chapter, index })   纯函数：数据 → HTML 字符串
 *   mount(root)                        可选：绑定这个区块专属的交互
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
