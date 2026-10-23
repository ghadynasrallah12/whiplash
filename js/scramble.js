// =========================================================
// WHIPLASH — letter scramble (as on the reference)
//   Each letter cycles through random capitals, resolving left to
//   right; while scrambling, letters randomly flip italic / light.
//   WHIPLASH_SCRAMBLE(el, text, { step: ms per tick, mixed: keep the
//   italic/weight mix a beat longer after resolving })
// =========================================================
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const timers = new WeakMap();

  window.WHIPLASH_SCRAMBLE = function scramble(el, text, opts = {}) {
    if (!el) return;
    text = (text ?? el.textContent).trim();
    if (reduce) { el.textContent = text; return; }
    const step = opts.step ?? 55;        // ms per tick  (≈ 2 s for a 10-letter word)
    const per  = opts.per  ?? 6;         // ticks each letter spends scrambling
    const lag  = opts.lag  ?? 3;         // ticks between one letter starting and the next
    clearInterval(timers.get(el));

    // one span per letter (keeps spaces as real spaces so wrapping is unchanged)
    el.textContent = '';
    let idx = 0;
    const base = 'sc' + (opts.wave ? ' sc--wave' : '');
    const cells = [...text].map((ch) => {
      if (ch === ' ') { el.appendChild(document.createTextNode(' ')); return null; }
      const s = document.createElement('span');
      s.className = 'sc' + (opts.wave ? ' sc--wave' : '');
      s.style.setProperty('--i', idx++);
      s.textContent = ch;
      el.appendChild(s);
      return { s, ch, style: Math.random() < 0.45 ? 'i' : (Math.random() < 0.5 ? 'l' : '') };
    }).filter(Boolean);

    let t = 0;
    const id = setInterval(() => {
      let done = true;
      cells.forEach((c, i) => {
        const start = i * lag, end = start + per;
        if (t < start) { c.s.textContent = c.ch; c.s.className = base; done = false; }
        else if (t < end) {
          const set = opts.chars || CHARS;
          c.s.textContent = c.ch === '[' || c.ch === ']' ? c.ch : set[(Math.random() * set.length) | 0];
          c.s.className = base + ' ' + (c.style === 'i' ? 'sc--i' : c.style === 'l' ? 'sc--l' : '');
          done = false;
        } else {
          c.s.textContent = c.ch;
          c.s.className = base + (opts.mixed && t < end + 6 ? (c.style === 'i' ? ' sc--i' : c.style === 'l' ? ' sc--l' : '') : '');
          if (opts.mixed && t < end + 6) done = false;
        }
      });
      t++;
      if (done) { clearInterval(id); timers.delete(el); if (!opts.wave) el.textContent = text; }
    }, step);
    timers.set(el, id);
  };

  // hover state (grow + ripple) without any background behind the word
  window.WHIPLASH_HOVER = function hoverGrow(container, selector) {
    container.addEventListener('mouseover', (e) => { const t = e.target.closest(selector); if (t && container.contains(t)) t.classList.add('is-hover'); });
    container.addEventListener('mouseout',  (e) => { const t = e.target.closest(selector); if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) t.classList.remove('is-hover'); });
  };
  window.WHIPLASH_HOVER(document.querySelector('.nav'), '.nav__item');

  // nav labels are split into letters once (each letter its own span): the letters wave on hover on
  // Projects, and scatter away from the cursor on the homepage (the "letter spill", main.js)
  document.querySelectorAll('.nav__item').forEach((a) => {
    let i = 0;
    a.innerHTML = a.innerHTML.split(/(<span class="br"><\/span>)/).map((part) =>
      part.startsWith('<span') ? part : [...part].map((ch) => (ch.trim() ? `<span class="sc" style="--i:${i++}">${ch}</span>` : ch)).join('')
    ).join('');
    a.addEventListener('mouseenter', () => {
      window.WHIPLASH_SOUND?.hover();
      const page = (document.getElementById('app') || document.body).dataset.page;
      if (page === 'projects' && !reduce) {
        a.querySelectorAll('.sc').forEach((l) => { l.classList.remove('sc--wave'); void l.offsetWidth; l.classList.add('sc--wave'); });
      }
    });
  });
})();
