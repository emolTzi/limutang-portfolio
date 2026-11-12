/**
 * pointer.js — 统一的指针状态（鼠标 / 触摸 / 手写笔）。
 *
 * 其他模块只读这个对象，不各自监听 mousemove：
 *   x, y        视口像素坐标
 *   nx, ny      归一化坐标 −1…1（y 向上为正）
 *   vx, vy      平滑后的速度（px/s）
 *   speed       速度大小
 *   down        是否按下
 *   inside      指针是否在窗口内
 *   seen        是否出现过真实的指针移动
 *   idle        静止了多少秒
 *   travel      本次访问累计移动的像素（页脚的「里程」用它）
 */

import { bus } from './bus.js';
import { damp } from './math.js';
import { ticker, ORDER } from './ticker.js';
import { env } from './env.js';

export const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  nx: 0,
  ny: 0,
  vx: 0,
  vy: 0,
  speed: 0,
  down: false,
  inside: false,
  seen: false,
  idle: 0,
  travel: 0,
  type: env.finePointer ? 'mouse' : 'touch',
  target: null,
};

let lastX = pointer.x;
let lastY = pointer.y;

function place(x, y) {
  if (!pointer.seen) {
    lastX = x;
    lastY = y;
  }
  pointer.x = x;
  pointer.y = y;
  pointer.inside = true;
  pointer.seen = true;
  pointer.idle = 0;
}

export function initPointer() {
  const opts = { passive: true };

  window.addEventListener('pointermove', (e) => {
    // 截图工具、链接预览等无头浏览器会在正左上角 (0,0) 合成一次鼠标事件：
    // 在出现真实移动之前忽略它，免得光标效果「粘」在角落里
    if (!pointer.seen && e.clientX === 0 && e.clientY === 0) return;
    pointer.type = e.pointerType || 'mouse';
    pointer.target = e.target;
    place(e.clientX, e.clientY);
  }, opts);

  window.addEventListener('pointerdown', (e) => {
    pointer.type = e.pointerType || 'mouse';
    pointer.target = e.target;
    place(e.clientX, e.clientY);
    if (e.button === 0 || e.pointerType !== 'mouse') {
      pointer.down = true;
      bus.emit('pointer:down', e);
    }
  }, opts);

  const release = (e) => {
    if (!pointer.down) return;
    pointer.down = false;
    bus.emit('pointer:up', e);
  };
  window.addEventListener('pointerup', release, opts);
  window.addEventListener('pointercancel', release, opts);
  window.addEventListener('blur', release);

  // 触摸滚动开始后浏览器会取消 pointer 事件，这里用 touch 事件补上，
  // 这样手指划过屏幕时粒子依然有反应
  window.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (t) { pointer.type = 'touch'; place(t.clientX, t.clientY); }
  }, opts);
  window.addEventListener('touchmove', (e) => {
    const t = e.touches[0];
    if (t) place(t.clientX, t.clientY);
  }, opts);
  window.addEventListener('touchend', () => { pointer.inside = false; }, opts);

  document.documentElement.addEventListener('mouseleave', () => { pointer.inside = false; });
  document.documentElement.addEventListener('mouseenter', () => { if (pointer.seen) pointer.inside = true; });

  ticker.add((time, dt) => {
    const dx = pointer.x - lastX;
    const dy = pointer.y - lastY;
    lastX = pointer.x;
    lastY = pointer.y;
    pointer.vx = damp(pointer.vx, dx / dt, 16, dt);
    pointer.vy = damp(pointer.vy, dy / dt, 16, dt);
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    pointer.travel += Math.hypot(dx, dy);
    pointer.idle += dt;
    pointer.nx = (pointer.x / window.innerWidth) * 2 - 1;
    pointer.ny = 1 - (pointer.y / window.innerHeight) * 2;
  }, ORDER.INPUT);
}
