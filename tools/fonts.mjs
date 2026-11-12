#!/usr/bin/env node
/**
 * fonts.mjs — 字体子集化。
 *
 * 中文展示字体（思源宋体 Noto Serif SC）完整文件每个字重 1.4 MB 以上。
 * 这个脚本把整站实际渲染出来的文字收集起来，只保留用到的字，
 * 每个字重压到一百 KB 上下，并生成 src/styles/fonts.css。
 *
 * 什么时候需要重新运行：改了 site.js 里的文字、出现了以前没用过的汉字之后。
 * 不运行也不会坏：缺的字会自动回退到系统宋体，只是那几个字的字形会略有不同。
 *
 *   npm install      （只需一次，装的是下面用到的字体源文件与子集化工具）
 *   npm run fonts
 */

import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import path from 'node:path';
import subsetFont from 'subset-font';
import { ROOT, renderSite, textOf } from './lib/render.mjs';

const OUT_DIR = path.join(ROOT, 'assets/fonts');
const CSS_FILE = path.join(ROOT, 'src/styles/fonts.css');
const SERIF_WEIGHTS = [600, 900];

const pkg = (name, file) => path.join(ROOT, 'node_modules', name, 'files', file);

/** 拉丁字符的 unicode-range（与 Google Fonts 的 latin 子集一致）。 */
const LATIN_RANGE =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

/** 直接拷贝的拉丁字体：[来源包, 文件, 输出名, font-family, 字重, 字形] */
const LATIN_FONTS = [
  ['@fontsource/instrument-serif', 'instrument-serif-latin-400-normal.woff2', 'instrument-serif-400.woff2', 'Instrument Serif', '400', 'normal'],
  ['@fontsource/instrument-serif', 'instrument-serif-latin-400-italic.woff2', 'instrument-serif-400-italic.woff2', 'Instrument Serif', '400', 'italic'],
  ['@fontsource-variable/instrument-sans', 'instrument-sans-latin-wght-normal.woff2', 'instrument-sans-var.woff2', 'Instrument Sans', '400 700', 'normal'],
  ['@fontsource/dm-mono', 'dm-mono-latin-400-normal.woff2', 'dm-mono-400.woff2', 'DM Mono', '400', 'normal'],
  ['@fontsource/dm-mono', 'dm-mono-latin-500-normal.woff2', 'dm-mono-500.woff2', 'DM Mono', '500', 'normal'],
];

/** 把码点列表压成 unicode-range 写法。 */
function toRanges(codes) {
  const sorted = [...codes].sort((a, b) => a - b);
  const parts = [];
  let start = sorted[0];
  let prev = sorted[0];
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0');
  const flush = () => parts.push(start === prev ? `U+${hex(start)}` : `U+${hex(start)}-${hex(prev)}`);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
      continue;
    }
    flush();
    start = prev = sorted[i];
  }
  flush();
  return parts.join(', ');
}

const kb = async (file) => `${((await stat(file)).size / 1024).toFixed(1)} KB`;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // 1. 收集全站文字：渲染出的页面 + index.html 里的静态文字（404 页用系统字体，不计入）
  const { chrome, app } = await renderSite();
  let text = textOf(chrome) + textOf(app);
  for (const file of ['index.html']) {
    try {
      text += textOf(await readFile(path.join(ROOT, file), 'utf8'));
    } catch {
      /* 文件不存在就跳过 */
    }
  }

  // 2. 只保留中日韩文字与全角标点（拉丁字母、数字由下面的 latin 文件负责）
  const codes = new Set();
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (code >= 0x2e80 && code !== 0xfeff && code !== 0xfffd) codes.add(code);
  }
  const cjk = String.fromCodePoint(...codes);
  const cjkRange = toRanges(codes);
  console.log(`收集到 ${codes.size} 个中文字符 / 全角标点`);

  let css = `/**\n * fonts.css — 由 tools/fonts.mjs 自动生成，请勿手改（运行 npm run fonts 重新生成）。\n * 字体均为 SIL Open Font License 1.1，许可文本见 assets/fonts/LICENSE.md。\n */\n`;

  // 3. 思源宋体：拉丁部分直接拷贝，中文部分按用字子集化
  for (const weight of SERIF_WEIGHTS) {
    const latinOut = `noto-serif-sc-${weight}-latin.woff2`;
    await copyFile(pkg('@fontsource/noto-serif-sc', `noto-serif-sc-latin-${weight}-normal.woff2`), path.join(OUT_DIR, latinOut));

    const source = await readFile(pkg('@fontsource/noto-serif-sc', `noto-serif-sc-chinese-simplified-${weight}-normal.woff2`));
    const subset = await subsetFont(source, cjk, { targetFormat: 'woff2' });
    const cjkOut = `noto-serif-sc-${weight}.woff2`;
    await writeFile(path.join(OUT_DIR, cjkOut), subset);
    console.log(`思源宋体 ${weight}：${await kb(path.join(OUT_DIR, cjkOut))}`);

    css += `
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url("../../assets/fonts/${latinOut}") format("woff2");
  unicode-range: ${LATIN_RANGE};
}

@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url("../../assets/fonts/${cjkOut}") format("woff2");
  unicode-range: ${cjkRange};
}
`;
  }

  // 4. 拉丁字体
  for (const [name, file, out, family, weight, style] of LATIN_FONTS) {
    await copyFile(pkg(name, file), path.join(OUT_DIR, out));
    css += `
@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("../../assets/fonts/${out}") format("woff2");
  unicode-range: ${LATIN_RANGE};
}
`;
  }

  await writeFile(CSS_FILE, css);
  console.log(`已生成 ${path.relative(ROOT, CSS_FILE)}`);

  // 5. 许可文本随字体一起分发（OFL 的要求）
  const licenseDir = path.join(OUT_DIR, 'licenses');
  await mkdir(licenseDir, { recursive: true });
  const packages = new Set(['@fontsource/noto-serif-sc', ...LATIN_FONTS.map((font) => font[0])]);
  for (const name of packages) {
    const out = `${name.replace(/^@/, '').replace(/\//g, '-')}.txt`;
    await copyFile(path.join(ROOT, 'node_modules', name, 'LICENSE'), path.join(licenseDir, out));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
