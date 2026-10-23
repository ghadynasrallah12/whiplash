// =========================================================
// WHIPLASH — Projects page
//   • red curtain rises from the bottom (CSS, driven by data-page)
//   • burger under HOME opens the filter list
//   • infinite project list with inertia scrolling + snap (auge-xp style):
//     every row's position is interpolated from the scroll position, the
//     active one opens up in the middle, the others fan out exponentially
//   • a tick plays each time a row crosses the middle (synthesised)
//   • names / titles / nav scramble letter by letter (window.WHIPLASH_SCRAMBLE)
//   • click the active image → project detail (back arrow returns)
// =========================================================
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ALL = window.WHIPLASH_PROJECTS || [];
  const FILTERS = window.WHIPLASH_FILTERS || [];

  const page   = document.getElementById('page-projects');
  const listEl = page.querySelector('.works');
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('filters');
  const detail = document.getElementById('work-detail');

  // ---------- geometry (measured on the reference, fractions of the viewport) ----
  const G = {
    pitch: 0.0833,        // row spacing (of H)
    bigH: 0.395,          // active image height (of H); width is 16:9
    nameOff: 0.255,       // how far the active name is pushed right (of W)
    idxOff: 0.225,        // how far the active index is pushed left (of W)
    nameScale: 0.667,     // size of the non-active names
    fall: 1.15,           // exponential fan: offset × e^(−fall·distance)
    thumbW: 0.065,        // small thumbnail width (of W), 16:9
    thumbX: 0.040,        // small thumbnail column (of W) — measured on the reference
    thumbFan: 0.012,      // thumbnails creep left as they near the active row
    thumbOut: 0.072,      // the active row's thumbnail slides off the left edge (a sliver stays visible)
    smallThumbs: true,    // the column of small previews at the far left (previous / next projects)
    rowsPerWheel: 1 / 90, // wheel deltaY → rows
    ease: 0.09,           // inertia (per frame)
    snapAfter: 120,       // ms of wheel silence before snapping to the nearest row
  };

  // ---------- state ----------------------------------------------------------------
  let items = ALL.slice();   // filtered list
  // backdrop: half black (top) / half red (bottom), resting on the curtain line.
  // Scrolling down pushes the black down into the red; scrolling up pulls the red up into
  // the black — the edge travels with the scroll, waves while it moves, and eases back to
  // the middle when you stop. (The reference does this in white/black; ours is red/black.)
  const bg = document.createElement('div');
  bg.className = 'works-bg';
  page.insertBefore(bg, page.querySelector('.works-gl') || listEl);   // under the GL images and the rows
  const panelTop = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-top')) || 48) / 100;
  // at rest the line sits just above the active title (the active row is at H/2), so a
  // title never straddles the edge while you read it: black text on red below, red text on black above
  const restFrac = () => Math.min(panelTop(), 0.5 - 0.065);
  let line = panelTop(), disp = 0, push = 0, wavePhase = 0, waveAmp = 0;
  // Opening: the homepage film is handed to the GL sheet the moment Projects is clicked and shrinks
  // into the middle of the list in step with the rising curtain (same easing, same bump), still
  // playing. The backdrop follows the curtain's edge while it rises; once the curtain has settled
  // (docked) the list's own picture fades in over the film (gate 0→1) and the edge eases to rest.
  // Closing runs the same film backwards while the curtain drops.
  let docked = false, gate = 0, film = false, closing = false;
  const heroEl = document.querySelector('.hero'), heroMedia = heroEl?.querySelector('.hero__media');
  const curtain = document.querySelector('.panel--bottom');
  // what the list draws for a project: the homepage film itself for the hero project (so it never
  // stops or restarts), a looping muted <video> for projects that have one, the still otherwise
  const vids = new Map();
  function videoFor(p) {
    if (!vids.has(p.video)) {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.src = p.video;
      v.className = 'works-video'; v.setAttribute('aria-hidden', 'true');
      page.appendChild(v);
      vids.set(p.video, v);
    }
    return vids.get(p.video);
  }
  const mediaSrc = (p, open) => {
    if (p.hero && heroMedia && heroMedia.tagName === 'VIDEO') return heroReady() ? heroMedia : p.thumb;
    if (p.video && window.WHIPLASH_GL) {
      const v = videoFor(p);
      if (open > 0.3 && v.paused) v.play().catch(() => {});
      else if (open < 0.05 && !v.paused) v.pause();
      return v.readyState >= 2 ? v : p.thumb;
    }
    return p.thumb;
  };
  // the hero as a texture source: the live <video> once it has frames, its poster / the image until then
  const heroReady = () => heroMedia && heroMedia.tagName === 'VIDEO' && heroMedia.readyState >= 2;
  const filmSrc = () => (!heroMedia ? null : heroReady() ? heroMedia : heroMedia.tagName === 'VIDEO' ? heroMedia.poster : heroMedia.currentSrc || heroMedia.src);
  // how far the curtain has risen: 0 = down, 1 = at its stop (goes a little past 1 on the bump)
  const curtainP = () => {
    if (!curtain) return 1;
    const H = window.innerHeight, top = curtain.getBoundingClientRect().top;
    return Math.max(0, Math.min(1.2, (H - top) / (H * (1 - panelTop()))));
  };
  let hoverWave = 0, hoverWant = 0;
  let bgParams = null, bgHidden = false;   // GL backdrop parameters for this frame (null = not painting)
  // project detail: the slot's picture grows to fill the screen (and shrinks back on close) on the GL sheet,
  // then stays as the detail's background — nothing is ever cut in
  let zoom = null;   // { p, from: {x,y,w,h}, t0, dir: 1 (opening) | -1 (closing), ms }
  const ZOOM_MS = 900;
  // the curtain's cubic-bezier(.7,0,.22,1.12), solved for x → y
  const bez = (() => {
    const x1 = 0.7, y1 = 0, x2 = 0.22, y2 = 1.12;
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
    const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 6; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-4) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
      return sy(Math.max(0, Math.min(1, t)));
    };
  })();
  const horizon = () => window.innerHeight * line + disp;
  function renderBg(dt) {
    const W = window.innerWidth, H = window.innerHeight;
    gate += ((docked ? 1 : 0) - gate) * 0.16;
    if (docked) line += (restFrac() - line) * 0.06;
    else { line = Math.min(1, 1 - curtainP() * (1 - panelTop())); disp = 0; push = 0; }   // ride the curtain's edge
    // pending scroll (rows) → how far the edge is pushed: down = black into red, up = red into black
    // pending rows (flicks) + the raw wheel impulse (slow trackpad scrolls) → both directions, same strength
    push *= 0.9;
    const want = Math.max(-0.45, Math.min(0.45, (target - pos) * 0.3 + push)) * H;
    disp += (want - disp) * (Math.abs(want) > Math.abs(disp) ? 0.14 : 0.07);
    hoverWave += (hoverWant - hoverWave) * 0.08;
    const ampWant = Math.min(H * 0.045, Math.abs(want - disp) * 0.35 + Math.abs(disp) * 0.05) + hoverWave * H * 0.02;
    waveAmp += (ampWant - waveAmp) * 0.1;
    wavePhase += dt * 3.2;
    const y0 = horizon();
    // the edge dips toward the cursor when the cursor is near it (follows it across the page)
    const near = mx > -5000 ? Math.exp(-Math.pow((my - y0) / (H * 0.18), 2)) : 0;
    const dip = near * H * 0.04 * lens * (my > y0 ? -1 : 1);
    if (window.WHIPLASH_GL?.hasBg) {               // drawn by the GL sheet (see render)
      bgParams = page.classList.contains('is-bg') ? { y0, amp: waveAmp, phase: wavePhase, dipX: lx, dipW: W * 0.08, dip } : null;
      if (!bgHidden) { bg.style.display = 'none'; bgHidden = true; }
      return;
    }
    if (waveAmp < 0.15 && Math.abs(dip) < 0.3) { bg.style.clipPath = `polygon(0 ${y0.toFixed(1)}px, 100% ${y0.toFixed(1)}px, 100% 100%, 0 100%)`; return; }
    const N = 40, pts = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * W;
      const g = Math.exp(-Math.pow((x - lx) / (W * 0.08), 2));
      const y = y0 + dip * g + waveAmp * Math.sin((i / N) * Math.PI * 2 * 1.6 + wavePhase) + waveAmp * 0.4 * Math.sin((i / N) * Math.PI * 2 * 3.1 - wavePhase * 1.7);
      pts.push(`${x.toFixed(1)}px ${y.toFixed(1)}px`);
    }
    bg.style.clipPath = `polygon(${pts.join(',')}, 100% 100%, 0 100%)`;
  }
  // is the screen red at this y? (used for the black/red switching of the nav labels)
  function isRedAt(y) { return y > horizon(); }
  let rows = [];             // DOM rows (one per virtual slot)
  let n = 0;                 // virtual row count (items repeated so the loop is long enough)
  let pos = 0, target = 0;   // scroll position in rows (float)
  let settled = 0;           // last row that was announced active (for the tick + scramble)
  let lastWheel = 0;
  let built = false, running = false;

  // ---------- filters --------------------------------------------------------------
  function buildFilters() {
    menu.innerHTML = '';
    window.WHIPLASH_HOVER?.(menu, '.filters__item');
    ['All', ...FILTERS].forEach((f, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'filters__item' + (i === 0 ? ' is-on' : '');
      b.textContent = f;
      b.style.setProperty('--i', i);
      b.addEventListener('mouseenter', () => tick(1, 0.55));
      b.addEventListener('click', () => {
        menu.querySelectorAll('.filters__item').forEach((x) => x.classList.toggle('is-on', x === b));
        items = f === 'All' ? ALL.slice() : ALL.filter((p) => p.tag === f);
        if (!items.length) items = ALL.slice();
        pos = target = settled = 0;
        build(); listEl.classList.add('is-in');
        closeMenu();
      });
      menu.appendChild(b);
    });
  }
  function openMenu()  { burger.classList.add('is-open');    menu.hidden = false; page.classList.add('menu-open');    burger.setAttribute('aria-expanded', 'true'); }
  function closeMenu() { burger.classList.remove('is-open'); menu.hidden = true;  page.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); }
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));

  // ---------- scroll sound: a bubble that sinks, with a bass thump (synthesised) -----
  let ac = null;
  // browsers only let sound start after a real gesture: unlock on the first click / key / touch
  function unlock() {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state !== 'running') ac.resume();
    } catch (_) {}
  }
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => document.addEventListener(ev, unlock, { passive: true }));
  function tick(dir, vol = 1) {
    if (reduce) return;
    try {
      if (!ac) return;                       // nothing has been clicked yet
      if (ac.state !== 'running') { ac.resume(); return; }
      const t = ac.currentTime + 0.01;
      const jitter = 0.9 + Math.random() * 0.2;
      // the bubble: a sine that sinks (or rises when scrolling up)
      const o = ac.createOscillator(); o.type = 'sine';
      const f0 = (dir > 0 ? 620 : 240) * jitter, f1 = (dir > 0 ? 190 : 640) * jitter;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + 0.16);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 * vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 2;
      o.connect(lp).connect(g).connect(ac.destination);
      o.start(t); o.stop(t + 0.25);
      // the bass underneath
      const b = ac.createOscillator(); b.type = 'sine';
      b.frequency.setValueAtTime(82, t);
      b.frequency.exponentialRampToValueAtTime(46, t + 0.18);
      const bg = ac.createGain();
      bg.gain.setValueAtTime(0.0001, t);
      bg.gain.exponentialRampToValueAtTime(0.5 * vol, t + 0.008);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      b.connect(bg).connect(ac.destination);
      b.start(t); b.stop(t + 0.32);
    } catch (_) {}
  }

  // the same bubble, softer, on hover of anything clickable
  // a bass hit (the logo landing on the intro)
  function thud() {
    if (reduce) return;
    try {
      if (!ac || ac.state !== 'running') return;
      const t = ac.currentTime + 0.01;
      const b = ac.createOscillator(); b.type = 'sine';
      b.frequency.setValueAtTime(96, t); b.frequency.exponentialRampToValueAtTime(34, t + 0.35);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      b.connect(g).connect(ac.destination); b.start(t); b.stop(t + 0.6);
      const n = ac.createBufferSource(); const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      n.buffer = buf; const ng = ac.createGain(); ng.gain.value = 0.25; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      n.connect(lp).connect(ng).connect(ac.destination); n.start(t);
    } catch (_) {}
  }
  window.WHIPLASH_SOUND = { bubble: (dir = 1, vol = 1) => tick(dir, vol), hover: () => tick(1, 0.55), thud };
  const hoverSound = (el) => el.addEventListener('mouseenter', () => tick(1, 0.55));
  [burger, detail.querySelector('.wd__back'), detail.querySelector('.wd__link')].forEach(hoverSound);

  // ---------- hover on the open image: the GL sheet bends, the edges wave, a label rides the cursor ----
  const label = page.querySelector('.cursor-label');
  let hoverRow = null, lx = -9999, ly = -9999, mx = -9999, my = -9999, lens = 0;
  page.addEventListener('mouseleave', () => { mx = my = -9999; });
  page.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
  function renderLabel() {
    if (!label) return;
    if (lx < -5000) { lx = mx; ly = my; }
    lx += (mx - lx) * 0.18; ly += (my - ly) * 0.18;
    lens += ((isOpen() && mx > -5000 ? 1 : 0) - lens) * 0.08;
    label.style.left = lx.toFixed(1) + 'px'; label.style.top = ly.toFixed(1) + 'px';
    label.classList.toggle('is-on', !!hoverRow && detail.hidden);
  }

  // ---------- list ------------------------------------------------------------------------
  const pad = (i) => '[' + String(i + 1).padStart(3, '0') + ']';
  const wrap = (v, m) => ((v % m) + m) % m;
  const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

  function build() {
    listEl.innerHTML = '';
    rows = [];
    window.WHIPLASH_HOVER?.(listEl, '.work__name');
    // repeat the items until the loop has at least 9 rows, so nothing visible is missing
    let reps = 1; while (items.length * reps < 9) reps++;
    n = items.length * reps;
    for (let k = 0; k < n; k++) {
      const p = items[k % items.length];
      const row = document.createElement('article');
      row.className = 'work';
      row.innerHTML = `
        <figure class="work__thumb"><img alt="" loading="lazy" src="${p.thumb}"></figure>
        <figure class="work__media"><img alt="" loading="lazy" src="${p.thumb}"></figure>
        <span class="work__idx">${pad(k % items.length)}</span>
        <div class="work__name"><h3>${p.name}</h3><p>${p.type}</p></div>`;
      row.dataset.k = k;
      row.querySelector('.work__name').addEventListener('mouseenter', () => { window.WHIPLASH_SCRAMBLE?.(row.querySelector('h3'), p.name, { wave: true }); tick(1, 0.55); });
      const media = row.querySelector('.work__media');
      row.hover = 0;
      media.addEventListener('mouseenter', () => { tick(1, 0.55); hoverRow = row; hoverWant = 1; });
      media.addEventListener('mouseleave', () => { if (hoverRow === row) hoverRow = null; hoverWant = 0; });
      row.addEventListener('click', () => {
        const d = wrap(k - pos + n / 2, n) - n / 2;
        if (Math.abs(d) < 0.5) openDetail(p, k % items.length);
        else { target = Math.round(pos + d); lastWheel = 0; }
      });
      listEl.appendChild(row);
      rows.push(row);
    }
    built = true;
    render(true); renderBg(0);
    if (!running) { running = true; requestAnimationFrame(frame); }
  }

  function render(force) {
    const W = window.innerWidth, H = window.innerHeight;
    const mobile = W < 760;
    const pitch = H * G.pitch;
    const bigH = mobile ? W * 0.9 * 9 / 16 : H * G.bigH;
    const bigW = bigH * 16 / 9;
    const E = bigH / 2 - pitch * 0.25;               // how far the neighbours get pushed by the open row
    const nameOff = (mobile ? 0.18 : G.nameOff) * W;
    const idxOff  = (mobile ? 0.18 : G.idxOff) * W;
    const half = n / 2;
    const glItems = [];
    // the homepage film, shrinking into (or growing back out of) the active slot with the curtain.
    // Drawn first, opaque: the list's own picture fades in on top of it (no crossfade dip over the red)
    if (film && window.WHIPLASH_GL && filmSrc()) {
      const p = Math.min(1.08, curtainP());
      const rect = { x: (W / 2 - bigW / 2) * p, y: (H / 2 - bigH / 2) * p, w: W + (bigW - W) * p, h: H + (bigH - H) * p };
      glItems.push({ rect, src: filmSrc(), hover: 0, opacity: 1, gray: Math.max(0, 1 - p), film: true });
      if (docked && gate > 0.995) film = false;
    }

    rows.forEach((row, k) => {
      const d = wrap(k - pos + half, n) - half;      // signed distance from the middle, in rows
      const a = Math.abs(d);
      const fan = Math.exp(-G.fall * a);              // 1 at the middle, 0.3 one row away…
      const open = 1 - smooth(a);                     // 1 only while the row sits in the middle
      const vis = a < 4.2;
      row.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis && !force) return;

      // vertical: regular pitch, plus the gap the open row makes. Inside the frame (|d| < 1) the
      // name rides its own picture as it slides through, then settles into the fan.
      const yFan = d * pitch + Math.sign(d) * E * smooth(a);
      const y = a < 1 ? d * bigH + (yFan - d * bigH) * smooth(a) : yFan;
      const fade = a > 3.6 ? Math.max(0, 1 - (a - 3.6) / 0.6) : 1;

      // name: from the centre, pushed right; grows to full size while open
      const nm = row.children[3];
      nm.style.transform = `translate3d(${(W / 2 + nameOff * fan).toFixed(1)}px, ${y.toFixed(2)}px, 0) scale(${(G.nameScale + (1 - G.nameScale) * open).toFixed(3)})`;
      nm.style.opacity = fade;
      // index: right-aligned at the centre, pushed left
      const ix = row.children[2];
      ix.style.transform = `translate3d(${(W / 2 - W * 0.012 - idxOff * fan).toFixed(1)}px, ${y.toFixed(2)}px, 0)`;
      ix.style.opacity = fade;
      // small thumbnail column (left), fanning out near the middle
      const th = row.children[0];
      if (G.smallThumbs && !mobile) {
        th.style.display = '';
        th.style.width = (W * G.thumbW).toFixed(1) + 'px';
        th.style.transform = `translate3d(${(W * G.thumbX - W * G.thumbFan * fan - W * G.thumbOut * open).toFixed(1)}px, ${y.toFixed(2)}px, 0)`;
        // two previews before and two after; they fade before they would reach HOME / PROJECTS
        th.style.opacity = (fade * Math.max(0, Math.min(1, 1 - (a - 1.9) / 0.45))).toFixed(3);
      } else th.style.display = 'none';
      // big image: grows out of the middle while the row is open
      const md = row.children[1];
      row.hover = (row.hover || 0) + ((hoverRow === row ? 1 : 0) - (row.hover || 0)) * 0.1;
      md.style.width = bigW.toFixed(1) + 'px';
      md.style.height = bigH.toFixed(1) + 'px';
      // without WebGL (file://) the image tilts toward the cursor instead of bending
      let tilt = '';
      if (!window.WHIPLASH_GL && row.hover > 0.01) {
        const r = md.getBoundingClientRect();
        const nx = r.width ? ((mx - r.left) / r.width - 0.5) : 0, ny = r.height ? ((my - r.top) / r.height - 0.5) : 0;
        tilt = ` perspective(900px) rotateX(${(-ny * 14 * row.hover).toFixed(2)}deg) rotateY(${(nx * 16 * row.hover).toFixed(2)}deg) scale(${(1 + 0.03 * row.hover).toFixed(3)})`;
      }
      // the frame in the middle is fixed; the pictures slide through it like a filmstrip (as on the
      // reference): while scrolling, the next one comes in from one edge as the current one leaves
      // by the other, each clipped to the frame — so two can share it mid-way
      const fx = W / 2 - bigW / 2, fy = H / 2 - bigH / 2;
      const yImg = d * bigH;                                    // where this row's picture sits (frame space)
      const top = Math.max(0, yImg), bottom = Math.min(bigH, bigH + yImg);
      const inFrame = a < 1 && bottom - top > 0.5;
      const clipTop = top, clipBottom = bigH - bottom;          // what the frame cuts off (px)
      md.style.transform = `translate3d(-50%, calc(-50% + ${yImg.toFixed(2)}px), 0)` + tilt;
      md.style.clipPath = inFrame ? `inset(${clipTop.toFixed(1)}px 0 ${clipBottom.toFixed(1)}px 0)` : 'inset(100% 0 0 0)';
      md.style.opacity = (inFrame ? gate : 0).toFixed(3);
      md.style.pointerEvents = a < 0.5 ? 'auto' : 'none';
      row.classList.toggle('is-active', a < 0.5);
      // GL sheet: the visible slice of this row's picture, plus the full rect it belongs to
      if (inFrame && window.WHIPLASH_GL) {
        glItems.push({
          rect: { x: fx, y: fy + top, w: bigW, h: bottom - top },
          full: { x: fx, y: fy + yImg, w: bigW, h: bigH },
          src: mediaSrc(items[k % items.length], open), hover: row.hover * open, opacity: gate,
        });
      }
    });
    if (zoom && window.WHIPLASH_GL) {
      const raw = Math.min(1, (performance.now() - zoom.t0) / ZOOM_MS);
      const q = zoom.dir > 0 ? bez(raw) : 1 - bez(raw);
      const f = zoom.from;
      const rect = { x: f.x * (1 - q), y: f.y * (1 - q), w: f.w + (W - f.w) * q, h: f.h + (H - f.h) * q };
      glItems.push({ rect, src: mediaSrc(zoom.p, 1), hover: 0, opacity: 1, gray: q, dim: 1 - 0.45 * q, film: true });
      if (raw >= 1 && zoom.dir < 0) { zoom = null; detail.hidden = true; }
    }
    if (window.WHIPLASH_GL) window.WHIPLASH_GL.draw(glItems, Math.max(-1, Math.min(1, (target - pos) * 0.6)), { x: lx, y: ly }, lens, bgParams);
  }

  const blurG = document.getElementById('mblur-g');
  let blurSd = 0;
  let lastT = performance.now();
  function frame() {
    if (!running) return;
    const now = performance.now(); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (closing && detail.hidden) { renderBg(dt); render(false); }
    else if (isOpen() && !detail.hidden) { renderBg(dt); render(false); }   // the detail's background lives on the GL sheet
    else if (isOpen() && detail.hidden) {
      // snap to the nearest row once the wheel has gone quiet
      if (lastWheel && performance.now() - lastWheel > G.snapAfter) { target = Math.round(target); lastWheel = 0; }
      const prev = pos;
      pos += (target - pos) * (reduce ? 1 : G.ease);
      if (Math.abs(target - pos) < 0.0005) pos = target;
      // keep the numbers small
      if (pos > n * 2 || pos < -n * 2) { const s = Math.round(pos / n) * n; pos -= s; target -= s; settled -= s; }
      // a row crossed the middle
      const near = Math.round(pos);
      if (near !== settled) {
        tick(near > settled ? 1 : -1);
        settled = near;
        const row = rows[wrap(near, n)];
        const p = items[wrap(near, n) % items.length];
        window.WHIPLASH_SCRAMBLE?.(row.querySelector('h3'), p.name);
      }
      renderLabel();
      renderBg(dt);
      render(false);
      // motion blur: the names smear along the scroll while the list is moving
      const sd = Math.min(14, Math.abs(target - pos) * 11);
      if (Math.abs(sd - blurSd) > 0.15) {
        blurSd = sd;
        blurG?.setAttribute('stdDeviation', `0 ${sd.toFixed(2)}`);
        listEl.classList.toggle('is-moving', sd > 0.35);
      }
    }
    requestAnimationFrame(frame);
  }

  // wheel / keys / touch
  page.addEventListener('wheel', (e) => {
    if (!isOpen() || !detail.hidden) return;
    e.preventDefault();
    target += e.deltaY * G.rowsPerWheel;
    push = Math.max(-0.45, Math.min(0.45, push + e.deltaY / window.innerHeight * 1.6));
    lastWheel = performance.now();
  }, { passive: false });
  window.addEventListener('keydown', (e) => {
    if (!isOpen() || !detail.hidden) return;
    if (e.key === 'ArrowDown') { target = Math.round(target) + 1; lastWheel = 0; push = Math.min(0.45, push + 0.25); }
    if (e.key === 'ArrowUp')   { target = Math.round(target) - 1; lastWheel = 0; push = Math.max(-0.45, push - 0.25); }
    if (e.key === 'Enter') openDetail(items[wrap(Math.round(pos), n) % items.length], wrap(Math.round(pos), n) % items.length);
  });
  let ty = null, tStart = 0;
  page.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; tStart = target; }, { passive: true });
  page.addEventListener('touchmove', (e) => {
    if (ty == null || !detail.hidden) return;
    target = tStart + (ty - e.touches[0].clientY) / (window.innerHeight * G.pitch * 1.6);
    lastWheel = performance.now();
  }, { passive: true });
  page.addEventListener('touchend', () => { ty = null; lastWheel = performance.now(); }, { passive: true });
  window.addEventListener('resize', () => { if (built) { render(true); renderBg(0); } });

  // ---------- detail ----------------------------------------------------------------------
  function openDetail(p, idx) {
    closeMenu();
    detail.querySelector('.wd__idx').textContent = pad(idx);
    const title = detail.querySelector('.wd__name');
    title.textContent = p.name;
    detail.querySelector('.wd__type').textContent = p.type;
    detail.querySelector('.wd__desc').textContent = p.description || '';
    const link = detail.querySelector('.wd__link'); link.hidden = !p.link; if (p.link) link.href = p.link;
    const logo = detail.querySelector('.wd__logo');  logo.hidden = !p.logo;  if (p.logo) logo.src = p.logo;
    const award = detail.querySelector('.wd__award'); award.hidden = !p.award; if (p.award) award.src = p.award;
    // the background is the slot's picture growing on the GL sheet (see render); without WebGL, the image itself
    const vid = detail.querySelector('.wd__video'); vid.hidden = true; vid.removeAttribute('src');
    const bgImg = detail.querySelector('.wd__bg');
    if (window.WHIPLASH_GL) {
      bgImg.hidden = true;
      const row = rows[wrap(Math.round(pos), n)];
      const md = row?.children[1];
      const r = md?.getBoundingClientRect();
      const from = r && r.width ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 1, h: 1 };
      zoom = { p, from, t0: performance.now(), dir: 1 };
      listEl.classList.remove('is-in'); listEl.classList.add('is-out');
      render(true);
    } else {
      bgImg.hidden = false; bgImg.src = p.thumb;
      if (p.video) { vid.hidden = false; vid.src = p.video; vid.play().catch(() => {}); }
    }
    const cr = detail.querySelector('.wd__credits');
    cr.innerHTML = '';
    (p.credits || []).forEach(([role, name], i) => {
      const r = document.createElement('div'); r.className = 'wd__row'; r.style.setProperty('--i', i);
      r.innerHTML = `<span>${role}</span><span>${name}</span>`;
      cr.appendChild(r);
    });
    detail.hidden = false;
    detail.classList.remove('is-in'); void detail.offsetWidth; detail.classList.add('is-in');
    document.documentElement.classList.add('in-detail');
    setTimeout(() => window.WHIPLASH_SCRAMBLE?.(title, p.name, { mixed: true }), 250);
  }
  function closeDetail() {
    detail.classList.remove('is-in');
    document.documentElement.classList.remove('in-detail');
    detail.querySelector('.wd__video').pause();
    if (zoom && window.WHIPLASH_GL) {
      // shrink back into the slot while the names land again; the detail hides once it has arrived (see render)
      const from = zoom.from;
      zoom = { p: zoom.p, from, t0: performance.now(), dir: -1 };
      listEl.classList.remove('is-out'); void listEl.offsetWidth; listEl.classList.add('is-in');
    } else {
      setTimeout(() => { detail.hidden = true; }, reduce ? 0 : 450);
    }
  }
  detail.querySelector('.wd__back').addEventListener('click', closeDetail);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !detail.hidden) { e.stopImmediatePropagation(); closeDetail(); } }, true);

  // build the rows and warm the GL sheet while the homepage is idle, so the click costs nothing
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 400));
  idle(() => {
    if (!built) { buildFilters(); build(); }
    const poster = heroMedia?.tagName === 'VIDEO' ? heroMedia.poster : heroMedia?.currentSrc;
    window.WHIPLASH_GL?.warm([poster, ...ALL.map((p) => p.thumb)]);
  });

  // ---------- public hooks (called by main.js) ----------------------------------------------
  let dockTimer = 0, closeTimer = 0;
  function isOpen() { return (document.getElementById('app') || document.body).dataset.page === 'projects'; }
  window.WHIPLASH_WORKS = {
    // t = 0 of the click: take the film over and start riding the curtain
    prepare() {
      clearTimeout(closeTimer); clearTimeout(dockTimer);
      closing = false; docked = false; gate = 0; film = true; disp = 0; push = 0;
      if (!built) { buildFilters(); build(); }
      // the list always opens on the homepage film (the hero project), so the shrink lands on itself
      const h = Math.max(0, items.findIndex((p) => p.hero));
      pos = target = settled = h; lastWheel = 0;
      page.hidden = false;
      page.classList.add('is-live', 'is-bg');
      curtain?.classList.add('is-under');          // the backdrop paints the red from here on (it follows the curtain's edge)
      heroEl?.classList.add('is-ready', 'is-handed');   // the GL sheet shows the same frame from now on
      listEl.classList.remove('is-in', 'is-out');
      renderBg(0); render(true);
    },
    // half-way up the curtain: the rows land
    open() {
      if (!built || !film) this.prepare();
      renderBg(0); render(true);
      listEl.classList.remove('is-in'); void listEl.offsetWidth; listEl.classList.add('is-in');
      const row = rows[wrap(Math.round(pos), n)];
      if (row) setTimeout(() => window.WHIPLASH_SCRAMBLE?.(row.querySelector('h3'), items[wrap(Math.round(pos), n) % items.length].name), 350);
      closeMenu();
      // once the curtain has settled: the list's picture fades in over the film, the edge eases to rest
      clearTimeout(dockTimer);
      dockTimer = setTimeout(() => { if (isOpen()) docked = true; }, 700);
    },
    // leaving: the film grows back while the curtain drops, then the page lets go
    close(ms = 1250) {
      closeMenu(); clearTimeout(dockTimer); hoverRow = null; hoverWant = 0; if (!detail.hidden) closeDetail();
      docked = false; closing = true; film = true;
      // the film (hero video) grows back under the slot: if the slot shows the film itself drop the copy at
      // once (same frame); if it shows another project, let it fade over the growing film
      const active = items[wrap(Math.round(pos), n) % items.length];
      if (active?.hero) gate = 0;
      if (heroMedia?.tagName === 'VIDEO' && heroMedia.paused) heroMedia.play().catch(() => {});
      listEl.classList.remove('is-in'); listEl.classList.add('is-out');
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        closing = false; film = false;
        heroEl?.classList.remove('is-handed');     // the real film is back under it, same frame
        if (heroMedia?.tagName === 'VIDEO' && heroMedia.paused) heroMedia.play().catch(() => {});
        page.classList.remove('is-live', 'is-bg');
        curtain?.classList.remove('is-under');
        // is-out stays (the names are faded out by it) until the next prepare(); the page is hidden by main.js
      }, ms);
    },
    isRedAt,
  };
})();
