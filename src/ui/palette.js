/**
 * palette.js — 指令面板（⌘K / Ctrl+K / 按 "/" 打开）。
 *
 * 像给智能体下指令一样浏览这个站：输入关键词，回车执行。
 * 条目全部由内容文件生成：章节、链接注册表里的每个入口、以及几个动作。
 * 在 site.js 里接入一个新链接，它会自动出现在这里。
 */

import { $, $$, el, esc, pad, copyText, isExternal } from '../core/dom.js';
import { env, saveMotion } from '../core/env.js';
import { toast } from './toast.js';

function buildItems(ctx) {
  const { site } = ctx;
  const items = [];

  items.push({ group: '章节', title: '回到顶部', hint: 'Top', keys: 'top home 首页 顶部', href: '#top' });
  site.chapters.forEach((c, i) => {
    items.push({ group: '章节', title: `${pad(i + 1)}  ${c.zh}`, hint: c.en, keys: `${c.zh} ${c.en} ${c.id}`, href: `#${c.id}` });
  });

  for (const [key, link] of Object.entries(site.links)) {
    items.push({
      group: '传送门',
      title: link.title,
      hint: link.url ? link.en || '' : '待接入',
      keys: `${link.title} ${link.en || ''} ${key} ${link.desc || ''}`,
      href: link.url || '',
      disabled: !link.url,
    });
    for (const child of link.children || []) {
      if (!child.url) continue;
      items.push({ group: '传送门', title: `${link.title} · ${child.title}`, hint: '', keys: `${child.title} ${link.title}`, href: child.url });
    }
  }

  items.push({
    group: '动作',
    title: '复制邮箱',
    hint: site.person.email,
    keys: 'email mail 邮箱 复制 联系 copy',
    run: async () => toast((await copyText(site.person.email)) ? '邮箱已复制' : `复制失败，请手动复制：${site.person.email}`),
  });
  items.push({
    group: '动作',
    title: '写邮件',
    hint: 'mailto',
    keys: 'email mail 邮件 联系 写信',
    href: `mailto:${site.person.email}`,
  });
  items.push({
    group: '动作',
    title: env.lite ? '切换到完整动效' : '切换到精简动效',
    hint: '刷新后生效',
    keys: 'motion 动效 动画 性能 精简 lite full',
    run: () => {
      saveMotion(env.lite ? 'full' : 'lite');
      window.location.reload();
    },
  });
  items.push({
    group: '动作',
    title: '打印 / 导出 PDF 简历',
    hint: 'Print',
    keys: 'print pdf 打印 导出 简历 resume',
    run: () => {
      try {
        window.print();
      } catch {
        toast('当前环境不支持打印');
      }
    },
  });
  return items;
}

export function initPalette(ctx) {
  const { scroll } = ctx;
  const items = buildItems(ctx);

  const node = el('div', { class: 'palette', id: 'palette', role: 'dialog', 'aria-modal': 'true', 'aria-label': '指令面板', hidden: true }, `
    <div class="palette__scrim" data-palette-close></div>
    <div class="palette__panel">
      <div class="palette__field">
        <span class="palette__prompt" aria-hidden="true">›</span>
        <input class="palette__input" id="palette-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"
               placeholder="输入指令或搜索：项目、B 站、邮箱……" aria-label="输入指令" aria-controls="palette-list">
        <kbd>ESC</kbd>
      </div>
      <ul class="palette__list" id="palette-list" role="listbox" data-native-scroll></ul>
      <p class="palette__foot"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 执行</span><span><kbd>/</kbd> 随时唤起</span></p>
    </div>`);
  document.body.appendChild(node);

  const input = $('#palette-input', node);
  const list = $('#palette-list', node);
  let visible = [];
  let active = 0;
  let open = false;
  let lastFocus = null;

  const render = () => {
    const query = input.value.trim().toLowerCase();
    visible = items.filter((item) => !query || `${item.title} ${item.hint} ${item.keys}`.toLowerCase().includes(query));
    active = Math.min(active, Math.max(0, visible.length - 1));
    if (visible[active]?.disabled) active = Math.max(0, visible.findIndex((item) => !item.disabled));

    let html = '';
    let group = '';
    visible.forEach((item, i) => {
      if (item.group !== group) {
        group = item.group;
        html += `<li class="palette__group" role="presentation">${esc(group)}</li>`;
      }
      const inner = `<span class="palette__title">${esc(item.title)}</span><span class="palette__hint">${esc(item.hint || '')}</span>`;
      const attrs = `class="palette__item${i === active ? ' is-active' : ''}${item.disabled ? ' is-disabled' : ''}" role="option" data-index="${i}" aria-selected="${i === active}"${item.disabled ? ' aria-disabled="true"' : ''}`;
      if (item.href && !item.disabled) {
        const external = isExternal(item.href) && !item.href.startsWith('mailto:');
        html += `<li><a ${attrs} href="${esc(item.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''} tabindex="-1">${inner}</a></li>`;
      } else {
        html += `<li><button type="button" ${attrs} tabindex="-1"${item.disabled ? ' disabled' : ''}>${inner}</button></li>`;
      }
    });
    list.innerHTML = html || '<li class="palette__empty">没有匹配的指令</li>';
    $('.is-active', list)?.scrollIntoView({ block: 'nearest' });
  };

  const setOpen = (next) => {
    if (next === open) return;
    open = next;
    if (open) {
      lastFocus = document.activeElement;
      node.hidden = false;
      input.value = '';
      active = 1;
      render();
      input.focus(); // 立刻聚焦：紧接着敲的字不能丢
      requestAnimationFrame(() => node.classList.add('is-open'));
      scroll.lock();
    } else {
      node.classList.remove('is-open');
      scroll.unlock();
      setTimeout(() => { if (!open) node.hidden = true; }, 320);
      if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
    }
  };

  const execute = (index) => {
    const item = visible[index];
    if (!item || item.disabled) return;
    setOpen(false);
    if (item.run) item.run();
  };

  const move = (step) => {
    if (!visible.length) return;
    let next = active;
    for (let i = 0; i < visible.length; i++) {
      next = (next + step + visible.length) % visible.length;
      if (!visible[next].disabled) break;
    }
    active = next;
    render();
  };

  input.addEventListener('input', () => { active = 0; render(); });

  node.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = visible[active];
      if (!item || item.disabled) return;
      // 链接类条目触发真实的 <a> 点击：新标签页、锚点滚动都交给浏览器 / nav.js
      const anchor = $(`a[data-index="${active}"]`, list);
      if (anchor) anchor.click();
      else execute(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab') {
      e.preventDefault(); // 焦点留在输入框
    }
  });

  list.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target.closest('[data-index]') : null;
    if (!target) return;
    const index = Number(target.dataset.index);
    if (target.tagName === 'A') setOpen(false);
    else execute(index);
  });
  list.addEventListener('pointermove', (e) => {
    const target = e.target instanceof Element ? e.target.closest('[data-index]') : null;
    if (!target) return;
    const index = Number(target.dataset.index);
    if (index === active || visible[index]?.disabled) return;
    active = index;
    $$('.palette__item', list).forEach((item) => {
      const on = Number(item.dataset.index) === active;
      item.classList.toggle('is-active', on);
      item.setAttribute('aria-selected', String(on));
    });
  });

  document.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target : null;
    if (!target) return;
    if (target.closest('[data-palette-open]')) setOpen(true);
    else if (target.closest('[data-palette-close]')) setOpen(false);
  });

  window.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setOpen(!open);
    } else if (e.key === '/' && !typing && !open) {
      e.preventDefault();
      setOpen(true);
    }
  });

  return { open: () => setOpen(true), close: () => setOpen(false) };
}
