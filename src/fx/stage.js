/**
 * stage.js — 舞台：把粒子引擎（Field）、编队（formations）、导演（Director）装配起来，
 * 对外只暴露一个很小的接口。页面其余部分通过 ctx.stage 使用它：
 *
 *   stage.enabled            WebGL 是否可用（false 时其余方法都是空操作）
 *   stage.start()            开场：粒子开始跟随滚动
 *   stage.focusGroup(i)      高亮当前编队里的第 i 组粒子，-1 取消
 *   stage.refresh()          页面布局变了（重新扫描 data-cue 并测量）
 *   stage.stats()            { particles, width, height, hdr }
 *   stage.charge             当前蓄力值 0…1（光标与智能体群会读它）
 */

import { $ } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ticker, ORDER } from '../core/ticker.js';
import { mulberry32 } from '../core/math.js';
import { getTeam } from '../content/site.js';
import { Field } from './field.js';
import { Director } from './director.js';
import { buildFormation, formationNames } from './formations.js';

/** 名字粒子用的字体（与 CSS 的 --font-serif 保持一致）。 */
const GLYPH_FONT = '"Noto Serif SC", "Source Han Serif SC", "Noto Serif CJK SC", "Songti SC", "STSong", "SimSun", serif';

/** 窄竖屏：名字竖排（与 CSS 里的同名媒体查询保持一致）。 */
export const VERTICAL_QUERY = '(max-width: 720px) and (orientation: portrait)';

/** 帧率不足时逐级降低画质，只降不升，避免来回抖动。 */
const QUALITY_STEPS = [
  { scale: 0.82 },
  { fraction: 0.7 },
  { scale: 0.66 },
  { fraction: 0.5, post: false },
  { scale: 0.5, fraction: 0.35 },
];

const nullStage = {
  enabled: false,
  charge: 0,
  start() {},
  focusGroup() {},
  refresh() {},
  settle() {},
  stats: () => ({ particles: 0, width: 0, height: 0, hdr: false }),
};

function seedOf(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
  return h >>> 0;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export async function createStage(ctx, onProgress = () => {}) {
  const { env, site, pointer, scroll } = ctx;
  const root = document.documentElement;
  const canvas = $('#fx-field');

  const fallback = (reason) => {
    if (env.debug && reason) console.info('[stage] 使用降级背景：', reason);
    root.classList.add('no-gl');
    return nullStage;
  };

  if (!canvas || env.fx === 'off') return fallback('已关闭或不支持 WebGL2');

  const field = new Field(canvas, { count: env.particles, maxPixels: env.maxPixels, dprCap: env.dprCap });
  try {
    if (!field.init()) return fallback('无法创建 WebGL2 上下文');
  } catch (err) {
    console.warn('[stage] 初始化失败', err);
    return fallback('初始化失败');
  }

  // 画布在 has-gl 之前是隐藏的（量不到尺寸）：先亮出来，再按真实尺寸分配渲染目标
  root.classList.add('has-gl');
  field.post = env.post;
  field.resize(true);

  /* ── 生成编队 ─────────────────────────────────────────────────────────── */
  const team = getTeam();
  const vertical = window.matchMedia(VERTICAL_QUERY);

  const build = (name) => {
    const extra = name === 'glyphs'
      ? { text: site.person.name, font: GLYPH_FONT, weight: 900, vertical: vertical.matches }
      : {};
    const formation = buildFormation(name, field.count, { rand: mulberry32(seedOf(name)), site, team, ...extra });
    field.addFormation(name, formation);
    if (name === 'glyphs') {
      // 把名字的宽高比告诉 CSS，首屏占位框就能和粒子严丝合缝
      root.style.setProperty('--name-aspect', (formation.size[0] / formation.size[1]).toFixed(4));
    }
  };

  const names = formationNames();
  for (let i = 0; i < names.length; i++) {
    build(names[i]);
    onProgress((i + 1) / names.length);
    if (i % 3 === 2) await nextFrame(); // 让加载动画有机会刷新
  }

  const director = new Director(field, { pointer, scroll, env });

  /* ── 尺寸与布局 ───────────────────────────────────────────────────────── */
  let resizeTimer = 0;
  const onResize = () => {
    field.resize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => director.measure(), 120);
  };
  window.addEventListener('resize', onResize);
  bus.on('layout', () => director.measure());
  const rebuildGlyphs = () => {
    build('glyphs');
    director.measure();
  };
  if (vertical.addEventListener) vertical.addEventListener('change', rebuildGlyphs);

  /* ── 自适应画质 ───────────────────────────────────────────────────────── */
  let level = 0;
  let warmup = 0;
  let frames = 0;
  let windowStart = performance.now();
  let slow = 0;
  const adapt = (dt) => {
    if (document.hidden) {
      frames = 0;
      windowStart = performance.now();
      return;
    }
    warmup += dt;
    if (warmup < 4) {
      frames = 0;
      windowStart = performance.now();
      return;
    }
    frames += 1;
    const elapsed = performance.now() - windowStart;
    if (elapsed < 1500) return;
    const fps = (frames * 1000) / elapsed;
    frames = 0;
    windowStart = performance.now();
    slow = fps < 40 ? slow + 1 : Math.max(0, slow - 1);
    if (slow >= 2 && level < QUALITY_STEPS.length) {
      const step = QUALITY_STEPS[level++];
      if (step.scale) field.scale = step.scale;
      if (step.fraction) field.fraction = step.fraction;
      if (step.post === false) field.post = false;
      field.resize(true);
      slow = 0;
      if (env.debug) console.info('[stage] 画质降级 →', level, step, `(${fps.toFixed(0)} fps)`);
    }
  };

  /* ── 逐帧 ─────────────────────────────────────────────────────────────── */
  const adaptive = !env.params.has('n') && !env.still;
  ticker.add((time, dt) => {
    director.update(time, dt);
    field.render(dt);
    if (adaptive) adapt(dt);
  }, ORDER.RENDER);

  if (env.debug) {
    console.info('[stage]', { particles: field.count, tier: env.tier, hdr: field.hdr, renderer: env.gpu.renderer });
  }

  return {
    enabled: true,
    field,
    director,
    get charge() {
      return director.charge;
    },
    start() {
      director.scan();
      director.start();
    },
    focusGroup(group) {
      director.focus(group);
    },
    refresh() {
      director.scan();
    },
    /**
     * 调试 / 截图用：只跑物理、不画像素，把模拟快进若干秒。
     * 在控制台里 __lmt.stage.settle(3) 可以立刻看到粒子到位后的样子。
     */
    settle(seconds = 2) {
      const step = 1 / 60;
      for (let i = 0; i < seconds * 60; i++) {
        ticker.time += step;
        director.update(ticker.time, step);
        field.simulate(step);
      }
      field.clearTrails();
    },
    stats: () => ({ particles: field.drawCount, width: field.width, height: field.height, hdr: field.hdr }),
  };
}
