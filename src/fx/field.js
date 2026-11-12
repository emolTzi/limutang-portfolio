/**
 * field.js — WebGL2 粒子引擎（纯渲染层，不关心页面内容）。
 *
 * 职责：管理 GL 资源、跑「GPU 物理模拟 → 粒子绘制 → 拖尾 → 合成」四个通道。
 * 它不知道什么是章节、什么是滚动；所有可调的量都放在 field.params 里，
 * 由 director.js 每帧写入。想做新效果，通常只需要改 params 或 shaders.js。
 *
 * 用法：
 *   const field = new Field(canvas, { count, maxPixels, dprCap });
 *   field.init();                                   // false = 不支持 WebGL2
 *   field.addFormation('name', { data, size });     // data: Float32Array(count × 4)
 *   field.setPair('from', 'to');                    // 指定正在过渡的两个编队
 *   field.render(dt);                               // 每帧调用
 */

import { SIM_VS, SIM_FS, DRAW_VS, DRAW_FS, QUAD_VS, TRAIL_FS, COMPOSITE_FS } from './shaders.js';
import { mat4, mulberry32, TAU, clamp } from '../core/math.js';

const FOV = (30 * Math.PI) / 180;

/** 相机：让 z = 0 平面的可视半高正好是 1 个世界单位，DOM 像素与世界坐标换算就是一次乘法。 */
export const CAMERA = { fov: FOV, near: 0.1, far: 40, distance: 1 / Math.tan(FOV / 2) };

/** 粒子数的参考值：实际粒子数偏离它时，自动补偿亮度与大小，保证各档设备观感一致。 */
const REFERENCE_COUNT = 110000;

export function defaultParams() {
  return {
    time: 0,
    morph: 1,
    lite: 0,
    modelFrom: mat4.create(),
    modelTo: mat4.create(),
    waveFrom: [0, 0, 0, 0],
    waveTo: [0, 0, 0, 0],
    spring: 34,
    damp: 7.5,
    turb: 0.12,
    breath: 0.006,
    arc: 0.35,
    rayO: [0, 0, CAMERA.distance],
    rayD: [0, 0, -1],
    ptrPos: [0, 0, 0],
    ptrVel: [0, 0, 0],
    ptrPush: 0,
    ptrRadius: 0.17,
    charge: 0,
    burst: [0, 0, 0, 0],
    burstAge: 99,
    follow: 0,
    followFrac: 0.035,
    wind: 0,
    view: mat4.create(),
    size: 0.0021,
    focus: CAMERA.distance,
    aperture: 0.02,
    alpha: 0.55,
    dim: 1,
    group: -1,
    groupAmt: 0,
    colA: [0.96, 0.92, 0.85],
    colB: [0.6, 0.9, 0.84],
    colHot: [1.0, 0.56, 0.14],
    decay: 0.84,
    exposure: 1.1,
    bloom: 0.6,
    ca: 0.012,
    grain: 0.035,
    vignette: 0.35,
    haze: 1,
    flash: 0,
    bgA: [0.05, 0.044, 0.038],
    bgB: [0.02, 0.017, 0.015],
    hazeA: [0.1, 0.055, 0.02],
    hazeB: [0.02, 0.06, 0.055],
  };
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`着色器编译失败：${log}`);
  }
  return shader;
}

function link(gl, vsSource, fsSource, varyings) {
  const prog = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vsSource);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSource);
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  if (varyings) gl.transformFeedbackVaryings(prog, varyings, gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`着色器链接失败：${gl.getProgramInfoLog(prog)}`);
  }
  const u = {};
  const total = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < total; i++) {
    const info = gl.getActiveUniform(prog, i);
    if (!info) continue;
    const name = info.name.replace(/\[0\]$/, '');
    u[name] = gl.getUniformLocation(prog, name);
  }
  return { prog, u };
}

export class Field {
  constructor(canvas, { count, maxPixels = 2.6e6, dprCap = 1.75 } = {}) {
    this.canvas = canvas;
    this.count = count;
    this.maxPixels = maxPixels;
    this.dprCap = dprCap;
    this.formations = new Map();
    this.pair = ['', ''];
    this.params = defaultParams();
    /** 自适应画质：渲染分辨率系数、实际绘制的粒子比例、是否开启后期。 */
    this.scale = 1;
    this.fraction = 1;
    this.post = true;
    this.lost = false;
    this.cssWidth = 1;
    this.cssHeight = 1;
    this.width = 0;
    this.height = 0;
    this.aspect = 1;
    this.proj = mat4.create();
    this.read = 0;
    this.trailRead = 0;
    this.gl = null;
  }

  static supported() {
    try {
      return Boolean(document.createElement('canvas').getContext('webgl2'));
    } catch {
      return false;
    }
  }

  init() {
    const gl = this.canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
    if (!gl) return false;
    this.gl = gl;

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    this.canvas.addEventListener('webglcontextrestored', () => {
      try {
        this._build();
        this.lost = false;
      } catch (err) {
        console.error('[field] 上下文恢复失败', err);
      }
    });

    this._build();
    return true;
  }

  /* ── 资源创建 ──────────────────────────────────────────────────────────── */

  _build() {
    const gl = this.gl;
    this.hdr = Boolean(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    this.sim = link(gl, SIM_VS, SIM_FS, ['vPos', 'vVel']);
    this.draw = link(gl, DRAW_VS, DRAW_FS);
    this.trailPass = link(gl, QUAD_VS, TRAIL_FS);
    this.comp = link(gl, QUAD_VS, COMPOSITE_FS);

    const n = this.count;
    const rand = mulberry32(20260911);

    // 初始状态：粒子散落在远处的一圈星尘里，开场时再汇聚成名字
    const state = new Float32Array(n * 8);
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU;
      const r = 1.6 + rand() * 3.4;
      const o = i * 8;
      state[o] = Math.cos(a) * r;
      state[o + 1] = Math.sin(a) * r * 0.7;
      state[o + 2] = -4 + rand() * 5.5;
      seeds[i * 4] = rand();
      seeds[i * 4 + 1] = rand();
      seeds[i * 4 + 2] = rand();
      seeds[i * 4 + 3] = rand();
    }

    this.state = [gl.createBuffer(), gl.createBuffer()];
    for (const buffer of this.state) {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, state, gl.DYNAMIC_COPY);
    }
    this.seedBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

    for (const formation of this.formations.values()) formation.buffer = this._upload(formation.data);

    // 每个状态缓冲各配一个 VAO；SIM 与 DRAW 共用同一套属性布局
    this.vao = this.state.map((buffer) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.seedBuffer);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
      return vao;
    });

    // 一个覆盖全屏的大三角形，后期通道共用
    this.quad = gl.createVertexArray();
    gl.bindVertexArray(this.quad);
    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    this.maxPoint = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64;
    this.read = 0;
    this.trailRead = 0;
    this.width = 0;
    this.height = 0;
    if (this.pair[0]) this.setPair(this.pair[0], this.pair[1]);
    this.resize(true);
  }

  _upload(data) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return buffer;
  }

  _target(width, height, mips) {
    const gl = this.gl;
    const make = (internal) => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      const levels = mips ? Math.floor(Math.log2(Math.max(width, height))) + 1 : 1;
      gl.texStorage2D(gl.TEXTURE_2D, levels, internal, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      return { tex, fbo, ok };
    };
    let target = make(this.hdr ? gl.RGBA16F : gl.RGBA8);
    if (!target.ok && this.hdr) {
      // 个别设备声明支持却建不出浮点帧缓冲：退回 8 位
      gl.deleteTexture(target.tex);
      gl.deleteFramebuffer(target.fbo);
      this.hdr = false;
      target = make(gl.RGBA8);
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return target;
  }

  /* ── 编队 ──────────────────────────────────────────────────────────────── */

  /** 注册（或覆盖）一个编队。data 长度必须是 count × 4：x, y, z, 分组号。 */
  addFormation(name, { data, size }) {
    if (data.length !== this.count * 4) throw new Error(`编队 "${name}" 的数据长度不对`);
    const existing = this.formations.get(name);
    if (existing && existing.buffer && this.gl) {
      const gl = this.gl;
      gl.bindBuffer(gl.ARRAY_BUFFER, existing.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      existing.data = data;
      existing.size = size;
      return;
    }
    this.formations.set(name, { data, size, buffer: this.gl ? this._upload(data) : null });
  }

  /** 指定过渡的起点与终点编队（params.morph 控制进度）。 */
  setPair(from, to) {
    const gl = this.gl;
    const a = this.formations.get(from);
    const b = this.formations.get(to);
    if (!a || !b) return;
    this.pair = [from, to];
    for (const vao of this.vao) {
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
      gl.enableVertexAttribArray(3);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer);
      gl.enableVertexAttribArray(4);
      gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /* ── 尺寸 ──────────────────────────────────────────────────────────────── */

  resize(force = false) {
    const gl = this.gl;
    if (!gl) return;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width));
    const cssH = Math.max(1, Math.round(rect.height));
    let ratio = Math.min(window.devicePixelRatio || 1, this.dprCap);
    const pixels = cssW * cssH * ratio * ratio;
    if (pixels > this.maxPixels) ratio *= Math.sqrt(this.maxPixels / pixels);
    ratio *= this.scale;
    const width = Math.max(2, Math.round(cssW * ratio));
    const height = Math.max(2, Math.round(cssH * ratio));
    this.cssWidth = cssW;
    this.cssHeight = cssH;
    if (!force && width === this.width && height === this.height) return;

    this.width = width;
    this.height = height;
    this.aspect = width / height;
    this.pixelRatio = ratio;
    this.canvas.width = width;
    this.canvas.height = height;
    mat4.perspective(this.proj, CAMERA.fov, this.aspect, CAMERA.near, CAMERA.far);

    for (const target of [this.scene, ...(this.trail || [])]) {
      if (!target) continue;
      gl.deleteTexture(target.tex);
      gl.deleteFramebuffer(target.fbo);
    }
    this.scene = this._target(width, height, false);
    this.trail = [this._target(width, height, true), this._target(width, height, true)];
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  /** 清空拖尾缓冲（快进模拟之后调用，避免残留上一幕的影子）。 */
  clearTrails() {
    const gl = this.gl;
    if (!gl || !this.trail) return;
    gl.clearColor(0, 0, 0, 1);
    for (const target of this.trail) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  get drawCount() {
    return Math.max(1000, Math.floor(this.count * this.fraction));
  }

  /* ── 每帧 ──────────────────────────────────────────────────────────────── */

  get active() {
    return Boolean(this.gl && !this.lost && this.pair[0] && this.scene);
  }

  /** 一帧 = 模拟一步 + 画出来。 */
  render(dt) {
    if (!this.active) return;
    this.simulate(dt);
    this.present(dt);
  }

  /** ① 物理模拟：读 state[read]，经 Transform Feedback 写入 state[write]。只动顶点，不画任何像素。 */
  simulate(dt) {
    if (!this.active) return;
    const gl = this.gl;
    const p = this.params;
    const count = this.drawCount;
    const write = 1 - this.read;
    const s = this.sim.u;
    gl.useProgram(this.sim.prog);
    gl.uniform1f(s.uTime, p.time);
    gl.uniform1f(s.uDt, dt);
    gl.uniform1f(s.uMorph, p.morph);
    gl.uniform1f(s.uLite, p.lite);
    gl.uniformMatrix4fv(s.uModelFrom, false, p.modelFrom);
    gl.uniformMatrix4fv(s.uModelTo, false, p.modelTo);
    gl.uniform4fv(s.uWaveFrom, p.waveFrom);
    gl.uniform4fv(s.uWaveTo, p.waveTo);
    gl.uniform1f(s.uSpring, p.spring);
    gl.uniform1f(s.uDamp, p.damp);
    gl.uniform1f(s.uTurb, p.turb);
    gl.uniform1f(s.uBreath, p.breath);
    gl.uniform1f(s.uArc, p.arc);
    gl.uniform3fv(s.uRayO, p.rayO);
    gl.uniform3fv(s.uRayD, p.rayD);
    gl.uniform3fv(s.uPtrPos, p.ptrPos);
    gl.uniform3fv(s.uPtrVel, p.ptrVel);
    gl.uniform1f(s.uPtrPush, p.ptrPush);
    gl.uniform1f(s.uPtrRadius, p.ptrRadius);
    gl.uniform1f(s.uCharge, p.charge);
    gl.uniform4fv(s.uBurst, p.burst);
    gl.uniform1f(s.uBurstAge, p.burstAge);
    gl.uniform1f(s.uFollow, p.follow);
    gl.uniform1f(s.uFollowFrac, p.followFrac);
    gl.uniform1f(s.uWind, p.wind);

    gl.bindVertexArray(this.vao[this.read]);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, this.state[write]);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindVertexArray(null);
    this.read = write;
  }

  /** ②③④ 把当前状态画到屏幕。 */
  present(dt) {
    if (!this.active) return;
    const gl = this.gl;
    const p = this.params;
    const count = this.drawCount;
    const W = this.width;
    const H = this.height;

    /* ② 粒子 → HDR 离屏纹理（加色混合） */
    const density = clamp(Math.sqrt(REFERENCE_COUNT / count), 0.85, 2.4);
    const d = this.draw.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.scene.fbo);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.draw.prog);
    gl.uniformMatrix4fv(d.uView, false, p.view);
    gl.uniformMatrix4fv(d.uProj, false, this.proj);
    gl.uniform1f(d.uProjScale, H / 2 / Math.tan(CAMERA.fov / 2));
    gl.uniform1f(d.uSize, p.size * Math.pow(density, 0.4));
    gl.uniform1f(d.uFocus, p.focus);
    gl.uniform1f(d.uAperture, p.aperture);
    gl.uniform1f(d.uAlpha, p.alpha * Math.pow(density, 0.9));
    gl.uniform1f(d.uDim, p.dim);
    gl.uniform1f(d.uTime, p.time);
    gl.uniform1f(d.uGroup, p.group);
    gl.uniform1f(d.uGroupAmt, p.groupAmt);
    gl.uniform3fv(d.uColA, p.colA);
    gl.uniform3fv(d.uColB, p.colB);
    gl.uniform3fv(d.uColHot, p.colHot);
    gl.uniform1f(d.uFollow, p.follow);
    gl.uniform1f(d.uFollowFrac, p.followFrac);
    gl.uniform1f(d.uMaxPoint, Math.min(this.maxPoint, 72 * this.pixelRatio));
    gl.uniform1f(d.uMorph, p.morph);
    gl.uniform1f(d.uLite, p.lite);
    gl.bindVertexArray(this.vao[this.read]);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.disable(gl.BLEND);

    /* ③ 拖尾：max(上一帧 × 衰减, 当前帧) */
    const prev = this.trail[this.trailRead];
    const next = this.trail[1 - this.trailRead];
    const t = this.trailPass.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
    gl.useProgram(this.trailPass.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, prev.tex);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.scene.tex);
    gl.uniform1i(t.uPrev, 0);
    gl.uniform1i(t.uScene, 1);
    gl.uniform1f(t.uDecay, this.post ? Math.pow(p.decay, dt * 60) : 0);
    gl.bindVertexArray(this.quad);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.trailRead = 1 - this.trailRead;

    /* ④ 合成到屏幕 */
    const c = this.comp.u;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, next.tex);
    if (this.post) gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(this.comp.prog);
    gl.uniform1i(c.uTex, 0);
    gl.uniform2f(c.uRes, W, H);
    gl.uniform1f(c.uAspect, this.aspect);
    gl.uniform1f(c.uTime, p.time);
    gl.uniform1f(c.uExposure, p.exposure);
    gl.uniform1f(c.uBloom, this.post ? p.bloom : 0);
    gl.uniform1f(c.uCA, p.ca);
    gl.uniform1f(c.uGrain, p.grain);
    gl.uniform1f(c.uVignette, p.vignette);
    gl.uniform1f(c.uHaze, p.haze);
    gl.uniform1f(c.uFlash, p.flash);
    gl.uniform3fv(c.uBgA, p.bgA);
    gl.uniform3fv(c.uBgB, p.bgB);
    gl.uniform3fv(c.uHazeA, p.hazeA);
    gl.uniform3fv(c.uHazeB, p.hazeB);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
}
