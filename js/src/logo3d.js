// =========================================================
// WHIPLASH — 3D logo (three.js)
// The logo is rebuilt as a real extruded solid so it can
// rotate in 3D and follow the cursor.
// =========================================================
import * as THREE from '../vendor/three.module.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
window.THREE = THREE;   // shared with js/gl-media.js

// ---------- Tunables -------------------------------------
const CONFIG = {
  color: 0xd41e12,   // brand red rgb(171,35,27) once lit         // base red
  depth: 14,               // extrusion depth (bar width = 16)
  skewDeg: 0,             // italic slant of the glyph
  heightVH: 0.17,          // logo height as a fraction of viewport height (desktop)
  heightVHMobile: 0.14,
  basePose: { x: 0.10, y: 0.16, z: 0.24 }, // resting orientation (matches the reference render)
  spin: 0.0045,            // radians of turn per pixel of cursor travel
  ease: 0.08,             // follow smoothing
  idleAfterMs: 2500,       // start slow auto-rotation after this much pointer silence
  idleSpeed: 0.25,         // rad/s
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('logo');

// ---------- Renderer -------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(22, 1, 1, 3000);
camera.position.set(0, 0, 640);

// Environment for glossy reflections
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.15;

// Lights (key / fill / rim)
const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(140, 200, 340);
const fill = new THREE.DirectionalLight(0xffe4e0, 0.3);
fill.position.set(-220, -40, 160);
const rim = new THREE.DirectionalLight(0xffffff, 0.5);
rim.position.set(120, 180, -220);
scene.add(key, fill, rim, new THREE.AmbientLight(0xffffff, 0.12));

// ---------- Glyph (2-D outline, y-up, H = 100 units) ----------
// Traced from the flat logo (whiplash-logo.jpg):
//   bar 1  – free-standing, bottom-left corner fully rounded
//   bar 2  – runs into the foot; concave fillets on both sides,
//            foot's left end is a quarter-round
//   bar 3  – shorter, small radius on its bottom-left corner
function buildGlyph() {
  const W = 21.2, PITCH = 42.7, H = 100;
  const x1 = 0, x2 = PITCH, x3 = 2 * PITCH;
  const RIGHT = x3 + W;          // 106.7 — foot ends under bar 3's right edge
  const FOOT = 18;               // foot thickness
  const FIL  = 21.4;             // fillet radius where bar 2 meets the foot
  const BAR1_BOTTOM = 18;        // bar 1 ends level with the foot top
  const BAR3_BOTTOM = 39.4;
  const BAR3_R = 8;

  // bar 2 + foot
  const main = new THREE.Shape();
  main.moveTo(x2, H);
  main.lineTo(x2 + W, H);
  main.lineTo(x2 + W, FOOT + FIL);
  main.absarc(x2 + W + FIL, FOOT + FIL, FIL, Math.PI, 1.5 * Math.PI, false);   // inner fillet (right)
  main.lineTo(RIGHT, FOOT);
  main.lineTo(RIGHT, 0);
  main.lineTo(x2 - FIL + FOOT, 0);
  main.absarc(x2 - FIL + FOOT, FOOT, FOOT, 1.5 * Math.PI, Math.PI, true);      // foot's rounded left end
  main.absarc(x2 - FIL, FOOT + FIL, FIL, 1.5 * Math.PI, 2 * Math.PI, false);   // outer fillet (left)
  main.lineTo(x2, H);

  // bar 1
  const bar1 = new THREE.Shape();
  bar1.moveTo(x1, H);
  bar1.lineTo(x1 + W, H);
  bar1.lineTo(x1 + W, BAR1_BOTTOM);
  bar1.absarc(x1 + W, BAR1_BOTTOM + W, W, 1.5 * Math.PI, Math.PI, true);      // full round, bottom-left
  bar1.lineTo(x1, H);

  // bar 3
  const bar3 = new THREE.Shape();
  bar3.moveTo(x3, H);
  bar3.lineTo(x3 + W, H);
  bar3.lineTo(x3 + W, BAR3_BOTTOM);
  bar3.lineTo(x3 + BAR3_R, BAR3_BOTTOM);
  bar3.absarc(x3 + BAR3_R, BAR3_BOTTOM + BAR3_R, BAR3_R, 1.5 * Math.PI, Math.PI, true);
  bar3.lineTo(x3, H);

  return [main, bar1, bar3];
}

const geometry = new THREE.ExtrudeGeometry(buildGlyph(), {
  depth: CONFIG.depth,
  bevelEnabled: true,
  bevelThickness: 0.6,
  bevelSize: 0.6,
  bevelSegments: 3,
  curveSegments: 28,
});

// Italic skew: x' = x + y·tan(angle)
const skew = new THREE.Matrix4().set(
  1, Math.tan(THREE.MathUtils.degToRad(CONFIG.skewDeg)), 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
);
geometry.applyMatrix4(skew);
geometry.center();
geometry.computeVertexNormals();

const material = new THREE.MeshStandardMaterial({
  color: CONFIG.color,
  roughness: 0.6,
  metalness: 0.0,
  envMapIntensity: 0.15,
});

const logo = new THREE.Mesh(geometry, material);
const pivot = new THREE.Group();
pivot.add(logo);
scene.add(pivot);

// Natural size of the glyph after skew/centering
geometry.computeBoundingBox();
const bb = geometry.boundingBox;
const glyphH = bb.max.y - bb.min.y;

const view = { w: 0, h: 0 };
// ---------- Page modes -------------------------------------
// Where the logo parks, as a fraction of the viewport (0,0 = top-left).
const MODES = {
  home: { x: 0.5,   y: 0.5,  scale: 1 },
  page: { x: 0.085, y: 0.485, scale: 1 },          // panel open: logo takes the CLIENTS spot in the left strip (as in the Keynote)
  hidden: { x: 0.5, y: 0.5, scale: 0 },             // Projects: the thumbnail takes the logo's place
};
const MODES_MOBILE = {
  home: { x: 0.5, y: 0.5,  scale: 1 },
  page: { x: 0.5, y: 0.22, scale: 0.62 },          // phone: panel is full width, logo tucks under the nav rows
  hidden: { x: 0.5, y: 0.5, scale: 0 },
};
let mode = 'home';
const posTarget = { x: 0, y: 0, s: 1 };
const posCurrent = { x: 0, y: 0, s: 1 };
function applyMode() {
  const m = (window.innerWidth < 760 ? MODES_MOBILE : MODES)[mode] || MODES.home;
  posTarget.x = (m.x - 0.5) * view.w;
  posTarget.y = (0.5 - m.y) * view.h;
  posTarget.s = m.scale;
}
let panelEl = null;   // the red curtain; its live left edge pushes the logo while it slides
window.WHIPLASH_LOGO = {
  setMode(next, panel) {
    if (panel) panelEl = panel;
    if (next === mode) return;
    mode = next;
    applyMode();
    // a little flourish: one extra turn while it glides over
    if (!reduceMotion) target.y += next === 'home' ? -1.4 : 1.4;
  },
};

// ---------- Sizing -----------------------------------------
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // Fit the logo to a fraction of the viewport height
  const frac = w < 760 ? CONFIG.heightVHMobile : CONFIG.heightVH;
  const visibleH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const s = (visibleH * frac) / glyphH;
  pivot.scale.setScalar(s);
  view.h = visibleH; view.w = visibleH * camera.aspect;
  applyMode();
}
window.addEventListener('resize', resize);
resize();

// ---------- Interaction -----------------------------------
// The cursor DRIVES the rotation: moving right keeps turning the
// logo right (no limit), moving up/down keeps tipping it. Idle →
// it keeps drifting slowly on its own.
const target  = { x: 0, y: 0 };   // accumulated turn (radians)
const current = { x: 0, y: 0 };
let last = null;
let lastPointer = performance.now();
let idleAngle = 0;

function onPointer(x, y) {
  if (last) {
    target.y += (x - last.x) * CONFIG.spin;    // left/right → turn around vertical axis
    target.x += (y - last.y) * CONFIG.spin;    // up/down   → tip forward/back
  }
  last = { x, y };
  lastPointer = performance.now();
}
window.addEventListener('pointermove', (e) => onPointer(e.clientX, e.clientY), { passive: true });
window.addEventListener('pointerleave', () => { last = null; });
window.addEventListener('touchstart', (e) => { const t = e.touches[0]; if (t) last = { x: t.clientX, y: t.clientY }; }, { passive: true });
window.addEventListener('touchmove',  (e) => { const t = e.touches[0]; if (t) onPointer(t.clientX, t.clientY); }, { passive: true });
window.addEventListener('touchend',   () => { last = null; });

// Gyroscope on phones (where allowed without a prompt): tilt drives the turn
let lastGyro = null;
window.addEventListener('deviceorientation', (e) => {
  if (e.gamma == null || e.beta == null) return;
  if (lastGyro) {
    target.y += (e.gamma - lastGyro.g) * 0.02;
    target.x += (e.beta  - lastGyro.b) * 0.02;
  }
  lastGyro = { g: e.gamma, b: e.beta };
  lastPointer = performance.now();
}, { passive: true });

// ---------- Loop -------------------------------------------
const clock = new THREE.Clock();
let introT = 0;

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = performance.now();
  const idle = now - lastPointer > CONFIG.idleAfterMs;

  // smooth follow
  const ease = reduceMotion ? 1 : CONFIG.ease;
  current.x += (target.x - current.x) * ease;
  current.y += (target.y - current.y) * ease;

  // idle: slow continuous turn + gentle breathing
  if (idle && !reduceMotion) idleAngle += dt * CONFIG.idleSpeed;
  const breathe = reduceMotion ? 0 : Math.sin(now * 0.0012) * 0.04;

  // glide to where the current page wants the logo…
  const pe = reduceMotion ? 1 : 0.055;
  let tx = posTarget.x, px = pe;
  // …but on desktop the curtain physically shoves it: the logo can never sit under the
  // curtain's live edge, so it rides along with it (in and out) until it reaches its parking spot
  if (panelEl && window.innerWidth >= 760) {
    const edgePx = panelEl.getBoundingClientRect().left;
    const edgeW = (edgePx / window.innerWidth - 0.5) * view.w;
    const halfW = ((bb.max.x - bb.min.x) / 2) * pivot.scale.x * posCurrent.s * 1.08 + view.w * 0.012;
    const homeX = (MODES.home.x - 0.5) * view.w;
    const parkX = (MODES.page.x - 0.5) * view.w;
    const pushX = edgeW - halfW;
    tx = Math.max(parkX, Math.min(homeX, pushX));
    if (mode === 'page' && pushX <= parkX) tx = parkX;
    if (mode === 'hidden') tx = posTarget.x;
    if (pushX < homeX) px = 0.35;      // being shoved: react fast, little lag
  }
  posCurrent.x += (tx - posCurrent.x) * px;
  posCurrent.y += (posTarget.y - posCurrent.y) * pe;
  posCurrent.s += (posTarget.s - posCurrent.s) * pe;
  pivot.position.set(posCurrent.x, posCurrent.y, 0);

  pivot.rotation.x = CONFIG.basePose.x + current.x + breathe;
  pivot.rotation.y = CONFIG.basePose.y + current.y + idleAngle;
  pivot.rotation.z = CONFIG.basePose.z;

  // intro: scale up + settle
  if (introT < 1) {
    introT = Math.min(1, introT + dt / 1.1);
    const e = 1 - Math.pow(1 - introT, 3);
    logo.scale.setScalar((reduceMotion ? 1 : 0.6 + 0.4 * e) * posCurrent.s);
  } else {
    logo.scale.setScalar(posCurrent.s);
    material.opacity = 1;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
