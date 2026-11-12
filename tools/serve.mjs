#!/usr/bin/env node
/**
 * serve.mjs — 零依赖的本地预览服务器。
 *
 *   node tools/serve.mjs            → http://localhost:8080
 *   node tools/serve.mjs 3000       → 指定端口
 *
 * 为什么需要它：页面用的是原生 ES 模块，浏览器不允许从 file:// 加载，
 * 所以本地预览要走 http。（部署到 GitHub Pages 后不需要任何服务器端程序。）
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const info = await stat(file).catch(() => null);
    if (info && info.isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    const fallback = await readFile(path.join(ROOT, '404.html')).catch(() => 'Not Found');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fallback);
  }
});

server.listen(PORT, () => {
  console.log(`本地预览已启动： http://localhost:${PORT}`);
  console.log('按 Ctrl + C 停止');
});
