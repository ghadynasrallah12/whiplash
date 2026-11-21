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
    if (typeof closeTry === 'function') closeTry(true);
    if (typeof exitTheater === 'function' && name !== 'home') exitTheater(true);
    // [04] Projects is its own "desktop" (js/desk.js) laid over the site
    var D = window.WL_DESK;
    if (D) { if (name === 'projects') D.open(true); else if (!D.busy) D.close(true); }
    if (typeof contactSnap === 'function' && !contactBusy) contactSnap(name === 'contact');
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
    // the page simply appears once the logo's red covers the screen (same red, so nothing visibly changes)
    setTimeout(function () { setState(SCENES.indexOf('about')); }, 760);
    setTimeout(function () { about.classList.add('is-open'); }, 820);
    coverPlate();
    setTimeout(function () { about.classList.add('is-in'); revealPlate(450); chLine(chapter, true); }, 900);
    setTimeout(function () { body.classList.remove('is-opening'); drawLogo(false); locked = false; }, 1500);
    setTimeout(function () { about.classList.add('is-settled'); }, 2000);   // entrance done: hovers may now move the words
  }
  // About → Home: the same thing backwards
  function closeAbout() {
    locked = true;
    closeTry(true);
    drawLogo(true);                                    // the full-screen red logo is waiting under the page
    about.classList.remove('is-open', 'is-settled');   // the page fades onto it…
    setTimeout(function () {
      about.hidden = true; about.classList.remove('is-in'); resetDetail();
      setState(0);
      LOGO().setMode('home');                          // …and the logo shrinks back to its place
      setTimeout(function () { locked = false; }, 700);
    }, 220);
  }

  function cutTo(i) {
    i = Math.max(0, Math.min(SCENES.length - 1, i));
    if (i === current || locked) return;
    var from = SCENES[current], to = SCENES[i];
    if (reduce) { locked = true; snap(i); setTimeout(function () { locked = false; }, 300); return; }
    if (from === 'home' && to === 'about') return openAbout();
    if (from === 'about' && to === 'home') return closeAbout();
    var D = window.WL_DESK;
    if (D && to === 'projects') {                              // slide over to the Projects desktop, like switching spaces on a Mac
      locked = true; D.open(false, function () { snap(i); locked = false; }); return;
    }
    if (D && from === 'projects') {                            // …and slide back
      locked = true; D.close(false, function () { locked = false; }); snap(i); return;
    }
    if (to === 'contact') { locked = true; openContact(function () { snap(i); locked = false; }); return; }
    if (from === 'contact') { locked = true; contactBusy = true; snap(i); closeContact(function () { locked = false; }); return; }
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
    if (body.classList.contains('desk-on') || theater) return;     // the Projects desktop / the player have their own keys
    if (tryOpen) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].indexOf(e.key) > -1) step(1);
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) > -1) step(-1);
  });
  window.addEventListener('hashchange', function () { var i = SCENES.indexOf(location.hash.slice(1)); if (i > -1) cutTo(i); });

  // ---------- letter shuffle + hover sound (the effect from the old Projects list) ----------
  // scramble(el, text): each letter runs through random capitals, left to right, flipping
  // italic / light while it runs, with a small wave through the word.
  var scTimers = new WeakMap(), ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scramble(el, text, chars, lag) {
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
    var t = 0, PER = 5, LAG = lag || 2;
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
  var pageReady = document.readyState === 'complete';
  window.addEventListener('load', function () { setTimeout(function () { pageReady = true; }, 300); });
  function tick(dir, vol) {
    if (reduce || !ac || !soundOn || !pageReady) return;   // sound switched off = no hover sounds either; none while the page is still loading
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
    { title: 'History',   caption: 'Since 20XX',                  image_url: 'assets/work-7.jpg', line: 'It all started\nwith *two editors.*' },
    { title: 'Countries', caption: 'Beirut · Dubai · KSA',        image_url: 'assets/work-5.jpg', line: 'From Lebanon to *the world,*\nand from the world back to Lebanon.' },
    { title: 'Services',  caption: 'Edit · Colour · VFX · Sound', image_url: 'assets/work-1.jpg', line: 'We fix it\n*in post.*' },
  ];
  var LINES = {}; CHAPTERS.forEach(function (c) { LINES[c.title.toLowerCase()] = c.line; });   // used when the dashboard has no line yet
  var chapter = 0, chTrack, chImg = document.getElementById('ch-img'), chCap = document.getElementById('ch-cap'), plate = document.querySelector('.plate');
  function two(n) { return (n < 10 ? '0' : '') + n; }

  // ---------- the photo's lock: red blocks over a black-and-white photo, cracked open like a safe ----------
  // Locked: a blocky red pattern sits over the photo. Then a scan line sweeps down, the blocks it passes
  // start running codes, and they break open one by one (a dial click each) until the photo is clear.
  var cubes = document.getElementById('cubes'), COLS = 8, ROWS = 10, CELLS = COLS * ROWS, lockTimers = [], codeT = 0;
  for (var q = 0; q < CELLS; q++) { var cell = document.createElement('i'); cell.appendChild(document.createElement('b')); cubes.appendChild(cell); }
  var scan = document.createElement('span'); scan.className = 'plate__scan'; cubes.appendChild(scan);
  function lockLater(fn, ms) { lockTimers.push(setTimeout(fn, ms)); }
  function clearLock() { lockTimers.forEach(clearTimeout); lockTimers = []; clearInterval(codeT); cubes.classList.remove('is-scanning'); }
  // a blocky pattern: smooth noise thresholded on the grid, so the red forms clusters rather than confetti
  function pattern() {
    var p = [], a = Math.random() * 6, b = Math.random() * 6, c = Math.random() * 6;
    for (var r = 0; r < ROWS; r++) for (var k = 0; k < COLS; k++) {
      var v = Math.sin(k * 2.2 + a) + Math.sin(r * 1.8 + b) + .8 * Math.sin((k - r) * 1.3 + c) + (Math.random() - .5) * .8;
      p.push(v > .2);
    }
    return p;
  }
  function cellAt(n) { return cubes.children[n]; }
  // stop a reveal mid-way: photo fully open, caption back to normal, no more sounds
  function stopLock() {
    clearLock(); revealId++;
    for (var n = 0; n < CELLS; n++) { var c = cellAt(n); c.className = ''; c.firstChild.textContent = ''; }
    var ch = CHAPTERS[chapter]; if (ch) chCap.textContent = '[' + two(chapter + 1) + '] ' + ch.title + (ch.caption ? ' — ' + ch.caption : '');
  }
  // everything red (used while the picture underneath is swapped)
  function coverPlate() {
    clearLock(); revealId++;
    for (var n = 0; n < CELLS; n++) { var c = cellAt(n); c.className = 'is-red'; c.firstChild.textContent = ''; }
  }
  var HEX = '0123456789ABCDEF';
  function code() { return HEX[(Math.random() * 16) | 0] + HEX[(Math.random() * 16) | 0]; }
  var revealId = 0;
  function revealPlate(wait) {
    clearLock();
    var id = ++revealId;
    var go = function () {
      if (id !== revealId) return;   // a newer reveal has started since
      var cells = []; for (var n = 0; n < CELLS; n++) cells.push(cellAt(n));
      if (reduce) { cells.forEach(function (c) { c.className = ''; }); return; }
      // 1) locked: only the pattern stays red
      var p = pattern();
      cells.forEach(function (c, n) { c.className = p[n] ? 'is-red' : ''; c.firstChild.textContent = ''; });
      var red = cells.filter(function (c, n) { return p[n]; });
      var cap = chCap.textContent, total = red.length, opened = 0, HOLD = 650, SCAN = 750;
      // 2) scan: blocks start running codes as the line passes them
      lockLater(function () {
        cubes.classList.add('is-scanning'); lockClick(.5, 1);
        red.forEach(function (c) { var row = Math.floor(cells.indexOf(c) / COLS); lockLater(function () { c.classList.add('is-code'); }, row / ROWS * SCAN); });
        codeT = setInterval(function () { red.forEach(function (c) { if (c.classList.contains('is-code') && !c.classList.contains('is-open')) c.firstChild.textContent = code(); }); }, 55);
      }, HOLD);
      // 3) brute force: blocks crack open one by one, top to bottom with some chance in it
      var order = red.map(function (c) { return { c: c, k: Math.floor(cells.indexOf(c) / COLS) + Math.random() * 4 }; }).sort(function (x, y) { return x.k - y.k; });
      var start = HOLD + SCAN * .55, step = Math.max(14, Math.min(34, 1100 / Math.max(total, 1)));
      order.forEach(function (o, n) {
        lockLater(function () {
          o.c.classList.add('is-open'); opened++;
          if (n % 2 === 0) lockClick(.35 + Math.random() * .25, 1 + Math.random() * .3);
          chCap.textContent = 'Unlocking ' + Math.round(opened / total * 100) + '%';
        }, start + n * step + Math.random() * step);
      });
      // 4) open: one heavy click, the caption decodes back
      lockLater(function () {
        clearInterval(codeT); cubes.classList.remove('is-scanning');
        cells.forEach(function (c) { c.className = ''; });
        lockClunk(); scramble(chCap, cap, null, 1);
      }, start + total * step + step + 260);
    };
    // wait for the picture itself, so nothing unlocks over an empty box
    var ready = chImg.complete || !chImg.getAttribute('src') ? Promise.resolve() : new Promise(function (r) { chImg.addEventListener('load', r, { once: true }); chImg.addEventListener('error', r, { once: true }); setTimeout(r, 4000); });
    ready.then(function () { if (id === revealId) lockLater(go, wait || 0); });
  }
  // sounds of the lock: dial clicks and the bolt (silent when Sound is off)
  var lastLockClick = 0;
  function lockAudible() { return SCENES[current] === 'about' && !detailOpen && !about.hidden; }
  function lockClick(vol, pitch) {
    if (reduce || !ac || !soundOn || ac.state !== 'running' || !lockAudible()) return;
    var now = performance.now(); if (now - lastLockClick < 22) return; lastLockClick = now;
    try {
      var t = ac.currentTime, len = Math.floor(ac.sampleRate * .012), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
      var src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 2400 * pitch; bp.Q.value = 6; g.gain.value = .9 * vol;
      src.connect(bp).connect(g).connect(ac.destination); src.start(t);
      var o = ac.createOscillator(), og = ac.createGain();
      o.type = 'square'; o.frequency.value = 3600 * pitch; og.gain.setValueAtTime(.04 * vol, t); og.gain.exponentialRampToValueAtTime(.0001, t + .01);
      o.connect(og).connect(ac.destination); o.start(t); o.stop(t + .012);
    } catch (e) { /* no audio */ }
  }
  function lockClunk() {
    if (reduce || !ac || !soundOn || ac.state !== 'running' || !lockAudible()) return;
    try {
      var t = ac.currentTime + .01;
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.6, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + .3);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .32);
      lockClick(.9, .6);
    } catch (e) { /* no audio */ }
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
      b.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse' || !about.classList.contains('is-settled')) return; b.classList.add('is-hover'); setChapter(i); chapterFx(i); });   // nothing until the page has fully come in
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
    chTrack.style.transform = 'translateY(calc(var(--pitch) * ' + -first + '))';
    if (same) return;
    chLine(i);
    var fill = function () {
      chImg.src = c.image_url || ''; chImg.alt = c.title; chImg.style.visibility = c.image_url ? '' : 'hidden';
      chCap.textContent = '[' + two(i + 1) + '] ' + c.title + (c.caption ? ' — ' + c.caption : '');
    };
    clearTimeout(swapT);
    if (instant) { fill(); coverPlate(); if (about.classList.contains('is-in')) revealPlate(150); return; }
    coverPlate();                                   // cubes snap back over the old picture…
    swapT = setTimeout(function () { fill(); revealPlate(60); }, 260);   // …and blaze off the new one
  }
  // ---------- the chapter's line beside the picture: typed out, a few words in white ----------
  // In the dashboard the line is plain text: Enter = new line, *stars* = white words.
  var chMeta = document.getElementById('chline-meta'), chText = document.getElementById('chline-text');
  var scrubHead = document.getElementById('scrub-head'), typeT = 0, lineAt = -1;
  var TCS = ['00:00:08:12', '00:00:17:04', '00:00:26:00'];
  function chTc(i) { if (TCS[i]) return TCS[i]; var s = 26 + (i - 2) * 9; return '00:00:' + two(s % 60) + ':' + two((i * 7) % 25); }
  (function buildRuler() {   // the ruler's ticks: a long one every fifth
    var r = document.getElementById('scrub'), f = document.createDocumentFragment();
    for (var k = 0; k <= 50; k++) { var t = document.createElement('b'); t.style.left = (k * 2) + '%'; if (k % 5 === 0) t.className = 'is-long'; f.appendChild(t); }
    r.insertBefore(f, scrubHead);
  })();
  function chLine(i, now) {
    if (!CHAPTERS.length || i === lineAt && !now) return;
    lineAt = i;
    var c = CHAPTERS[i], line = c.line || LINES[(c.title || '').toLowerCase()] || '';
    chMeta.textContent = '— Chapter ' + two(i + 1) + ' · ' + c.title + ' · ' + chTc(i);
    scrubHead.style.left = ((i + 0.5) / CHAPTERS.length * 100) + '%';
    // build the words, every letter hidden, then type them in with a block cursor at the end
    clearInterval(typeT); chText.textContent = '';
    var chars = [], hi = false;
    line.split('\n').forEach(function (row, r) {
      if (r) chText.appendChild(document.createElement('br'));
      row.split(/(\*)/).forEach(function (part) {
        if (part === '*') { hi = !hi; return; }
        for (var k = 0; k < part.length; k++) {
          var sp = document.createElement('span'); sp.textContent = part[k]; sp.className = hi ? 'is-hi' : ''; sp.style.visibility = 'hidden';
          chText.appendChild(sp); chars.push(sp);
        }
      });
    });
    var cur = document.createElement('i'); cur.className = 'chline__cur'; chText.appendChild(cur);
    if (reduce || !chars.length) { chars.forEach(function (sp) { sp.style.visibility = ''; }); return; }
    var n = 0, step = Math.max(12, Math.min(34, 900 / chars.length));
    chars[0].parentNode.insertBefore(cur, chars[0]);
    typeT = setInterval(function () {
      var sp = chars[n++]; sp.style.visibility = ''; sp.parentNode.insertBefore(cur, sp.nextSibling);
      if (n >= chars.length) clearInterval(typeT);
    }, step);
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
  // Each route runs from the middle of Beirut's "[01]" to the middle of the destination's "[0N]",
  // so the lines never cross the Whiplash marks. Measured from the real text, so it follows any font.
  function numberBox(g) {
    var t = g.querySelector('text'), m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform'));
    var a = t.getExtentOfChar(0), b = t.getExtentOfChar(3);
    return { x: +m[1] + (a.x + b.x + b.width) / 2, top: +m[2] + a.y, bottom: +m[2] + a.y + a.height };
  }
  function layoutRoutes(drawn) {
    var from;
    try { from = numberBox(cityEl('beirut')); } catch (e) { from = null; }
    routes.forEach(function (r) {
      if (from && from.bottom > from.top) {
        var to = numberBox(cityEl(r.dataset.to)), bend = (r.dataset.bend || '.5 .2').split(' ').map(Number);
        // arrive on the side of the number the curve comes from (from below for Dubai, which sits across the Gulf)
        var sx = from.x, sy = from.bottom + 2, ex = to.x, ey0 = to.top - 2;
        var cx = sx + (ex - sx) * bend[0], cy = sy + (ey0 - sy) * bend[1], ey = cy > to.bottom ? to.bottom + 2 : ey0;
        r.setAttribute('d', 'M' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + ex.toFixed(1) + ' ' + ey.toFixed(1));
      }
      var len = r.getTotalLength(); r.dataset.len = len;
      r.style.transition = 'none'; r.style.strokeDasharray = len; r.style.strokeDashoffset = drawn ? 0 : len;
      void r.getBoundingClientRect(); r.style.transition = '';
    });
  }
  layoutRoutes(false);
  window.addEventListener('resize', function () { if (!mapEl.hidden) layoutRoutes(mapReady); });
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

  // ---------- Services: the crafts ----------
  // Fallback crafts; the dashboard (About → Services) replaces them. start = second of the reel to show
  // when a craft has no clip of its own.
  var CRAFTS = [
    { name: 'Edit',   line: 'The cut, the rhythm, the story.', video_url: '' },
    { name: 'Colour', line: 'The grade that sets the mood.',   video_url: '' },
    { name: 'VFX',    line: "What wasn't there on set.",        video_url: '' },
    { name: 'Sound',  line: 'Design, mix and music.',           video_url: '' },
    { name: 'Online', line: 'Finishing and delivery.',          video_url: '' },
    { name: 'Motion', line: 'Titles, type and movement.',       video_url: '' },
  ];
  var svc = document.getElementById('svc'), svcList = document.getElementById('svc-list'), svcVideo = document.getElementById('svc-video'), svcCap = document.getElementById('svc-cap');
  var craft = 0, craftT;
  function reelSrc() { return reel.currentSrc || reel.src || 'assets/hero.mp4'; }
  function renderCrafts() {
    svcList.textContent = '';
    CRAFTS.forEach(function (c, i) {
      var li = el('li', 'svc__row'); li.style.setProperty('--i', i); li.tabIndex = 0;
      var w = el('span', 'svc__w0'); w.appendChild(el('span', '', c.name));
      li.appendChild(el('span', 'svc__n', '[' + two(i + 1) + ']')); li.appendChild(w); li.appendChild(el('p', 'svc__d', c.line));
      li.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') pickCraft(i, true); });
      li.addEventListener('click', function () { pickCraft(i, true); });
      li.addEventListener('focus', function () { pickCraft(i, false); });
      svcList.appendChild(li);
    });
  }
  function craftClip(i, video) {
    var c = CRAFTS[i], src = c.video_url || reelSrc();
    if (video.getAttribute('src') !== src) { video.src = src; }
    if (!c.video_url) {   // one reel for every craft: each craft starts at its own moment of it
      var seek = function () { if (video.duration) video.currentTime = (video.duration * i / Math.max(CRAFTS.length, 1)) % video.duration; };
      if (video.readyState >= 1) seek(); else video.addEventListener('loadedmetadata', seek, { once: true });
    }
    video.play().catch(function () {});
  }
  function pickCraft(i, fx) {
    if (!svcList.children[i]) return;
    var same = i === craft && svcList.children[i].classList.contains('is-active');
    craft = i;
    [].forEach.call(svcList.children, function (r, k) { r.classList.toggle('is-active', k === i); });
    svcCap.textContent = '[' + two(i + 1) + '] ' + CRAFTS[i].name + ' — Hover a craft, the W plays it';
    if (same) return;
    if (fx && svc.classList.contains('is-settled')) { scramble(svcList.children[i].querySelector('.svc__w0 > span'), CRAFTS[i].name); tick(1, .5); }
    clearTimeout(craftT); svcVideo.classList.add('is-swapping');
    craftT = setTimeout(function () { craftClip(i, svcVideo); svcVideo.classList.remove('is-swapping'); }, 170);
  }
  renderCrafts();
  function playServices() {
    svc.classList.remove('is-settled');
    craft = -1; pickCraft(0, false);
    later(function () { svc.classList.add('is-settled'); }, reduce ? 0 : 1900);
  }
  function resetServices() { svc.classList.remove('is-settled'); svcVideo.pause(); }

  // ---------- Before / after ----------
  var tryEl = document.getElementById('try'), tryStage = document.getElementById('try-stage'), trySplit = document.getElementById('try-split');
  var vBefore = document.getElementById('try-before'), vAfter = document.getElementById('try-after');
  var tryOpen = false, tryX = 50, tryRaf = 0, tryTimers = [];
  var FX = {   // what the left side shows for each craft, and the two words
    edit:   ['Raw', 'Cut'],     colour: ['Log', 'Grade'],   vfx:    ['Plate', 'Comp'],
    sound:  ['Silent', 'Mix'],  online: ['Proxy', 'Master'], motion: ['Still', 'Motion'],
  };
  var FX_KEYS = Object.keys(FX);
  function fxOf(i) { var k = String((CRAFTS[i] || {}).name || '').toLowerCase(); return FX[k] ? k : FX_KEYS[i % FX_KEYS.length]; }
  function setX(pct) {
    tryX = Math.max(0, Math.min(100, pct));
    tryEl.style.setProperty('--x', tryX + '%');
    trySplit.setAttribute('aria-valuenow', Math.round(tryX));
  }
  function renderChips(active) {
    var box = document.getElementById('try-chips'); box.textContent = '';
    CRAFTS.forEach(function (c, i) {
      // labels only: the page always shows Edit (Raw / Cut); the other crafts are listed, not clickable
      var b = el('span', '', '[' + c.name + ']'); if (i === active) b.className = 'is-on';
      box.appendChild(b);
    });
  }
  var fxIndex = 0;
  function setFx(i, anim) {
    fxIndex = i;
    var key = 'edit', words = FX[key];
    tryEl.dataset.fx = key;
    var a = document.querySelector('#try-wa > span'), b = document.querySelector('#try-wb > span');
    a.parentNode.style.setProperty('--len', Math.max(3, words[0].length)); b.parentNode.style.setProperty('--len', Math.max(3, words[1].length));   // longer words set smaller so they fit
    if (anim) { scramble(a, words[0].toUpperCase()); scramble(b, words[1].toUpperCase()); tick(1, .5); }
    else { a.textContent = words[0]; b.textContent = words[1]; }
    if (key !== 'motion') vBefore.play().catch(function () {}); else vBefore.pause();
  }
  // keep the two films on the same frame. "Motion" before = stop-motion: the left only steps 6 times a second
  var lastStep = 0;
  function syncLoop() {
    if (!tryOpen) return;
    if (tryEl.dataset.fx === 'motion') {
      if (Math.abs(vAfter.currentTime - lastStep) > 1 / 6) { lastStep = vAfter.currentTime; vBefore.currentTime = lastStep; }
    } else if (Math.abs(vBefore.currentTime - vAfter.currentTime) > .12) vBefore.currentTime = vAfter.currentTime;
    tryRaf = requestAnimationFrame(syncLoop);
  }

  // sound of the cut: a record being scratched (forward and backward, pitch follows the hand) + a frame click every few %
  var scr = null;
  function buildScratch() {
    if (scr || !ac) return scr;
    try {
      var sr = ac.sampleRate, n = Math.floor(sr * 1.6), fwd = ac.createBuffer(1, n, sr), rev = ac.createBuffer(1, n, sr), d = fwd.getChannelData(0), r = rev.getChannelData(0);
      var F = [[420, 1], [760, .6], [2300, .18]], f0 = 82.4;   // a low "ohh": a deep voice-like tone (the higher "ahh" sounded like a cat once sped up)
      for (var t = 0; t < n; t++) {
        var tt = t / sr, v = 0, vib = f0 * (1 + .012 * Math.sin(2 * Math.PI * 5 * tt));
        for (var k = 1; k * f0 < 4200; k++) {
          var hz = k * vib, w = 0;
          F.forEach(function (f) { w += f[1] * Math.exp(-Math.pow((hz - f[0]) / 160, 2)); });
          v += (w + .04) * Math.sin(2 * Math.PI * hz * tt) / Math.sqrt(k);
        }
        d[t] = v * .22 + (Math.random() * 2 - 1) * .03;
      }
      for (var j = 0; j < n; j++) r[j] = d[n - 1 - j];
      var make = function (buf) {
        var src = ac.createBufferSource(), g = ac.createGain(); src.buffer = buf; src.loop = true; g.gain.value = 0;
        src.connect(g); src.start(); return { src: src, g: g };
      };
      var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; lp.Q.value = 1.2;
      var out = ac.createGain(); out.gain.value = .9;
      var A = make(fwd), B = make(rev); A.g.connect(lp); B.g.connect(lp); lp.connect(out).connect(ac.destination);
      scr = { A: A, B: B, lp: lp };
    } catch (e) { scr = null; }
    return scr;
  }
  var scrIdle;
  function scratch(v) {   // v = how fast the line moves, in % of the screen per second (sign = direction)
    if (reduce || !ac || !soundOn || ac.state !== 'running' || !buildScratch()) return;
    var t = ac.currentTime, sp = Math.min(Math.abs(v) / 110, 1.25), vol = Math.min(Math.abs(v) / 70, 1) * .6;
    var on = v >= 0 ? scr.A : scr.B, off = v >= 0 ? scr.B : scr.A;
    on.src.playbackRate.setTargetAtTime(Math.max(.06, sp), t, .04);
    on.g.gain.setTargetAtTime(vol, t, .03); off.g.gain.setTargetAtTime(0, t, .02);
    scr.lp.frequency.setTargetAtTime(450 + sp * 900, t, .05);
    clearTimeout(scrIdle);
    scrIdle = setTimeout(function () { if (scr) { scr.A.g.gain.setTargetAtTime(0, ac.currentTime, .03); scr.B.g.gain.setTargetAtTime(0, ac.currentTime, .03); } }, 70);
  }
  function frameClick() {
    if (reduce || !ac || !soundOn || ac.state !== 'running') return;
    try {
      var t = ac.currentTime, len = Math.floor(ac.sampleRate * .006), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      var s2 = ac.createBufferSource(), hp = ac.createBiquadFilter(), g = ac.createGain();
      s2.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 2500; g.gain.value = .35;
      s2.connect(hp).connect(g).connect(ac.destination); s2.start(t);
    } catch (e) { /* no audio */ }
  }

  // dragging the cut: the hand sets a target and the line follows it on a spring with a speed limit,
  // so it can't be flung across, and it glides to a stop instead of halting dead
  var drag = null, lastNotch = Math.round(50 / 4), tryT = 50, tryV = 0, tryLast = 0, tryMove = 0;
  var TRY_VMAX = 130, TRY_K = 55, TRY_C = 2 * Math.sqrt(55);    // max speed in % of the screen per second; spring stiffness; critical damping
  function aimAt(pct) { tryT = Math.max(0, Math.min(100, pct)); if (!tryMove) { tryLast = 0; tryMove = requestAnimationFrame(tryStep); } }
  function tryStep(now) {
    var dt = tryLast ? Math.min(.05, (now - tryLast) / 1000) : 1 / 60; tryLast = now;
    tryV += ((tryT - tryX) * TRY_K - tryV * TRY_C) * dt;
    tryV = Math.max(-TRY_VMAX, Math.min(TRY_VMAX, tryV));
    setX(tryX + tryV * dt);
    if (!demoQuiet) { scratch(tryV); var notch = Math.round(tryX / 4); if (notch !== lastNotch) { lastNotch = notch; frameClick(); } }
    if (tryOpen && (Math.abs(tryT - tryX) > .02 || Math.abs(tryV) > .3)) tryMove = requestAnimationFrame(tryStep);
    else { tryMove = 0; tryV = 0; scratch(0); }
  }
  tryStage.addEventListener('pointerdown', function (e) {
    if (!tryOpen || e.button > 0) return;
    e.preventDefault(); unlockSound(); tryStage.setPointerCapture(e.pointerId); stopDemo();
    drag = true; tryEl.classList.add('is-dragging');
    aimAt(e.clientX / innerWidth * 100);
  });
  tryStage.addEventListener('pointermove', function (e) { if (drag) aimAt(e.clientX / innerWidth * 100); });
  function endDrag() { if (!drag) return; drag = null; tryEl.classList.remove('is-dragging'); }
  tryStage.addEventListener('pointerup', endDrag); tryStage.addEventListener('pointercancel', endDrag);
  trySplit.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 10 : 3;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); stopDemo(); aimAt(tryT + (e.key === 'ArrowRight' ? step : -step)); }
  });

  // the line stays in the middle until the visitor drags it (no self-moving demo)
  var demoQuiet = false;
  function stopDemo() { demoQuiet = false; }

  function openTry() {
    if (tryOpen) return;
    tryOpen = true; unlockSound();
    var src = reelSrc();
    [vBefore, vAfter].forEach(function (v) { if (v.getAttribute('src') !== src) v.src = src; v.currentTime = 0; v.play().catch(function () {}); });
    fxIndex = Math.max(0, CRAFTS.findIndex(function (c) { return String(c.name).toLowerCase() === 'edit'; }));
    renderChips(fxIndex); setFx(fxIndex, false); setX(50); tryT = 50; tryV = 0;
    tryEl.hidden = false; tryEl.classList.remove('is-in', 'is-out', 'is-open'); void tryEl.offsetWidth;
    tryEl.classList.add('is-open');                         // the red line drops
    tryTimers.push(setTimeout(function () { tryEl.classList.add('is-in'); tick(1, .6); }, reduce ? 0 : 380));   // …and the film opens out of it
    tryRaf = requestAnimationFrame(syncLoop);
    setTimeout(function () { trySplit.focus({ preventScroll: true }); }, 1400);
  }
  function closeTry(instant, then) {
    if (!tryOpen) { if (then) then(); return; }
    tryOpen = false; drag = null; stopDemo(); scratch(0); cancelAnimationFrame(tryRaf); cancelAnimationFrame(tryMove); tryMove = 0; tryV = 0; tryTimers.forEach(clearTimeout); tryTimers = [];
    var done = function () { tryEl.hidden = true; tryEl.classList.remove('is-in', 'is-out', 'is-open', 'is-dragging'); vBefore.pause(); vAfter.pause(); if (then) then(); };
    if (instant || reduce) return done();
    tryEl.classList.add('is-out'); tick(-1, .5);
    setTimeout(done, 600);
  }
  document.getElementById('svc-try').addEventListener('click', openTry);
  document.getElementById('try-back').addEventListener('click', function () { closeTry(false, function () { document.getElementById('svc-try').focus({ preventScroll: true }); }); });
  document.getElementById('try-next').addEventListener('click', function () { closeTry(true); cutTo(SCENES.indexOf('clients')); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tryOpen) closeTry(false); }, true);

  // ---------- chapter pages: shared open / switch / close ----------
  var PAGES = { timeline: hist, map: mapEl, services: svc }, det = null, dfoot = document.getElementById('dfoot');
  function pageOf(i) {
    var c = CHAPTERS[i]; if (!c) return '';
    return c.page || ({ history: 'timeline', countries: 'map', services: 'services' })[String(c.title).toLowerCase()] || '';
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
    [hist, mapEl, svc].forEach(function (p) { p.hidden = true; p.classList.remove('is-in', 'is-out'); });
    resetServices(); body.classList.remove('is-dark');
    tlHead.classList.remove('is-on');
    [].forEach.call(tlItems.children, function (li) { li.classList.remove('is-on'); });
    resetMap();
  }
  function showPage(i) {
    var kind = pageOf(i); det = PAGES[kind]; chapter = i;
    about.dataset.detail = kind; fillFoot(i);
    body.classList.toggle('is-dark', kind === 'services');
    if (kind === 'timeline') {
      document.getElementById('hist-n').textContent = '[' + two(i + 1) + ']';
      document.getElementById('hist-word').textContent = CHAPTERS[i].title;
      document.getElementById('hist-crumb').textContent = '[' + two(i + 1) + '] ' + CHAPTERS[i].title;
    }
    det.hidden = false; void det.offsetWidth;
    about.classList.add('is-detail-on'); det.classList.add('is-in'); dfoot.classList.add('is-in');
    if (kind === 'timeline') playTimeline(); else if (kind === 'services') playServices(); else { layoutRoutes(false); playMap(); }
  }
  function openDetail(i) {
    if (locked || !pageOf(i)) return;
    if (detailOpen) return switchDetail(i);
    stopLock();
    detailOpen = true; histTimers.forEach(clearTimeout); histTimers = [];
    setChapter(i, true);
    var stays = pageOf(i) === 'timeline';            // History keeps its word as the page title; on the other pages every word leaves
    for (var k = 0; k < chTrack.children.length; k++) chTrack.children[k].classList.toggle('is-picked', stays && k === i);
    chTrack.children[i].classList.remove('is-hover');
    var word = chTrack.children[i].querySelector('.ch__t > span'); clearInterval(scTimers.get(word)); word.textContent = CHAPTERS[i].title;   // stop any letter shuffle mid-way
    if (stays) chTrack.style.transform = 'translateY(calc(var(--pitch) * ' + -i + '))';     // the picked word rides up to the first row
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
    var big = !!e.target.closest('a,button'); if (big !== ringBig) { ringBig = big; ring.classList.toggle('is-big', big); }
    if (!ringRaf) ringRaf = requestAnimationFrame(follow);
  }, { passive: true });
  document.addEventListener('pointerleave', function () { ring.classList.remove('is-on'); seen = false; });
  // follows with a little lag; stops working once it has caught up
  var ringBig = false, ringRaf = 0;
  function follow() {
    rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
    ring.style.transform = 'translate3d(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px,0)';
    ringRaf = Math.abs(mx - rx) + Math.abs(my - ry) > .3 ? requestAnimationFrame(follow) : 0;
  }

  // ---------- content from the dashboard ----------
  function rest(path) {
    return fetch(CFG.supabaseUrl + '/rest/v1/' + path, { headers: { apikey: CFG.supabaseAnonKey, Authorization: 'Bearer ' + CFG.supabaseAnonKey } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  var reelFromDash = false;
  if (CFG.supabaseUrl && CFG.supabaseAnonKey) {
    rest('texts?select=key,value').then(function (rows) {
      var map = {}; rows.forEach(function (r) { map[r.key] = r.value; });
      document.querySelectorAll('[data-text]').forEach(function (el) { var v = map[el.dataset.text]; if (v) el.textContent = v; });
      document.querySelectorAll('[data-href]').forEach(function (el) { var v = map[el.dataset.href]; if (v) el.href = v; });
      if (map['home.reel']) { reelFromDash = true; if (map['home.poster']) reel.poster = map['home.poster']; reel.src = map['home.reel']; reel.play().catch(function () {}); }
      if (map['seo.title']) document.title = map['seo.title'];
      var d = document.querySelector('meta[name=description]'); if (d && map['seo.description']) d.content = map['seo.description'];
    }).catch(function () { /* keep the words already in the page */ });
    rest('chapters?select=*&order=position').then(function (rows) {
      if (rows.length) { CHAPTERS = rows; lineAt = -1; renderChapters(); }
    }).catch(function () { /* table not there yet: keep the built-in chapters */ });
    rest('crafts?select=name,line,video_url&order=position').then(function (rows) {
      if (rows.length) { CRAFTS = rows; renderCrafts(); }
    }).catch(function () { /* keep the built-in crafts */ });
    rest('milestones?select=year,title,line&order=position').then(function (rows) {
      if (rows.length) { MILESTONES = rows; renderTimeline(); }
    }).catch(function () { /* keep the built-in dates */ });
    // the project marked "Homepage film" supplies the reel
    rest('projects?select=video_url,thumb_url&is_hero=eq.true&published=eq.true&limit=1').then(function (rows) {
      var p = rows[0]; if (!p || !p.video_url || reelFromDash) return;
      if (p.thumb_url) reel.poster = p.thumb_url;
      reel.src = p.video_url; reel.play().catch(function () {});
    }).catch(function () {});
  }

  // ---------- [06] Contact ----------
  var contact = document.getElementById('contact'), contactBusy = false, contactT = [];
  // The word is the designed wordmark (assets/wordmark.png, already off-register as in the design).
  // It is painted as 7 strips; each strip flies in from the side and comes to rest at 0, i.e. exactly
  // the design. After that a strip only drifts a little with the cursor and glitches now and then.
  var WM_PULL = [-70, 55, -45, 85, -60, 48, -52];         // while hovering the word: how far each strip follows the cursor (2200 = the word's width)
  var wmCanvas = document.getElementById('wm'), wmCtx = wmCanvas.getContext('2d'), wmImg = new Image();
  var wmGeo = { W: 0 }, wm = [];
  for (var wk = 0; wk < 7; wk++) wm.push({ x: (wk % 2 ? 1 : -1) * 3000, target: (wk % 2 ? 1 : -1) * 3000, rest: 0, pull: 0, settled: false });
  wmImg.onload = function () { if (!contact.hidden && wmBuild()) wmPaint(); };
  wmImg.src = 'assets/wordmark.png';
  function wmBuild() {
    var r = wmCanvas.getBoundingClientRect(); if (!r.width || !r.height) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2), W = r.width, H = r.height, mobile = innerWidth <= 760;
    var ratio = wmImg.naturalWidth ? wmImg.naturalWidth / wmImg.naturalHeight : 7.07;
    var ww = mobile ? W - 24 : W * .93, x0 = mobile ? 12 : W * .0334;   // always 93% of the screen wide, like the design
    wmCanvas.width = Math.round(W * dpr); wmCanvas.height = Math.round(H * dpr);
    var unit = ww / 2200;
    wm.forEach(function (b, k) { b.pull = WM_PULL[k] * unit; });
    wmGeo = { W: W, H: H, x0: x0, ww: ww, wh: ww / ratio, dpr: dpr, unit: unit };
    return true;
  }
  function wmPaint() {
    var g = wmGeo; if (!g.W || !wmImg.naturalWidth) return;
    wmCtx.setTransform(1, 0, 0, 1, 0, 0); wmCtx.clearRect(0, 0, wmCanvas.width, wmCanvas.height);
    var sh = wmImg.naturalHeight / 7, dh = g.wh / 7;
    wm.forEach(function (b, k) {
      wmCtx.drawImage(wmImg, 0, k * sh, wmImg.naturalWidth, sh, (g.x0 + b.x) * g.dpr, k * dh * g.dpr, g.ww * g.dpr, dh * g.dpr);
    });
  }
  window.addEventListener('resize', function () { if (!contact.hidden && wmBuild()) wmPaint(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!contact.hidden && wmBuild()) wmPaint(); });
  var wmRaf = 0, wmMouse = 0, wmGlitchT = 0, wmHover = false;
  function wmLoop() {
    wm.forEach(function (b) { b.x += (b.target + (b.settled && wmHover ? wmMouse * b.pull : 0) - b.x) * (b.fast ? .3 : .1); });
    wmPaint();
    wmRaf = contact.hidden ? 0 : requestAnimationFrame(wmLoop);
  }
  // At rest the word is exactly the design. Only while the pointer is ON the word: the strips re-cut
  // (each jumps sideways and snaps back, top to bottom) and then lean with the cursor; leaving puts them back.
  function wmGlitch() { clearTimeout(wmGlitchT); }   // (no idle glitching any more)
  function wmRecut() {
    if (reduce) return;
    wm.forEach(function (b, k) {
      if (!b.settled) return;
      setTimeout(function () {
        b.fast = true; b.target = (k % 2 ? 1 : -1) * (90 + Math.random() * 120) * (wmGeo.unit || 1);
        setTimeout(function () { b.target = b.rest; setTimeout(function () { b.fast = false; }, 220); }, 110);
      }, k * 35);
    });
    tick(1, .45);
  }
  contact.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || !wmGeo.W) return;
    var r = wmCanvas.getBoundingClientRect(), lx = e.clientX - r.left - wmGeo.x0, ly = e.clientY - r.top;
    var inside = lx >= -12 && lx <= wmGeo.ww + 12 && ly >= -12 && ly <= wmGeo.wh + 12;
    if (inside && !wmHover) { wmHover = true; wmRecut(); }
    else if (!inside && wmHover) wmHover = false;
    wmMouse = inside ? Math.max(-.5, Math.min(.5, lx / wmGeo.ww - .5)) : 0;
    contact.classList.toggle('is-wm-hover', inside);
  });
  contact.addEventListener('pointerleave', function () { wmHover = false; wmMouse = 0; contact.classList.remove('is-wm-hover'); });
  function wmIntro(instant) {
    wmBuild();
    wm.forEach(function (b, k) {
      b.settled = false; b.fast = false;
      if (instant || reduce) { b.x = b.target = b.rest; b.settled = true; return; }
      b.x = b.target = (k % 2 ? 1 : -1) * (wmGeo.W || innerWidth) * (1.05 + k * .05);
      contactT.push(setTimeout(function () { b.target = b.rest; }, 380 + k * 70));      // strip by strip, from alternating sides
      contactT.push(setTimeout(function () { b.settled = true; }, 1500 + k * 70));
    });
    wmPaint();
    if (!wmRaf) wmRaf = requestAnimationFrame(wmLoop);
    clearTimeout(wmGlitchT); wmGlitchT = setTimeout(wmGlitch, 2600);
  }
  function contactClear() { contactT.forEach(clearTimeout); contactT = []; }
  function contactSnap(on) {
    if (on && !contact.hidden && contact.classList.contains('is-content')) return;   // already there (maybe still building): leave it be
    contactClear();
    contact.classList.remove('is-out', 'is-closing');
    if (!on) { contact.hidden = true; contact.classList.remove('is-in', 'is-solid', 'is-content'); clearTimeout(wmGlitchT); return; }
    contact.hidden = false; contact.classList.add('is-in', 'is-solid', 'is-content');
    wmIntro(true); paintTimes();
  }
  // strips back off-screen and nothing drawn, so the word can never show before the page has come in
  function wmReset() {
    wm.forEach(function (b, k) { b.settled = false; b.fast = false; b.x = b.target = (k % 2 ? 1 : -1) * (wmGeo.W || innerWidth) * (1.05 + k * .05); });
    wmCtx.setTransform(1, 0, 0, 1, 0, 0); wmCtx.clearRect(0, 0, wmCanvas.width, wmCanvas.height);
  }
  function openContact(done) {
    contactClear(); contactBusy = true; wmReset();
    contact.hidden = false; contact.classList.remove('is-in', 'is-solid', 'is-content', 'is-out', 'is-closing'); void contact.offsetWidth;
    contact.classList.add('is-in'); tick(1, .55); paintTimes();          // the dark strips slide in…
    contactT.push(setTimeout(function () { contact.classList.add('is-solid', 'is-content'); wmIntro(false); }, 620));   // …then the page builds
    contactT.push(setTimeout(function () { contactBusy = false; if (done) done(); }, 700));
  }
  function closeContact(done) {
    contactClear(); clearTimeout(wmGlitchT);
    contact.classList.add('is-closing');
    contactT.push(setTimeout(function () { contact.classList.remove('is-solid', 'is-content'); contact.classList.add('is-out'); tick(-1, .5); }, 180));   // strips slide away
    contactT.push(setTimeout(function () { contact.hidden = true; contact.classList.remove('is-in', 'is-out', 'is-closing'); wmReset(); contactBusy = false; if (done) done(); }, 900));
  }
  // local time in each office
  var tzFmt = {};
  function paintTimes() {
    [].forEach.call(document.querySelectorAll('[data-tz]'), function (n) {
      try { tzFmt[n.dataset.tz] = tzFmt[n.dataset.tz] || new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: n.dataset.tz }); n.textContent = tzFmt[n.dataset.tz].format(new Date()); } catch (e) { n.textContent = ''; }
    });
  }
  setInterval(function () { if (!contact.hidden) paintTimes(); }, 15000);
  document.getElementById('year').textContent = new Date().getFullYear();
  // email: click to copy
  var mail = document.getElementById('mail'), mailHint = document.getElementById('mail-hint'), mailT;
  mail.addEventListener('click', function () {
    var addr = document.getElementById('mail-addr').textContent.trim();
    var ok = function () { mail.classList.add('is-copied'); mailHint.textContent = '— Copied'; tick(1, .5); clearTimeout(mailT); mailT = setTimeout(function () { mail.classList.remove('is-copied'); mailHint.textContent = '— Click to copy'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(addr).then(ok, function () { location.href = 'mailto:' + addr; });
    else location.href = 'mailto:' + addr;
  });

  // ---------- Homepage reel: hover cursor + full-screen player ----------
  // Hovering the reel turns the cursor into an edit playhead (Razor) with the timecode where you'd cut in;
  // clicking makes the razor sound and opens the film full screen, starting from that point.
  var frame = document.querySelector('.frame'), rc = document.querySelector('.reelcur');
  var theater = false, rcx = 0, rcy = 0, rcMx = 0, rcMy = 0, rcOn = false, rcRaf = 0;
  var thTime = document.getElementById('th-time'), thDur = document.getElementById('th-dur'), thFill = document.getElementById('th-fill'), thTrack = document.getElementById('th-track'), thMute = document.getElementById('th-mute');
  function mmss(t) { t = Math.max(0, t || 0); return two(Math.floor(t / 60)) + ':' + two(Math.floor(t % 60)); }
  var hc = document.getElementById('hcur'), hcRazor = hc.querySelector('.hc--razor');
  var hcOn = false, hx = 0, hy = 0, frRect = null;
  function reelReady() { return reel.readyState >= 2 && reel.videoWidth > 0; }

  // the razor's sound, synthesised like the rest: a blade through film, then the cut lands
  var nBuf = null;
  function razorSound() {
    if (reduce || !ac || !soundOn) return;
    try {
      if (ac.state !== 'running') ac.resume();
      if (!nBuf) { nBuf = ac.createBuffer(1, ac.sampleRate * .5, ac.sampleRate); var d = nBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t = ac.currentTime + .005;
      var src = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = nBuf; fl.type = 'bandpass'; fl.Q.value = 1.3; fl.frequency.setValueAtTime(2200, t); fl.frequency.exponentialRampToValueAtTime(9500, t + .15);
      g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.0001, t + .17);
      src.connect(fl).connect(g).connect(ac.destination); src.start(t, Math.random() * .3); src.stop(t + .2);
      var o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(120, t + .1); o.frequency.exponentialRampToValueAtTime(48, t + .35);
      og.gain.setValueAtTime(.0001, t + .1); og.gain.exponentialRampToValueAtTime(.55, t + .105); og.gain.exponentialRampToValueAtTime(.0001, t + .35);
      o.connect(og).connect(ac.destination); o.start(t + .1); o.stop(t + .37);
    } catch (e) { /* no audio */ }
  }

  // Razor: an edit playhead across the reel with the timecode under it; click = the film opens and starts from there
  var rzLine = hcRazor.querySelector('.rz-line'), rzTag = hcRazor.querySelector('.rz-tag'), rzTc = hcRazor.querySelector('.rz-tc'), rzAt = 0;
  function reelLen() { return reel.duration && isFinite(reel.duration) ? reel.duration : 0; }
  function rzFrame() {
    if (!frRect) return;
    hy += (rcMy - hy) * .3;
    var r = frRect, x = Math.max(r.left, Math.min(r.right - 1, rcMx)), f = (x - r.left) / r.width;
    rzLine.style.transform = 'translate(' + x.toFixed(1) + 'px,' + r.top.toFixed(1) + 'px)'; rzLine.style.height = r.height + 'px';
    var w = rzTag.offsetWidth, flip = x + w + 20 > r.right;
    rzTag.style.transform = 'translate(' + (flip ? x - w : x).toFixed(1) + 'px,' + Math.max(r.top + 12, Math.min(r.bottom - 34, hy - 11)).toFixed(1) + 'px)';
    var tt = f * (reelLen() || 60), ss = Math.floor(tt);
    rzAt = f; rzTc.textContent = '00:' + two(Math.floor(ss / 60)) + ':' + two(ss % 60) + ':' + two(Math.floor((tt % 1) * 25));
  }
  function setHover(on) {
    if (on === hcOn) return;
    if (on) { hy = rcMy; frRect = frame.getBoundingClientRect(); }
    hcOn = on; hc.classList.toggle('is-on', on); body.classList.toggle('reel-hover', on || rcOn);
    if (on && !rcRaf) rcRaf = requestAnimationFrame(rcLoop);
  }
  function hcFire() {
    razorSound();
    var len = reelLen(); if (len) { try { reel.currentTime = rzAt * len; } catch (e) { /* not seekable yet */ } }   // the film starts where you cut
    hc.style.transition = 'none'; setHover(false); void hc.offsetWidth; hc.style.transition = '';   // the playhead goes at once
    enterTheater(true);
  }

  function rcLoop(now) {
    rcx += (rcMx - rcx) * .25; rcy += (rcMy - rcy) * .25;
    rc.style.transform = 'translate(' + rcx.toFixed(1) + 'px,' + rcy.toFixed(1) + 'px)';
    if (hcOn) rzFrame();
    if (theater) { thTime.textContent = mmss(reel.currentTime); thDur.textContent = mmss(reel.duration); thFill.style.width = (reel.duration ? reel.currentTime / reel.duration * 100 : 0) + '%'; }
    rcRaf = (rcOn || theater || hcOn) ? requestAnimationFrame(rcLoop) : 0;
  }
  function reelHoverable() { return SCENES[current] === 'home' && !locked && !body.classList.contains('is-cutting'); }
  function setRc(on) {
    if (on && !rcOn) { rcx = rcMx; rcy = rcMy; }
    rcOn = on; rc.classList.toggle('is-on', on); body.classList.toggle('reel-hover', on || hcOn);
    rc.classList.toggle('is-pause', theater && !reel.paused);
    if (on && !rcRaf) rcRaf = requestAnimationFrame(rcLoop);
  }
  window.addEventListener('resize', function () { if (hcOn) frRect = frame.getBoundingClientRect(); });
  frame.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    rcMx = e.clientX; rcMy = e.clientY;
    var overControls = !!e.target.closest('.theater button, .theater__track');
    setRc(theater && !overControls);
    setHover(!theater && reelHoverable());
  });
  frame.addEventListener('pointerleave', function () { setRc(false); setHover(false); });
  frame.addEventListener('click', function (e) {
    if (e.target.closest('.theater button, .theater__track')) return;
    if (theater) { if (reel.paused) reel.play().catch(function () {}); else reel.pause(); setRc(true); return; }
    if (!reelHoverable()) return;
    if (hcOn) { hcFire(); setRc(true); } else enterTheater();   // touch: straight in
  });
  function enterTheater(silent) {
    if (theater) return;
    theater = true; unlockSound();
    body.classList.add('is-theater');
    LOGO().setMode('hidden');                                   // the logo shrinks away into the film
    setTimeout(function () { if (theater) drawLogo(false); }, 700);   // gone from view: stop drawing it
    reel.muted = !soundOn; reel.play().catch(function () { reel.muted = true; reel.play().catch(function () {}); });
    thMute.textContent = reel.muted ? 'Sound off' : 'Sound on';
    [].forEach.call(frame.querySelectorAll('.theater button'), function (b) { b.tabIndex = 0; });
    frame.querySelector('.theater').setAttribute('aria-hidden', 'false');
    setTimeout(function () { rc.classList.toggle('is-pause', theater && !reel.paused); }, 120); if (!silent) tick(1, .55);
    if (!rcRaf) rcRaf = requestAnimationFrame(rcLoop);
    setTimeout(function () { if (theater) document.getElementById('th-close').focus({ preventScroll: true }); }, 900);
  }
  function exitTheater(instant) {
    if (!theater) return;
    theater = false;
    if (instant) body.classList.add('no-trans');
    body.classList.remove('is-theater');
    if (instant) { void body.offsetWidth; body.classList.remove('no-trans'); }
    if (SCENES[current] === 'home') { drawLogo(true); LOGO().setMode('home'); }
    applySound(); if (reel.paused) reel.play().catch(function () {});
    [].forEach.call(frame.querySelectorAll('.theater button'), function (b) { b.tabIndex = -1; });
    frame.querySelector('.theater').setAttribute('aria-hidden', 'true');
    setRc(false); tick(-1, .5);
  }
  document.getElementById('th-close').addEventListener('click', function () { exitTheater(); });
  thMute.addEventListener('click', function () { reel.muted = !reel.muted; if (!reel.muted) reel.play().catch(function () {}); thMute.textContent = reel.muted ? 'Sound off' : 'Sound on'; });
  var seeking = false;
  function seekAt(e) { var r = thTrack.getBoundingClientRect(); if (reel.duration) reel.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * reel.duration; }
  thTrack.addEventListener('pointerdown', function (e) { seeking = true; thTrack.setPointerCapture(e.pointerId); seekAt(e); });
  thTrack.addEventListener('pointermove', function (e) { if (seeking) seekAt(e); });
  thTrack.addEventListener('pointerup', function () { seeking = false; });
  window.addEventListener('keydown', function (e) {
    if (!theater) return;
    if (e.key === 'Escape') { e.preventDefault(); exitTheater(); }
    else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); if (reel.paused) reel.play().catch(function () {}); else reel.pause(); }
  }, true);
  // ripple of the sound switch: leaving the player hands the reel's sound back to it
  reel.addEventListener('play', function () { rc.classList.toggle('is-pause', theater); });
  reel.addEventListener('pause', function () { rc.classList.remove('is-pause'); });

  // shared with js/desk.js
  window.WL = { cutTo: function (name) { cutTo(SCENES.indexOf(name)); }, tick: function (d, v) { tick(d, v); }, rest: rest, live: !!(CFG.supabaseUrl && CFG.supabaseAnonKey), reduce: reduce, unlock: function () { unlockSound(); } };

  // ---------- start ----------
  var first = SCENES.indexOf(location.hash.slice(1));
  snap(first > -1 ? first : 0);
  window.addEventListener('load', function () { snap(current); });   // the logo script may arrive after us
})();
