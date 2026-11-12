/**
 * bus.js — 极简事件总线，模块之间解耦通信。
 *
 * 全站事件一览（新增事件请补在这里）：
 *   'chapter'        { index, id }     当前章节变化（index = -1 表示在首屏）
 *   'cue'            { name, entry }   粒子编队切换
 *   'pointer:down'   PointerEvent
 *   'pointer:up'     PointerEvent
 *   'burst'          { power }         蓄力释放
 *   'motion'         'full' | 'lite'   动效档位切换
 *   'layout'         —                 页面高度 / 尺寸变化后
 */

const listeners = new Map();

export const bus = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type)?.delete(fn);
  },
  emit(type, payload) {
    const set = listeners.get(type);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[bus] "${type}" 的监听器出错`, err);
      }
    }
  },
};
