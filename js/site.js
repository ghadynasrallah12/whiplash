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
  function show(i) {
    current = i;
    var name = SCENES[i];
    body.dataset.scene = name;
    document.querySelectorAll('.scene').forEach(function (s) { s.hidden = s.dataset.scene !== name; });
    document.querySelectorAll('.nav a').forEach(function (a) { if (a.dataset.go === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (window.WHIPLASH_LOGO) window.WHIPLASH_LOGO.setMode(name === 'home' ? 'home' : 'hidden');
    if (location.hash.slice(1) !== name) history.replaceState(null, '', name === 'home' ? location.pathname : '#' + name);
  }
  function cutTo(i) {
    i = Math.max(0, Math.min(SCENES.length - 1, i));
    if (i === current || locked) return;
    locked = true;
    if (reduce) { show(i); setTimeout(function () { locked = false; }, 300); return; }
    body.classList.add('is-cutting');                        // a few black frames…
    setTimeout(function () {
      if (reel.duration) reel.currentTime = (reel.duration * i / SCENES.length) % reel.duration;   // …the reel jumps to another shot…
      show(i);
      body.classList.remove('is-cutting');                   // …and we're in the next scene
    }, 110);
    setTimeout(function () { locked = false; }, 700);
  }
  document.querySelectorAll('[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); cutTo(SCENES.indexOf(a.dataset.go)); });
  });
  document.getElementById('next').addEventListener('click', function () { cutTo(current === SCENES.length - 1 ? 0 : current + 1); });

  var wheelAcc = 0, wheelT;
  window.addEventListener('wheel', function (e) {
    wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    clearTimeout(wheelT); wheelT = setTimeout(function () { wheelAcc = 0; }, 160);
    if (Math.abs(wheelAcc) > 60) { cutTo(current + (wheelAcc > 0 ? 1 : -1)); wheelAcc = 0; }
  }, { passive: true });
  var touch = null;
  window.addEventListener('touchstart', function (e) { touch = e.touches[0] ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null; }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (!touch || !e.changedTouches[0]) return;
    var dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y, d = Math.abs(dy) > Math.abs(dx) ? dy : dx;
    if (Math.abs(d) > 50) cutTo(current + (d < 0 ? 1 : -1));
    touch = null;
  }, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].indexOf(e.key) > -1) cutTo(current + 1);
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].indexOf(e.key) > -1) cutTo(current - 1);
  });
  window.addEventListener('hashchange', function () { var i = SCENES.indexOf(location.hash.slice(1)); if (i > -1) cutTo(i); });

  // ---------- sound ----------
  var sound = document.getElementById('sound');
  sound.addEventListener('click', function () {
    reel.muted = !reel.muted;
    if (!reel.muted) reel.play().catch(function () { reel.muted = true; });
    sound.setAttribute('aria-pressed', String(!reel.muted));
  });

  // ---------- timecode (hh:mm:ss:ff of the reel) ----------
  var tc = document.getElementById('tc');
  function two(n) { return (n < 10 ? '0' : '') + n; }
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
    // the project marked "Homepage film" supplies the reel
    rest('projects?select=video_url,thumb_url&is_hero=eq.true&published=eq.true&limit=1').then(function (rows) {
      var p = rows[0]; if (!p || !p.video_url) return;
      if (p.thumb_url) reel.poster = p.thumb_url;
      reel.src = p.video_url; reel.play().catch(function () {});
    }).catch(function () {});
  }

  // ---------- start ----------
  var first = SCENES.indexOf(location.hash.slice(1));
  window.addEventListener('load', function () { show(first > -1 ? first : 0); });
  show(first > -1 ? first : 0);
})();
