/**
 * nav.js — 页面外壳：顶部导航、右侧章节轨、全屏菜单、锚点跳转、当前章节追踪。
 *
 * 导航项完全由 site.chapters 生成；增删章节不需要改这里。
 * 章节变化时通过 bus 广播 'chapter' 事件，别的模块可以订阅。
 */

import { $, $$, esc, pad } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ticker } from '../core/ticker.js';

const isMac = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || '');

export function renderChrome(site) {
  const { chapters, person } = site;
  const links = chapters
    .map((c, i) => `<a href="#${esc(c.id)}" data-nav="${i}"><span class="nav__num">${pad(i + 1)}</span><span class="nav__label">${esc(c.zh)}</span></a>`)
    .join('');
  const rail = chapters
    .map((c, i) => `<li><a href="#${esc(c.id)}" data-rail="${i}" aria-label="${pad(i + 1)} ${esc(c.zh)}"><span class="rail__label">${esc(c.zh)}</span><i class="rail__orb"></i></a></li>`)
    .join('');
  const menu = chapters
    .map((c, i) => `<li style="--i:${i}"><a href="#${esc(c.id)}"><span class="menu__num">${pad(i + 1)}</span><span class="menu__zh">${esc(c.zh)}</span><span class="menu__en">${esc(c.en)}</span></a></li>`)
    .join('');

  return `
    <header class="nav" id="nav">
      <a class="nav__brand" href="#top" aria-label="${esc(person.name)}，回到顶部">
        <span class="nav__orb" aria-hidden="true"></span>
        <span class="nav__name">${esc(person.name)}</span>
        <span class="nav__role">${esc(person.intentEn)}</span>
      </a>
      <nav class="nav__links" aria-label="章节导航">${links}</nav>
      <div class="nav__tools">
        <button type="button" class="nav__cmd" data-palette-open aria-haspopup="dialog">
          <span>指令</span><kbd>${isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>
        <button type="button" class="nav__burger" data-menu-toggle aria-expanded="false" aria-controls="menu" aria-label="打开菜单">
          <i></i><i></i>
        </button>
      </div>
    </header>

    <nav class="rail" aria-label="章节进度">
      <ol>${rail}</ol>
    </nav>

    <div class="menu" id="menu" hidden>
      <ol class="menu__list">${menu}</ol>
      <p class="menu__foot">${esc(person.intent)} · ${esc(person.school)}</p>
    </div>`;
}

export function initNav(ctx) {
  const { site, scroll } = ctx;
  const root = document.documentElement;
  const nav = $('#nav');
  const menu = $('#menu');
  const burger = $('[data-menu-toggle]');
  const navLinks = $$('[data-nav]');
  const railLinks = $$('[data-rail]');
  const sections = site.chapters.map((c) => document.getElementById(c.id));

  /* ── 全屏菜单 ─────────────────────────────────────────────────────────── */
  let menuOpen = false;
  const setMenu = (open) => {
    if (open === menuOpen || !menu) return;
    menuOpen = open;
    if (open) {
      menu.hidden = false;
      // 下一帧再加类，过渡才会生效
      requestAnimationFrame(() => root.classList.add('menu-open'));
      scroll.lock();
    } else {
      root.classList.remove('menu-open');
      scroll.unlock();
      setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 500);
    }
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  };
  burger?.addEventListener('click', () => setMenu(!menuOpen));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 1100) setMenu(false); });

  /* ── 锚点：平滑滚动到目标 ─────────────────────────────────────────────── */
  const go = (hash, immediate = false) => {
    const id = decodeURIComponent(hash.replace(/^#/, ''));
    const target = id ? document.getElementById(id) : null;
    if (!target) return false;
    setMenu(false);
    scroll.to(target, { immediate });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const link = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const hash = link.getAttribute('href');
    if (hash.length < 2) return;
    if (go(hash)) {
      e.preventDefault();
      try {
        window.history.replaceState(null, '', hash);
      } catch {
        /* 某些内嵌环境不允许改地址栏，忽略 */
      }
    }
  });

  /* ── 当前章节 ─────────────────────────────────────────────────────────── */
  let tops = [];
  const measure = () => {
    const offset = window.scrollY;
    tops = sections.map((s) => (s ? s.getBoundingClientRect().top + offset : Infinity));
  };
  measure();
  bus.on('layout', measure);
  window.addEventListener('resize', measure);

  let current = -2;
  let hidden = false;
  let lastY = window.scrollY;

  ticker.add(() => {
    const y = window.scrollY;
    const line = y + window.innerHeight * 0.45;
    let index = -1;
    for (let i = 0; i < tops.length; i++) if (tops[i] <= line) index = i;

    if (index !== current) {
      current = index;
      navLinks.forEach((a, i) => {
        a.classList.toggle('is-current', i === index);
        if (i === index) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      railLinks.forEach((a, i) => {
        a.classList.toggle('is-current', i === index);
        a.classList.toggle('is-passed', i < index);
      });
      root.dataset.chapter = index < 0 ? 'top' : site.chapters[index].id;
      bus.emit('chapter', { index, id: index < 0 ? 'top' : site.chapters[index].id });
    }

    // 向下滚时收起导航，向上滚时放出来
    const delta = y - lastY;
    if (Math.abs(delta) > 2) {
      const next = delta > 0 && y > 320 && !menuOpen;
      if (next !== hidden) {
        hidden = next;
        nav?.classList.toggle('is-hidden', hidden);
      }
      lastY = y;
    }
    nav?.classList.toggle('is-scrolled', y > 40);
  });

  return {
    go,
    /** 页面载入时如果地址带 #锚点，直接跳过去。 */
    restore() {
      if (window.location.hash.length > 1) go(window.location.hash, true);
    },
  };
}
