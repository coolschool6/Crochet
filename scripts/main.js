'use strict';

(function () {
  const state = {
    items: [],
    filtered: [],
    tags: new Set(),
    activeTag: 'All',
    // lightbox
    lbOpen: false,
    lbIndex: 0,
    // lookbook
    lookbookPlaying: true,
    lookbookTimer: null,
    autoAdvanceMs: 4000,
  };

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));
  const byId = id => document.getElementById(id);

  const isLookbook = !!byId('lookbook');

  // Entry
  window.addEventListener('DOMContentLoaded', async () => {
    const yearEl = byId('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    try {
      const res = await fetch('data/images.json');
      const data = await res.json();
      state.items = Array.isArray(data) ? data : (data.items || []);
      collectTags();
      if (isLookbook) {
        initLookbook();
      } else {
        initFilters();
        applyFilter('All');
        renderGallery();
        initLightbox();
        initScrollUi();
      }
    } catch (e) {
      console.error('Failed to load images.json', e);
      renderError('Could not load images. Ensure you are serving the site over HTTP (not file://) and that data/images.json exists.');
    }
  });

  function collectTags() {
    state.tags = new Set(['All']);
    state.items.forEach(it => {
      (it.tags || []).forEach(t => state.tags.add(t));
    });
  }

  // Filters
  function initFilters() {
    const wrap = byId('filterChips');
    wrap.innerHTML = '';
    state.tags.forEach(tag => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(tag === state.activeTag));
      btn.textContent = tag;
      btn.addEventListener('click', () => applyFilter(tag));
      wrap.appendChild(btn);
    });
  }

  function applyFilter(tag) {
    state.activeTag = tag;
    const chips = $$('.chip');
    chips.forEach(c => c.setAttribute('aria-selected', String(c.textContent === tag)));

    state.filtered = tag === 'All'
      ? state.items
      : state.items.filter(it => (it.tags || []).includes(tag));
    renderGallery();
  }

  // Gallery
  function renderGallery() {
    const grid = byId('gallery');
    if (!grid) return;

    grid.innerHTML = '';

    const frag = document.createDocumentFragment();
    state.filtered.forEach((it, idx) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('data-idx', String(idx));
      card.setAttribute('tabindex', '0');

      const link = document.createElement('a');
      link.href = '#';
      link.className = 'card-link';
      link.addEventListener('click', (e) => { e.preventDefault(); openLightbox(idx); });
      link.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); openLightbox(idx); } });

      const img = document.createElement('img');
      img.className = 'card-picture';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = it.src;
      img.alt = it.alt || '';

      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton';

      const caption = document.createElement('div');
      caption.className = 'card-caption';
      caption.textContent = it.title || '';

      link.appendChild(img);
      card.appendChild(link);
      card.appendChild(skeleton);
      card.appendChild(caption);
      frag.appendChild(card);

      img.addEventListener('load', () => skeleton.remove());
      img.addEventListener('error', () => skeleton.remove());
    });

    grid.appendChild(frag);
  }

  // Lightbox
  function initLightbox() {
    const box = byId('lightbox');
    if (!box) return;
    byId('lightboxClose').addEventListener('click', closeLightbox);
    byId('lightboxPrev').addEventListener('click', () => stepLightbox(-1));
    byId('lightboxNext').addEventListener('click', () => stepLightbox(1));

    box.addEventListener('click', (e) => {
      if (e.target === box) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (!state.lbOpen) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') stepLightbox(-1);
      else if (e.key === 'ArrowRight') stepLightbox(1);
    });

    // touch swipe
    let startX = 0;
    box.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive:true});
    box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) stepLightbox(dx > 0 ? -1 : 1);
    });
  }

  function openLightbox(idx) {
    const list = state.filtered;
    if (!list.length) return;
    state.lbOpen = true;
    state.lbIndex = Math.max(0, Math.min(idx, list.length - 1));

    const box = byId('lightbox');
    const img = byId('lightboxImage');
    const cap = byId('lightboxCaption');

    const item = list[state.lbIndex];
    img.src = item.src;
    img.alt = item.alt || '';
    cap.textContent = item.title || '';

    box.hidden = false;
    disableScroll();
  }

  function stepLightbox(dir) {
    const len = state.filtered.length;
    state.lbIndex = (state.lbIndex + dir + len) % len;
    const item = state.filtered[state.lbIndex];
    byId('lightboxImage').src = item.src;
    byId('lightboxImage').alt = item.alt || '';
    byId('lightboxCaption').textContent = item.title || '';
  }

  function closeLightbox() {
    state.lbOpen = false;
    byId('lightbox').hidden = true;
    enableScroll();
  }

  // Scroll UI
  function initScrollUi() {
    const btn = byId('toTop');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) btn.hidden = false; else btn.hidden = true;
    });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function disableScroll() { document.documentElement.style.overflow = 'hidden'; }
  function enableScroll() { document.documentElement.style.overflow = ''; }

  // Lookbook
  function initLookbook() {
    const root = byId('lookbook');
    const slidesData = state.items.filter(it => it.featured === true || (it.tags || []).includes('Lookbook'));
    if (!slidesData.length) {
      root.innerHTML = '<p style="color:#e5e7eb;">No featured items yet. Mark some with "featured": true in data/images.json.</p>';
      return;
    }

    const slides = slidesData.map((it, i) => {
      const s = document.createElement('div');
      s.className = 'slide' + (i === 0 ? ' is-active' : '');
      const img = document.createElement('img');
      img.src = it.src; img.alt = it.alt || '';
      const cap = document.createElement('div'); cap.className = 'caption'; cap.textContent = it.title || '';
      s.appendChild(img); s.appendChild(cap);
      root.appendChild(s);
      return s;
    });

    let idx = 0;
    const show = (n) => {
      slides[idx].classList.remove('is-active');
      idx = (n + slides.length) % slides.length;
      slides[idx].classList.add('is-active');
    };

    const prev = () => show(idx - 1);
    const next = () => show(idx + 1);

    const btnPrev = byId('lbPrev');
    const btnNext = byId('lbNext');
    const btnPlay = byId('lbPlayPause');

    btnPrev.addEventListener('click', prev);
    btnNext.addEventListener('click', next);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    state.lookbookPlaying = !reduce;
    btnPlay.textContent = state.lookbookPlaying ? '❚❚' : '▶';

    btnPlay.addEventListener('click', () => {
      state.lookbookPlaying = !state.lookbookPlaying;
      btnPlay.textContent = state.lookbookPlaying ? '❚❚' : '▶';
      restartTimer();
    });

    function startTimer() {
      if (!state.lookbookPlaying) return;
      clearInterval(state.lookbookTimer);
      state.lookbookTimer = setInterval(next, state.autoAdvanceMs);
    }
    function restartTimer() { clearInterval(state.lookbookTimer); startTimer(); }

    // swipe support
    let sx = 0;
    root.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, {passive:true});
    root.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { dx > 0 ? prev() : next(); restartTimer(); }
    });

    // keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prev(); restartTimer(); }
      else if (e.key === 'ArrowRight') { next(); restartTimer(); }
      else if (e.key === ' ') { e.preventDefault(); btnPlay.click(); }
    });

    startTimer();
  }

  function renderError(msg) {
    const main = byId('main') || document.body;
    const p = document.createElement('p');
    p.style.color = 'crimson';
    p.textContent = msg;
    main.prepend(p);
  }
})();
