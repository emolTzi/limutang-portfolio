#!/usr/bin/env node
/**
 * prerender.mjs — 把当前内容预渲染进 index.html。
 *
 * 线上页面每次打开都会用脚本从 site.js 重新生成全部内容，所以「不运行这个脚本」
 * 也不影响正常访问。它的作用是给三种情况准备一份静态内容：
 *   · 搜索引擎 / 分享卡片抓取（很多爬虫不执行脚本）
 *   · 脚本被禁用或加载失败
 *   · 直接双击打开本地 index.html（浏览器不允许 file:// 加载模块）
 *
 * 改完 site.js 之后运行一次即可：
 *   npm run prerender
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, renderSite } from './lib/render.mjs';

const FILE = path.join(ROOT, 'index.html');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** 替换 <!-- prerender:name --> … <!-- /prerender:name --> 之间的内容。 */
function inject(html, name, content) {
  const pattern = new RegExp(`(<!-- prerender:${name} -->)[\\s\\S]*?(<!-- /prerender:${name} -->)`);
  if (!pattern.test(html)) throw new Error(`index.html 里找不到 prerender:${name} 标记`);
  return html.replace(pattern, (_, open, close) => `${open}\n${content.trim()}\n${close}`);
}

/** 结构化数据：让搜索引擎知道这是谁的主页。 */
function personSchema(site) {
  const p = site.person;
  const sameAs = Object.values(site.links)
    .map((link) => link.url)
    .filter((url) => /^https?:\/\//.test(url));
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: p.name,
      alternateName: p.latin,
      jobTitle: p.intent,
      description: site.meta.description,
      email: `mailto:${p.email}`,
      affiliation: { '@type': 'CollegeOrUniversity', name: p.school },
      knowsAbout: p.focus,
      ...(sameAs.length ? { sameAs } : {}),
    },
    null,
    2,
  );
}

async function main() {
  const { site, chrome, app } = await renderSite();
  let html = await readFile(FILE, 'utf8');

  html = inject(html, 'chrome', chrome);
  html = inject(html, 'app', app);
  html = inject(html, 'schema', `<script type="application/ld+json">\n${personSchema(site)}\n</script>`);

  // 标题与描述跟随内容文件
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(site.meta.title)}</title>`);
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(site.meta.description)}$2`);
  html = html.replace(/(<meta name="author" content=")[^"]*(")/, `$1${esc(site.person.name)}$2`);
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(site.meta.title)}$2`);
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(site.hero.tagline)}$2`);

  await writeFile(FILE, html);
  console.log(`已把内容预渲染进 index.html（${(Buffer.byteLength(html) / 1024).toFixed(0)} KB）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
