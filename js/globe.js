/* Whiplash — the Countries globe.
   A dotted Earth on a canvas: drag to turn it, tap or hover a city to pick it.
   Lines run from Beirut to every city (solid = worked there, dotted = to confirm),
   and small dots keep travelling out of Beirut along them.
   Land dots come from js/globe-land.js (window.WL_LAND). */
(function () {
  'use strict';
  var TAU = Math.PI * 2, RAD = Math.PI / 180;

  // ok: true = worked there (solid line), false = to confirm (dotted line, "?" on the label)
  // dx/dy: which side of the dot the label sits on, so close cities don't overlap
  var CITIES = [
    { key: 'beirut',     name: 'Beirut',      lat: 33.89, lon: 35.50,   ok: true,  dx: -1, dy: -1 },
    { key: 'dubai',      name: 'Dubai',       lat: 25.20, lon: 55.27,   ok: true,  dx: 1,  dy: -0.4 },
    { key: 'riyadh',     name: 'Riyadh',      lat: 24.71, lon: 46.68,   ok: true,  dx: 1,  dy: 1.2 },
    { key: 'jeddah',     name: 'Jeddah',      lat: 21.49, lon: 39.19,   ok: true,  dx: -1, dy: 1.3 },
    { key: 'paris',      name: 'Paris',       lat: 48.86, lon: 2.35,    ok: false, dx: 1,  dy: 0.6 },
    { key: 'london',     name: 'London',      lat: 51.51, lon: -0.13,   ok: false, dx: -1, dy: -0.8 },
    { key: 'newyork',    name: 'New York',    lat: 40.71, lon: -74.01,  ok: false, dx: 1,  dy: 0 },
    { key: 'losangeles', name: 'Los Angeles', lat: 34.05, lon: -118.24, ok: false, dx: -1, dy: 0 },
  ];
  var HOME = CITIES[0];

  var canvas, ctx, dpr = 1, W = 0, H = 0, cx = 0, cy = 0, R = 0, mobile = false;
  var lat0 = 22, lon0 = 28, tLat = 22, tLon = 28;          // centre of view (degrees) and where it's easing to
  var vLon = 0, vLat = 0, dragging = null, moved = 0;
  var land = null, arcs = [], picked = null, onPick = null, running = false, raf = 0, t0 = 0, last = 0;
  var hits = [], hover = null, appear = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FONT = '500 11px "PP Neue Montreal", "Helvetica Neue", Helvetica, Arial, sans-serif';

  function unit(lat, lon) { var a = lat * RAD, b = lon * RAD; return [Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b)]; }
  function decodeLand() {
    var b64 = window.WL_LAND || '', bin = atob(b64), n = bin.length / 4, out = new Float32Array(n * 3);
    var buf = new Int16Array(new Uint8Array(bin.split('').map(function (c) { return c.charCodeAt(0); })).buffer);
    for (var i = 0; i < n; i++) { var u = unit(buf[i * 2] / 10, buf[i * 2 + 1] / 10); out[i * 3] = u[0]; out[i * 3 + 1] = u[1]; out[i * 3 + 2] = u[2]; }
    return out;
  }
  // a great-circle arc from Beirut, lifted off the surface (higher for far cities)
  function makeArc(c) {
    var a = unit(HOME.lat, HOME.lon), b = unit(c.lat, c.lon);
    var dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])), om = Math.acos(dot), so = Math.sin(om) || 1;
    var lift = 0.05 + 0.34 * om / Math.PI, pts = [], N = 72;
    for (var i = 0; i <= N; i++) {
      var t = i / N, s1 = Math.sin((1 - t) * om) / so, s2 = Math.sin(t * om) / so, h = 1 + Math.sin(Math.PI * t) * lift;
      pts.push([(a[0] * s1 + b[0] * s2) * h, (a[1] * s1 + b[1] * s2) * h, (a[2] * s1 + b[2] * s2) * h]);
    }
    return { city: c, pts: pts, p: 0 };
  }
  // rotate a world vector into view space: turn by the centre longitude, then tip by the centre latitude
  var cl, sl, ca, sa;
  function setView() { cl = Math.cos(-lon0 * RAD); sl = Math.sin(-lon0 * RAD); ca = Math.cos(lat0 * RAD); sa = Math.sin(lat0 * RAD); }
  function view(x, y, z, out) {
    var x1 = x * cl + z * sl, z1 = -x * sl + z * cl;          // about the vertical axis
    out[0] = x1; out[1] = y * ca - z1 * sa; out[2] = y * sa + z1 * ca;   // about the horizontal axis
    return out;
  }
  var V = [0, 0, 0];
  function visible(v) { return v[2] > 0 || v[0] * v[0] + v[1] * v[1] > 1.0005; }

  function size() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    mobile = W < 760;
    if (mobile) { cx = W / 2; cy = H / 2; R = Math.min(W, H) * 0.44; }
    else { cx = W * 0.70; cy = H * 0.5; R = Math.min(W * 0.205, H * 0.355); }
  }

  function draw(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
    var t = (now - t0) / 1000;
    // motion: drag inertia, else ease toward the target view
    if (!dragging) {
      if (Math.abs(vLon) > 0.01 || Math.abs(vLat) > 0.01) { tLon += vLon; tLat += vLat; vLon *= 0.93; vLat *= 0.93; }
      tLat = Math.max(-55, Math.min(60, tLat));
    }
    var dl = ((tLon - lon0 + 540) % 360) - 180;
    lon0 += dl * Math.min(1, dt * (dragging ? 30 : 4)); lat0 += (tLat - lat0) * Math.min(1, dt * (dragging ? 30 : 4));
    setView();
    appear = reduce ? 1 : Math.min(1, t / 0.9);
    var ap = 1 - Math.pow(1 - appear, 3), rr = R * (0.88 + 0.12 * ap);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = ap;
    // the sphere: a darker red disc with a soft rim, lit from the top left
    var g = ctx.createRadialGradient(cx - rr * 0.35, cy - rr * 0.4, rr * 0.1, cx, cy, rr);
    g.addColorStop(0, 'rgba(60,0,4,0.10)'); g.addColorStop(0.75, 'rgba(40,0,3,0.22)'); g.addColorStop(1, 'rgba(20,0,2,0.38)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(240,240,245,0.12)'; ctx.lineWidth = 1; ctx.stroke();

    // land dots, front side only, fading toward the edge
    if (land) {
      var n = land.length / 3, s = Math.max(1.1, rr / 230), half = s / 2;
      ctx.fillStyle = '#f0f0f5';
      for (var band = 0; band < 4; band++) {
        ctx.globalAlpha = ap * (0.28 + band * 0.22);
        var lo = band * 0.25, hi = lo + 0.25;
        for (var i = 0; i < n; i++) {
          view(land[i * 3], land[i * 3 + 1], land[i * 3 + 2], V);
          var z = V[2]; if (z <= 0) continue;
          var zz = Math.min(0.999, z * 1.25); if (zz < lo || zz >= hi) continue;
          ctx.fillRect(cx + V[0] * rr - half, cy - V[1] * rr - half, s, s);
        }
      }
      ctx.globalAlpha = ap;
    }

    // the lines out of Beirut: drawn one after another, then a dot keeps travelling along each
    var since = t - 0.7;
    arcs.forEach(function (a, k) {
      a.p = reduce ? 1 : Math.max(0, Math.min(1, (since - k * 0.32) / 0.8));
      if (a.p <= 0) return;
      var on = !picked || picked === a.city || picked === HOME;
      ctx.strokeStyle = on ? 'rgba(18,3,4,0.85)' : 'rgba(18,3,4,0.3)';
      ctx.lineWidth = picked === a.city ? 2 : 1.3;
      ctx.setLineDash(a.city.ok ? [] : [2, 4]);
      ctx.beginPath(); var pen = false, last = Math.round(a.p * (a.pts.length - 1));
      for (var j = 0; j <= last; j++) {
        var q = a.pts[j]; view(q[0], q[1], q[2], V);
        if (!visible(V)) { pen = false; continue; }
        var x = cx + V[0] * rr, y = cy - V[1] * rr;
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (a.p >= 1 && !reduce) {   // the travelling dot
        var u = ((t * 0.42 + k * 0.137) % 1), idx = u * (a.pts.length - 1), j0 = Math.floor(idx), f = idx - j0, p0 = a.pts[j0], p1 = a.pts[Math.min(a.pts.length - 1, j0 + 1)];
        view(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f, V);
        if (visible(V)) {
          ctx.globalAlpha = ap * Math.sin(Math.PI * u);
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx + V[0] * rr, cy - V[1] * rr, 2.4, 0, TAU); ctx.fill();
          ctx.globalAlpha = ap;
        }
      }
    });

    // cities: a small square on the surface and a label; Beirut shows first, the others when their line arrives
    hits = [];
    ctx.font = FONT; ctx.textBaseline = 'middle';
    CITIES.forEach(function (c, i) {
      var shown = c === HOME ? since > -0.2 : (arcs[i - 1] && arcs[i - 1].p >= 1);
      if (!shown) return;
      var u = c.u || (c.u = unit(c.lat, c.lon)); view(u[0], u[1], u[2], V);
      if (V[2] < 0.04) return;
      var fade = Math.min(1, (V[2] - 0.04) / 0.18), x = cx + V[0] * rr, y = cy - V[1] * rr, sel = picked === c, hov = hover === c;
      ctx.globalAlpha = ap * fade;
      ctx.fillStyle = c === HOME ? '#fff' : '#f0f0f5'; ctx.strokeStyle = '#120304'; ctx.lineWidth = 1.2;
      var m = c === HOME ? 4 : 3; ctx.fillRect(x - m, y - m, m * 2, m * 2); ctx.strokeRect(x - m, y - m, m * 2, m * 2);
      var label = '[' + (i < 9 ? '0' : '') + (i + 1) + '] ' + c.name.toUpperCase() + (c.ok ? '' : ' ?');
      var tw = ctx.measureText(label).width, bw = tw + 12, bh = 18;
      var bx = c.dx > 0 ? x + 9 : x - 9 - bw, by = y - bh / 2 + c.dy * 11;
      ctx.fillStyle = sel ? '#0a0a0c' : (hov ? '#fff' : '#f0f0f5'); ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = sel ? '#fff' : '#0a0a0c'; ctx.fillText(label, bx + 6, by + bh / 2 + 0.5);
      ctx.globalAlpha = ap;
      if (fade > 0.5) hits.push({ c: c, x: bx, y: by, w: bw, h: bh, px: x, py: y });
    });
    ctx.globalAlpha = 1;
    if (running) raf = requestAnimationFrame(draw);
  }

  function hitAt(e) {
    var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (var i = hits.length - 1; i >= 0; i--) {
      var h = hits[i];
      if ((x >= h.x - 3 && x <= h.x + h.w + 3 && y >= h.y - 3 && y <= h.y + h.h + 3) || Math.hypot(x - h.px, y - h.py) < 12) return h.c;
    }
    return null;
  }
  function onGlobe(e) { var r = canvas.getBoundingClientRect(); return Math.hypot(e.clientX - r.left - cx, e.clientY - r.top - cy) < R * 1.05; }

  function bind() {
    canvas.addEventListener('pointerdown', function (e) {
      if (!onGlobe(e) && !hitAt(e)) return;
      dragging = { x: e.clientX, y: e.clientY }; moved = 0; vLon = vLat = 0;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing');
    });
    canvas.addEventListener('pointermove', function (e) {
      if (dragging) {
        var dx = e.clientX - dragging.x, dy = e.clientY - dragging.y; dragging.x = e.clientX; dragging.y = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
        var k = 57.3 / R * 0.9; vLon = -dx * k; vLat = dy * k; tLon += vLon; tLat = Math.max(-55, Math.min(60, tLat + vLat));
        return;
      }
      var c = hitAt(e); hover = c;
      canvas.style.cursor = c ? 'pointer' : (onGlobe(e) ? 'grab' : '');
      if (c && e.pointerType === 'mouse' && c !== picked) pick(c, false);
    });
    function up(e) {
      if (!dragging) return;
      dragging = null; canvas.classList.remove('is-grabbing');
      if (moved < 6) { var c = hitAt(e); if (c) pick(c, true); vLon = vLat = 0; }
    }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointerleave', function () { hover = null; });
    window.addEventListener('resize', function () { if (running) size(); });
  }

  // pick a city: highlight it, its line and its label; turn the globe to it when asked
  function pick(c, turn) {
    if (typeof c === 'string') c = CITIES.filter(function (x) { return x.key === c; })[0];
    picked = c || null;
    if (c && turn) { tLon = c.lon; tLat = Math.max(-30, Math.min(45, c.lat * 0.8)); vLon = vLat = 0; }
    if (onPick) onPick(c);
  }

  window.WL_GLOBE = {
    cities: CITIES,
    init: function (el, cb) {
      canvas = el; ctx = canvas.getContext('2d'); onPick = cb;
      arcs = CITIES.slice(1).map(makeArc); bind();
    },
    start: function () {
      if (!land && window.WL_LAND) land = decodeLand();
      size(); picked = HOME; hover = null; lat0 = tLat = 24; lon0 = tLon = 30; vLon = vLat = 0;
      t0 = performance.now(); last = 0; running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    },
    stop: function () { running = false; cancelAnimationFrame(raf); },
    pick: function (key, turn) { pick(key, turn !== false); },
    ready: function () { return running && (performance.now() - t0) / 1000 > 0.7 + CITIES.length * 0.32; },
  };
})();
