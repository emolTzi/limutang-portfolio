/**
 * main.js — 启动入口。
 *
 * 启动顺序：
 *   1. 内容 → DOM        由 site.js 渲染导航与全部章节（index.html 里那份静态内容只是降级预案）
 *   2. 核心服务          指针、平滑滚动
 *   3. 等字体            名字粒子要按真实字形采样
 *   4. 舞台              WebGL2 粒子引擎（不支持则自动降级为静态背景）
 *   5. 交互              导航、指令面板、区块挂载、进场动效、磁吸倾斜、光标智能体群、读数
 *   6. 开场              加载层淡出，粒子从星尘汇聚成名字
 *
 * ctx 是贯穿全站的上下文对象，所有模块都从它取依赖：
 *   { site, env, bus, ticker, pointer, scroll, stage }
 */

import { site, getTeam } from './content/site.js';
import { $ } from './core/dom.js';
import { env } from './core/env.js';
import { bus } from './core/bus.js';
import { ticker } from './core/ticker.js';
import { pointer, initPointer } from './core/pointer.js';
import { scroll } from './core/scroll.js';
import { createStage } from './fx/stage.js';
import { renderSections, mountSections } from './sections/index.js';
import { createLoader } from './ui/loader.js';
import { renderChrome, initNav } from './ui/nav.js';
import { initPalette } from './ui/palette.js';
import { initMotion } from './ui/motion.js';
import { initInteract } from './ui/interact.js';
import { initCursor } from './ui/cursor.js';
import { initHud } from './ui/hud.js';

const root = document.documentElement;

/** 等首屏名字要用的字体；超时就用系统宋体兜底，不让页面卡住。 */
async function waitForFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const timeout = new Promise((resolve) => setTimeout(resolve, 3500));
  try {
    await Promise.race([document.fonts.load('900 64px "Noto Serif SC"', site.person.name), timeout]);
  } catch {
    /* 字体加载失败不影响其余流程 */
  }
}

async function boot() {
  root.classList.toggle('is-lite', env.lite);
  const loader = createLoader({ total: getTeam().total, still: env.still });

  // 1 ── 内容
  $('#chrome').innerHTML = renderChrome(site);
  $('#app').innerHTML = renderSections(site);
  document.title = site.meta.title;
  loader.set(0.2);

  // 2 ── 核心服务
  const ctx = { site, env, bus, ticker, pointer, scroll, stage: null };
  initPointer();
  scroll.init();

  // 3 ── 字体
  await waitForFonts();
  loader.set(0.4);

  // 4 ── 舞台
  ctx.stage = await createStage(ctx, (progress) => loader.set(0.4 + progress * 0.5));
  loader.set(0.92);

  // 5 ── 交互
  const nav = initNav(ctx);
  initPalette(ctx);
  mountSections($('#app'), ctx);
  if (!env.lite) root.classList.add('is-armed');
  initMotion(document);
  initInteract(ctx);
  initCursor(ctx);
  initHud(ctx);
  ticker.start();
  nav.restore();
  window.__lmt = ctx; // 方便在控制台里调试：__lmt.stage、__lmt.scroll …

  // 6 ── 开场
  await loader.finish();
  root.classList.add('is-ready');
  root.classList.remove('is-static');
  ctx.stage.start();
}

function fallback(err) {
  console.error('[main] 启动失败或超时，已显示页面内容', err);
  root.classList.remove('is-armed');
  root.classList.add('is-ready', 'is-static', 'no-gl');
  $('#loader')?.remove();
}

const BOOT_DEADLINE_MS = 8000;
let bootTimer = 0;
Promise.race([
  boot(),
  new Promise((_, reject) => {
    bootTimer = setTimeout(() => reject(new Error('boot timeout')), BOOT_DEADLINE_MS);
  }),
]).then(() => clearTimeout(bootTimer)).catch(fallback);
