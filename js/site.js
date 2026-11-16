// =========================================================
// WHIPLASH — site
//   scenes   : six of them; the nav (click) and the arrow keys "cut" between them — scrolling does nothing
//   content  : read from the dashboard (Supabase); the words in index.html are the fallback
//   reel     : sound toggle + running timecode
// =========================================================
(function () {
  'use strict';
  var SCENES = ['home', 'about', 'clients', 'projects', 'team', 'contact'];
  var FPS = 25;
  var CFG = window.WHIPLASH_CONFIG || {};
  var body = document.body, stage = document.querySelector('.stage'), reel = document.querySelector('.reel');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0, locked = false;

  // ---------- scenes ----------
  var about = document.getElementById('about');
  var LOGO = function () { return window.WHIPLASH_LOGO || { setMode: function () {} }; };
  var logoCanvas = document.getElementById('logo');
  function drawLogo(on) { logoCanvas.dataset.off = on ? '0' : '1'; }   // no point rendering 3D nobody can see

  function setState(i) {
    current = i;
    var name = SCENES[i];
    body.dataset.scene = name;
    document.querySelectorAll('.scene').forEach(function (s) { s.hidden = s.dataset.scene !== name; });
    document.querySelectorAll('.nav a').forEach(function (a) { if (a.dataset.go === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (location.hash.slice(1) !== name) history.replaceState(null, '', name === 'home' ? location.pathname : '#' + name);
  }
  // put everything in its resting state for scene i, no animation
  function snap(i) {
    var name = SCENES[i];
    setState(i);
    LOGO().setMode(name === 'home' ? 'home' : name === 'about' ? 'flood' : 'hidden');
    about.classList.add('no-anim');
    about.hidden = name !== 'about';
    about.classList.toggle('is-open', name === 'about');
    about.classList.toggle('is-in', name === 'about');
    about.classList.toggle('is-settled', name === 'about');
    void about.offsetWidth; about.classList.remove('no-anim');
    resetDetail();
    if (name === 'about') { coverPlate(); revealPlate(350); }
    drawLogo(name === 'home');
  }

  // Home → About: the logo grows until its red fills the screen, the red page spreads out of it
  function openAbout() {
    locked = true; drawLogo(true);
    body.classList.add('is-opening');
    about.hidden = false; about.classList.remove('is-in', 'is-open', 'is-settled'); void about.offsetWidth;
    LOGO().setMode('flood');
    setTimeout(function () { about.classList.add('is-open'); }, 380);
    setTimeout(function () { setState(SCENES.indexOf('about')); }, 760);
    coverPlate();
    setTimeout(function () { about.classList.add('is-in'); revealPlate(450); }, 820);
    setTimeout(function () { body.classList.remove('is-opening'); drawLogo(false); locked = false; }, 1500);
    setTimeout(function () { about.classList.add('is-settled'); }, 2000);   // entrance done: hovers may now move the words
  }
  // About → Home: the same thing backwards
  function closeAbout() {
    locked = true;
    drawLogo(true);
    about.classList.remove('is-in', 'is-open', 'is-settled');
    setState(0);
    LOGO().setMode('home');
    setTimeout(function () { about.hidden = true; resetDetail(); locked = false; }, 900);
  }

  function cutTo(i) {
    i = Math.max(0, Math.min(SCENES.length - 1, i));
    if (i === current || locked) return;
    var from = SCENES[current], to = SCENES[i];
    if (reduce) { locked = true; snap(i); setTimeout(function () { locked = false; }, 300); return; }
    if (from === 'home' && to === 'about') return openAbout();
    if (from === 'about' && to === 'home') return closeAbout();
    locked = true;
    body.classList.add('is-cutting');                         // a few black frames…
    setTimeout(function () {
      if (reel.duration) reel.currentTime = (reel.duration * i / SCENES.length) % reel.duration;   // …the reel jumps to another shot…
      snap(i);
      body.classList.remove('is-cutting');                    // …and we're in the next scene
    }, 110);
    setTimeout(function () { locked = false; }, 700);
  }
  document.querySelectorAll('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); cutTo(SCENES.indexOf(a.dataset.go)); });
  });
  document.getElementById('next').addEventListener('click', function () { cutTo(current === SCENES.length - 1 ? 0 : current + 1); });

  // one "step" forward/back = the next / previous page, on every page (chapters on About are picked by hover or click)
  function step(dir) { if (!locked) cutTo(current + dir); }
  // Scrolling and swiping do NOT change pages (by request): pages change on click, or with the arrow keys.
  window.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', 'PageDown'].indexOf(e.key) > -1) step(1);
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) > -1) step(-1);
  });
  window.addEventListener('hashchange', function () { var i = SCENES.indexOf(location.hash.slice(1)); if (i > -1) cutTo(i); });

  // ---------- letter shuffle + hover sound (the effect from the old Projects list) ----------
  // scramble(el, text): each letter runs through random capitals, left to right, flipping
  // italic / light while it runs, with a small wave through the word.
  var scTimers = new WeakMap(), ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scramble(el, text, chars) {
    chars = chars || ABC;
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    clearInterval(scTimers.get(el));
    el.textContent = '';
    var cells = [], n = 0;
    text.split('').forEach(function (ch) {
      if (ch === ' ') { el.appendChild(document.createTextNode(' ')); return; }
      var sp = document.createElement('span'); sp.className = 'sc sc--wave'; sp.style.setProperty('--i', n++); sp.textContent = ch; el.appendChild(sp);
      cells.push({ s: sp, ch: ch, style: Math.random() < .45 ? ' sc--i' : Math.random() < .5 ? ' sc--l' : '' });
    });
    var t = 0, PER = 5, LAG = 2;
    var id = setInterval(function () {
      var done = true;
      cells.forEach(function (c, i) {
        var start = i * LAG, end = start + PER;
        if (t < start) { done = false; }
        else if (t < end) { c.s.textContent = chars[(Math.random() * chars.length) | 0]; c.s.className = 'sc sc--wave' + c.style; done = false; }
        else if (t < end + 4) { c.s.textContent = c.ch; done = false; }                 // right letter, still in its odd style for a beat
        else { c.s.textContent = c.ch; c.s.className = 'sc sc--wave'; }
      });
      t++;
      if (done) { clearInterval(id); scTimers.delete(el); }
    }, 42);
    scTimers.set(el, id);
  }
  // sound: a soft bubble with a little bass under it, synthesised (no audio files).
  // Browsers only allow sound after a real click / key / touch, so it wakes up on the first one.
  var ac = null;
  function unlockSound() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state !== 'running') ac.resume(); } catch (e) { /* no audio */ } }
  ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { document.addEventListener(ev, unlockSound, { passive: true }); });
  function tick(dir, vol) {
    if (reduce || !ac || !soundOn) return;   // sound switched off = no hover sounds either
    try {
      if (ac.state !== 'running') { ac.resume(); return; }
      var t = ac.currentTime + .01, j = .9 + Math.random() * .2;
      var o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'sine'; o.frequency.setValueAtTime((dir > 0 ? 620 : 240) * j, t); o.frequency.exponentialRampToValueAtTime((dir > 0 ? 190 : 640) * j, t + .16);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.22 * vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
      lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 2;
      o.connect(lp).connect(g).connect(ac.destination); o.start(t); o.stop(t + .25);
      var b = ac.createOscillator(), bg = ac.createGain();
      b.type = 'sine'; b.frequency.setValueAtTime(82, t); b.frequency.exponentialRampToValueAtTime(46, t + .18);
      bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.5 * vol, t + .008); bg.gain.exponentialRampToValueAtTime(.0001, t + .3);
      b.connect(bg).connect(ac.destination); b.start(t); b.stop(t + .32);
    } catch (e) { /* no audio */ }
  }
  function chapterFx(i, dir) {
    var row = chTrack && chTrack.children[i]; if (!row) return;
    scramble(row.querySelector('.ch__t > span'), CHAPTERS[i].title);
    tick(dir || 1, .6);
  }

  // ---------- About chapters ----------
  // Fallback content; the dashboard (About) replaces it.
  var CHAPTERS = [
    { title: 'History',   caption: 'Since 20XX',           image_url: 'assets/work-7.jpg' },
    { title: 'Countries', caption: 'Beirut / Dubai / KSA', image_url: 'assets/work-5.jpg' },
    { title: 'Services',  caption: 'Edit to delivery',     image_url: 'assets/work-1.jpg' },
  ];
  var chapter = 0, chTrack, chImg = document.getElementById('ch-img'), chCap = document.getElementById('ch-cap'), plate = document.querySelector('.plate');
  function two(n) { return (n < 10 ? '0' : '') + n; }

  // the red cubes over the photo
  var cubes = document.getElementById('cubes'), CUBES = 20, coverT;
  for (var q = 0; q < CUBES; q++) cubes.appendChild(document.createElement('i'));
  function coverPlate() { clearTimeout(coverT); for (var k = 0; k < CUBES; k++) cubes.children[k].classList.remove('is-out'); }
  function revealPlate(wait) {
    clearTimeout(coverT);
    var go = function () {
      if (reduce) { for (var k = 0; k < CUBES; k++) { cubes.children[k].style.setProperty('--d', '0ms'); cubes.children[k].classList.add('is-out'); } return; }
      // random order: a few go early, most in the middle, a few hang on to the end
      var order = []; for (var k2 = 0; k2 < CUBES; k2++) order.push(k2);
      order.sort(function () { return Math.random() - .5; });
      order.forEach(function (idx, n) { var c = cubes.children[idx]; c.style.setProperty('--d', Math.round(n * 62 + Math.random() * 90) + 'ms'); c.classList.add('is-out'); });
    };
    // wait for the picture itself, so the cubes never lift off an empty box
    var ready = chImg.complete || !chImg.getAttribute('src') ? Promise.resolve() : new Promise(function (r) { chImg.onload = chImg.onerror = r; setTimeout(r, 4000); });
    ready.then(function () { coverT = setTimeout(go, wait || 0); });
  }

  function renderChapters() {
    var box = document.getElementById('chapters'); box.textContent = '';
    chTrack = document.createElement('div'); chTrack.className = 'chapters__track'; box.appendChild(chTrack);
    document.getElementById('ch-count').textContent = CHAPTERS.length;
    CHAPTERS.forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'ch'; b.setAttribute('role', 'tab'); b.style.setProperty('--i', i);
      var n = document.createElement('span'); n.className = 'ch__n'; n.textContent = '[' + two(i + 1) + ']';
      var t = document.createElement('span'); t.className = 'ch__t'; var w = document.createElement('span'); w.textContent = c.title; t.appendChild(w);
      b.appendChild(n); b.appendChild(t);
      b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; b.classList.add('is-hover'); setChapter(i); chapterFx(i); });
      b.addEventListener('pointerleave', function () { b.classList.remove('is-hover'); });
      b.addEventListener('click', function (e) {
        if (pageOf(i)) return openDetail(i);
        setChapter(i); if (e.detail && !b.classList.contains('is-hover')) chapterFx(i);
      });
      b.addEventListener('focus', function () { if (!detailOpen) setChapter(i); });
      chTrack.appendChild(b);
    });
    chapter = Math.min(chapter, CHAPTERS.length - 1);
    setChapter(chapter, true);
  }
  var swapT;
  function setChapter(i, instant) {
    if (!CHAPTERS.length || (detailOpen && !instant)) return;
    var same = i === chapter && !instant; chapter = i;
    var c = CHAPTERS[i], rows = chTrack.children;
    for (var k = 0; k < rows.length; k++) rows[k].setAttribute('aria-selected', String(k === i));
    // three rows are visible: slide only when the picked one would fall outside them
    var first = Math.max(0, Math.min(CHAPTERS.length - 3, i - 2));
    chTrack.style.transform = 'translateY(calc(var(--row) * ' + -first + '))';
    if (same) return;
    var fill = function () {
      chImg.src = c.image_url || ''; chImg.alt = c.title; chImg.style.visibility = c.image_url ? '' : 'hidden';
      chCap.textContent = '[' + two(i + 1) + '] ' + c.title + (c.caption ? ' — ' + c.caption : '');
    };
    clearTimeout(swapT);
    if (instant) { fill(); coverPlate(); if (about.classList.contains('is-in')) revealPlate(150); return; }
    coverPlate();                                   // cubes snap back over the old picture…
    swapT = setTimeout(function () { fill(); revealPlate(60); }, 260);   // …and blaze off the new one
  }
  renderChapters();

  // ---------- chapter page: History timeline ----------
  // Fallback dates; the dashboard (About → History timeline) replaces them.
  var MILESTONES = [
    { year: '20XX', title: 'Founded in Beirut',       line: 'Two editors, one room, one deadline.' },
    { year: '20XX', title: 'First global brand',      line: 'The cut that put us on the map.' },
    { year: '20XX', title: 'Colour & sound in-house', line: 'Every craft under one roof.' },
    { year: '20XX', title: 'Dubai',                   line: 'A second home for the studio.' },
    { year: '20XX', title: 'KSA',                     line: 'Cutting for the Kingdom.' },
    { year: '2026', title: 'Now',                     line: 'Still obsessed with the frame.' },
  ];
  var hist = document.getElementById('hist'), tlItems = document.getElementById('tl-items'), tlHead = document.getElementById('tl-head');
  var detailOpen = false, histTimers = [];
  function later(fn, ms) { histTimers.push(setTimeout(fn, ms)); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function renderTimeline() {
    tlItems.textContent = '';
    tlItems.style.setProperty('--n', MILESTONES.length);
    MILESTONES.forEach(function (m, i) {
      var li = el('li'), n = MILESTONES.length, last = i === n - 1;
      var year = el('div', 'tl__year'); year.appendChild(el('span', '', m.year));
      var bar = el('div', 'tl__bar');
      // clips run from light grey to dark; the last one is anthracite
      bar.style.setProperty('--c', last ? '#232326' : 'hsl(240 2% ' + Math.round(73 - (n > 2 ? i / (n - 2) : 0) * 39) + '%)');
      li.appendChild(year); li.appendChild(bar); li.appendChild(el('h3', 'tl__name', m.title)); li.appendChild(el('p', 'tl__line', m.line));
      tlItems.appendChild(li);
    });
  }
  renderTimeline();

  // ---------- Countries map ----------
  var mapEl = document.getElementById('map'), mapSvg = document.getElementById('map-svg'), mapWord = document.getElementById('map-word');
  var routes = [].slice.call(mapSvg.querySelectorAll('.map__route')), cities = [].slice.call(mapSvg.querySelectorAll('.city'));
  var HOME_CITY = 'Beirut', mapReady = false;
  routes.forEach(function (r) { var len = r.getTotalLength(); r.dataset.len = len; r.style.strokeDasharray = len; r.style.strokeDashoffset = len; });
  function cityEl(key) { return mapSvg.querySelector('.city[data-city="' + key + '"]'); }
  // the big word: a city name on two lines (BEI / RUT)
  function setMapWord(name, fx) {
    var cut = Math.ceil(name.length / 2), parts = [name.slice(0, cut), name.slice(cut)];
    [].forEach.call(mapWord.querySelectorAll('.map__ln > span'), function (sp, k) { if (fx) scramble(sp, parts[k].toUpperCase()); else { clearInterval(scTimers.get(sp)); sp.textContent = parts[k]; } });
  }
  function pickCity(g) {
    if (!mapReady) return;
    cities.forEach(function (c) { c.classList.toggle('is-picked', c === g); });
    routes.forEach(function (r) { r.classList.toggle('is-picked', !!g && r.dataset.to === g.dataset.city); });
    mapSvg.classList.toggle('has-pick', !!g && g.dataset.city !== 'beirut');
    setMapWord(g ? g.dataset.name : HOME_CITY, true); tick(1, .5);
  }
  cities.forEach(function (g) {
    g.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pickCity(g); });
    g.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') pickCity(null); });
    g.addEventListener('click', function () { pickCity(g); });
    g.addEventListener('focus', function () { pickCity(g); });
  });
  function resetMap() {
    mapReady = false; mapSvg.classList.remove('has-pick');
    routes.forEach(function (r) { r.style.transition = 'none'; r.style.strokeDashoffset = r.dataset.len; r.classList.remove('is-picked'); void r.getBoundingClientRect(); r.style.transition = ''; });
    cities.forEach(function (c) { c.classList.remove('is-on', 'is-picked'); });
    setMapWord(HOME_CITY, false);
  }
  // Beirut first, then one route at a time; each city's mark lands when its line arrives
  function playMap() {
    if (reduce) { routes.forEach(function (r) { r.style.strokeDashoffset = 0; }); cities.forEach(function (c) { c.classList.add('is-on'); }); mapReady = true; return; }
    later(function () { cityEl('beirut').classList.add('is-on'); tick(1, .5); }, 1050);
    var t = 1450;
    routes.forEach(function (r) {
      later(function () { r.style.strokeDashoffset = 0; }, t);
      later(function () { cityEl(r.dataset.to).classList.add('is-on'); tick(1, .45); }, t + 780);
      t += 950;
    });
    later(function () { mapReady = true; }, t);
  }
  resetMap();

  // ---------- chapter pages: shared open / switch / close ----------
  var PAGES = { timeline: hist, map: mapEl }, det = null, dfoot = document.getElementById('dfoot');
  function pageOf(i) {
    var c = CHAPTERS[i]; if (!c) return '';
    return c.page || ({ history: 'timeline', countries: 'map' })[String(c.title).toLowerCase()] || '';
  }
  function fillFoot(i) {
    var back = document.getElementById('hist-back'), next = document.getElementById('hist-next'), box = document.getElementById('hist-chapters');
    back.textContent = i > 0 ? '← ' + CHAPTERS[i - 1].title : '← [02] About';
    back.onclick = function () { closeDetail(i > 0 ? i - 1 : null); };
    box.textContent = '';
    CHAPTERS.forEach(function (c, k) {
      var b = el('button', '', '[' + two(k + 1) + '] ' + c.title); b.type = 'button';
      if (k === i) b.setAttribute('aria-current', 'true'); else b.addEventListener('click', function () { closeDetail(k); });
      box.appendChild(b);
    });
    var nx = (i + 1) % CHAPTERS.length;
    next.hidden = CHAPTERS.length < 2; next.textContent = CHAPTERS[nx].title + ' →';
    next.onclick = function () { closeDetail(nx); };
  }
  function hidePages() {
    [hist, mapEl].forEach(function (p) { p.hidden = true; p.classList.remove('is-in', 'is-out'); });
    tlHead.classList.remove('is-on');
    [].forEach.call(tlItems.children, function (li) { li.classList.remove('is-on'); });
    resetMap();
  }
  function showPage(i) {
    var kind = pageOf(i); det = PAGES[kind]; chapter = i;
    about.dataset.detail = kind; fillFoot(i);
    if (kind === 'timeline') {
      document.getElementById('hist-n').textContent = '[' + two(i + 1) + ']';
      document.getElementById('hist-word').textContent = CHAPTERS[i].title;
      document.getElementById('hist-crumb').textContent = '[' + two(i + 1) + '] ' + CHAPTERS[i].title;
    }
    det.hidden = false; void det.offsetWidth;
    about.classList.add('is-detail-on'); det.classList.add('is-in'); dfoot.classList.add('is-in');
    if (kind === 'timeline') playTimeline(); else playMap();
  }
  function openDetail(i) {
    if (locked || !pageOf(i)) return;
    if (detailOpen) return switchDetail(i);
    detailOpen = true; histTimers.forEach(clearTimeout); histTimers = [];
    setChapter(i, true);
    var stays = pageOf(i) === 'timeline';            // History keeps its word as the page title; on the map every word leaves
    for (var k = 0; k < chTrack.children.length; k++) chTrack.children[k].classList.toggle('is-picked', stays && k === i);
    chTrack.children[i].classList.remove('is-hover');
    var word = chTrack.children[i].querySelector('.ch__t > span'); clearInterval(scTimers.get(word)); word.textContent = CHAPTERS[i].title;   // stop any letter shuffle mid-way
    if (stays) chTrack.style.transform = 'translateY(calc(var(--row) * ' + -i + '))';     // the picked word rides up to the first row
    about.classList.add('is-detail');
    tick(1, .6);
    later(function () { showPage(i); }, reduce ? 0 : 620);
  }
  // from one chapter page straight to another
  function switchDetail(i) {
    histTimers.forEach(clearTimeout); histTimers = [];
    if (det) det.classList.add('is-out');
    tick(1, .5);
    later(function () { hidePages(); showPage(i); }, reduce ? 0 : 360);
  }

  // the playhead visits each date in turn; a date only cuts in once the playhead is on it
  function playTimeline() {
    var items = [].slice.call(tlItems.children);
    if (reduce) { items.forEach(function (li) { li.classList.add('is-on'); }); return; }
    var mobile = innerWidth <= 760, t = 750;
    later(function () {
      var bar = items[0] && items[0].querySelector('.tl__bar'); if (!bar) return;
      tlHead.style.height = (bar.offsetTop + bar.offsetHeight + tlHead.offsetTop * -1 + 2) + 'px';
      tlHead.style.left = items[0].offsetLeft + 'px'; tlHead.classList.add('is-on');
    }, 400);
    items.forEach(function (li, i) {
      later(function () { tlHead.style.left = li.offsetLeft + 'px'; }, t);
      later(function () {
        li.classList.add('is-on');
        scramble(li.querySelector('.tl__year > span'), MILESTONES[i].year, '0123456789');
        tick(1, .4);
        if (mobile) li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, t + (mobile ? 0 : 300));
      t += 620;
    });
  }

  function resetDetail() {
    histTimers.forEach(clearTimeout); histTimers = []; detailOpen = false; det = null;
    hidePages(); dfoot.classList.remove('is-in');
    about.classList.remove('is-detail', 'is-detail-on'); delete about.dataset.detail;
    if (chTrack) { [].forEach.call(chTrack.children, function (r) { r.classList.remove('is-picked'); }); setChapter(chapter, true); }
  }
  // leave a chapter page: to another chapter's page if it has one, otherwise back to the chapter list
  function closeDetail(to) {
    if (!detailOpen) return;
    if (to != null && pageOf(to)) return switchDetail(to);
    histTimers.forEach(clearTimeout); histTimers = [];
    if (det) det.classList.add('is-out'); dfoot.classList.remove('is-in'); tick(-1, .5);
    setTimeout(function () {
      if (to != null) chapter = to;
      resetDetail();
      coverPlate(); revealPlate(200);
    }, reduce ? 0 : 360);
  }

  // ---------- sound: ONE switch for everything ----------
  // "Sound — On / Off" on the homepage rules the reel's audio AND the hover sounds.
  // On by default; browsers only let audio start after the visitor's first click or key press.
  // The choice is remembered for the next visit.
  var sound = document.getElementById('sound'), soundOn = true;
  try { soundOn = localStorage.getItem('whiplash-sound') !== 'off'; } catch (e) { /* private mode */ }
  function applySound() {
    sound.setAttribute('aria-pressed', String(soundOn));
    reel.muted = !soundOn || !gestured;
    if (!reel.muted) reel.play().catch(function () { reel.muted = true; });
  }
  var gestured = false;
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, function () { if (!gestured) { gestured = true; applySound(); } }, { passive: true }); });
  sound.addEventListener('click', function () {
    soundOn = !soundOn;
    try { localStorage.setItem('whiplash-sound', soundOn ? 'on' : 'off'); } catch (e) { /* private mode */ }
    applySound();
  });
  applySound();

  // ---------- timecode (hh:mm:ss:ff of the reel) ----------
  var tc = document.getElementById('tc');
  (function tick() {
    var t = reel.currentTime || 0, s = Math.floor(t);
    tc.textContent = two(Math.floor(s / 3600)) + ':' + two(Math.floor(s / 60) % 60) + ':' + two(s % 60) + ':' + two(Math.floor((t - s) * FPS));
    requestAnimationFrame(tick);
  })();

  // ---------- cursor ring ----------
  var ring = document.querySelector('.ring'), rx = 0, ry = 0, mx = 0, my = 0, seen = false;
  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    mx = e.clientX; my = e.clientY;
    if (!seen) { seen = true; rx = mx; ry = my; ring.classList.add('is-on'); }
    ring.classList.toggle('is-big', !!e.target.closest('a,button'));
  }, { passive: true });
  document.addEventListener('pointerleave', function () { ring.classList.remove('is-on'); seen = false; });
  (function follow() { rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14; ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)'; requestAnimationFrame(follow); })();

  // ---------- content from the dashboard ----------
  function rest(path) {
    return fetch(CFG.supabaseUrl + '/rest/v1/' + path, { headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
    rest('texts?select=key,value').then(function (rows) {
      var map = {}; rows.forEach(function (r) { map[r.key] = r.value; });
      document.querySelectorAll('[data-text]').forEach(function (el) { var v = map[el.dataset.text]; if (v) el.textContent = v; });
      if (map['seo.title']) document.title = map['seo.title'];
      var d = document.querySelector('meta[name=description]'); if (d && map['seo.description']) d.content = map['seo.description'];
    }).catch(function () { /* keep the words already in the page */ });
    rest('chapters?select=*&order=position').then(function (rows) {
      if (rows.length) { CHAPTERS = rows; renderChapters(); }
    }).catch(function () { /* table not there yet: keep the built-in chapters */ });
    rest('milestones?select=year,title,line&order=position').then(function (rows) {
      if (rows.length) { MILESTONES = rows; renderTimeline(); }
    }).catch(function () { /* keep the built-in dates */ });
    // the project marked "Homepage film" supplies the reel
    rest('projects?select=video_url,thumb_url&is_hero=eq.true&published=eq.true&limit=1').then(function (rows) {
      var p = rows[0]; if (!p || !p.video_url) return;
      if (p.thumb_url) reel.poster = p.thumb_url;
      reel.src = p.video_url; reel.play().catch(function () {});
    }).catch(function () {});
  }

  // ---------- start ----------
  var first = SCENES.indexOf(location.hash.slice(1));
  snap(first > -1 ? first : 0);
  window.addEventListener('load', function () { snap(current); });   // the logo script may arrive after us
})();
