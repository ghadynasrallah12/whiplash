// =========================================================
// WHIPLASH — pages + curtain
//   #about / #clients / … open the red curtain from the right,
//   the logo glides to the left strip, the copy lands word by word.
// =========================================================
(() => {
  const body  = document.getElementById('app') || document.body;   // #app only exists in the hosted preview
  const nav   = [...document.querySelectorAll('.nav__item')];
  const pages = [...document.querySelectorAll('.page')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CURTAIN_MS = reduce ? 0 : 1150;

  // Split every [data-drop] block into words once, so each word can land on its own.
  pages.forEach((page) => {
    page.querySelectorAll('[data-drop]').forEach((el) => {
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = '';
      words.forEach((w, i) => {
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = w;
        el.appendChild(span);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    });
  });

  // Number the words top-to-bottom so the landing cascades down the page
  function stagger(page) {
    const ws = page.querySelectorAll('.w');
    ws.forEach((w, i) => w.style.setProperty('--i', i));
    return ws.length;
  }

  const navEl = document.querySelector('.nav');
  // once the intro has played, drop the entrance animation so opacity can be driven by CSS again
  nav.forEach((a) => a.addEventListener('animationend', () => a.classList.add('is-in'), { once: true }));

  let current = 'home';
  let leaveTimer = null;

  // ---- right-column labels ride the curtain ------------------------------
  // Every frame: read the curtain's live left edge; any label the edge has passed is
  // carried along (never further right than its home spot), so it bumps with the
  // curtain and ends up on the curtain's gutter — black on red.
  const panel = document.querySelector('.panel');
  const riders = [
    { el: document.getElementById('nav-about'),   inset: () => gutterX() },
    { el: document.getElementById('nav-team'),    inset: () => gutterX() },
    { el: document.getElementById('nav-contact'), inset: () => window.innerWidth * 0.052 },
  ];
  function gutterX() { return parseFloat(getComputedStyle(navEl).paddingLeft) || 0; }
  function homeLeft(r) {
    // untransformed left edge of the label
    const rect = r.el.getBoundingClientRect();
    return rect.left - r.tx;
  }
  riders.forEach((r) => { r.tx = 0; });
  const bottomPanel = document.querySelector('.panel--bottom');
  // after the intro fade the film just stays (so it can shrink into Projects and grow back without re-fading)
  const hero = document.querySelector('.hero');
  hero?.querySelector('.hero__media')?.addEventListener('animationend', () => hero.classList.add('is-ready'));
  const redBelow = () => bottomPanel.getBoundingClientRect().top;   // live top edge of the bottom curtain
  let logoWait = false, logoTimer = 0;
  const logoEl = document.getElementById('logo');
  function ride() {
    // bottom curtain (Projects): anything below its edge reads black
    const yEdge = redBelow();
    if (logoWait && yEdge < window.innerHeight * 0.6) {
      logoWait = false;
      window.WHIPLASH_LOGO?.setMode('hidden', document.querySelector('.panel:not(.panel--bottom)'));
      clearTimeout(logoTimer);
      logoTimer = setTimeout(() => { if (body.dataset.page === 'projects') logoEl?.classList.add('is-gone'); }, 700);
    }
    const onProjects = body.dataset.page === 'projects' && window.WHIPLASH_WORKS?.isRedAt && yEdge < window.innerHeight * 0.9;
    const red = (y) => (onProjects ? window.WHIPLASH_WORKS.isRedAt(y) : y > yEdge);
    nav.forEach((a) => {
      const r = a.getBoundingClientRect();
      if (r.width) a.classList.toggle('on-red-y', red(r.top + r.height * 0.5));
    });
    document.querySelectorAll('.filters__item').forEach((el) => {
      const r = el.getBoundingClientRect();
      el.classList.toggle('on-red', red(r.top + r.height * 0.5));
    });
    if (window.innerWidth >= 760) {
      const edge = panel.getBoundingClientRect().left;
      riders.forEach((r) => {
        const home = homeLeft(r);
        const want = edge + r.inset();
        const tx = Math.min(0, want - home);
        if (Math.abs(tx - r.tx) > 0.01) {
          r.tx = tx;
          r.el.style.transform = tx ? `translateX(${tx}px)` : '';
        }
        r.el.classList.toggle('on-red', tx < -0.5);
      });
    } else {
      riders.forEach((r) => { if (r.tx) { r.tx = 0; r.el.style.transform = ''; } r.el.classList.remove('on-red'); });
    }
    requestAnimationFrame(ride);
  }
  requestAnimationFrame(ride);

  function show(name) {
    if (name === current) return;
    const prev = current;
    current = name;
    body.dataset.page = name;
    nav.forEach((a) => a.toggleAttribute('aria-current', a.dataset.page === name));
    // Projects: the logo stays until the rising curtain reaches it (handled in ride()), then goes
    logoWait = name === 'projects';
    if (!logoWait) { clearTimeout(logoTimer); logoEl?.classList.remove('is-gone'); }
    if (!logoWait) window.WHIPLASH_LOGO?.setMode(name === 'home' ? 'home' : 'page', document.querySelector('.panel:not(.panel--bottom)'));
    if (name === 'projects') { window.WHIPLASH_WORKS?.prepare(); setTimeout(() => window.WHIPLASH_WORKS?.open(), CURTAIN_MS * 0.5); }
    if (prev === 'projects') window.WHIPLASH_WORKS?.close(CURTAIN_MS + 100);

    // outgoing page: words drop away, then it hides
    clearTimeout(leaveTimer);
    pages.forEach((p) => {
      if (p.id === 'page-' + prev) {
        p.classList.add('is-leaving');
        leaveTimer = setTimeout(() => { p.hidden = true; p.classList.remove('is-leaving'); }, reduce ? 0 : prev === 'projects' ? CURTAIN_MS + 150 : 450);
      }
    });

    // incoming page: wait for the curtain to be most of the way in, then land the words
    const next = document.getElementById('page-' + name);
    if (!next) return;
    const delay = prev === 'home' ? CURTAIN_MS * 0.55 : 420;
    setTimeout(() => {
      if (current !== name) return;
      stagger(next);
      next.style.setProperty('--t0', '0s');
      next.hidden = false;
      next.scrollTop = 0;
      // restart the word animations
      next.querySelectorAll('.w').forEach((w) => { w.style.animation = 'none'; void w.offsetWidth; w.style.animation = ''; });
    }, delay);
  }

  // Links → pages (same URL hash so back/forward and sharing work)
  nav.forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    const name = a.dataset.page;
    try { if (location.hash !== '#' + name) history.pushState(null, '', '#' + name); } catch (_) {}
    show(name);
  }));
  window.addEventListener('popstate', () => show(pageFromHash()));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && current !== 'home') { try { history.pushState(null, '', '#home'); } catch (_) {} show('home'); } });

  function pageFromHash() {
    const h = location.hash.replace('#', '');
    return document.getElementById('page-' + h) ? h : 'home';
  }
  // open directly on a page if the URL says so
  const initial = pageFromHash();
  if (initial !== 'home') setTimeout(() => show(initial), 600);
})();
