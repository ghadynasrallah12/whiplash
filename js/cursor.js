// =========================================================
// WHIPLASH — the cursor
//   A soft lens that follows the pointer and blurs whatever is under it
//   (the "drunk" lens): a main disc with a backdrop blur, a ghost disc that
//   lags behind it for a touch of double vision, and a sharp dot where the
//   real pointer is. It grows over anything clickable. Pointer devices only.
// =========================================================
(() => {
  const fine = window.matchMedia('(pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine) return;

  const root = document.getElementById('app') || document.body;
  const el = document.createElement('div');
  el.className = 'cur';
  el.innerHTML = '<div class="cur__ghost"></div><div class="cur__lens"></div><div class="cur__dot"></div>';
  root.appendChild(el);
  document.documentElement.classList.add('has-cur');

  const lens = el.querySelector('.cur__lens'), ghost = el.querySelector('.cur__ghost'), dot = el.querySelector('.cur__dot');
  let mx = -500, my = -500;            // pointer
  let lx = mx, ly = my;                 // lens (lags a little, wobbles)
  let gx = mx, gy = my;                 // ghost (lags more)
  let vx = 0, vy = 0, gvx = 0, gvy = 0; // spring velocities
  let shown = false, hot = 0, hotWant = 0, pressed = 0, pressWant = 0;

  const CLICKABLE = 'a, button, .work__name, .work__media, .work__thumb, .filters__item, .burger, .wd__back, .wd__link';
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; lx = gx = mx; ly = gy = my; el.classList.add('is-on'); }
    hotWant = e.target.closest?.(CLICKABLE) ? 1 : 0;
  }, { passive: true });
  document.addEventListener('mouseleave', () => { el.classList.remove('is-on'); shown = false; });
  document.addEventListener('mouseenter', () => { if (mx > -400) { el.classList.add('is-on'); shown = true; } });
  window.addEventListener('mousedown', () => { pressWant = 1; });
  window.addEventListener('mouseup', () => { pressWant = 0; });

  // a slightly under-damped spring: the lens overshoots the pointer a little and settles — the sway
  const K = reduce ? 1 : 0.16, D = reduce ? 1 : 0.72;
  const GK = reduce ? 1 : 0.075, GD = reduce ? 1 : 0.8;
  function frame() {
    if (reduce) { lx = gx = mx; ly = gy = my; }
    else {
      vx = (vx + (mx - lx) * K) * D; vy = (vy + (my - ly) * K) * D; lx += vx; ly += vy;
      gvx = (gvx + (lx - gx) * GK) * GD; gvy = (gvy + (ly - gy) * GK) * GD; gx += gvx; gy += gvy;
    }
    hot += (hotWant - hot) * 0.18;
    pressed += (pressWant - pressed) * 0.25;
    const s = (1 + hot * 0.55) * (1 - pressed * 0.18);
    lens.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
    ghost.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s * 0.92).toFixed(3)})`;
    dot.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(1 - hot * 0.6).toFixed(3)})`;
    el.style.setProperty('--hot', hot.toFixed(3));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
