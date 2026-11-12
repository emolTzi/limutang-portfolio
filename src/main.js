/**
 * main.js — 简洁版启动入口。
 * 用 site.js 渲染导航与全部章节；没有粒子、加载层、自定义光标或滚动劫持。
 */

import { site } from './content/site.js';
import { $ } from './core/dom.js';
import { renderSections, mountSections } from './sections/index.js';
import { renderChrome, initNav } from './ui/nav.js';

function boot() {
  const chrome = $('#chrome');
  const app = $('#app');
  if (chrome) chrome.innerHTML = renderChrome(site);
  if (app) app.innerHTML = renderSections(site);
  document.title = site.meta.title;
  const nav = initNav(site);
  if (app) mountSections(app);
  nav.restore();
  document.documentElement.classList.add('is-ready');
  window.__lmt = { site };
}

try {
  boot();
} catch (err) {
  console.error('[main] 启动失败，已切换为静态页面', err);
  document.documentElement.classList.add('is-ready', 'is-static');
}
