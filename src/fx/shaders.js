/**
 * shaders.js — 粒子引擎的全部 GLSL（WebGL2 / GLSL ES 3.00）。
 *
 * 渲染管线（每帧）：
 *   ① SIM        顶点着色器里做物理积分，Transform Feedback 把结果写回缓冲 → 纯 GPU 模拟
 *   ② DRAW       把粒子以加色混合画进 HDR 离屏纹理（带景深散景）
 *   ③ TRAIL      与上一帧做 max 混合并衰减 → 运动拖尾
 *   ④ COMPOSITE  泛光（mip 链）+ 色散 + 色调映射 + 背景雾 + 暗角 + 胶片颗粒 → 屏幕
 *
 * 每个粒子的顶点属性（SIM 与 DRAW 共用同一套 location）：
 *   0 aPos   xyz 位置, w 热度（被指针扰动后升高，决定颜色从冷白 → 琥珀）
 *   1 aVel   xyz 速度, w 变形进度 k
 *   2 aSeed  4 个 0–1 随机数（个体差异）
 *   3 aFrom  上一个编队中的目标点 xyz, w 分组号
 *   4 aTo    下一个编队中的目标点 xyz, w 分组号
 */

export const SIM_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec4 aPos;
layout(location = 1) in vec4 aVel;
layout(location = 2) in vec4 aSeed;
layout(location = 3) in vec4 aFrom;
layout(location = 4) in vec4 aTo;

uniform float uTime;
uniform float uDt;
uniform float uMorph;        // 0→1 编队切换进度
uniform float uLite;         // 1 = 减少动态效果：瞬时交叉淡化
uniform mat4 uModelFrom;     // 两个编队各自的摆放矩阵
uniform mat4 uModelTo;
uniform vec4 uWaveFrom;      // 波纹：振幅, 波数, 角频率
uniform vec4 uWaveTo;
uniform float uSpring;       // 回位弹簧刚度
uniform float uDamp;         // 阻尼
uniform float uTurb;         // 湍流强度
uniform float uBreath;       // 整体呼吸幅度
uniform float uArc;          // 迁移时的弧线幅度
uniform vec3 uRayO;          // 指针射线（世界空间）
uniform vec3 uRayD;
uniform vec3 uPtrPos;        // 指针在 z=0 平面上的落点
uniform vec3 uPtrVel;
uniform float uPtrPush;      // 推开力度
uniform float uPtrRadius;
uniform float uCharge;       // 按住蓄力 0…1
uniform vec4 uBurst;         // xyz 爆发中心, w 力度
uniform float uBurstAge;     // 爆发后经过的秒数
uniform float uFollow;       // 追随者参与度 0…1
uniform float uFollowFrac;   // 追随者占比
uniform float uWind;         // 滚动带来的风

out vec4 vPos;
out vec4 vVel;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

// 无散度流场（两层 ABC 流叠加）：粒子像在水里一样打旋，但不会聚成一团
vec3 flow(vec3 p, float t) {
  vec3 a = vec3(
    sin(p.z * 1.7 + t * 0.31) + cos(p.y * 1.3 - t * 0.23),
    sin(p.x * 1.5 - t * 0.27) + cos(p.z * 1.9 + t * 0.19),
    sin(p.y * 1.6 + t * 0.25) + cos(p.x * 1.4 - t * 0.21));
  vec3 q = p * 2.9 + 1.7;
  vec3 b = vec3(
    sin(q.z + t * 0.53) + cos(q.y - t * 0.47),
    sin(q.x - t * 0.43) + cos(q.z + t * 0.39),
    sin(q.y + t * 0.41) + cos(q.x - t * 0.37));
  return a + 0.5 * b;
}

// 双波源干涉（数字教材章节的水面）
vec3 ripple(vec3 p, vec4 w, float t) {
  float r1 = length(p.xz - vec2(-0.55, 0.0));
  float r2 = length(p.xz - vec2(0.55, 0.0));
  p.y += w.x * 0.5 * (sin(r1 * w.y - t * w.z) + sin(r2 * w.y - t * w.z));
  return p;
}

void main() {
  vec3 pos = aPos.xyz;
  vec3 vel = aVel.xyz;
  float heat = aPos.w;

  // —— 目标点：切换时原地呼吸淡出，再在新位置渐显，不在两点之间飞行 ——
  // 与 DRAW_VS 里的时间窗口保持一致。
  float delay = aSeed.x * 0.32;
  float outA, outB, inA, inB;
  if (uLite > 0.5) {
    outA = 0.0; outB = 0.5;
    inA = 0.5;  inB = 1.0;
  } else {
    outA = delay * 0.35;
    outB = 0.38 + delay * 0.12;
    inA  = 0.52 + delay * 0.32;
    inB  = inA + 0.34;
  }
  float fadeOut = 1.0 - smoothstep(outA, max(outA + 1e-4, outB), uMorph);
  float fadeIn  = smoothstep(inA, max(inA + 1e-4, inB), uMorph);
  float onB = step(inA, uMorph);
  float vis = max(fadeOut, fadeIn);
  float k = fadeIn; // 供绘制阶段判断当前属于新编队
  vec3 a = (uModelFrom * vec4(ripple(aFrom.xyz, uWaveFrom, uTime), 1.0)).xyz;
  vec3 b = (uModelTo * vec4(ripple(aTo.xyz, uWaveTo, uTime), 1.0)).xyz;
  vec3 target = mix(a, b, onB);
  // 切入新编队的瞬间传送到位并清零速度，避免弹簧把粒子拉过去
  if (onB > 0.5 && fadeIn < 0.4) {
    pos = b;
    vel = vec3(0.0);
  }
  target += flow(target * 1.3, uTime * 0.6) * uBreath;

  // —— 追随者：一小部分粒子脱离编队，绕着指针飞 ——
  // 切换过程中（粒子几乎看不见时）不要跟着乱飞
  float follower = step(aSeed.w, uFollowFrac) * uFollow * vis;
  if (follower > 0.0) {
    float dir = aSeed.y > 0.5 ? 1.0 : -1.0;
    float ang = uTime * (0.7 + aSeed.x * 2.6) * dir + aSeed.z * TAU;
    float rad = (0.025 + 0.2 * aSeed.y * aSeed.y) * (1.0 - uCharge * 0.6);
    vec3 orbit = vec3(cos(ang), sin(ang), sin(ang * 0.7 + aSeed.x * TAU) * 0.7) * rad;
    target = mix(target, uPtrPos + orbit, follower);
  }

  // —— 受力 ——
  float kS = uSpring * mix(0.55, 1.45, aSeed.y);
  kS = mix(kS, 26.0 * mix(0.3, 1.2, aSeed.x), follower);
  vec3 acc = (target - pos) * kS;

  acc += flow(pos * 1.1 + aSeed.xyz * 0.4, uTime) * uTurb;

  // 指针：以「到指针射线的距离」衰减，所以任何深度的粒子都会被拨动
  vec3 w = pos - uRayO;
  vec3 c = uRayO + uRayD * dot(w, uRayD);
  vec3 r = pos - c;
  float d = length(r) + 1e-5;
  vec3 rn = r / d;
  float f = exp(-(d * d) / (uPtrRadius * uPtrRadius));
  float free = 1.0 - follower;
  acc += (rn + cross(uRayD, rn) * 0.7) * f * uPtrPush * free;   // 推开 + 旋涡
  vel += uPtrVel * f * uDt * 5.0 * free;                         // 被指针带着走

  // 蓄力：吸入旋涡，并松开编队对它的束缚
  if (uCharge > 0.001) {
    float fc = uCharge / (1.0 + d * d * 7.0);
    acc += (-rn * 10.0 + cross(uRayD, rn) * 8.0) * fc * free;
    acc -= (target - pos) * kS * clamp(fc * 1.4, 0.0, 0.92) * free;
    heat += fc * uDt * 2.2;
  }

  // 释放：一圈向外扩散的冲击波
  if (uBurst.w > 0.001) {
    vec3 rb = pos - uBurst.xyz;
    float db = length(rb) + 1e-5;
    float ring = exp(-pow((db - uBurstAge * 2.4) / 0.25, 2.0));
    float amp = uBurst.w * exp(-uBurstAge * 1.8);
    acc += (rb / db) * ring * amp * 70.0;
    heat += ring * amp * uDt * 14.0;
  }

  acc.y += uWind * (0.4 + aSeed.z);

  // —— 积分 ——
  vel += acc * uDt;
  vel *= exp(-uDamp * mix(0.8, 1.25, aSeed.z) * uDt);
  float sp = length(vel);
  if (sp > 12.0) vel *= 12.0 / sp;
  pos += vel * uDt;

  heat = max(0.0, heat - uDt * 0.85);
  heat = min(1.6, heat + f * length(uPtrVel) * uDt * 1.4 * free);
  heat = mix(heat, max(heat, 0.9), follower);

  // 数值保险：一旦出现 NaN / 飞出边界，直接回到目标点
  if (any(isnan(pos)) || any(isinf(pos)) || dot(pos, pos) > 4.0e3) {
    pos = target;
    vel = vec3(0.0);
    heat = 0.0;
  }

  vPos = vec4(pos, heat);
  vVel = vec4(vel, k);
}
`;

/** Transform Feedback 阶段不光栅化，片元着色器只是占位。 */
export const SIM_FS = /* glsl */ `#version 300 es
precision highp float;
out vec4 o;
void main() { o = vec4(0.0); }
`;

export const DRAW_VS = /* glsl */ `#version 300 es
precision highp float;

layout(location = 0) in vec4 aPos;
layout(location = 1) in vec4 aVel;
layout(location = 2) in vec4 aSeed;
layout(location = 3) in vec4 aFrom;
layout(location = 4) in vec4 aTo;

uniform mat4 uView;
uniform mat4 uProj;
uniform float uProjScale;    // 深度为 1 处，每世界单位对应的像素数
uniform float uSize;         // 基础半径（世界单位）
uniform float uFocus;        // 对焦距离
uniform float uAperture;     // 光圈：越大越虚
uniform float uAlpha;
uniform float uDim;          // 整体亮度（正文区域调暗）
uniform float uTime;
uniform float uGroup;        // 高亮的分组号，-1 = 无
uniform float uGroupAmt;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColHot;
uniform float uFollow;
uniform float uFollowFrac;
uniform float uMaxPoint;
uniform float uMorph;        // 与模拟阶段相同的编队切换进度
uniform float uLite;         // 1 = 减少动态效果：瞬时交叉淡化

out vec3 vColor;
out float vBokeh;

void main() {
  vec4 mv = uView * vec4(aPos.xyz, 1.0);
  gl_Position = uProj * mv;

  float depth = max(0.05, -mv.z);
  float px = uProjScale / depth;
  float s = aSeed.z * aSeed.z * aSeed.z;
  float base = uSize * mix(0.55, 2.4, s);
  float coc = abs(depth - uFocus) * uAperture;        // 弥散圆
  float diam = (base + coc) * 2.0 * px;
  float point = clamp(diam, 1.0, uMaxPoint);
  gl_PointSize = point;

  // 与 SIM_VS 相同的淡出 / 渐显窗口
  float delay = aSeed.x * 0.32;
  float outA, outB, inA, inB;
  if (uLite > 0.5) {
    outA = 0.0; outB = 0.5;
    inA = 0.5;  inB = 1.0;
  } else {
    outA = delay * 0.35;
    outB = 0.38 + delay * 0.12;
    inA  = 0.52 + delay * 0.32;
    inB  = inA + 0.34;
  }
  float fadeOut = 1.0 - smoothstep(outA, max(outA + 1e-4, outB), uMorph);
  float fadeIn  = smoothstep(inA, max(inA + 1e-4, inB), uMorph);
  float vis = max(fadeOut, fadeIn);
  float pulseT = smoothstep(outA, max(outA + 1e-4, outB), uMorph);
  float pulse = (uLite > 0.5) ? 0.0 : fadeOut * sin(pulseT * 3.14159265359);

  float follower = step(aSeed.w, uFollowFrac) * uFollow * vis;
  float speed = length(aVel.xyz);
  float heat = clamp(aPos.w + speed * 0.35, 0.0, 1.6);

  vec3 cool = mix(uColA, uColB, smoothstep(0.55, 1.0, aSeed.y));
  vec3 col = mix(cool, uColHot, smoothstep(0.05, 1.0, heat));
  col = mix(col, vec3(1.0, 0.95, 0.86), smoothstep(1.0, 1.6, heat) * 0.6);

  // 虚化后能量守恒：光斑越大越暗
  float ratio = base / (base + coc);
  float energy = pow(ratio, 1.7);
  float sub = min(1.0, diam * diam);                  // 小于 1 像素时按面积变暗
  float twinkle = 0.72 + 0.28 * sin(uTime * (0.6 + aSeed.x * 2.2) + aSeed.y * 6.2831853);

  float group = mix(aFrom.w, aTo.w, step(0.5, fadeIn));
  float match = 1.0 - step(0.5, abs(group - uGroup));
  float focusGain = mix(1.0, mix(0.22, 2.1, match), uGroupAmt * step(0.0, uGroup));

  float dim = mix(uDim, max(uDim, 0.85), follower);
  float a = uAlpha * dim * energy * sub * twinkle * focusGain * (1.0 + heat * 1.3) * vis;

  // 淡出时轻轻胀一下，再回到零；渐显时从稍小的光点长到正常大小
  gl_PointSize = point * (1.0 + pulse * 0.7) * mix(0.7, 1.0, max(fadeOut, fadeIn));

  vColor = col * a * (1.0 + pulse * 0.35);
  vBokeh = smoothstep(4.0, 16.0, point);
}
`;

export const DRAW_FS = /* glsl */ `#version 300 es
precision highp float;

in vec3 vColor;
in float vBokeh;
out vec4 o;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;
  float core = exp(-r2 * 4.0);                                    // 清晰时：高斯亮点
  float r = sqrt(r2);
  float disc = smoothstep(1.0, 0.84, r) * (0.5 + 0.5 * smoothstep(0.45, 1.0, r)); // 虚化时：亮边散景
  o = vec4(vColor * mix(core, disc * 0.6, vBokeh), 1.0);
}
`;

export const QUAD_VS = /* glsl */ `#version 300 es
layout(location = 0) in vec2 aXY;
out vec2 vUv;
void main() {
  vUv = aXY * 0.5 + 0.5;
  gl_Position = vec4(aXY, 0.0, 1.0);
}
`;

export const TRAIL_FS = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uPrev;
uniform sampler2D uScene;
uniform float uDecay;

in vec2 vUv;
out vec4 o;

void main() {
  vec3 prev = textureLod(uPrev, vUv, 0.0).rgb * uDecay;
  vec3 cur = texture(uScene, vUv).rgb;
  o = vec4(max(prev, cur), 1.0);
}
`;

export const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uAspect;
uniform float uTime;
uniform float uExposure;
uniform float uBloom;
uniform float uCA;           // 色散
uniform float uGrain;
uniform float uVignette;
uniform float uHaze;
uniform float uFlash;        // 蓄力释放时的闪光
uniform vec3 uBgA;
uniform vec3 uBgB;
uniform vec3 uHazeA;
uniform vec3 uHazeB;

in vec2 vUv;
out vec4 o;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// 在某个 mip 层做 4 点旋转采样，抹掉低分辨率 mip 的方块感
vec3 glow(float lod) {
  vec2 px = exp2(lod) / uRes;
  vec3 c = textureLod(uTex, vUv + px * vec2(0.5, 0.2), lod).rgb;
  c += textureLod(uTex, vUv + px * vec2(-0.2, 0.5), lod).rgb;
  c += textureLod(uTex, vUv + px * vec2(-0.5, -0.2), lod).rgb;
  c += textureLod(uTex, vUv + px * vec2(0.2, -0.5), lod).rgb;
  return c * 0.25;
}

void main() {
  vec2 d = vUv - 0.5;
  float e = dot(d, d);

  vec3 c;
  c.r = textureLod(uTex, vUv - d * e * uCA, 0.0).r;
  c.g = textureLod(uTex, vUv, 0.0).g;
  c.b = textureLod(uTex, vUv + d * e * uCA, 0.0).b;

  if (uBloom > 0.0) {
    vec3 bloom = glow(2.0) * 0.34 + glow(4.0) * 0.33 + glow(6.0) * 0.33;
    c += bloom * uBloom;
  }

  c *= uExposure * (1.0 + uFlash * 0.8);
  c = 1.0 - exp(-c);                                  // 色调映射：高光柔和收拢

  vec2 q = d * vec2(uAspect, 1.0);
  float v = smoothstep(0.15, 1.05, length(q));
  vec3 bg = mix(uBgA, uBgB, v);
  float n1 = noise(q * 1.4 + vec2(uTime * 0.020, -uTime * 0.015));
  float n2 = noise(q * 2.3 - vec2(uTime * 0.017, uTime * 0.011) + 7.3);
  bg += uHazeA * smoothstep(0.35, 1.0, n1) * uHaze * (1.0 - v * 0.6);
  bg += uHazeB * smoothstep(0.45, 1.0, n2) * uHaze * 0.7;
  bg += uHazeA * uFlash * 0.6;

  c = bg + c * (1.0 - bg);
  c *= mix(1.0, 1.0 - uVignette, smoothstep(0.35, 1.25, length(q)));
  c += (hash(vUv * uRes + fract(uTime) * 61.0) - 0.5) * uGrain;

  o = vec4(c, 1.0);
}
`;
