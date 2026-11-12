/**
 * env.js — 运行环境探测与用户偏好。
 *
 * 调试用 URL 参数：
 *   ?fx=off        关闭 WebGL 粒子（走降级背景）
 *   ?motion=lite   精简动效（等同系统「减少动态效果」）
 *   ?n=60000       指定粒子数
 *   ?tier=high     强制设备档位（soft | low | mid | high）
 *   ?debug         在控制台打印引擎信息
 *   ?still         跳过开场加载动画（截图 / 自动化测试用）
 */

const params = new URLSearchParams(window.location.search);
const mq = (query) => (window.matchMedia ? window.matchMedia(query).matches : false);

const STORE_KEY = 'lmt.motion';

function readStore() {
  try {
    return window.localStorage.getItem(STORE_KEY);
  } catch {
    return null;
  }
}

function detectGPU() {
  const info = { webgl2: false, software: false, renderer: '' };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return info;
    info.webgl2 = true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    info.renderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    info.software = /swiftshader|llvmpipe|software|basic render/i.test(info.renderer);
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  } catch {
    /* 探测失败按不支持处理 */
  }
  return info;
}

const reducedMotion = mq('(prefers-reduced-motion: reduce)');
const finePointer = mq('(hover: hover) and (pointer: fine)');
const gpu = detectGPU();

const cores = navigator.hardwareConcurrency || 4;
const memory = navigator.deviceMemory || 4;
const smallScreen = Math.min(window.screen.width, window.screen.height) < 720;

/**
 * 设备档位决定粒子数与渲染分辨率上限。
 *   soft  没有显卡加速（软件渲染）：极简配置，保证能动
 *   low   手机 / 小屏
 *   mid   普通电脑
 *   high  多核大内存的电脑
 */
const BUDGET = {
  soft: { particles: 12000, maxPixels: 5e5, dprCap: 1, post: false },
  low: { particles: 36000, maxPixels: 1.5e6, dprCap: 1.5, post: true },
  mid: { particles: 84000, maxPixels: 2.6e6, dprCap: 1.75, post: true },
  high: { particles: 128000, maxPixels: 3.6e6, dprCap: 2, post: true },
};

let tier = 'mid';
if (gpu.software) tier = 'soft';
else if (!finePointer || smallScreen) tier = 'low';
else if (cores >= 8 && memory >= 8) tier = 'high';
if (BUDGET[params.get('tier')]) tier = params.get('tier');

const stored = readStore();
const motionParam = params.get('motion');
const motion = motionParam || stored || (reducedMotion ? 'lite' : 'full');

export const env = {
  params,
  debug: params.has('debug'),
  still: params.has('still'),
  reducedMotion,
  finePointer,
  touch: !finePointer,
  gpu,
  tier,
  /** 'full' | 'lite' */
  motion: motion === 'lite' ? 'lite' : 'full',
  fx: params.get('fx') === 'off' || !gpu.webgl2 ? 'off' : 'on',
  particles: Number(params.get('n')) || BUDGET[tier].particles,
  maxPixels: BUDGET[tier].maxPixels,
  dprCap: BUDGET[tier].dprCap,
  /** 是否开启后期（拖尾与泛光） */
  post: BUDGET[tier].post,
  get lite() {
    return this.motion === 'lite';
  },
};

/** 记住用户选择的动效档位（下次访问生效）。 */
export function saveMotion(mode) {
  try {
    window.localStorage.setItem(STORE_KEY, mode);
  } catch {
    /* 隐私模式下可能不可写，忽略 */
  }
}
