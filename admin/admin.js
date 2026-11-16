// =========================================================
// WHIPLASH dashboard
//   config.js empty  → DEMO MODE: data lives in this browser (localStorage)
//   config.js filled → LIVE: Supabase (data, logins and uploaded files)
// Sections: helpers · data layer (demo / live) · UI pieces · views · boot
// =========================================================
(function () {
  'use strict';
  const CFG = window.WHIPLASH_CONFIG || {};
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const LIMIT = { image: 10, video: 50 };   // MB — Supabase free plan allows 50 MB per file
  const MARK = '<svg viewBox="0 0 106.6 100" aria-hidden="true"><path d="M0 0H21.2V82A21.2 21.2 0 0 1 0 60.8Z"/><path d="M42.7 0H63.9V60.6A21.4 21.4 0 0 0 85.3 82H106.6V100H39.3A18 18 0 0 1 21.3 82A21.4 21.4 0 0 0 42.7 60.6Z"/><path d="M85.4 0H106.6V60.6H93.4A8 8 0 0 1 85.4 52.6Z"/></svg>';
  const ICON = {
    grip: '<svg viewBox="0 0 14 20" fill="currentColor"><circle cx="3" cy="3" r="2"/><circle cx="11" cy="3" r="2"/><circle cx="3" cy="10" r="2"/><circle cx="11" cy="10" r="2"/><circle cx="3" cy="17" r="2"/><circle cx="11" cy="17" r="2"/></svg>',
    up: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5-5 5 5"/></svg>',
    down: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l5 5 5-5"/></svg>',
    x: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>',
    edit: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 3.5l3 3L7 16l-4 1 1-4z"/></svg>',
  };

  // ---------- helpers ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') el.value = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (typeof v === 'boolean') el[k] = v;
      else el.setAttribute(k, v);
    }
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c)); });
    return el;
  }
  const $app = document.getElementById('app');
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + Math.random().toString(16).slice(2));
  const pad2 = (n) => String(n).padStart(2, '0');
  const byPos = (a, b) => a.position - b.position;

  function toast(msg, err) {
    const t = h('div', { class: 'toast' + (err ? ' toast--err' : '') }, msg);
    document.getElementById('toasts').append(t);
    setTimeout(() => t.remove(), err ? 5200 : 2600);
  }
  const fail = (e) => { console.error(e); toast((e && e.message) || 'Something went wrong. Try again.', true); };

  function confirmBox({ title, body, yes, danger }) {
    return new Promise((resolve) => {
      const d = h('dialog', null,
        h('h3', null, title), h('p', null, body),
        h('div', { class: 'btns' },
          h('button', { class: 'btn', onclick: () => d.close('no') }, 'Cancel'),
          h('button', { class: 'btn ' + (danger ? 'btn--red' : ''), onclick: () => d.close('yes') }, yes)));
      d.addEventListener('close', () => { d.remove(); resolve(d.returnValue === 'yes'); });
      document.body.append(d); d.showModal();
    });
  }

  function filmHost(url) {
    if (!url) return '';
    if (/vimeo\.com/i.test(url)) return 'Vimeo';
    if (/youtu\.?be/i.test(url)) return 'YouTube';
    return /^https?:\/\//i.test(url) ? 'Link' : '';
  }

  // =========================================================
  // DATA LAYER — both versions expose the same functions
  // =========================================================
  const TABLES = ['projects', 'categories', 'clients'];

  // ---------- demo (this browser only) ----------
  function demoApi() {
    const KEY = 'whiplash-admin-demo-v1';
    let db;
    const seed = () => {
      const cats = ['Runway', 'Cuts on Beat', "Director's Cut", 'Full Throttle', 'Postcards', 'Prime Time'].map((name, i) => ({ id: 'cat-' + i, name, position: i + 1 }));
      const cat = (n) => cats.find((c) => c.name === n).id;
      const cr = [['Director', 'Idiw Dnawij'], ['Producer', 'Kjwnd Odawidia'], ['Colorist', 'Njdwdi Iwjaiaj'], ['Client', 'Iwajd Iwjdo']];
      const P = [['Whiplash', 'Showreel', "Director's Cut", 'hero-poster'], ['Night Shift', 'Music Video', 'Cuts on Beat', 'work-1'], ['Velvet Static', 'Fashion Film', 'Runway', 'work-2'], ['Hollow Ground', 'Documentary', "Director's Cut", 'work-3'], ['Paper Moon', 'Ad', 'Prime Time', 'work-4'], ['Saint Nobody', 'Profile Film', 'Postcards', 'work-5'], ['Glass Hours', 'Short Film', "Director's Cut", 'work-6'], ['Low Tide', 'Fashion Film', 'Runway', 'work-7'], ['Mercury Lane', 'Ad', 'Full Throttle', 'work-8'], ['Afterglow', 'Music Video', 'Cuts on Beat', 'work-9']];
      return {
        categories: cats,
        projects: P.map((p, i) => ({ id: 'p-' + i, position: i + 1, name: p[0], type: p[1], category_id: cat(p[2]), description: 'Driven by sound design as much as image, we shape a complete sensory experience; where audio and visuals work seamlessly and land deeply, memorably and with impact.', thumb_url: '../assets/' + p[3] + '.jpg', video_url: i === 0 ? '../assets/hero.mp4' : '', film_link: 'https://vimeo.com/', logo_url: '', award_url: '', credits: cr, is_hero: i === 0, published: i !== 9 })),
        chapters: [['History', 'Since 20XX', 'work-7'], ['Countries', 'Beirut / Dubai / KSA', 'work-5'], ['Services', 'Edit to delivery', 'work-1']].map((c, i) => ({ id: 'ch-' + i, position: i + 1, title: c[0], caption: c[1], image_url: '../assets/' + c[2] + '.jpg' })),
        milestones: [['Founded in Beirut', 'Two editors, one room, one deadline.'], ['First global brand', 'The cut that put us on the map.'], ['Colour & sound in-house', 'Every craft under one roof.'], ['Dubai', 'A second home for the studio.'], ['KSA', 'Cutting for the Kingdom.'], ['Now', 'Still obsessed with the frame.']].map((m, i, all) => ({ id: 'ms-' + i, position: i + 1, year: i === all.length - 1 ? '2026' : '20XX', title: m[0], line: m[1] })),
        clients: ['Sample Client', 'Another Brand', 'Agency Name'].map((name, i) => ({ id: 'c-' + i, position: i + 1, name, logo_url: '', website: '' })),
        texts: [
          { key: 'home.tagline', group_name: 'Home', label: 'Line under the film, left', kind: 'short', position: 1, value: 'Post-production · Beirut / Dubai / KSA' },
          { key: 'home.reel_label', group_name: 'Home', label: 'Label next to the timecode', kind: 'short', position: 2, value: 'Showreel 26' },
          { key: 'about.lead1', group_name: 'About', label: 'Opening line', kind: 'long', position: 1, value: "We come from music, not film. That's why we care so much about timing. If it doesn't feel right, we don't move on." },
          { key: 'about.lead2', group_name: 'About', label: 'Second paragraph', kind: 'long', position: 2, value: 'Whiplash is a post-production studio that believes in the power of precision-driven storytelling where every frame is intentional, every cut has weight, and every detail exists.' },
          { key: 'about.lead3', group_name: 'About', label: 'Third paragraph', kind: 'long', position: 3, value: 'We combine strong creative direction with disciplined execution.' },
          { key: 'countries.since', group_name: 'About: Countries page', label: 'Small label (after "[02] About —")', kind: 'short', position: 1, value: 'Since 20XX' },
          { key: 'countries.line', group_name: 'About: Countries page', label: 'Sentence under the city name', kind: 'long', position: 2, value: 'Born in Beirut. Cutting for Dubai and KSA. Every frame intentional, every cut with weight.' },
          { key: 'contact.email', group_name: 'Contact', label: 'Email', kind: 'short', position: 1, value: '' },
          { key: 'contact.phone', group_name: 'Contact', label: 'Phone', kind: 'short', position: 2, value: '' },
          { key: 'contact.address', group_name: 'Contact', label: 'Address', kind: 'long', position: 3, value: '' },
          { key: 'contact.instagram', group_name: 'Contact', label: 'Instagram link', kind: 'short', position: 4, value: '' },
          { key: 'contact.vimeo', group_name: 'Contact', label: 'Vimeo link', kind: 'short', position: 5, value: '' },
          { key: 'seo.title', group_name: 'Search and sharing', label: 'Site title', kind: 'short', position: 1, value: 'Whiplash' },
          { key: 'seo.description', group_name: 'Search and sharing', label: 'Description shown on Google', kind: 'long', position: 2, value: 'Whiplash — post-production studio.' },
        ],
        editors: [{ user_id: 'me', email: 'you@whiplash.demo', name: 'You', role: 'owner' }, { user_id: 'u-2', email: 'editor@whiplash.demo', name: 'Studio editor', role: 'editor' }],
        session: null,
      };
    };
    try { db = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { db = seed(); }
    if (!db.chapters) db.chapters = seed().chapters;
    if (!db.milestones) db.milestones = seed().milestones;   // demo data saved before the About page existed
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { toast('This browser is out of demo storage. Use smaller images.', true); } };
    const wait = (v) => new Promise((r) => setTimeout(() => r(v), 120));
    const shrink = (file) => new Promise((res, rej) => {   // keep demo images small enough for localStorage
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => { const s = Math.min(1, 960 / img.width), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL(/png|svg/.test(file.type) ? 'image/png' : 'image/jpeg', .8)); };
      img.onerror = () => rej(new Error('This file is not an image the browser can read.')); img.src = url;
    });
    return {
      async init() { return db.session; },
      async signIn(email) { db.session = { id: 'me', email: email || 'you@whiplash.demo', name: 'You', role: 'owner' }; db.editors[0].email = db.session.email; persist(); return wait(db.session); },
      async signOut() { db.session = null; persist(); },
      async setPassword() { return wait(); },
      async loadAll() { return wait(JSON.parse(JSON.stringify({ projects: db.projects, categories: db.categories, clients: db.clients, chapters: db.chapters, milestones: db.milestones, texts: db.texts, editors: db.editors }))); },
      async save(table, row) { const r = { ...row }; if (!r.id) { r.id = uid(); db[table].push(r); } else db[table] = db[table].map((x) => (x.id === r.id ? r : x)); persist(); return wait(r); },
      async patch(table, id, fields) { db[table] = db[table].map((x) => (x.id === id ? { ...x, ...fields } : x)); persist(); },
      async remove(table, id) { db[table] = db[table].filter((x) => x.id !== id); if (table === 'categories') db.projects.forEach((p) => { if (p.category_id === id) p.category_id = null; }); persist(); return wait(); },
      async reorder(table, ids) { ids.forEach((id, i) => { const r = db[table].find((x) => x.id === id); if (r) r.position = i + 1; }); persist(); },
      async saveTexts(list) { list.forEach((t) => { const r = db.texts.find((x) => x.key === t.key); if (r) r.value = t.value; }); persist(); return wait(); },
      async upload(file, kind, folder, onProgress) {
        for (let i = 1; i <= 5; i++) { await new Promise((r) => setTimeout(r, 90)); onProgress(i / 5); }
        return kind === 'video' ? URL.createObjectURL(file) : shrink(file);
      },
      async addUser(u) { const r = { user_id: uid(), email: u.email, name: u.name, role: u.role }; db.editors.push(r); persist(); return wait(r); },
      async removeUser(id) { db.editors = db.editors.filter((e) => e.user_id !== id); persist(); return wait(); },
    };
  }

  // ---------- live (Supabase) ----------
  function liveApi() {
    let sb;
    const ok = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    const loadLib = () => new Promise((res, rej) => {
      if (window.supabase) return res();
      const s = h('script', { src: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' });
      s.onload = res; s.onerror = () => rej(new Error('Could not reach the server. Check your connection.')); document.head.append(s);
    });
    const who = async (user) => {
      if (!user) return null;
      const rows = ok(await sb.from('editors').select('*').eq('user_id', user.id));
      if (!rows.length) { await sb.auth.signOut(); throw new Error('This account has no access to the dashboard.'); }
      return { id: user.id, email: rows[0].email, name: rows[0].name, role: rows[0].role };
    };
    const server = async (path, init) => {
      const { data } = await sb.auth.getSession();
      const r = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (data.session ? data.session.access_token : '') } });
      let j = {}; try { j = await r.json(); } catch (e) { /* not json */ }
      if (!r.ok) throw new Error(j.error || 'The server did not answer. This part only works on the live site.');
      return j;
    };
    return {
      async init() { await loadLib(); sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey); const { data } = await sb.auth.getSession(); return who(data.session && data.session.user); },
      async signIn(email, password) { const { data, error } = await sb.auth.signInWithPassword({ email, password }); if (error) throw new Error(/invalid/i.test(error.message) ? 'Wrong email or password.' : error.message); return who(data.user); },
      async signOut() { await sb.auth.signOut(); },
      async setPassword(password) { const { error } = await sb.auth.updateUser({ password }); if (error) throw new Error(error.message); },
      async loadAll() {
        const chapters = await sb.from('chapters').select('*').order('position');
        const milestones = await sb.from('milestones').select('*').order('position');
        const [projects, categories, clients, texts, editors] = await Promise.all([
          sb.from('projects').select('*').order('position'), sb.from('categories').select('*').order('position'),
          sb.from('clients').select('*').order('position'), sb.from('texts').select('*').order('position'), sb.from('editors').select('*').order('created_at')]);
        return { projects: ok(projects), categories: ok(categories), clients: ok(clients), chapters: chapters.error ? null : chapters.data, milestones: milestones.error ? null : milestones.data, texts: ok(texts), editors: ok(editors) };
      },
      async save(table, row) {
        const { id, created_at, updated_at, ...fields } = row;
        const q = id ? sb.from(table).update(fields).eq('id', id) : sb.from(table).insert(fields);
        return ok(await q.select().single());
      },
      async patch(table, id, fields) { ok(await sb.from(table).update(fields).eq('id', id)); },
      async remove(table, id) { ok(await sb.from(table).delete().eq('id', id)); },
      async reorder(table, ids) { const rs = await Promise.all(ids.map((id, i) => sb.from(table).update({ position: i + 1 }).eq('id', id))); rs.forEach(ok); },
      async saveTexts(list) { const rs = await Promise.all(list.map((t) => sb.from('texts').update({ value: t.value }).eq('key', t.key))); rs.forEach(ok); },
      async upload(file, kind, folder, onProgress) {   // straight into the public "media" bucket (only editors may write, see schema.sql)
        const { data } = await sb.auth.getSession();
        if (!data.session) throw new Error('Your session ended. Sign in again.');
        const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0].toLowerCase();
        const base = file.name.replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
        const path = folder + '/' + Date.now().toString(36) + '-' + base + ext;
        return new Promise((res, rej) => {
          const x = new XMLHttpRequest();
          x.open('POST', CFG.supabaseUrl + '/storage/v1/object/media/' + path);
          x.setRequestHeader('Authorization', 'Bearer ' + data.session.access_token);
          x.setRequestHeader('apikey', CFG.supabaseAnonKey);
          x.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
          x.setRequestHeader('Cache-Control', 'max-age=31536000');
          x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(e.loaded / e.total); };
          x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch (e) { /* */ } if (x.status < 300) res(CFG.supabaseUrl + '/storage/v1/object/public/media/' + path); else rej(new Error(/exceed|too large|413/i.test((j.message || '') + x.status) ? 'This file is too big for the storage plan.' : (j.message || 'The upload failed. Try again.'))); };
          x.onerror = () => rej(new Error('The upload failed. Check your connection.'));
          x.send(file);
        });
      },
      async addUser(u) { return server('/api/users', { method: 'POST', body: JSON.stringify(u) }); },
      async removeUser(id) { return server('/api/users?id=' + encodeURIComponent(id), { method: 'DELETE' }); },
    };
  }

  const api = LIVE ? liveApi() : demoApi();
  const S = { user: null, view: 'projects', q: '', cat: '', projects: [], categories: [], clients: [], chapters: [], milestones: [], texts: [], editors: [] };

  // =========================================================
  // UI PIECES
  // =========================================================
  function field(label, control, hint) {
    const id = 'f' + Math.random().toString(36).slice(2, 8);
    if (control.matches && control.matches('input,textarea,select')) control.id = id;
    return h('div', { class: 'field' }, h('label', { for: id }, label), control, hint && h('span', { class: 'hint' }, hint));
  }
  function toggle(checked, title, sub, onchange) {
    const input = h('input', { type: 'checkbox', checked: !!checked, onchange: () => onchange && onchange(input.checked) });
    const el = h('label', { class: 'switch' }, input, h('i'), h('span', null, h('b', null, title), sub && h('small', null, sub)));
    el.input = input; return el;
  }

  // Upload box: drop a file, pick one, or paste a link. get() returns the current URL.
  function mediaField({ label, kind, folder, value, hint, logo }) {
    let url = value || '';
    const view = h('div', { class: 'media__view' });
    const bar = h('div', { class: 'bar', hidden: true }, h('i'));
    const link = h('input', { class: 'input', type: 'url', placeholder: 'or paste a link to the file', value: /^(blob:|data:)/.test(url) ? '' : url, oninput: () => { url = link.value.trim(); paint(); box.dispatchEvent(new Event('input', { bubbles: true })); } });
    const file = h('input', { type: 'file', accept: kind + '/*', hidden: true, onchange: () => file.files[0] && take(file.files[0]) });
    const clear = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { url = ''; link.value = ''; paint(); box.dispatchEvent(new Event('input', { bubbles: true })); } }, 'Remove');
    function paint() {
      view.replaceChildren(url ? (kind === 'video' ? h('video', { src: url, muted: true, loop: true, autoplay: true, playsinline: true }) : h('img', { src: url, alt: '' })) : (kind === 'video' ? 'No clip' : 'No image'));
      clear.hidden = !url;
    }
    async function take(f) {
      if (f.type.indexOf(kind) !== 0) return toast('Choose ' + (kind === 'video' ? 'a video' : 'an image') + ' file.', true);
      if (f.size > LIMIT[kind] * 1048576) return toast(kind === 'video' ? 'This clip is over 50 MB. Upload a shorter or more compressed preview clip and put the full film in "Full film link".' : 'This image is over 10 MB. Export a smaller one.', true);
      bar.hidden = false; box.busy = true;
      try { url = await api.upload(f, kind, folder, (p) => { bar.firstChild.style.width = Math.round(p * 100) + '%'; }); link.value = /^(blob:|data:)/.test(url) ? '' : url; paint(); box.dispatchEvent(new Event('input', { bubbles: true })); toast('Uploaded'); }
      catch (e) { fail(e); }
      bar.hidden = true; bar.firstChild.style.width = 0; box.busy = false; file.value = '';
    }
    const zone = h('div', { class: 'media' + (logo ? ' media--logo' : '') }, view,
      h('div', { class: 'media__side' },
        h('div', { class: 'media__btns' }, h('button', { class: 'btn btn--sm', type: 'button', onclick: () => file.click() }, 'Upload ' + (kind === 'video' ? 'clip' : 'image')), clear), bar, link, file));
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('is-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-over'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('is-over'); if (e.dataTransfer.files[0]) take(e.dataTransfer.files[0]); });
    const box = h('div', { class: 'field' }, h('span', { class: 'label' }, label), zone, hint && h('span', { class: 'hint' }, hint));
    box.get = () => url; paint(); return box;
  }

  // Side sheet. build(body, markDirty) fills it; returns { close }.
  function openSheet({ title, build, footer }) {
    let dirty = false;
    const body = h('div', { class: 'sheet__body' });
    const foot = h('div', { class: 'sheet__foot' });
    const sheet = h('aside', { class: 'sheet', role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet__head' }, h('h2', null, title), h('button', { class: 'icon-btn', 'aria-label': 'Close', html: ICON.x, onclick: () => tryClose() })), body, foot);
    const scrim = h('div', { class: 'scrim', onclick: () => tryClose() });
    const onKey = (e) => { if (e.key === 'Escape' && !document.querySelector('dialog[open]')) { e.preventDefault(); setTimeout(tryClose, 0); } };
    function close() { document.removeEventListener('keydown', onKey); sheet.classList.add('is-out'); scrim.remove(); setTimeout(() => sheet.remove(), 300); }
    async function tryClose() { if (!dirty || await confirmBox({ title: 'Leave without saving?', body: 'The changes you made here will be lost.', yes: 'Leave', danger: true })) close(); }
    body.addEventListener('input', () => { dirty = true; });
    const ctl = { close, tryClose, clean: () => { dirty = false; } };
    build(body, ctl); footer(foot, ctl);
    document.addEventListener('keydown', onKey);
    document.body.append(scrim, sheet);
    const first = body.querySelector('input,textarea'); if (first) setTimeout(() => first.focus(), 350);
    return ctl;
  }

  // Drag to reorder (plus up/down buttons for touch). items: elements with dataset.id
  function sortable(container, table, sel, horizontal) {
    let dragId = null;
    const clear = () => container.querySelectorAll('.drop-before,.drop-after,.is-dragging').forEach((e) => e.classList.remove('drop-before', 'drop-after', 'is-dragging'));
    container.addEventListener('dragstart', (e) => { const it = e.target.closest(sel); if (!it) return; dragId = it.dataset.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); setTimeout(() => it.classList.add('is-dragging')); });
    container.addEventListener('dragover', (e) => {
      const it = e.target.closest(sel); if (!it || !dragId) return; e.preventDefault();
      const r = it.getBoundingClientRect(); const after = horizontal ? e.clientX > r.left + r.width / 2 : e.clientY > r.top + r.height / 2;
      container.querySelectorAll('.drop-before,.drop-after').forEach((x) => x.classList.remove('drop-before', 'drop-after'));
      if (it.dataset.id !== dragId) it.classList.add(after ? 'drop-after' : 'drop-before');
    });
    container.addEventListener('drop', (e) => {
      const it = e.target.closest(sel); if (!it || !dragId || it.dataset.id === dragId) return clear(); e.preventDefault();
      const ids = S[table].slice().sort(byPos).map((x) => x.id).filter((id) => id !== dragId);
      ids.splice(ids.indexOf(it.dataset.id) + (it.classList.contains('drop-after') ? 1 : 0), 0, dragId);
      clear(); applyOrder(table, ids);
    });
    container.addEventListener('dragend', () => { dragId = null; clear(); });
  }
  async function applyOrder(table, ids) {
    ids.forEach((id, i) => { const r = S[table].find((x) => x.id === id); if (r) r.position = i + 1; });
    render();
    try { await api.reorder(table, ids); toast('Order saved'); } catch (e) { fail(e); }
  }
  function nudge(table, id, dir) {
    const ids = S[table].slice().sort(byPos).map((x) => x.id); const i = ids.indexOf(id), j = i + dir;
    if (j < 0 || j >= ids.length) return; ids.splice(j, 0, ids.splice(i, 1)[0]); applyOrder(table, ids);
  }

  // =========================================================
  // VIEWS
  // =========================================================
  const catName = (id) => { const c = S.categories.find((x) => x.id === id); return c ? c.name : ''; };

  // ---------- Projects ----------
  function viewProjects() {
    const all = S.projects.slice().sort(byPos);
    const filtering = !!(S.q || S.cat);
    const shown = all.filter((p) => (!S.cat || p.category_id === S.cat) && (!S.q || (p.name + ' ' + p.type).toLowerCase().includes(S.q.toLowerCase())));
    const list = h('div', { class: 'list' });
    shown.forEach((p) => {
      const n = all.indexOf(p) + 1;
      const pub = toggle(p.published, '', '', async (on) => { p.published = on; row.classList.toggle('is-draft', !on); try { await api.patch('projects', p.id, { published: on }); toast(on ? 'Published' : 'Hidden from the site'); } catch (e) { fail(e); } });
      pub.title = 'Show on the site'; pub.input.setAttribute('aria-label', 'Show ' + p.name + ' on the site');
      const row = h('div', { class: 'item' + (p.published ? '' : ' is-draft'), 'data-id': p.id, draggable: !filtering },
        h('span', { class: 'grip', html: ICON.grip, title: filtering ? 'Clear the search to reorder' : 'Drag to reorder' }),
        h('span', { class: 'item__n' }, pad2(n)),
        h('div', { class: 'item__thumb', style: p.thumb_url ? 'background-image:url("' + encodeURI(p.thumb_url).replace(/"/g, '%22') + '")' : '' }),
        h('button', { class: 'item__main', onclick: () => editProject(p) },
          h('span', { class: 'item__name' }, p.name),
          h('div', { class: 'item__meta' }, p.is_hero && h('span', { class: 'tag tag--red' }, 'Homepage film'), !p.published && h('span', { class: 'tag' }, 'Hidden'), [p.type, catName(p.category_id)].filter(Boolean).join(', '))),
        pub,
        h('div', { class: 'item__acts' },
          h('button', { class: 'icon-btn move', 'aria-label': 'Move up', html: ICON.up, disabled: filtering || n === 1, onclick: () => nudge('projects', p.id, -1) }),
          h('button', { class: 'icon-btn move', 'aria-label': 'Move down', html: ICON.down, disabled: filtering || n === all.length, onclick: () => nudge('projects', p.id, 1) }),
          h('button', { class: 'icon-btn', 'aria-label': 'Edit ' + p.name, html: ICON.edit, onclick: () => editProject(p) })));
      list.append(row);
    });
    if (!shown.length) list.append(h('div', { class: 'empty' }, all.length ? [h('h3', null, 'Nothing matches'), 'Clear the search or pick another category.'] : [h('h3', null, 'No projects yet'), 'Add the first one and it shows up on the site straight away.', h('br'), h('button', { class: 'btn btn--red', onclick: () => editProject() }, 'New project')]));
    sortable(list, 'projects', '.item');

    const search = h('input', { class: 'input', type: 'search', placeholder: 'Search projects', value: S.q, 'aria-label': 'Search projects', oninput: () => { S.q = search.value; render(); const s = document.querySelector('.tools .input'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); } });
    const chip = (id, name) => h('button', { class: 'chip', 'aria-pressed': String(S.cat === id), onclick: () => { S.cat = id; render(); } }, name);
    return [
      h('div', { class: 'head' },
        h('div', null, h('h1', null, 'Projects'), h('p', null, 'The order here is the order on the site. Drag a row, or use the arrows, to move it.')),
        h('div', { class: 'head__actions' }, h('button', { class: 'btn', onclick: editCategories }, 'Categories'), h('button', { class: 'btn btn--red', onclick: () => editProject() }, 'New project'))),
      h('div', { class: 'tools' }, search, chip('', 'All ' + all.length), S.categories.slice().sort(byPos).map((c) => chip(c.id, c.name))),
      list];
  }

  function editProject(p) {
    const isNew = !p;
    p = p || { name: '', type: '', category_id: '', description: '', thumb_url: '', video_url: '', film_link: '', logo_url: '', award_url: '', credits: [], is_hero: false, published: true };
    const name = h('input', { type: 'text', value: p.name, placeholder: 'Night Shift' });
    const type = h('input', { type: 'text', value: p.type, placeholder: 'Music Video', list: 'types' });
    const types = h('datalist', { id: 'types' }, [...new Set(S.projects.map((x) => x.type).filter(Boolean))].map((t) => h('option', { value: t })));
    const cat = h('select', null, h('option', { value: '' }, 'No category'), S.categories.slice().sort(byPos).map((c) => h('option', { value: c.id, selected: c.id === p.category_id }, c.name)));
    const desc = h('textarea', { value: p.description, rows: 4 });
    const thumb = mediaField({ label: 'Still image', kind: 'image', folder: 'projects', value: p.thumb_url, hint: '16:9, up to 10 MB. Shown in the project list.' });
    const clip = mediaField({ label: 'Preview clip', kind: 'video', folder: 'projects', value: p.video_url, hint: 'A short silent loop, up to 50 MB (10 to 20 seconds at 1080p is plenty). It plays in the list and behind the project page.' });
    const hostNote = h('span', { class: 'hint' });
    const film = h('input', { type: 'url', value: p.film_link, placeholder: 'https://vimeo.com/123456789', oninput: () => paintHost() });
    const paintHost = () => { const v = film.value.trim(), host = filmHost(v); hostNote.textContent = !v ? 'Paste the Vimeo or YouTube page of the full film. No size limit.' : host === 'Link' ? 'Link saved. Vimeo and YouTube links play inside the site; other links open in a new tab.' : host ? host + ' link recognised.' : 'This does not look like a link. It should start with https://'; };
    paintHost();
    const logo = mediaField({ label: 'Client or film logo', kind: 'image', folder: 'projects', value: p.logo_url, hint: 'PNG with a transparent background works best.', logo: true });
    const award = mediaField({ label: 'Award laurel', kind: 'image', folder: 'projects', value: p.award_url, logo: true });
    const credits = h('div', { style: 'display:grid;gap:8px' });
    const addCredit = (role, who) => { const r = h('div', { class: 'credit' }, h('input', { type: 'text', value: role || '', placeholder: 'Role', 'aria-label': 'Role' }), h('input', { type: 'text', value: who || '', placeholder: 'Name', 'aria-label': 'Name' }), h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Remove credit', html: ICON.x, onclick: () => { r.remove(); credits.dispatchEvent(new Event('input', { bubbles: true })); } })); credits.append(r); return r; };
    (p.credits || []).forEach((c) => addCredit(c[0], c[1]));
    const published = toggle(p.published, 'Show on the site', 'Turn off to keep it as a draft.');
    const hero = toggle(p.is_hero, 'Homepage film', 'Its preview clip plays behind the homepage. Only one project can have this.');

    openSheet({
      title: isNew ? 'New project' : 'Edit project',
      build(body) {
        body.append(
          field('Project name', name), h('div', { class: 'row2' }, field('Type', type), field('Category', cat, 'Used by the filter menu on the site.')), types,
          field('Description', desc),
          h('div', { class: 'group' }, h('h3', null, 'Film'), thumb, clip, h('div', { class: 'field' }, h('label', { for: 'film' }, 'Full film link'), Object.assign(film, { id: 'film' }), hostNote)),
          h('div', { class: 'group' }, h('h3', null, 'Credits'), credits, h('div', null, h('button', { class: 'btn btn--sm', type: 'button', onclick: () => addCredit().querySelector('input').focus() }, 'Add credit'))),
          h('div', { class: 'group' }, h('h3', null, 'Extras'), h('div', { class: 'row2' }, logo, award)),
          h('div', { class: 'group' }, published, hero));
      },
      footer(foot, ctl) {
        const save = h('button', { class: 'btn btn--red', onclick: async () => {
          if (!name.value.trim()) { name.focus(); return toast('Give the project a name.', true); }
          if ([thumb, clip, logo, award].some((m) => m.busy)) return toast('Wait for the upload to finish.', true);
          if (hero.input.checked && !clip.get()) return toast('The homepage film needs a preview clip.', true);
          save.disabled = true; save.textContent = 'Saving…';
          try {
            const row = { ...p, name: name.value.trim(), type: type.value.trim(), category_id: cat.value || null, description: desc.value.trim(), thumb_url: thumb.get(), video_url: clip.get(), film_link: film.value.trim(), logo_url: logo.get(), award_url: award.get(),
              credits: [...credits.children].map((r) => [...r.querySelectorAll('input')].map((i) => i.value.trim())).filter((c) => c[0] || c[1]), is_hero: hero.input.checked, published: published.input.checked };
            if (isNew) row.position = S.projects.length + 1;
            if (row.is_hero) for (const o of S.projects.filter((x) => x.is_hero && x.id !== p.id)) { await api.patch('projects', o.id, { is_hero: false }); o.is_hero = false; }
            const saved = await api.save('projects', row);
            if (isNew) S.projects.push(saved); else S.projects = S.projects.map((x) => (x.id === saved.id ? saved : x));
            ctl.clean(); ctl.close(); render(); toast(isNew ? 'Project added' : 'Project saved');
          } catch (e) { fail(e); save.disabled = false; save.textContent = 'Save project'; }
        } }, 'Save project');
        foot.append(isNew ? h('span') : h('button', { class: 'btn btn--danger', onclick: async () => {
          if (!await confirmBox({ title: 'Delete "' + p.name + '"?', body: 'It disappears from the site and cannot be brought back.', yes: 'Delete project', danger: true })) return;
          try { await api.remove('projects', p.id); S.projects = S.projects.filter((x) => x.id !== p.id); ctl.clean(); ctl.close(); render(); toast('Project deleted'); } catch (e) { fail(e); }
        } }, 'Delete'), h('div', null, h('button', { class: 'btn', onclick: ctl.tryClose }, 'Cancel'), save));
      },
    });
  }

  function editCategories() {
    openSheet({
      title: 'Categories',
      build(body) {
        const wrap = h('div', { style: 'display:grid;gap:8px' });
        const paint = () => {
          const cats = S.categories.slice().sort(byPos);
          wrap.replaceChildren(...cats.map((c, i) => {
            const inp = h('input', { type: 'text', value: c.name, 'aria-label': 'Category name', onchange: async () => { const v = inp.value.trim(); if (!v) { inp.value = c.name; return; } c.name = v; try { await api.patch('categories', c.id, { name: v }); toast('Renamed'); render(); } catch (e) { fail(e); } } });
            const move = async (d) => { const ids = cats.map((x) => x.id); ids.splice(i + d, 0, ids.splice(i, 1)[0]); ids.forEach((id, k) => { S.categories.find((x) => x.id === id).position = k + 1; }); paint(); render(); try { await api.reorder('categories', ids); } catch (e) { fail(e); } };
            return h('div', { class: 'catrow' }, inp,
              h('button', { class: 'icon-btn', 'aria-label': 'Move up', html: ICON.up, disabled: i === 0, onclick: () => move(-1) }),
              h('button', { class: 'icon-btn', 'aria-label': 'Move down', html: ICON.down, disabled: i === cats.length - 1, onclick: () => move(1) }),
              h('button', { class: 'icon-btn', 'aria-label': 'Delete category', html: ICON.x, onclick: async () => {
                const used = S.projects.filter((p) => p.category_id === c.id).length;
                if (!await confirmBox({ title: 'Delete "' + c.name + '"?', body: used ? used + ' project' + (used > 1 ? 's' : '') + ' will be left without a category. The projects stay.' : 'No project uses it.', yes: 'Delete category', danger: true })) return;
                try { await api.remove('categories', c.id); S.categories = S.categories.filter((x) => x.id !== c.id); S.projects.forEach((p) => { if (p.category_id === c.id) p.category_id = null; }); if (S.cat === c.id) S.cat = ''; paint(); render(); toast('Category deleted'); } catch (e) { fail(e); }
              } }));
          }));
        };
        paint();
        const add = h('input', { class: 'input', type: 'text', placeholder: 'New category name', 'aria-label': 'New category name', onkeydown: (e) => { if (e.key === 'Enter') go(); } });
        const go = async () => { const v = add.value.trim(); if (!v) return add.focus(); try { S.categories.push(await api.save('categories', { name: v, position: S.categories.length + 1 })); add.value = ''; paint(); render(); toast('Category added'); } catch (e) { fail(e); } };
        body.append(h('p', { class: 'note' }, 'Categories are the filters visitors use on the Projects page. Changes save as you make them.'), wrap,
          h('div', { style: 'display:flex;gap:8px' }, add, h('button', { class: 'btn', onclick: go }, 'Add')));
        body.addEventListener('input', (e) => e.stopPropagation());   // saves instantly, so never "unsaved"
      },
      footer(foot, ctl) { foot.append(h('span'), h('button', { class: 'btn', onclick: ctl.close }, 'Done')); },
    });
  }

  // ---------- Clients ----------
  function viewClients() {
    const all = S.clients.slice().sort(byPos);
    const grid = h('div', { class: 'grid' });
    all.forEach((c) => grid.append(h('div', { class: 'card', 'data-id': c.id, draggable: true },
      h('div', { class: 'card__logo' }, c.logo_url ? h('img', { src: c.logo_url, alt: c.name, draggable: false }) : h('span', null, c.name)),
      h('div', { class: 'card__foot' }, h('b', null, c.name), h('button', { class: 'icon-btn', 'aria-label': 'Edit ' + c.name, html: ICON.edit, onclick: () => editClient(c) })))));
    sortable(grid, 'clients', '.card', true);
    return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'Clients'), h('p', null, 'Brands and agencies shown on the Clients page. Drag a card to change the order.')),
        h('div', { class: 'head__actions' }, h('button', { class: 'btn btn--red', onclick: () => editClient() }, 'New client'))),
      all.length ? grid : h('div', { class: 'list' }, h('div', { class: 'empty' }, h('h3', null, 'No clients yet'), 'Add a name and a logo for each one.', h('br'), h('button', { class: 'btn btn--red', onclick: () => editClient() }, 'New client')))];
  }
  function editClient(c) {
    const isNew = !c; c = c || { name: '', logo_url: '', website: '' };
    const name = h('input', { type: 'text', value: c.name });
    const site = h('input', { type: 'url', value: c.website, placeholder: 'https://' });
    const logo = mediaField({ label: 'Logo', kind: 'image', folder: 'clients', value: c.logo_url, hint: 'White or light logo on a transparent background (PNG or SVG). Without a logo, the name is shown.', logo: true });
    openSheet({
      title: isNew ? 'New client' : 'Edit client',
      build(body) { body.append(field('Name', name), logo, field('Website', site, 'Optional. The logo links here.')); },
      footer(foot, ctl) {
        const save = h('button', { class: 'btn btn--red', onclick: async () => {
          if (!name.value.trim()) { name.focus(); return toast('Give the client a name.', true); }
          if (logo.busy) return toast('Wait for the upload to finish.', true);
          save.disabled = true;
          try { const row = { ...c, name: name.value.trim(), website: site.value.trim(), logo_url: logo.get() }; if (isNew) row.position = S.clients.length + 1;
            const saved = await api.save('clients', row); if (isNew) S.clients.push(saved); else S.clients = S.clients.map((x) => (x.id === saved.id ? saved : x));
            ctl.clean(); ctl.close(); render(); toast(isNew ? 'Client added' : 'Client saved'); } catch (e) { fail(e); save.disabled = false; }
        } }, 'Save client');
        foot.append(isNew ? h('span') : h('button', { class: 'btn btn--danger', onclick: async () => {
          if (!await confirmBox({ title: 'Delete "' + c.name + '"?', body: 'It disappears from the Clients page.', yes: 'Delete client', danger: true })) return;
          try { await api.remove('clients', c.id); S.clients = S.clients.filter((x) => x.id !== c.id); ctl.clean(); ctl.close(); render(); toast('Client deleted'); } catch (e) { fail(e); }
        } }, 'Delete'), h('div', null, h('button', { class: 'btn', onclick: ctl.tryClose }, 'Cancel'), save));
      },
    });
  }

  // ---------- About chapters ----------
  function viewAbout() {
    if (S.chapters === null) return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'About'), h('p', null, 'The chapters on the About page.'))),
      h('div', { class: 'list' }, h('div', { class: 'empty' }, h('h3', null, 'One setup step is missing'), 'Run supabase/schema.sql again in the Supabase SQL Editor, then reload this page. Until then the site shows its built-in chapters.'))];
    const all = S.chapters.slice().sort(byPos);
    const list = h('div', { class: 'list' });
    all.forEach((c, i) => list.append(h('div', { class: 'item', 'data-id': c.id, draggable: true },
      h('span', { class: 'grip', html: ICON.grip, title: 'Drag to reorder' }),
      h('span', { class: 'item__n' }, pad2(i + 1)),
      h('div', { class: 'item__thumb', style: c.image_url ? 'background-image:url("' + encodeURI(c.image_url).replace(/"/g, '%22') + '")' : '' }),
      h('button', { class: 'item__main', onclick: () => editChapter(c) }, h('span', { class: 'item__name' }, c.title), h('div', { class: 'item__meta' }, c.caption)),
      h('span'),
      h('div', { class: 'item__acts' },
        h('button', { class: 'icon-btn move', 'aria-label': 'Move up', html: ICON.up, disabled: i === 0, onclick: () => nudge('chapters', c.id, -1) }),
        h('button', { class: 'icon-btn move', 'aria-label': 'Move down', html: ICON.down, disabled: i === all.length - 1, onclick: () => nudge('chapters', c.id, 1) }),
        h('button', { class: 'icon-btn', 'aria-label': 'Edit ' + c.title, html: ICON.edit, onclick: () => editChapter(c) })))));
    if (!all.length) list.append(h('div', { class: 'empty' }, h('h3', null, 'No chapters yet'), 'Each chapter is one big word on the About page, with a picture and a small caption.', h('br'), h('button', { class: 'btn btn--red', onclick: () => editChapter() }, 'New chapter')));
    sortable(list, 'chapters', '.item');
    return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'About'), h('p', null, 'The chapters on the About page, in this order. Visitors pick one to see its picture.')),
        h('div', { class: 'head__actions' }, h('button', { class: 'btn btn--red', onclick: () => editChapter() }, 'New chapter'))),
      list,
      timelineBlock()];
  }
  // the dates on the History page
  function timelineBlock() {
    const head = (extra) => h('div', { class: 'head', style: 'margin-top:56px' }, h('div', null, h('h2', { style: 'font:700 30px/1 var(--display);letter-spacing:-.025em' }, 'History timeline'), h('p', null, 'The dates shown when a visitor opens History. They appear one after the other, left to right. The last one gets the darkest block.')), extra);
    if (S.milestones === null) return h('div', null, head(), h('div', { class: 'list' }, h('div', { class: 'empty' }, h('h3', null, 'One setup step is missing'), 'Run supabase/schema.sql again in the Supabase SQL Editor, then reload this page.')));
    const all = S.milestones.slice().sort(byPos);
    const list = h('div', { class: 'list' });
    all.forEach((m, i) => list.append(h('div', { class: 'item item--plain', 'data-id': m.id, draggable: true },
      h('span', { class: 'grip', html: ICON.grip, title: 'Drag to reorder' }),
      h('span', { class: 'item__n' }, pad2(i + 1)),
      h('button', { class: 'item__main', onclick: () => editMilestone(m) }, h('span', { class: 'item__name' }, (m.year ? m.year + '  ' : '') + m.title), h('div', { class: 'item__meta' }, m.line)),
      h('div', { class: 'item__acts' },
        h('button', { class: 'icon-btn move', 'aria-label': 'Move up', html: ICON.up, disabled: i === 0, onclick: () => nudge('milestones', m.id, -1) }),
        h('button', { class: 'icon-btn move', 'aria-label': 'Move down', html: ICON.down, disabled: i === all.length - 1, onclick: () => nudge('milestones', m.id, 1) }),
        h('button', { class: 'icon-btn', 'aria-label': 'Edit ' + m.title, html: ICON.edit, onclick: () => editMilestone(m) })))));
    if (!all.length) list.append(h('div', { class: 'empty' }, h('h3', null, 'No dates yet'), 'Add the first moment in the studio\'s story.'));
    sortable(list, 'milestones', '.item');
    return h('div', null, head(h('div', { class: 'head__actions' }, h('button', { class: 'btn', onclick: () => editMilestone() }, 'New date'))), list);
  }
  function editMilestone(m) {
    const isNew = !m; m = m || { year: '', title: '', line: '' };
    const year = h('input', { type: 'text', value: m.year, placeholder: '2014' });
    const title = h('input', { type: 'text', value: m.title, placeholder: 'Founded in Beirut' });
    const line = h('input', { type: 'text', value: m.line, placeholder: 'Two editors, one room, one deadline.' });
    openSheet({
      title: isNew ? 'New date' : 'Edit date',
      build(body) { body.append(field('Year', year, 'Shown very large. Four characters fit best.'), field('What happened', title), field('One short line about it', line)); },
      footer(foot, ctl) {
        const save = h('button', { class: 'btn btn--red', onclick: async () => {
          if (!title.value.trim()) { title.focus(); return toast('Say what happened.', true); }
          save.disabled = true;
          try { const row = { ...m, year: year.value.trim(), title: title.value.trim(), line: line.value.trim() }; if (isNew) row.position = S.milestones.length + 1;
            const saved = await api.save('milestones', row); if (isNew) S.milestones.push(saved); else S.milestones = S.milestones.map((x) => (x.id === saved.id ? saved : x));
            ctl.clean(); ctl.close(); render(); toast(isNew ? 'Date added' : 'Date saved'); } catch (e) { fail(e); save.disabled = false; }
        } }, 'Save date');
        foot.append(isNew ? h('span') : h('button', { class: 'btn btn--danger', onclick: async () => {
          if (!await confirmBox({ title: 'Delete "' + m.title + '"?', body: 'It disappears from the History timeline.', yes: 'Delete date', danger: true })) return;
          try { await api.remove('milestones', m.id); S.milestones = S.milestones.filter((x) => x.id !== m.id); ctl.clean(); ctl.close(); render(); toast('Date deleted'); } catch (e) { fail(e); }
        } }, 'Delete'), h('div', null, h('button', { class: 'btn', onclick: ctl.tryClose }, 'Cancel'), save));
      },
    });
  }
  function editChapter(c) {
    const isNew = !c; c = c || { title: '', caption: '', image_url: '' };
    const title = h('input', { type: 'text', value: c.title, placeholder: 'History' });
    const caption = h('input', { type: 'text', value: c.caption, placeholder: 'Since 2015' });
    const img = mediaField({ label: 'Picture', kind: 'image', folder: 'about', value: c.image_url, hint: 'Portrait works best. The site turns it red and reveals it from under red cubes.' });
    openSheet({
      title: isNew ? 'New chapter' : 'Edit chapter',
      build(body) { body.append(field('Title', title, 'One word works best. It is shown very large.'), field('Small line under the picture', caption), img); },
      footer(foot, ctl) {
        const save = h('button', { class: 'btn btn--red', onclick: async () => {
          if (!title.value.trim()) { title.focus(); return toast('Give the chapter a title.', true); }
          if (img.busy) return toast('Wait for the upload to finish.', true);
          save.disabled = true;
          try { const row = { ...c, title: title.value.trim(), caption: caption.value.trim(), image_url: img.get() }; if (isNew) row.position = S.chapters.length + 1;
            const saved = await api.save('chapters', row); if (isNew) S.chapters.push(saved); else S.chapters = S.chapters.map((x) => (x.id === saved.id ? saved : x));
            ctl.clean(); ctl.close(); render(); toast(isNew ? 'Chapter added' : 'Chapter saved'); } catch (e) { fail(e); save.disabled = false; }
        } }, 'Save chapter');
        foot.append(isNew ? h('span') : h('button', { class: 'btn btn--danger', onclick: async () => {
          if (!await confirmBox({ title: 'Delete "' + c.title + '"?', body: 'It disappears from the About page.', yes: 'Delete chapter', danger: true })) return;
          try { await api.remove('chapters', c.id); S.chapters = S.chapters.filter((x) => x.id !== c.id); ctl.clean(); ctl.close(); render(); toast('Chapter deleted'); } catch (e) { fail(e); }
        } }, 'Delete'), h('div', null, h('button', { class: 'btn', onclick: ctl.tryClose }, 'Cancel'), save));
      },
    });
  }

  // ---------- Page texts ----------
  function viewTexts() {
    const ORDER = ['Home', 'About', 'About: Countries page', 'Clients', 'Projects', 'Team', 'Contact', 'Search and sharing'];
    const groups = [...new Set(S.texts.map((t) => t.group_name))].sort((a, b) => (ORDER.indexOf(a) + 1 || 99) - (ORDER.indexOf(b) + 1 || 99));
    const inputs = {};
    const bar = h('div', { class: 'savebar' }, h('span', null, 'You have unsaved changes'));
    const changed = () => S.texts.filter((t) => inputs[t.key].value !== t.value);
    const check = () => { bar.classList.toggle('is-on', changed().length > 0); S.dirtyTexts = changed().length > 0; };
    const save = h('button', { class: 'btn', onclick: async () => {
      const list = changed().map((t) => ({ key: t.key, value: inputs[t.key].value })); save.disabled = true;
      try { await api.saveTexts(list); list.forEach((c) => { S.texts.find((t) => t.key === c.key).value = c.value; }); check(); toast('Texts saved'); } catch (e) { fail(e); }
      save.disabled = false;
    } }, 'Save changes');
    bar.append(h('div', { style: 'display:flex;gap:8px' }, h('button', { class: 'btn btn--ghost', style: 'color:#fff', onclick: () => { S.texts.forEach((t) => { inputs[t.key].value = t.value; }); check(); } }, 'Undo'), save));
    return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'Page texts'), h('p', null, 'The words on the site. Edit, then save. Changes go live right away.'))),
      groups.map((g) => h('section', { class: 'block' }, h('h2', null, g), h('div', null,
        S.texts.filter((t) => t.group_name === g).sort(byPos).map((t) => { const el = t.kind === 'short' ? h('input', { type: 'text', value: t.value, oninput: check }) : h('textarea', { value: t.value, rows: 3, oninput: check }); inputs[t.key] = el; return field(t.label, el); })))),
      bar];
  }

  // ---------- People ----------
  function viewPeople() {
    const owner = S.user.role === 'owner';
    const list = h('div', { class: 'list' }, S.editors.map((e) => h('div', { class: 'person' },
      h('div', { class: 'person__av' }, (e.name || e.email).slice(0, 1).toUpperCase()),
      h('div', { class: 'person__main' }, h('b', null, (e.name || e.email) + (e.user_id === S.user.id ? ' (you)' : '')), h('span', null, e.email)),
      h('span', { class: 'tag' + (e.role === 'owner' ? ' tag--red' : '') }, e.role === 'owner' ? 'Owner' : 'Editor'),
      owner && e.user_id !== S.user.id && h('button', { class: 'btn btn--sm btn--danger', onclick: async () => {
        if (!await confirmBox({ title: 'Remove ' + (e.name || e.email) + '?', body: 'They will no longer be able to sign in.', yes: 'Remove person', danger: true })) return;
        try { await api.removeUser(e.user_id); S.editors = S.editors.filter((x) => x.user_id !== e.user_id); render(); toast('Person removed'); } catch (err) { fail(err); }
      } }, 'Remove'))));
    return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'People'), h('p', null, owner ? 'Everyone here can edit the site. Owners can also add and remove people.' : 'Everyone here can edit the site. Ask an owner to add or remove someone.')),
        owner && h('div', { class: 'head__actions' }, h('button', { class: 'btn btn--red', onclick: addPerson }, 'Add person'))),
      list];
  }
  function addPerson() {
    const name = h('input', { type: 'text' }), email = h('input', { type: 'email' });
    const pw = h('input', { type: 'text', value: Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('').replace(/(.{3})(?=.)/g, '$1-') });
    const role = h('select', null, h('option', { value: 'editor' }, 'Editor: can edit everything on the site'), h('option', { value: 'owner' }, 'Owner: can also add and remove people'));
    openSheet({
      title: 'Add person',
      build(body) { body.append(field('Name', name), field('Email', email, 'They sign in with this.'), field('First password', pw, 'Send it to them yourself. They can change it under Account after signing in.'), field('Role', role)); },
      footer(foot, ctl) {
        const go = h('button', { class: 'btn btn--red', onclick: async () => {
          if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { email.focus(); return toast('Enter a valid email.', true); }
          if (pw.value.length < 8) { pw.focus(); return toast('The password needs at least 8 characters.', true); }
          go.disabled = true;
          try { S.editors.push(await api.addUser({ name: name.value.trim(), email: email.value.trim(), password: pw.value, role: role.value })); ctl.clean(); ctl.close(); render(); toast('Person added'); } catch (e) { fail(e); go.disabled = false; }
        } }, 'Add person');
        foot.append(h('span'), h('div', null, h('button', { class: 'btn', onclick: ctl.tryClose }, 'Cancel'), go));
      },
    });
  }

  // ---------- Account ----------
  function viewAccount() {
    const a = h('input', { type: 'password', autocomplete: 'new-password' }), b = h('input', { type: 'password', autocomplete: 'new-password' });
    const go = h('button', { class: 'btn btn--red', onclick: async () => {
      if (a.value.length < 8) return toast('Use at least 8 characters.', true);
      if (a.value !== b.value) return toast('The two passwords are not the same.', true);
      go.disabled = true; try { await api.setPassword(a.value); a.value = b.value = ''; toast('Password changed'); } catch (e) { fail(e); } go.disabled = false;
    } }, 'Change password');
    return [
      h('div', { class: 'head' }, h('div', null, h('h1', null, 'Account'), h('p', null, 'Signed in as ' + S.user.email))),
      h('section', { class: 'block' }, h('h2', null, 'Password'), h('div', null, field('New password', a), field('Repeat it', b), h('div', null, go))),
      h('section', { class: 'block' }, h('h2', null, 'Session'), h('div', null, h('div', null, h('button', { class: 'btn', onclick: signOut }, 'Sign out'))))];
  }

  // =========================================================
  // SHELL + BOOT
  // =========================================================
  const VIEWS = { projects: ['Projects', viewProjects], about: ['About', viewAbout], clients: ['Clients', viewClients], texts: ['Page texts', viewTexts], people: ['People', viewPeople], account: ['Account', viewAccount] };

  async function go(view) {
    if (S.dirtyTexts && S.view === 'texts' && view !== 'texts' && !await confirmBox({ title: 'Leave without saving?', body: 'Your text changes will be lost.', yes: 'Leave', danger: true })) return;
    S.dirtyTexts = false; S.view = view; history.replaceState(null, '', '#' + view); render(); window.scrollTo(0, 0);
  }
  function render() {
    const count = { projects: S.projects.length, about: (S.chapters || []).length, clients: S.clients.length, people: S.editors.length };
    const nav = (k, cls) => h('button', { class: 'nav-item ' + (cls || ''), 'aria-current': S.view === k ? 'page' : null, onclick: () => go(k) }, VIEWS[k][0], count[k] != null && h('span', null, count[k]));
    $app.replaceChildren(h('div', { class: 'shell' },
      h('nav', { class: 'side', 'aria-label': 'Dashboard' },
        h('div', { class: 'side__mark', html: MARK + '<span>Whiplash</span>' }),
        nav('projects'), nav('about'), nav('clients'), nav('texts'), nav('people'),
        h('div', { class: 'side__foot' },
          h('a', { class: 'nav-item nav-item--site', href: CFG.siteUrl || '../', target: '_blank', rel: 'noopener' }, 'View site'),
          nav('account'), h('div', { class: 'side__who' }, S.user.email))),
      h('main', { class: 'main' },
        !LIVE && h('div', { class: 'demo' }, h('b', null, 'Demo mode. '), 'Nothing here is live yet: changes are kept in this browser only. Follow admin/SETUP.md to connect the real site. ',
          h('button', { class: 'btn btn--ghost btn--sm', onclick: async () => { if (await confirmBox({ title: 'Reset the demo?', body: 'Sample content comes back and your demo changes are removed.', yes: 'Reset demo', danger: true })) { localStorage.removeItem('whiplash-admin-demo-v1'); location.reload(); } } }, 'Reset demo')),
        VIEWS[S.view][1]())));
  }

  function renderLogin(msg) {
    const email = h('input', { type: 'email', autocomplete: 'username', required: true });
    const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
    const err = h('p', { class: 'login__err', role: 'alert' }, msg || '');
    const btn = h('button', { class: 'btn btn--red', type: 'submit' }, 'Sign in');
    const form = h('form', { class: 'login__form', onsubmit: async (e) => {
      e.preventDefault(); err.textContent = ''; btn.disabled = true; btn.textContent = 'Signing in…';
      try { S.user = await api.signIn(email.value.trim(), pw.value); await start(); }
      catch (ex) { err.textContent = ex.message; btn.disabled = false; btn.textContent = 'Sign in'; }
    } }, h('h2', null, 'Sign in'), field('Email', email), field('Password', pw), err, btn,
      h('p', { class: 'note' }, LIVE ? 'Forgot your password? Ask a studio owner to set a new one.' : 'Demo mode: any email and password work.'));
    $app.replaceChildren(h('div', { class: 'login' }, h('div', { class: 'login__brand' }, h('div', { html: MARK }), h('h1', null, 'Whiplash', h('br'), 'dashboard')), form));
    email.focus();
  }

  async function start() {
    Object.assign(S, await api.loadAll());
    const v = location.hash.slice(1); if (VIEWS[v]) S.view = v;
    render();
  }
  async function signOut() { await api.signOut(); S.user = null; renderLogin(); }

  window.addEventListener('beforeunload', (e) => { if (S.dirtyTexts) { e.preventDefault(); e.returnValue = ''; } });
  (async function boot() {
    try { S.user = await api.init(); if (S.user) await start(); else renderLogin(); }
    catch (e) { console.error(e); renderLogin(e.message); }
  })();
})();
