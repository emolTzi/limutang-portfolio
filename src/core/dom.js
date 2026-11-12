/**
 * dom.js — DOM 小工具与模板辅助。
 * 所有区块模板都是「数据 → HTML 字符串」的纯函数，这里提供转义与常用片段。
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** HTML 转义：任何来自内容文件的字符串进模板前都要过这一步。 */
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** 转义 + 把 **片段** 变成高亮。 */
export const rich = (value) => esc(value).replace(/\*\*(.+?)\*\*/g, '<strong class="hl">$1</strong>');

/** 两位编号：1 → "01"。 */
export const pad = (n) => String(n).padStart(2, '0');

/** 条件 class 拼接。 */
export const cx = (...parts) => parts.filter(Boolean).join(' ');

/** 创建元素。 */
export function el(tag, attrs = {}, html = '') {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    node.setAttribute(key, value === true ? '' : value);
  }
  if (html) node.innerHTML = html;
  return node;
}

/** 监听并返回取消函数。 */
export function on(target, type, fn, options) {
  target.addEventListener(type, fn, options);
  return () => target.removeEventListener(type, fn, options);
}

/** 防抖。 */
export function debounce(fn, wait = 150) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** 是否为站外链接。 */
export const isExternal = (url) => /^(https?:)?\/\//i.test(url) || /^mailto:/i.test(url);

/** 写剪贴板（失败时返回 false，由调用方给出提示）。 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = el('textarea', { readonly: true, style: 'position:fixed;opacity:0;pointer-events:none' });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
