/**
 * nav.js — 顶部导航与窄屏菜单。导航项由 site.chapters 生成。
 */

import { $, $$, esc, pad } from '../core/dom.js';

export function renderChrome(site) {
  const { chapters, person } = site;
  const items = chapters
    .map((c, i) => `<a href="#${esc(c.id)}" data-nav="${i}">${esc(c.zh)}</a>`)
    .join('');
  const panel = chapters
    .map((c, i) => `<a href="#${esc(c.id)}" data-panel="${i}"><span class="mono">${pad(i + 1)}</span> ${esc(c.zh)}</a>`)
    .join('');

  return `
    <header class="site-header" id="nav">
      <a class="brand" href="#top" aria-label="${esc(person.name)}，回到顶部">
        <span class="brand__name">${esc(person.name)}</span>
        <span class="brand__role">${esc(person.intent)}</span>
      </a>
      <nav class="nav-links" aria-label="章节导航">${items}</nav>
      <button type="button" class="nav-toggle" data-menu-toggle aria-expanded="false" aria-controls="nav-panel">菜单</button>
    </header>
    <div class="nav-panel" id="nav-panel" hidden>${panel}</div>`;
}

export function initNav(site) {
  const header = $('#nav');
  const panel = $('#nav-panel');
  const toggle = $('[data-menu-toggle]');
  const links = [...$$('[data-nav]'), ...$$('[data-panel]')];
  const sections = site.chapters.map((c) => document.getElementById(c.id)).filter(Boolean);

  const setMenu = (open) => {
    if (!panel || !toggle) return;
    panel.hidden = !open;
    panel.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? '关闭' : '菜单';
  };

  toggle?.addEventListener('click', () => setMenu(panel?.hidden !== false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 860) setMenu(false); });

  const go = (hash) => {
    const id = decodeURIComponent((hash || '').replace(/^#/, ''));
    const target = id ? document.getElementById(id) : null;
    if (!target) return false;
    setMenu(false);
    target.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  };

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const link = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    const hash = link.getAttribute('href');
    if (!hash || hash.length < 2) return;
    if (go(hash)) {
      e.preventDefault();
      try { history.replaceState(null, '', hash); } catch { /* ignore */ }
    }
  });

  const setCurrent = (index) => {
    links.forEach((a) => {
      const i = Number(a.dataset.nav ?? a.dataset.panel);
      const on = i === index;
      a.classList.toggle('is-current', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visible.set(entry.target.id, entry.isIntersecting && entry.intersectionRatio > 0 ? entry.boundingClientRect.top : Infinity);
      }
      const ordered = site.chapters
        .map((c, i) => ({ i, top: visible.get(c.id) ?? Infinity }))
        .filter((x) => x.top !== Infinity)
        .sort((a, b) => a.top - b.top);
      if (ordered.length) setCurrent(ordered[0].i);
    }, { rootMargin: '-20% 0px -60% 0px', threshold: [0, 0.25, 0.5] });
    sections.forEach((s) => io.observe(s));
  }

  const onScroll = () => header?.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return {
    go,
    restore() {
      if (location.hash.length > 1) go(location.hash);
    },
  };
}
