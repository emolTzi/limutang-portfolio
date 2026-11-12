#!/usr/bin/env node
/**
 * standalone.mjs — 生成离线单文件版 standalone.html。
 *
 * 把样式、脚本、字体全部内联进一个 HTML：
 *   · 双击就能打开（不需要本地服务器，也不依赖网络）
 *   · 可以当成一个文件直接发给别人
 *
 * 线上部署用的仍然是 index.html + src/（零构建）；这个文件只是它的一份「打包快照」，
 * 所以改了内容或代码之后需要重新生成：
 *   npm run standalone
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { build } from 'esbuild';
import { ROOT } from './lib/render.mjs';

const OUT = path.join(ROOT, 'standalone.html');

const read = (file) => readFile(path.join(ROOT, file), 'utf8');
const dataUri = async (file, mime) => `data:${mime};base64,${(await readFile(path.join(ROOT, file))).toString('base64')}`;

async function main() {
  let html = await read('index.html');

  /* 1 ── 样式：按 index.html 里的顺序合并，字体转成 data URI */
  let css = '';
  for (const match of html.matchAll(/<link rel="stylesheet" href="\.\/([^"]+)"(?: media="([^"]+)")?>/g)) {
    const [, file, media] = match;
    let text = await read(file);
    for (const [found, asset] of text.matchAll(/url\("\.\.\/\.\.\/(assets\/fonts\/[^"]+)"\)/g)) {
      text = text.replace(found, `url("${await dataUri(asset, 'font/woff2')}")`);
    }
    css += media ? `@media ${media} {\n${text}\n}\n` : `${text}\n`;
  }

  /* 2 ── 脚本：把全部 ES 模块打成一个自执行脚本 */
  const result = await build({
    entryPoints: [path.join(ROOT, 'src/main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['es2020'],
    legalComments: 'none',
    charset: 'utf8',
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

  /* 3 ── 组装 */
  const favicon = await dataUri('assets/img/favicon.svg', 'image/svg+xml');
  html = html
    .replace(/[ \t]*<link rel="(?:stylesheet|modulepreload|preload)"[^>]*>\n?/g, '')
    .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${favicon}">`)
    .replace(/[ \t]*<meta property="og:image"[^>]*>\n?/, '')
    // 单文件版本来就是为 file:// 准备的：去掉「本地打开 → 静态版」的判断和那条提示
    .replace(/^.*standalone:strip.*\n/gm, '')
    .replace(/[ \t]*<p class="notice">[\s\S]*?<\/p>\n?/, '')
    .replace('</head>', () => `  <style>\n${css}</style>\n</head>`)
    .replace(/<script type="module"[^>]*><\/script>/, () => `<script>\n${js}</script>`);

  await writeFile(OUT, html);
  console.log(`已生成 standalone.html（${(Buffer.byteLength(html) / 1024).toFixed(0)} KB）`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
