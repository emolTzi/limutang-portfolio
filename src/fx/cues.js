/**
 * cues.js — 舞台调度表：每个「预设」描述粒子在某一段页面里该是什么样子。
 *
 * 页面上任意元素写 data-cue="预设名"，当它滚到视口中线时导演就切到这个预设。
 * 元素内部如果有 [data-stage-anchor] 占位框，编队会被装进这个框并跟着它一起滚动；
 * 没有占位框（或 anchored: false）时，编队固定在视口里的 pos 位置，当作背景。
 *
 * 所有数值都会被平滑过渡，所以这里只管写「到位之后」的状态。
 *
 * 坐标约定：视口高度 = 2 个世界单位，原点在视口中心，y 向上。
 *   pos   [x, y, z]  x 以「半个视口宽」为单位（1 = 右边缘），y 以半个视口高为单位，
 *                    z 为世界单位（负数 = 远离镜头，会变小变虚）
 *   rot   [x, y, z]  静态倾斜（弧度）。平铺在 XZ 平面的形状靠 rot.x 抬起来给镜头看
 *   spin  [x, y, z]  自转角速度（弧度/秒）
 *   sway  [x, y]     跟随指针的转动幅度
 */

export const PALETTES = {
  /** 墨：暖白为主，少量青色 —— 首屏与通用 */
  ink: {
    a: [0.96, 0.92, 0.85],
    b: [0.6, 0.9, 0.84],
    hot: [1.0, 0.56, 0.14],
    hazeA: [0.095, 0.052, 0.02],
    hazeB: [0.018, 0.055, 0.05],
  },
  /** 珀：琥珀与金 —— 祈愿龙珠、联系 */
  amber: {
    a: [1.0, 0.88, 0.66],
    b: [1.0, 0.62, 0.2],
    hot: [1.0, 0.4, 0.1],
    hazeA: [0.13, 0.062, 0.015],
    hazeB: [0.05, 0.03, 0.012],
  },
  /** 青：青白 —— 数字教材、智能体、教育 */
  jade: {
    a: [0.88, 0.96, 0.93],
    b: [0.46, 0.86, 0.79],
    hot: [1.0, 0.62, 0.2],
    hazeA: [0.03, 0.06, 0.05],
    hazeB: [0.012, 0.062, 0.058],
  },
  /** 曙：暖白与浅金 —— 星系、传送门 */
  dawn: {
    a: [0.99, 0.93, 0.84],
    b: [0.98, 0.74, 0.46],
    hot: [1.0, 0.5, 0.14],
    hazeA: [0.1, 0.058, 0.03],
    hazeB: [0.03, 0.045, 0.05],
  },
};

export const DEFAULTS = {
  formation: 'dust',
  anchored: true,
  /** contain：完整装进占位框；height / width：只按一条边缩放（允许另一边溢出） */
  fitMode: 'contain',
  fit: 1,
  /**
   * 这个编队在桌面端「设计稿」里占的屏幕面积（世界单位²）。实际显示得更小时，
   * 导演会按比例缩小粒子，避免同样多的粒子挤在更小的区域里而过曝（手机上尤其明显）。
   */
  area: 1.2,
  pos: [0, 0, 0],
  scale: 1,
  rot: [0, 0, 0],
  spin: [0, 0, 0],
  sway: [0.08, 0.05],
  spring: 34,
  damp: 7.5,
  turb: 0.12,
  breath: 0.006,
  arc: 0.35,
  dim: 1,
  size: 1,
  aperture: 0.006,
  exposure: 1.1,
  bloom: 0.6,
  decay: 0.84,
  /** 波纹：[振幅, 波数, 角频率]，只有 wave 编队用得上 */
  wave: [0, 0, 0],
  palette: 'ink',
  /** 追随指针的粒子参与度（0 = 没有粒子跟随指针） */
  follow: 1,
  /** 指针推开粒子的力度倍率 */
  push: 1,
  /** 切到这个预设时，编队变形持续的秒数 */
  duration: 1.7,
};

export const CUES = {
  /** 开场：粒子从远处的星尘汇聚（仅作为第一次变形的起点） */
  intro: {
    formation: 'dust',
    anchored: false,
    pos: [0, 0, -1.2],
    scale: 1.5,
    spring: 4,
    damp: 2.4,
    turb: 0.3,
    dim: 0.5,
  },

  hero: {
    formation: 'glyphs',
    area: 2.2,
    sway: [0.16, 0.1],
    spring: 44,
    damp: 8.5,
    turb: 0.07,
    breath: 0.004,
    aperture: 0.02,
    size: 1.1,
    exposure: 1.75,
    bloom: 0.8,
    duration: 2.4,
    arc: 0.5,
  },

  about: {
    formation: 'dust',
    anchored: false,
    spin: [0, 0.02, 0],
    sway: [0.12, 0.08],
    spring: 5,
    damp: 2.6,
    turb: 0.3,
    breath: 0.03,
    dim: 0.62,
    aperture: 0.008,
    decay: 0.9,
    narrow: { dim: 0.45 },
  },

  education: {
    formation: 'terrain',
    fitMode: 'height',
    area: 4.5,
    rot: [0.08, 0, 0],
    sway: [0.07, 0.03],
    spring: 30,
    turb: 0.05,
    breath: 0.004,
    dim: 1,
    aperture: 0.003,
    exposure: 1.5,
    palette: 'jade',
    // 窄屏：按宽度缩放，让一屏里能看到足够多的山脊起伏
    narrow: { fitMode: 'width', fit: 2.2, dim: 0.85 },
  },

  orbs: {
    formation: 'orbs',
    rot: [0.42, 0, -0.12],
    spin: [0, 0.16, 0],
    sway: [0.22, 0.14],
    spring: 30,
    turb: 0.1,
    aperture: 0.004,
    exposure: 1.15,
    palette: 'amber',
  },

  wave: {
    formation: 'wave',
    rot: [0.5, 0, 0],
    spin: [0, 0.05, 0],
    sway: [0.14, 0.08],
    wave: [0.085, 13, 2.6],
    spring: 42,
    damp: 9,
    turb: 0.03,
    breath: 0.002,
    aperture: 0.005,
    palette: 'jade',
  },

  network: {
    formation: 'network',
    rot: [0.3, 0, 0],
    spin: [0, 0.12, 0],
    sway: [0.2, 0.12],
    spring: 32,
    turb: 0.07,
    aperture: 0.006,
    palette: 'jade',
  },

  galaxy: {
    formation: 'galaxy',
    rot: [0.62, 0, 0.2],
    spin: [0, -0.07, 0],
    sway: [0.2, 0.14],
    spring: 22,
    damp: 6,
    turb: 0.1,
    aperture: 0.006,
    palette: 'dawn',
  },

  stack: {
    formation: 'stack',
    rot: [0.3, 0.6, 0],
    spin: [0, 0.1, 0],
    sway: [0.18, 0.12],
    spring: 40,
    damp: 9,
    turb: 0.04,
    breath: 0.003,
    aperture: 0.005,
    palette: 'ink',
    narrow: { dim: 0.55 },
  },

  portal: {
    formation: 'portal',
    area: 3.8,
    rot: [0.16, -0.22, 0],
    spin: [0, 0, 0.12],
    sway: [0.26, 0.18],
    spring: 26,
    turb: 0.12,
    aperture: 0.008,
    palette: 'dawn',
    dim: 0.9,
    narrow: { dim: 0.6 },
  },

  contact: {
    formation: 'orb',
    rot: [0.2, 0, 0.1],
    spin: [0, 0.14, 0],
    sway: [0.26, 0.18],
    spring: 28,
    turb: 0.14,
    breath: 0.01,
    aperture: 0.007,
    exposure: 1.2,
    bloom: 0.8,
    palette: 'amber',
    narrow: { dim: 0.6 },
  },
};

/**
 * 修饰模式：data-cue-mode="backdrop" 表示沿用同一个编队，但退到正文背后当氛围。
 * 用在「标题屏之后的正文段落」：编队不变，只是变暗、推远、虚化。
 */
export const MODES = {
  backdrop: {
    anchored: false,
    pos: [0.46, -0.04, -1.5],
    scale: 1.3,
    dim: 0.2,
    aperture: 0.012,
    turb: 0.16,
    sway: [0.1, 0.06],
    duration: 1.5,
    narrow: { pos: [0, -0.2, -2.2], dim: 0.14 },
  },
};

/** 把预设、修饰模式、窄屏覆盖合并成最终配置。 */
export function resolveCue(name, mode, narrow) {
  const base = CUES[name] || CUES.about;
  let cfg = { ...DEFAULTS, ...base };
  if (narrow && base.narrow) cfg = { ...cfg, ...base.narrow };
  const modifier = mode && MODES[mode];
  if (modifier) {
    cfg = { ...cfg, ...modifier };
    if (narrow && modifier.narrow) cfg = { ...cfg, ...modifier.narrow };
  }
  delete cfg.narrow;
  cfg.colors = PALETTES[cfg.palette] || PALETTES.ink;
  return cfg;
}
