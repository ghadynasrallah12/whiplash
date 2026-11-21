/* Whiplash — [03] Clients as an editing timeline.
   Four video tracks (one per kind of work) and a sound track; each client is a clip on the years ruler.
   A red playhead plays through (the clip under it lights up red), and the bar at the bottom zooms
   and pans like an editor's timeline: drag its ends to zoom, its middle to move; ⌘/Ctrl + scroll or pinch
   to zoom, scroll or swipe sideways to move; drag the playhead to scrub.
   Content: projects from the dashboard that have a client and a date become clips (their folder is the track);
   until there are any, the built-in timeline below is shown. */
(function () {
  'use strict';
  var Y0 = 2019, Y1 = 2027;   // the whole timeline, in years
  var SAMPLE = [
    { name: 'Runway cuts', clips: [[2019.3, 2020.3, 'Lancôme'], [2020.95, 2021.62, 'Puma'], [2022.55, 2023.85, 'Lancôme'], [2025.15, 2025.85, 'Puma'], [2025.95, 2026.95, 'Lancôme']] },
    { name: 'On beat', clips: [[2019.9, 2020.7, 'Adidas'], [2020.72, 2021.35, 'Zain'], [2021.37, 2022.45, 'Adidas'], [2022.95, 2023.62, 'Puma'], [2023.98, 2024.8, 'Adidas'], [2024.98, 2026.25, 'Bu Kolthoum']] },
    { name: "Director's cut", clips: [[2019.0, 2020.2, "McDonald's"], [2020.22, 2021.3, 'Samsung'], [2021.32, 2022.18, "Dewar's"], [2022.2, 2023.2, 'Samsung'], [2023.22, 2024.1, "Dewar's"], [2024.2, 2025.42, "McDonald's"], [2025.5, 2026.6, 'Zain']] },
    { name: 'Prime time', clips: [[2019.1, 2020.15, 'Pizza Hut'], [2020.17, 2021.15, 'Vice'], [2021.6, 2022.45, 'Netflix'], [2023.2, 2024.4, 'Netflix'], [2024.7, 2025.33, 'Vice'], [2025.35, 2025.95, 'Zain'], [2025.97, 2026.9, 'Netflix']] },
  ];
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  var root, area, ruler, rows, head, wave, waveCtx, bar, win, hL, hR, playBtn, tracks = SAMPLE;
  var a = 0, b = 1;            // visible window, as fractions of the whole timeline
  var ph = 0.02, playing = true, running = false, raf = 0, last = 0, dragging = null, lastClip = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WL = function () { return window.WL || {}; };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function frac(y) { return (y - Y0) / (Y1 - Y0); }
  function xOf(f) { return (f - a) / (b - a) * 100; }   // % across the visible area

  function build() {
    rows.textContent = '';
    tracks.forEach(function (t, i) {
      var r = el('div', 'tlc__row'), lab = el('div', 'tlc__lab');
      lab.appendChild(el('b', '', 'V' + (tracks.length - i))); lab.appendChild(document.createTextNode(' ' + t.name));
      r.appendChild(lab);
      var lane = el('div', 'tlc__lane'); r.appendChild(lane);
      t.els = t.clips.map(function (c) {
        var k = el('button', 'tlc__clip'); k.type = 'button'; k.appendChild(el('span', '', c[2]));
        k.addEventListener('click', function () { ph = frac(c[0]) + 0.0005; keepInView(); paint(); });
        k.addEventListener('pointerenter', function () { var t2 = WL().tick; if (t2) t2(1, .4); });
        lane.appendChild(k); return k;
      });
      rows.appendChild(r);
    });
    var r = el('div', 'tlc__row tlc__row--a'), lab = el('div', 'tlc__lab'); lab.appendChild(el('b', '', 'A1')); lab.appendChild(document.createTextNode(' Sound'));
    r.appendChild(lab); var lane = el('div', 'tlc__lane'); lane.appendChild(wave); r.appendChild(lane); rows.appendChild(r);
  }

  // ruler: years, and months once zoomed in far enough
  function paintRuler() {
    ruler.textContent = '';
    var span = (b - a) * (Y1 - Y0), step = span > 4.5 ? 1 : span > 1.6 ? 0.25 : 1 / 12;
    var first = Math.floor((Y0 + a * (Y1 - Y0)) / step) * step;
    for (var y = first; y <= Y0 + b * (Y1 - Y0) + step; y += step) {
      var x = xOf(frac(y)); if (x < -2 || x > 102) continue;
      var yr = Math.abs(y - Math.round(y)) < 1e-6, m = Math.round((y - Math.floor(y + 1e-6)) * 12) % 12;
      var t = el('i', 'tlc__tick' + (yr ? ' is-year' : '')); t.style.left = x + '%'; ruler.appendChild(t);
      if (yr || step < 1) {
        var lbl = el('span', 'tlc__yr', yr ? String(Math.round(y)) : MONTHS[m]);
        if (step === 1 / 12 && !yr && m % 3) lbl.className += ' is-faint';
        lbl.style.left = x + '%'; ruler.appendChild(lbl);
      }
      if (step === 1) for (var q = 1; q < 4; q++) { var s = el('i', 'tlc__tick is-minor'); s.style.left = xOf(frac(y + q / 4)) + '%'; ruler.appendChild(s); }
    }
  }
  function paintWave() {
    var r = wave.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!r.width) return;
    if (wave.width !== Math.round(r.width * dpr)) { wave.width = Math.round(r.width * dpr); wave.height = Math.round(r.height * dpr); }
    waveCtx.setTransform(dpr, 0, 0, dpr, 0, 0); waveCtx.clearRect(0, 0, r.width, r.height);
    var n = Math.round(r.width / 4), mid = r.height / 2, px = xOf(ph) / 100 * r.width;
    for (var i = 0; i < n; i++) {
      var x = i * 4, f = a + (b - a) * (x / r.width), s = f * 900;
      var amp = (0.25 + 0.75 * Math.abs(Math.sin(s * 1.7) * Math.sin(s * 0.31 + 1) * Math.cos(s * 0.13))) * (0.55 + 0.45 * Math.abs(Math.sin(s * 5.3)));
      waveCtx.fillStyle = x < px ? '#ce1e27' : 'rgba(240,240,245,.55)';
      var h = Math.max(2, amp * r.height * 0.9); waveCtx.fillRect(x, mid - h / 2, 2, h);
    }
  }
  var laneW = 1;
  function paint() {
    laneW = area.getBoundingClientRect().width || 1;
    tracks.forEach(function (t) {
      t.clips.forEach(function (c, k) {
        var e = t.els[k], x0 = xOf(frac(c[0])), x1 = xOf(frac(c[1]));
        e.style.left = x0 + '%'; e.style.width = Math.max(0.2, x1 - x0) + '%';
        e.firstChild.style.marginLeft = x0 < 0 ? (Math.min(-x0, x1 - x0 - 6) / 100 * laneW) + 'px' : '';   // a clip that starts off-screen keeps its name in view
        e.hidden = x1 < -1 || x0 > 101;
        var on = ph >= frac(c[0]) && ph <= frac(c[1]);
        e.classList.toggle('is-on', on);
        if (on && lastClip !== e && running) { lastClip = e; var tk = WL().tick; if (tk && !dragging) tk(1, .35); }
      });
    });
    var hx = xOf(ph); head.style.left = hx + '%'; head.hidden = hx < 0 || hx > 100;
    win.style.left = (a * 100) + '%'; win.style.width = ((b - a) * 100) + '%';
    paintRuler(); paintWave();
  }
  function setWindow(na, nb) {
    var minW = 1 / ((Y1 - Y0) * 12) * 6;   // never closer than six months across
    if (nb - na < minW) { var c = (na + nb) / 2; na = c - minW / 2; nb = c + minW / 2; }
    var w = nb - na; if (na < 0) { na = 0; nb = w; } if (nb > 1) { nb = 1; na = 1 - w; }
    a = Math.max(0, na); b = Math.min(1, nb); paint();
  }
  function zoom(k, at) { at = at == null ? (a + b) / 2 : at; setWindow(at - (at - a) * k, at + (b - at) * k); }
  function keepInView() { var w = b - a; if (ph < a || ph > b) setWindow(ph - w * 0.1, ph - w * 0.1 + w); }

  function loop(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now;
    if (playing && !dragging && !reduce) {
      ph += dt / 34;                                  // the whole timeline plays in about half a minute
      if (ph > 1) { ph = 0; lastClip = null; }
      if (b - a < 0.999 && ph > b - (b - a) * 0.08) setWindow(a + dt / 34, b + dt / 34);   // zoomed in: the view follows the playhead
    }
    paint();
    if (running) raf = requestAnimationFrame(loop);
  }

  function bind() {
    // the zoom bar: ends zoom, middle moves
    function barDrag(kind) {
      return function (e) {
        e.preventDefault(); e.stopPropagation(); bar.setPointerCapture(e.pointerId);
        dragging = { kind: kind, x: e.clientX, a: a, b: b, w: bar.getBoundingClientRect().width };
      };
    }
    hL.addEventListener('pointerdown', barDrag('l')); hR.addEventListener('pointerdown', barDrag('r')); win.addEventListener('pointerdown', barDrag('m'));
    bar.addEventListener('pointerdown', function (e) {   // a click on the empty bar jumps the window there
      if (e.target !== bar) return; var r = bar.getBoundingClientRect(), f = (e.clientX - r.left) / r.width, w = b - a; setWindow(f - w / 2, f + w / 2);
    });
    bar.addEventListener('pointermove', function (e) {
      if (!dragging || !dragging.kind || dragging.kind === 'ph') return;
      var d = (e.clientX - dragging.x) / dragging.w;
      if (dragging.kind === 'm') setWindow(dragging.a + d, dragging.b + d);
      else if (dragging.kind === 'l') setWindow(Math.min(dragging.a + d, b - 0.02), b);
      else setWindow(a, Math.max(dragging.b + d, a + 0.02));
    });
    function stop() { dragging = null; root.classList.remove('is-scrubbing'); }
    bar.addEventListener('pointerup', stop); bar.addEventListener('pointercancel', stop);
    // the playhead: grab it (or click the ruler) to scrub
    function scrubTo(e) { var r = area.getBoundingClientRect(); ph = Math.max(0, Math.min(1, a + (b - a) * (e.clientX - r.left) / r.width)); lastClip = null; paint(); }
    [head, ruler].forEach(function (t) {
      t.addEventListener('pointerdown', function (e) { e.preventDefault(); t.setPointerCapture(e.pointerId); dragging = { kind: 'ph' }; root.classList.add('is-scrubbing'); scrubTo(e); });
      t.addEventListener('pointermove', function (e) { if (dragging && dragging.kind === 'ph') scrubTo(e); });
      t.addEventListener('pointerup', stop); t.addEventListener('pointercancel', stop);
    });
    // trackpad / wheel: ⌘ or Ctrl (and pinch) zooms around the pointer, otherwise it moves the view
    area.addEventListener('wheel', function (e) {
      e.preventDefault();
      var r = area.getBoundingClientRect(), at = a + (b - a) * (e.clientX - r.left) / r.width;
      if (e.ctrlKey || e.metaKey) zoom(Math.exp(e.deltaY * 0.01), at);
      else { var d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) / r.width * (b - a); setWindow(a + d, b + d); }
    }, { passive: false });
    // touch: one finger swipes, two fingers pinch
    var touches = {}, pinch = null;
    area.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'touch') return; touches[e.pointerId] = e.clientX; });
    area.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'touch' || touches[e.pointerId] == null) return;
      var ids = Object.keys(touches), r = area.getBoundingClientRect();
      if (ids.length === 1) { var d = -(e.clientX - touches[e.pointerId]) / r.width * (b - a); setWindow(a + d, b + d); }
      else if (ids.length === 2) {
        var other = touches[ids[0] == e.pointerId ? ids[1] : ids[0]], dist = Math.abs(e.clientX - other);
        if (pinch) zoom(pinch / Math.max(20, dist), a + (b - a) * ((e.clientX + other) / 2 - r.left) / r.width);
        pinch = dist;
      }
      touches[e.pointerId] = e.clientX;
    });
    function tUp(e) { delete touches[e.pointerId]; pinch = null; }
    area.addEventListener('pointerup', tUp); area.addEventListener('pointercancel', tUp);
    root.querySelector('[data-z="out"]').addEventListener('click', function () { zoom(1.6); });
    root.querySelector('[data-z="in"]').addEventListener('click', function () { zoom(1 / 1.6, ph); });
    root.querySelector('[data-z="fit"]').addEventListener('click', function () { setWindow(0, 1); });
    playBtn.addEventListener('click', function () { playing = !playing; playBtn.textContent = playing ? 'Pause' : 'Play'; });
    window.addEventListener('resize', function () { if (running) paint(); });
  }

  // dashboard content: projects with a client and a date; their folder is the track
  function fromProjects(projects, categories) {
    var byCat = {};
    projects.forEach(function (p) {
      if (!p.client || !p.released || !p.category_id) return;
      var d = new Date(p.released); if (isNaN(d)) return;
      var s = d.getFullYear() + d.getMonth() / 12, len = Math.max(1, +p.months || 3) / 12;
      (byCat[p.category_id] = byCat[p.category_id] || []).push([s, s + len, p.client]);
    });
    var out = categories.filter(function (c) { return byCat[c.id]; }).map(function (c) {
      return { name: c.name, clips: byCat[c.id].sort(function (x, y) { return x[0] - y[0]; }) };
    });
    if (!out.length) return null;
    var lo = Infinity, hi = -Infinity;
    out.forEach(function (t) { t.clips.forEach(function (c) { lo = Math.min(lo, c[0]); hi = Math.max(hi, c[1]); }); });
    Y0 = Math.floor(lo); Y1 = Math.max(Y0 + 1, Math.ceil(hi + 0.05));
    return out;
  }

  window.WL_CLIENTS = {
    init: function () {
      root = document.getElementById('tlc'); if (!root) return;
      area = root.querySelector('.tlc__area'); ruler = root.querySelector('.tlc__ruler'); rows = root.querySelector('.tlc__rows');
      head = root.querySelector('.tlc__head'); bar = root.querySelector('.tlc__bar'); win = root.querySelector('.tlc__win');
      hL = root.querySelector('.tlc__h--l'); hR = root.querySelector('.tlc__h--r'); playBtn = root.querySelector('[data-z="play"]');
      wave = el('canvas', 'tlc__wave'); waveCtx = wave.getContext('2d');
      build(); bind();
    },
    load: function (projects, categories) { var t = fromProjects(projects || [], categories || []); if (t) { tracks = t; if (rows) build(); if (running) paint(); } },
    show: function () {
      if (!root) return; root.hidden = false; void root.offsetWidth; root.classList.add('is-in');
      if (!running) { running = true; last = 0; lastClip = null; raf = requestAnimationFrame(loop); }
    },
    hide: function () { if (!root) return; running = false; cancelAnimationFrame(raf); root.classList.remove('is-in'); root.hidden = true; },
  };
})();
