/**
 * orgchart.js — 多智能体团队的汇报结构图（SVG，按容器宽度实时排版）。
 *
 * 数据来自 getTeam()：与粒子网络编队、光标智能体群是同一份结构。
 * 宽屏画成自上而下的树；窄屏改成沿左侧主干展开的纵向布局，保证文字始终可读。
 * 悬停某一条线时，背景里对应的那簇粒子会一起亮起（stage.focusGroup）。
 */

import { $, $$, esc, debounce } from '../../core/dom.js';
import { getTeam } from '../../content/site.js';
import { env } from '../../core/env.js';

const curve = (x1, y1, x2, y2) => {
  const my = (y1 + y2) / 2;
  return `M${x1.toFixed(1)},${y1.toFixed(1)} C${x1.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${my.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
};

/** 沿路径流动的小光点：reverse = 自下而上（汇报），否则自上而下（指令）。 */
const pulse = (id, { reverse, delay, tone, dur = 2.6 }) => {
  if (env.lite) return '';
  const points = reverse ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : '';
  return `<circle class="org__pulse org__pulse--${tone}" r="2.4"><animateMotion dur="${dur}s" begin="${delay.toFixed(2)}s" repeatCount="indefinite" ${points}><mpath href="#${id}"/></animateMotion></circle>`;
};

function executorNode(x, y, role) {
  return `
    <g class="org__exec${role ? '' : ' is-anon'}">
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${role ? 5 : 3.5}"/>
      ${role ? `<text class="org__role" x="${x.toFixed(1)}" y="${(y + 24).toFixed(1)}" text-anchor="middle">${esc(role)}</text>` : ''}
    </g>`;
}

function wide(team, W, uid) {
  const H = 440;
  const padX = 24;
  const gap = 40;
  const hx = W / 2;
  const hy = 46;
  const weights = team.lines.map((l) => Math.max(l.executors, 3));
  const sum = weights.reduce((a, b) => a + b, 0);
  const usable = W - padX * 2 - gap * (team.lines.length - 1);
  let x = padX;
  let body = '';

  team.lines.forEach((line, li) => {
    const colW = (usable * weights[li]) / sum;
    const cx = x + colW / 2;
    const cy = 176;
    const m = line.nodes.length;
    const stagger = m > 3;
    const trunk = `${uid}-t${li}`;
    let inner = `<path class="org__edge org__edge--trunk" id="${trunk}" d="${curve(hx, hy + 22, cx, cy - 16)}"/>`;
    inner += pulse(trunk, { delay: li * 0.7, tone: 'amber', dur: 3.2 });

    line.nodes.forEach((node, j) => {
      const exX = m === 1 ? cx : x + (colW * (j + 0.5)) / m;
      const exY = 318 + (stagger ? (j % 2) * 56 : 0);
      const id = `${uid}-e${li}-${j}`;
      inner += `<path class="org__edge" id="${id}" d="${curve(cx, cy + 14, exX, exY - 9)}"/>`;
      if (j % 2 === 0 || m <= 4) inner += pulse(id, { reverse: true, delay: ((li * 3 + j) % 7) * 0.45, tone: 'jade' });
      inner += executorNode(exX, exY, node.role);
    });

    inner += `
      <g class="org__coord">
        <circle class="org__halo" cx="${cx.toFixed(1)}" cy="${cy}" r="22"/>
        <circle cx="${cx.toFixed(1)}" cy="${cy}" r="11"/>
        <text class="org__name" x="${(cx + 24).toFixed(1)}" y="${cy - 3}">${esc(line.name)}</text>
        <text class="org__tag" x="${(cx + 24).toFixed(1)}" y="${cy + 14}">协调 bot · 执行 ${line.executors}</text>
      </g>`;
    body += `<g class="org__line" data-line="${li}" tabindex="0" role="group" aria-label="${esc(line.name)}：1 个协调 bot，${line.executors} 个执行 bot">${inner}</g>`;
    x += colW + gap;
  });

  body += `
    <g class="org__human" data-line="-1">
      <circle class="org__halo" cx="${hx}" cy="${hy}" r="30"/>
      <circle cx="${hx}" cy="${hy}" r="20"/>
      <text class="org__me" x="${hx}" y="${hy + 6}" text-anchor="middle">${esc(team.human.label)}</text>
      <text class="org__tag" x="${hx + 34}" y="${hy + 4}">${esc(team.human.sub)}</text>
    </g>`;
  return `<svg class="org" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="多智能体团队汇报结构示意图">${body}</svg>`;
}

function narrow(team, W, uid) {
  const sx = 26;
  const startX = sx + 40;
  const cols = Math.max(2, Math.floor((W - startX - 8) / 78));
  const cellW = (W - startX - 8) / cols;
  let y = 36;
  const hy = y;
  let body = '';
  let lastCoordY = y;
  y += 82;

  team.lines.forEach((line, li) => {
    const cy = y;
    lastCoordY = cy;
    let inner = '';
    let bottom = cy;
    line.nodes.forEach((node, j) => {
      const col = j % cols;
      const row = Math.floor(j / cols);
      const exX = startX + cellW * (col + 0.5);
      const exY = cy + 54 + row * 56;
      bottom = exY;
      const id = `${uid}-e${li}-${j}`;
      inner += `<path class="org__edge" id="${id}" d="M${sx},${cy + 12} C${sx},${exY} ${(exX - 34).toFixed(1)},${exY} ${(exX - 8).toFixed(1)},${exY}"/>`;
      if (j % 2 === 0) inner += pulse(id, { reverse: true, delay: ((li * 3 + j) % 7) * 0.45, tone: 'jade' });
      inner += executorNode(exX, exY, node.role);
    });
    inner += `
      <g class="org__coord">
        <circle class="org__halo" cx="${sx}" cy="${cy}" r="18"/>
        <circle cx="${sx}" cy="${cy}" r="9"/>
        <text class="org__name" x="${sx + 22}" y="${cy - 2}">${esc(line.name)}</text>
        <text class="org__tag" x="${sx + 22}" y="${cy + 14}">协调 bot · 执行 ${line.executors}</text>
      </g>`;
    body += `<g class="org__line" data-line="${li}" tabindex="0" role="group" aria-label="${esc(line.name)}：1 个协调 bot，${line.executors} 个执行 bot">${inner}</g>`;
    y = bottom + 92;
  });

  const spine = `${uid}-spine`;
  const head = `
    <path class="org__edge org__edge--trunk" id="${spine}" d="M${sx},${hy + 18} V${lastCoordY - 12}"/>
    ${pulse(spine, { delay: 0, tone: 'amber', dur: 4 })}
    <g class="org__human" data-line="-1">
      <circle class="org__halo" cx="${sx}" cy="${hy}" r="24"/>
      <circle cx="${sx}" cy="${hy}" r="16"/>
      <text class="org__me" x="${sx}" y="${hy + 5}" text-anchor="middle">${esc(team.human.label)}</text>
      <text class="org__tag" x="${sx + 30}" y="${hy + 4}">${esc(team.human.sub)}</text>
    </g>`;
  const H = y - 48;
  return `<svg class="org org--narrow" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="多智能体团队汇报结构示意图">${head}${body}</svg>`;
}

let serial = 0;

export function mountOrgchart(root, ctx) {
  const host = $('[data-orgchart-canvas]', root);
  if (!host) return;
  const team = getTeam();
  const uid = `org${serial++}`;
  let lastWidth = 0;

  const draw = () => {
    const width = Math.floor(host.clientWidth);
    if (!width || width === lastWidth) return;
    lastWidth = width;
    host.innerHTML = width >= 720 ? wide(team, width, uid) : narrow(team, width, uid);
    for (const group of $$('[data-line]', host)) {
      const index = Number(group.dataset.line);
      const enter = () => {
        host.classList.add('is-focusing');
        group.classList.add('is-focus');
        ctx.stage.focusGroup(index + 1);
      };
      const leave = () => {
        host.classList.remove('is-focusing');
        group.classList.remove('is-focus');
        ctx.stage.focusGroup(-1);
      };
      group.addEventListener('pointerenter', enter);
      group.addEventListener('pointerleave', leave);
      group.addEventListener('focus', enter);
      group.addEventListener('blur', leave);
    }
  };

  draw();
  if ('ResizeObserver' in window) new ResizeObserver(debounce(draw, 160)).observe(host);
  else window.addEventListener('resize', debounce(draw, 160));
}
