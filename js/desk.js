// =========================================================
// WHIPLASH — [04] Projects: a Mac desktop
//   Desktop      : menu bar + one PROJECTS folder (double-click to open)
//   PROJECTS     : a window of folders, one per category (dashboard → Projects → Categories)
//   Finder       : the projects in a folder, icons or list, scrollable, searchable
//   Quick Look   : plays a project (double-click, Enter or Space)
// Content comes from the dashboard; the projects below are the fallback.
// =========================================================
(function () {
  'use strict';
  var WL = window.WL || {};
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;
  var touch = matchMedia('(hover: none)').matches;
  var tick = function (d, v) { if (WL.tick) WL.tick(d, v); };

  // ---------- fallback content ----------
  var CATS = [
    { id: 'c1', name: 'Runway cuts' }, { id: 'c2', name: 'On beat' }, { id: 'c3', name: "Director's cut" },
    { id: 'c4', name: 'Full throttle' }, { id: 'c5', name: 'Postcards' }, { id: 'c6', name: 'Prime time' },
  ];
  var cr = [['Director', 'Name Surname'], ['Producer', 'Name Surname'], ['Colorist', 'Name Surname'], ['Client', 'Client name']];
  var PROJECTS = [
    ['Whiplash', 'Showreel', 'c3', 'hero-poster', 'assets/hero.mp4'], ['Night Shift', 'Music Video', 'c2', 'work-1'], ['Velvet Static', 'Fashion Film', 'c1', 'work-2'],
    ['Hollow Ground', 'Documentary', 'c3', 'work-3'], ['Paper Moon', 'Ad', 'c6', 'work-4'], ['Saint Nobody', 'Profile Film', 'c5', 'work-5'],
    ['Glass Hours', 'Short Film', 'c3', 'work-6'], ['Low Tide', 'Fashion Film', 'c1', 'work-7'], ['Mercury Lane', 'Ad', 'c4', 'work-8'],
    ['Afterglow', 'Music Video', 'c2', 'work-9'], ['Tin Halo', 'Profile Film', 'c5', 'work-10'], ['Concrete Hymn', 'Fashion Film', 'c1', 'work-11'],
    ['Wild Signal', 'Ad', 'c4', 'work-12'], ['Second Skin', 'Short Film', 'c6', 'work-13'],
  ].map(function (p, i) { return { id: 'p' + i, name: p[0], type: p[1], category_id: p[2], thumb_url: 'assets/' + p[3] + '.jpg', video_url: p[4] || '', film_link: '', description: 'From offline to online edit, VFX, grading and full creative direction, we shape every stage of the process.', credits: cr }; });

  // ---------- helpers ----------
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function svg(html, cls) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); if (cls) s.setAttribute('class', cls); s.innerHTML = html; return s; }
  var MARK = '<path d="M0 0H21.2V82A21.2 21.2 0 0 1 0 60.8Z"/><path d="M42.7 0H63.9V60.6A21.4 21.4 0 0 0 85.3 82H106.6V100H39.3A18 18 0 0 1 21.3 82A21.4 21.4 0 0 0 42.7 60.6Z"/><path d="M85.4 0H106.6V60.6H93.4A8 8 0 0 1 85.4 52.6Z"/>';
  var FOLDER = '<path d="M0 7a7 7 0 0 1 7-7h25.5a5 5 0 0 1 3.6 1.5L42 8h51a7 7 0 0 1 7 7v56a7 7 0 0 1-7 7H7a7 7 0 0 1-7-7z" style="fill:var(--f-back,#4d84de)"/><rect y="17" width="100" height="61" rx="7" style="fill:var(--f-front,#75a3ec)"/><rect y="17" width="100" height="2.2" style="fill:var(--f-edge,#a9c6f6)" opacity=".9"/>';   // colours from CSS: .is-red turns it Whiplash red
  var X = '<path d="M2 2l6 6M8 2l-6 6"/>', MIN = '<path d="M1.5 5h7"/>', MAX = '<path d="M2 2h3M2 2v3M8 8H5M8 8V5"/>';
  function icon(name, cls) {
    var b = el('button', 'ficon' + (cls ? ' ' + cls : '')); b.type = 'button';
    var s = svg(FOLDER); s.setAttribute('viewBox', '0 0 100 78'); s.setAttribute('aria-hidden', 'true');
    b.appendChild(s); b.appendChild(el('span', 'ficon__label', name));
    return b;
  }
  // single click selects, double click (or Enter, or one tap on a phone) opens
  function clickable(node, onSelect, onOpen) {
    node.addEventListener('click', function (e) { e.stopPropagation(); onSelect(); if (touch || e.detail === 0) onOpen(); });
    node.addEventListener('dblclick', function (e) { e.stopPropagation(); onOpen(); });
    node.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); onOpen(); } });
  }
  function lights(onClose, onMin, onMax) {
    var l = el('div', 'lights');
    [['l-close', X, 'Close', onClose], ['l-min', MIN, 'Minimise', onMin], ['l-max', MAX, 'Zoom', onMax]].forEach(function (d) {
      var b = el('button', d[0]); b.type = 'button'; b.setAttribute('aria-label', d[2]);
      var s = svg(d[1]); s.setAttribute('viewBox', '0 0 10 10'); b.appendChild(s);
      b.addEventListener('click', function (e) { e.stopPropagation(); d[3](); });
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      l.appendChild(b);
    });
    return l;
  }

  // ---------- build the desktop ----------
  var desk = el('div', 'desk'); desk.id = 'desk'; desk.hidden = true; desk.setAttribute('aria-label', 'Projects');
  var mb = el('header', 'mb');
  var logo = svg(MARK, 'mb__logo'); logo.setAttribute('viewBox', '0 0 106.6 100'); logo.setAttribute('aria-hidden', 'true');
  var homeBtn = el('button', 'mb__home', '← Home'); homeBtn.type = 'button';
  var menus = el('nav', 'mb__menus');
  var clock = el('span', 'mb__clock');
  mb.appendChild(logo); mb.appendChild(el('span', 'mb__app', 'Whiplash')); mb.appendChild(homeBtn); mb.appendChild(menus); mb.appendChild(clock);
  desk.appendChild(mb);

  var deskIconWrap = el('div', 'desk__icon');
  var rootIcon = icon('Projects', 'is-red'); deskIconWrap.appendChild(rootIcon); desk.appendChild(deskIconWrap);   // the desktop folder is Whiplash red
  var hint = el('p', 'desk__hint', touch ? 'Tap the folder to open it' : 'Double-click the folder to open it'); desk.appendChild(hint);

  // PROJECTS window
  var rootWin = el('section', 'win win--root'); rootWin.hidden = true; rootWin.setAttribute('aria-label', 'Projects');
  var rootBar = el('div', 'win__bar'); var rootCount = el('span', 'win__count');
  rootBar.appendChild(lights(function () { closeWin(rootWin, rootIcon); }, function () { closeWin(rootWin, null); }, function () { rootWin.classList.toggle('is-max'); }));
  rootBar.appendChild(el('span', 'win__title', 'Projects')); rootBar.appendChild(rootCount);
  var rootGrid = el('div', 'root__grid');
  rootWin.appendChild(rootBar); rootWin.appendChild(rootGrid); desk.appendChild(rootWin);

  // Finder window
  var fd = el('section', 'win win--finder fd'); fd.hidden = true; fd.setAttribute('aria-label', 'Folder');
  var fdBar = el('div', 'win__bar fd__bar');
  var navBox = el('div', 'fd__nav');
  var back = el('button'); back.type = 'button'; back.setAttribute('aria-label', 'Back'); back.appendChild(svg('<path d="M10 3L5 8l5 5"/>')); back.firstChild.setAttribute('viewBox', '0 0 16 16');
  var fwd = el('button'); fwd.type = 'button'; fwd.setAttribute('aria-label', 'Forward'); fwd.appendChild(svg('<path d="M6 3l5 5-5 5"/>')); fwd.firstChild.setAttribute('viewBox', '0 0 16 16');
  navBox.appendChild(back); navBox.appendChild(fwd);
  var fdTitle = el('span', 'win__title');
  var views = el('div', 'fd__views');
  var vIcons = el('button'); vIcons.type = 'button'; vIcons.setAttribute('aria-label', 'Show as icons'); vIcons.appendChild(svg('<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>')); vIcons.firstChild.setAttribute('viewBox', '0 0 16 16');
  var vList = el('button'); vList.type = 'button'; vList.setAttribute('aria-label', 'Show as list'); vList.appendChild(svg('<path d="M5 4h9M5 8h9M5 12h9M2 4h.01M2 8h.01M2 12h.01"/>')); vList.firstChild.setAttribute('viewBox', '0 0 16 16');
  views.appendChild(vIcons); views.appendChild(vList);
  var search = el('label', 'fd__search'); var sIn = el('input'); sIn.type = 'search'; sIn.placeholder = 'Search'; sIn.setAttribute('aria-label', 'Search projects');
  var sIco = svg('<circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/>'); sIco.setAttribute('viewBox', '0 0 16 16'); search.appendChild(sIco); search.appendChild(sIn);
  fdBar.appendChild(lights(function () { closeWin(fd, fdFrom); }, function () { closeWin(fd, null); }, function () { fd.classList.toggle('is-max'); }));
  fdBar.appendChild(navBox); fdBar.appendChild(fdTitle); fdBar.appendChild(views); fdBar.appendChild(search);
  var fdMain = el('div', 'fd__main'), side = el('nav', 'fd__side'), list = el('div', 'fd__list'), status = el('div', 'fd__status');
  side.setAttribute('aria-label', 'Folders');
  var right = el('div'); right.style.cssText = 'flex:1;display:flex;flex-direction:column;min-width:0';
  right.appendChild(list); right.appendChild(status);
  fdMain.appendChild(side); fdMain.appendChild(right);
  fd.appendChild(fdBar); fd.appendChild(fdMain); desk.appendChild(fd);

  // Quick Look
  var ql = el('div', 'ql'); ql.hidden = true; ql.setAttribute('role', 'dialog'); ql.setAttribute('aria-label', 'Project');
  desk.appendChild(ql);
  document.body.appendChild(desk);

  // ---------- clock ----------
  function paintClock() {
    var d = new Date();
    clock.textContent = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '') + '  ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  paintClock(); setInterval(paintClock, 15000);

  // ---------- selection on the desktop ----------
  function deselect(scope) { [].forEach.call((scope || desk).querySelectorAll('.is-sel'), function (n) { n.classList.remove('is-sel'); }); }
  desk.addEventListener('click', function (e) { if (e.target === desk || e.target === deskIconWrap) { deselect(desk); closeMenus(); } });
  clickable(rootIcon, function () { deselect(desk); rootIcon.classList.add('is-sel'); tick(1, .3); }, function () { openRoot(); });

  // ---------- windows: open from an icon, close back into it, drag by the title bar ----------
  var front = null;
  function toFront(w) { [rootWin, fd].forEach(function (x) { x.classList.toggle('is-front', x === w); }); front = w; }
  function place(w, wv, hv) {
    var mbH = mb.offsetHeight, W = innerWidth, H = innerHeight;
    var ww = w.offsetWidth || wv, wh = w.offsetHeight || hv;
    w.style.left = Math.max(8, (W - ww) / 2) + 'px';
    w.style.top = Math.max(mbH + 8, mbH + (H - mbH - wh) / 2) + 'px';
  }
  function zoomFrom(w, from, closing, done) {
    var r = w.getBoundingClientRect(), f = from ? from.getBoundingClientRect() : { left: innerWidth / 2 - 20, top: innerHeight - 30, width: 40, height: 20 };
    var t = 'translate(' + (f.left - r.left) + 'px,' + (f.top - r.top) + 'px) scale(' + (f.width / r.width) + ',' + (f.height / r.height) + ')';
    if (reduce) { w.style.transform = ''; w.style.opacity = closing ? 0 : 1; if (done) done(); return; }
    if (!closing) { w.classList.remove('is-zooming'); w.style.transform = t; w.style.opacity = '.2'; void w.offsetWidth; }
    w.classList.add('is-zooming');
    w.style.transform = closing ? t : ''; w.style.opacity = closing ? '0' : '1';
    setTimeout(function () { w.classList.remove('is-zooming'); if (done) done(); }, 520);
  }
  function openWin(w, from) {
    if (!w.hidden) { toFront(w); return; }
    w.hidden = false; place(w); toFront(w);
    if (from) { from.classList.add('is-opening'); setTimeout(function () { from.classList.remove('is-opening'); }, 300); }
    zoomFrom(w, from, false);
    tick(1, .45);
  }
  function closeWin(w, to) {
    if (w.hidden) return;
    if (w === fd) closeQL(true);
    zoomFrom(w, to && document.contains(to) && !to.closest('[hidden]') ? to : null, true, function () {
      w.hidden = true; w.style.transform = ''; w.style.opacity = ''; w.classList.remove('is-max');
      var other = w === fd ? rootWin : fd; if (!other.hidden) toFront(other); else front = null;
    });
    tick(-1, .4);
  }
  function draggable(w, handle) {
    var d = null;
    handle.addEventListener('pointerdown', function (e) {
      toFront(w);
      if (e.button > 0 || e.target.closest('button, input') || w.classList.contains('is-max') || innerWidth <= 760) return;
      d = { x: e.clientX - w.offsetLeft, y: e.clientY - w.offsetTop }; handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', function (e) {
      if (!d) return;
      w.style.left = Math.min(innerWidth - 80, Math.max(-w.offsetWidth + 120, e.clientX - d.x)) + 'px';
      w.style.top = Math.min(innerHeight - 40, Math.max(mb.offsetHeight, e.clientY - d.y)) + 'px';
    });
    handle.addEventListener('pointerup', function () { d = null; });
    handle.addEventListener('dblclick', function (e) { if (!e.target.closest('button, input')) w.classList.toggle('is-max'); });
    w.addEventListener('pointerdown', function () { toFront(w); });
  }
  draggable(rootWin, rootBar); draggable(fd, fdBar);

  // ---------- PROJECTS window: one folder per category ----------
  var folderIcons = {};
  function catsWithProjects() { return CATS; }
  function renderRoot() {
    rootGrid.textContent = ''; folderIcons = {};
    var cats = catsWithProjects();
    rootCount.textContent = cats.length + (cats.length === 1 ? ' folder' : ' folders');
    if (!cats.length) { rootGrid.appendChild(el('p', 'root__empty', 'No folders yet.')); return; }
    cats.forEach(function (c) {
      var b = icon(c.name, c.is_red ? 'is-red' : ''); folderIcons[c.id] = b;
      clickable(b, function () { deselect(rootGrid); b.classList.add('is-sel'); tick(1, .25); }, function () { openFolder(c.id, b); });
      rootGrid.appendChild(b);
    });
  }
  function openRoot() { renderRoot(); openWin(rootWin, rootIcon); }

  // ---------- Finder ----------
  var fdFrom = null, current = null, hist = [], histAt = -1, mode = 'icons', sel = -1, shown = [];
  try { mode = localStorage.getItem('whiplash-finder-view') === 'list' ? 'list' : 'icons'; } catch (e) { /* private mode */ }
  function catName(id) { if (id === 'all') return 'All projects'; for (var k = 0; k < CATS.length; k++) if (CATS[k].id === id) return CATS[k].name; return ''; }
  function projectsIn(id) { return PROJECTS.filter(function (p) { return id === 'all' || p.category_id === id; }); }
  function renderSide() {
    side.textContent = '';
    side.appendChild(el('h4', '', 'Whiplash'));
    var all = el('button'); all.type = 'button'; all.appendChild(svg(FOLDER)); all.firstChild.setAttribute('viewBox', '0 0 100 78'); all.appendChild(document.createTextNode('All projects'));
    all.setAttribute('aria-current', String(current === 'all')); all.addEventListener('click', function () { go('all'); }); side.appendChild(all);
    side.appendChild(el('h4', '', 'Folders'));
    CATS.forEach(function (c) {
      var b = el('button', c.is_red ? 'is-red' : ''); b.type = 'button'; b.appendChild(svg(FOLDER)); b.firstChild.setAttribute('viewBox', '0 0 100 78'); b.appendChild(document.createTextNode(c.name));
      b.setAttribute('aria-current', String(current === c.id)); b.addEventListener('click', function () { go(c.id); });
      side.appendChild(b);
    });
  }
  function renderList() {
    var q = sIn.value.trim().toLowerCase();
    var items = projectsIn(current).filter(function (p) { return !q || (p.name + ' ' + (p.type || '')).toLowerCase().indexOf(q) > -1; });
    list.textContent = ''; shown = items; sel = -1;
    fd.classList.toggle('is-list', mode === 'list');
    vIcons.setAttribute('aria-pressed', String(mode === 'icons')); vList.setAttribute('aria-pressed', String(mode === 'list'));
    status.textContent = items.length + (items.length === 1 ? ' item' : ' items');
    if (!items.length) { list.appendChild(el('p', 'fd__empty', q ? 'No projects match "' + sIn.value.trim() + '".' : 'This folder is empty.')); return; }
    // inside a folder: one section. "All projects": a section per folder. Order = the dashboard's order.
    var groups = [], byType = {};
    items.forEach(function (p) { var t = current === 'all' ? (catName(p.category_id) || 'Unsorted') : catName(current); if (!byType[t]) { byType[t] = []; groups.push(t); } byType[t].push(p); });
    if (current === 'all') groups.sort(function (x, y) { var ix = CATS.findIndex(function (c) { return c.name === x; }), iy = CATS.findIndex(function (c) { return c.name === y; }); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); });
    var n = 0;
    groups.forEach(function (t) {
      var sec = el('section', 'fd__sec'); var h = el('h3', '', t); h.appendChild(el('span', '', byType[t].length + (byType[t].length === 1 ? ' item' : ' items')));
      var grid = el('div', 'fd__grid');
      byType[t].forEach(function (p) {
        var idx = n++, f = el('button', 'file'); f.type = 'button'; f.dataset.i = idx;
        var th = el('span', 'file__thumb'), img = el('img'); img.alt = ''; img.loading = 'lazy'; img.src = p.thumb_url || ''; th.appendChild(img);
        f.appendChild(th); f.appendChild(el('span', 'file__name', p.name)); f.appendChild(el('span', 'file__meta', mode === 'list' ? (p.type || '') : ''));
        clickable(f, function () { select(idx); }, function () { select(idx); openQL(idx); });
        grid.appendChild(f);
      });
      sec.appendChild(h); sec.appendChild(grid); list.appendChild(sec);
    });
    // keep the order of the files in one flat list (for arrows / Quick Look)
    shown = []; groups.forEach(function (t) { shown = shown.concat(byType[t]); });
  }
  function select(i) {
    sel = i;
    [].forEach.call(list.querySelectorAll('.file'), function (f) { f.classList.toggle('is-sel', +f.dataset.i === i); });
    var f = list.querySelector('.file[data-i="' + i + '"]'); if (f) { f.focus({ preventScroll: true }); f.scrollIntoView({ block: 'nearest' }); }
  }
  function go(id, fromHistory) {
    current = id; fdTitle.textContent = catName(id); sIn.value = '';
    if (!fromHistory) { hist = hist.slice(0, histAt + 1); hist.push(id); histAt = hist.length - 1; }
    back.disabled = false; back.title = histAt > 0 ? 'Back' : 'Back to Projects'; fwd.disabled = histAt >= hist.length - 1;
    renderSide(); renderList(); list.scrollTop = 0;
  }
  // back past the first folder = back to the PROJECTS window: the Finder folds into that folder's icon
  function backToRoot() {
    if (rootWin.hidden) { renderRoot(); rootWin.hidden = false; place(rootWin); }
    var into = folderIcons[current] || null;
    if (into) { deselect(rootGrid); into.classList.add('is-sel'); }
    closeWin(fd, into); toFront(rootWin);
  }
  function goBack() { if (histAt > 0) { histAt--; go(hist[histAt], true); } else backToRoot(); }
  back.addEventListener('click', goBack);
  fwd.addEventListener('click', function () { if (histAt < hist.length - 1) { histAt++; go(hist[histAt], true); } });
  vIcons.addEventListener('click', function () { setMode('icons'); });
  vList.addEventListener('click', function () { setMode('list'); });
  function setMode(m) { mode = m; try { localStorage.setItem('whiplash-finder-view', m); } catch (e) { /* */ } renderList(); }
  sIn.addEventListener('input', renderList);
  list.addEventListener('click', function (e) { if (!e.target.closest('.file')) select(-1); });
  function openFolder(id, from) {
    fdFrom = from || null; hist = []; histAt = -1; go(id);
    if (fd.hidden) openWin(fd, from); else { toFront(fd); tick(1, .35); }
  }

  // ---------- Quick Look ----------
  var qlAt = -1;
  function isVideoHost(u) { return /vimeo\.com|youtu\.?be/i.test(u || ''); }
  function openQL(i) {
    var p = shown[i]; if (!p) return;
    qlAt = i; ql.textContent = '';
    var win = el('div', 'ql__win'), bar = el('div', 'ql__bar');
    var x = el('button', '', 'Close'); x.type = 'button'; x.addEventListener('click', function () { closeQL(); });
    bar.appendChild(x); bar.appendChild(el('b', '', p.name)); bar.appendChild(el('span', 'sp'));
    if (p.film_link) { var a = el('a', 'ql__film', isVideoHost(p.film_link) ? 'Watch the full film ↗' : 'Open link ↗'); a.href = p.film_link; a.target = '_blank'; a.rel = 'noopener'; bar.appendChild(a); }
    var media = el('div', 'ql__media');
    if (p.video_url) { var v = el('video'); v.src = p.video_url; v.poster = p.thumb_url || ''; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.controls = true; media.appendChild(v); v.play().catch(function () {}); }
    else { var im = el('img'); im.src = p.thumb_url || ''; im.alt = p.name; media.appendChild(im); }
    [['prev', -1, 'M10 3L5 8l5 5'], ['next', 1, 'M6 3l5 5-5 5']].forEach(function (d) {
      var b = el('button', 'ql__nav ql__nav--' + d[0]); b.type = 'button'; b.setAttribute('aria-label', d[0] === 'prev' ? 'Previous project' : 'Next project');
      b.appendChild(svg('<path d="' + d[2] + '"/>')); b.firstChild.setAttribute('viewBox', '0 0 16 16');
      b.addEventListener('click', function () { stepQL(d[1]); }); media.appendChild(b);
    });
    var info = el('div', 'ql__info'), left = el('div');
    left.appendChild(el('h2', '', p.name)); left.appendChild(el('p', 'ql__type', [p.type, catName(p.category_id)].filter(Boolean).join(' — ')));
    if (p.description) left.appendChild(el('p', '', p.description));
    var dl = el('dl', 'ql__credits');
    (p.credits || []).forEach(function (c) { if (!c || !(c[0] || c[1])) return; dl.appendChild(el('dt', '', c[0] || '')); dl.appendChild(el('dd', '', c[1] || '')); });
    info.appendChild(left); info.appendChild(dl);
    win.appendChild(bar); win.appendChild(media); win.appendChild(info); ql.appendChild(win);
    var wasHidden = ql.hidden; ql.hidden = false;
    if (wasHidden) { ql.classList.remove('is-in'); void ql.offsetWidth; ql.classList.add('is-in'); tick(1, .4); }
    x.focus({ preventScroll: true });
  }
  function stepQL(d) { if (!shown.length) return; var n = (qlAt + d + shown.length) % shown.length; select(n); openQL(n); }
  function closeQL(instant) {
    if (ql.hidden) return;
    var v = ql.querySelector('video'); if (v) v.pause();
    ql.classList.remove('is-in');
    var done = function () { ql.hidden = true; ql.textContent = ''; var f = list.querySelector('.file[data-i="' + qlAt + '"]'); if (f && !instant) f.focus({ preventScroll: true }); };
    if (instant || reduce) done(); else setTimeout(done, 250);
  }
  ql.addEventListener('click', function (e) { if (e.target === ql) closeQL(); });

  // ---------- menus ----------
  var MENUS = {
    File: function () { return [['Open', 'Enter', function () { if (!fd.hidden && sel > -1) openQL(sel); else if (!rootWin.hidden) { var s = rootGrid.querySelector('.is-sel'); if (s) s.dispatchEvent(new MouseEvent('dblclick')); } else openRoot(); }],
                               ['Quick Look', 'Space', function () { if (sel > -1) openQL(sel); }, fd.hidden || sel < 0],
                               null, ['Close window', '⌘W', closeFront, !front]]; },
    Edit: function () { return [['Find…', '⌘F', function () { if (fd.hidden) openFolder('all', rootIcon); setTimeout(function () { sIn.focus(); }, 60); }]]; },
    View: function () { return [['as Icons', '', function () { setMode('icons'); }, fd.hidden], ['as List', '', function () { setMode('list'); }, fd.hidden]]; },
    Go: function () { return [['All projects', '', function () { openFolder('all', fdFrom || rootIcon); }], null,
                             ['Home', '', function () { leave('home'); }], ['About', '', function () { leave('about'); }], ['Clients', '', function () { leave('clients'); }],
                             ['Contact', '', function () { leave('contact'); }]]; },
  };
  var openMenu = null;
  function closeMenus() { if (openMenu) { openMenu.menu.remove(); openMenu.btn.setAttribute('aria-expanded', 'false'); openMenu = null; } }
  Object.keys(MENUS).forEach(function (name) {
    var b = el('button', '', name); b.type = 'button'; b.setAttribute('aria-haspopup', 'true'); b.setAttribute('aria-expanded', 'false');
    var show = function () {
      closeMenus();
      var m = el('div', 'menu'); m.setAttribute('role', 'menu');
      MENUS[name]().forEach(function (it) {
        if (!it) { m.appendChild(el('hr')); return; }
        var i = el('button'); i.type = 'button'; i.setAttribute('role', 'menuitem'); i.appendChild(el('span', '', it[0])); i.appendChild(el('kbd', '', it[1] || ''));
        if (it[3]) i.disabled = true;
        i.addEventListener('click', function (e) { e.stopPropagation(); closeMenus(); it[2](); });
        m.appendChild(i);
      });
      m.style.left = b.offsetLeft + 'px'; desk.appendChild(m);
      b.setAttribute('aria-expanded', 'true'); openMenu = { btn: b, menu: m };
      var first = m.querySelector('button:not([disabled])'); if (first && document.activeElement === b) first.focus();
    };
    b.addEventListener('click', function (e) { e.stopPropagation(); if (openMenu && openMenu.btn === b) closeMenus(); else show(); });
    b.addEventListener('pointerenter', function () { if (openMenu && openMenu.btn !== b) show(); });
    menus.appendChild(b);
  });
  document.addEventListener('pointerdown', function (e) { if (openMenu && !e.target.closest('.menu, .mb__menus button')) closeMenus(); });
  function closeFront() { if (!ql.hidden) return closeQL(); if (front === fd) closeWin(fd, fdFrom); else if (front === rootWin) closeWin(rootWin, rootIcon); }
  homeBtn.addEventListener('click', function () { leave('home'); });
  function leave(name) { closeMenus(); if (WL.cutTo) WL.cutTo(name); }

  // ---------- keys ----------
  window.addEventListener('keydown', function (e) {
    if (desk.hidden || !desk.classList.contains('is-in')) return;
    var typing = e.target === sIn;
    if (e.key === 'Escape') { if (openMenu) return closeMenus(); if (!ql.hidden) return closeQL(); if (typing && sIn.value) { sIn.value = ''; return renderList(); } return closeFront(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'w') { e.preventDefault(); return closeFront(); }
    if ((e.metaKey || e.ctrlKey) && (e.key === '[' || e.key === 'ArrowUp') && front === fd && !fd.hidden && ql.hidden) { e.preventDefault(); return goBack(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') { e.preventDefault(); return MENUS.Edit()[0][2](); }
    if (typing) return;
    if (!ql.hidden) {
      if (e.key === ' ') { e.preventDefault(); closeQL(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); stepQL(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); stepQL(-1); }
      return;
    }
    if (!fd.hidden && front === fd && shown.length) {
      if (e.key === ' ' && sel > -1) { e.preventDefault(); return openQL(sel); }
      var cols = mode === 'list' ? 1 : Math.max(1, Math.round(list.clientWidth / ((list.querySelector('.file') || { offsetWidth: 140 }).offsetWidth + 4)));
      var d = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
      if (d) { e.preventDefault(); select(Math.max(0, Math.min(shown.length - 1, sel < 0 ? 0 : sel + d))); }
    }
  });

  // ---------- show / hide the desktop ----------
  var api = { busy: false };
  api.open = function (instant, done) {
    var already = !desk.hidden && desk.classList.contains('is-in');
    body.classList.remove('desk-off'); body.classList.add('desk-on');
    if (already) { if (done) done(); return; }
    desk.hidden = false;
    if (instant || reduce) { desk.classList.add('no-anim', 'is-in'); void desk.offsetWidth; desk.classList.remove('no-anim'); if (done) done(); return; }
    api.busy = true;
    desk.classList.remove('is-in'); void desk.offsetWidth; desk.classList.add('is-in');
    if (WL.unlock) WL.unlock();
    tick(1, .5);
    setTimeout(function () { api.busy = false; if (done) done(); }, 820);
  };
  api.close = function (instant, done) {
    closeMenus(); closeQL(true);
    if (desk.hidden) { body.classList.remove('desk-on'); if (done) done(); return; }
    var finish = function () {
      desk.hidden = true; desk.classList.remove('is-in');
      [rootWin, fd].forEach(function (w) { w.hidden = true; w.classList.remove('is-max', 'is-zooming'); w.style.transform = ''; w.style.opacity = ''; });
      deselect(desk); api.busy = false; front = null;
      body.classList.remove('desk-off');
      if (done) done();
    };
    body.classList.remove('desk-on'); body.classList.add('desk-off');
    if (instant || reduce) { desk.classList.add('no-anim'); finish(); desk.classList.remove('no-anim'); return; }
    api.busy = true; desk.classList.remove('is-in'); tick(-1, .5);
    setTimeout(finish, 820);
  };
  window.WL_DESK = api;
  if (body.dataset.scene === 'projects') api.open(true);

  // ---------- content from the dashboard ----------
  if (WL.live && WL.rest) {
    Promise.all([WL.rest('categories?select=*&order=position'), WL.rest('projects?select=*&order=position')]).then(function (r) {
      // use the dashboard once it has projects (until then the built-in ones keep the folders full)
      if (!r[1].length) return;
      CATS = r[0];
      PROJECTS = r[1].map(function (p) { p.credits = Array.isArray(p.credits) ? p.credits : []; return p; });
      if (!rootWin.hidden) renderRoot();
      if (!fd.hidden) { renderSide(); renderList(); }
    }).catch(function () { /* keep the built-in projects */ });
  }
})();
