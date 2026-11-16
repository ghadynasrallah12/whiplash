// =========================================================
// WHIPLASH — site
//   scenes   : six of them; scroll / swipe / arrows / nav "cut" between them
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
    setTimeout(function () { about.hidden = true; locked = false; }, 900);
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
  var wheelAcc = 0, wheelT;
  window.addEventListener('wheel', function (e) {
    wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    clearTimeout(wheelT); wheelT = setTimeout(function () { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) > 30) { step(wheelAcc > 0 ? 1 : -1); wheelAcc = 0; }
  }, { passive: true });
  var touch = null;
  window.addEventListener('touchstart', function (e) { touch = e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (!touch || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y, d = Math.abs(dy) > Math.abs(dx) ? dy : dx;
    if (Math.abs(d) > 50) step(d < 0 ? 1 : -1);
    touch = null;
  }, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', 'PageDown'].indexOf(e.key) > -1) step(1);
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) > -1) step(-1);
  });
  window.addEventListener('hashchange', function () { var i = SCENES.indexOf(location.hash.slice(1)); if (i > -1) cutTo(i); });

  // ---------- letter shuffle + hover sound (the effect from the old Projects list) ----------
  // scramble(el, text): each letter runs through random capitals, left to right, flipping
  // italic / light while it runs, with a small wave through the word.
  var scTimers = new WeakMap(), ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function scramble(el, text) {
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
        else if (t < end) { c.s.textContent = ABC[(Math.random() * 26) | 0]; c.s.className = 'sc sc--wave' + c.style; done = false; }
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
    if (reduce || !ac) return;
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
      b.addEventListener('click', function (e) { setChapter(i); if (e.detail && !b.classList.contains('is-hover')) chapterFx(i); });
      b.addEventListener('focus', function () { setChapter(i); });
      chTrack.appendChild(b);
    });
    chapter = Math.min(chapter, CHAPTERS.length - 1);
    setChapter(chapter, true);
  }
  var swapT;
  function setChapter(i, instant) {
    if (!CHAPTERS.length) return;
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

  // ---------- sound ----------
  var sound = document.getElementById('sound');
  sound.addEventListener('click', function () {
    reel.muted = !reel.muted;
    if (!reel.muted) reel.play().catch(function () { reel.muted = true; });
    sound.setAttribute('aria-pressed', String(!reel.muted));
  });

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
    rest('chapters?select=title,caption,image_url&order=position').then(function (rows) {
      if (rows.length) { CHAPTERS = rows; renderChapters(); }
    }).catch(function () { /* table not there yet: keep the built-in chapters */ });
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
