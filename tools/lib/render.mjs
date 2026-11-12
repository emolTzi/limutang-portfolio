/**
 * render.mjs — 在 Node 里把整站渲染成 HTML 字符串。
 *
 * 区块模板本来就是「数据 → 字符串」的纯函数，这里只需要给少数几个在模块顶层
 * 读取浏览器对象的文件垫上最小的替身，就能直接复用线上那套模板。
 */

import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function stubBrowser() {
  const g = globalThis;
  if (g.window) return;
  const noop = () => {};
  const classList = { add: noop, remove: noop, toggle: noop, contains: () => false };
  g.window = {
    location: { search: '', hash: '', protocol: 'http:' },
    matchMedia: () => ({ matches: false, addEventListener: noop }),
    screen: { width: 1920, height: 1080 },
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    scrollY: 0,
    addEventListener: noop,
    localStorage: { getItem: () => null, setItem: noop },
  };
  g.document = {
    documentElement: { classList, style: { setProperty: noop } },
    createElement: () => ({ getContext: () => null, style: {}, classList }),
    addEventListener: noop,
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  if (!g.navigator) g.navigator = { userAgent: 'node', platform: 'node', hardwareConcurrency: 4 };
}

const load = (file) => import(pathToFileURL(path.join(ROOT, file)).href);

/** 返回 { site, chrome, app }：导航外壳与全部章节的 HTML。 */
export async function renderSite() {
  stubBrowser();
  const { site } = await load('src/content/site.js');
  const { renderSections } = await load('src/sections/index.js');
  const { renderChrome } = await load('src/ui/nav.js');
  return { site, chrome: renderChrome(site), app: renderSections(site) };
}

/** 去掉标签，只留文字。 */
export const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ');
