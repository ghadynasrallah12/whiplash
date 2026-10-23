// =========================================================
// WHIPLASH — GL media (the project images in the list)
//   Draws the open image as a WebGL sheet so it can bend in 3D:
//   on hover it bulges and its edges undulate (as on the reference),
//   while scrolling it skews with the velocity. Uses the THREE
//   build that logo3d.js exposes on window.THREE.
//   works.js calls WHIPLASH_GL.draw([{ rect, src, open, hover }]) each frame.
// =========================================================
(() => {
  const T = window.THREE;
  const page = document.getElementById('page-projects');
  const list = page?.querySelector('.works');
  if (!T || !list) return;
  // WebGL can't read images from file:// (browser security) — the list then falls back to a CSS tilt
  if (location.protocol === 'file:') return;

  const canvas = document.createElement('canvas');
  canvas.className = 'works-gl';
  page.insertBefore(canvas, list);   // under the rows, above the red/black backdrop

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: false });
  } catch (_) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(0, 1, 0, 1, -10, 10);
  const geometry = new T.PlaneGeometry(1, 1, 48, 28);

  const vert = `
    uniform vec4 uRect;      // x, y, w, h in px (y down)
    uniform float uHover;    // 0..1
    uniform float uVel;      // scroll velocity (rows pending)
    uniform float uTime;
    uniform vec2 uMouse;     // cursor in px (y down)
    uniform float uLens;     // 0..1 cursor-lens strength
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec2 p = vec2(uv.x, 1.0 - uv.y);          // 0..1, y down
      vec2 c = p - 0.5;
      float x = uRect.x + p.x * uRect.z;
      float y = uRect.y + p.y * uRect.w;
      // hover: the sheet inflates (barrel) and its edges ripple
      float bul = uHover * 0.07;
      x += c.x * uRect.z * bul * (1.0 - c.y * c.y * 2.4);
      y += c.y * uRect.w * bul * (1.0 - c.x * c.x * 2.4);
      y += uHover * uRect.w * 0.030 * sin(p.x * 6.2832 + uTime * 2.6) * (0.4 + 0.6 * abs(c.y) * 2.0);
      x += uHover * uRect.z * 0.014 * sin(p.y * 6.2832 - uTime * 2.1);
      // scroll: skew with the velocity
      y += uVel * (p.x - 0.5) * uRect.w * 0.12;
      x += uVel * (p.y - 0.5) * uRect.z * 0.04;
      // cursor lens: the sheet bulges around the pointer wherever it is on the page
      vec2 d = vec2(x, y) - uMouse;
      float r = length(d) / (uRect.w * 0.9);
      float bump = exp(-r * r * 2.2) * uLens * uRect.w * 0.09;
      vec2 dir = r > 0.0001 ? normalize(d) : vec2(0.0);
      x += dir.x * bump; y += dir.y * bump;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, 0.0, 1.0);
    }`;
  const frag = `
    uniform sampler2D map;
    uniform vec2 uScale, uOffset;   // cover-fit
    uniform float uOpacity;
    uniform float uGray;            // 1 = black & white (the homepage film), 0 = colour
    uniform float uDim;             // brightness (1 = as is; the project detail dims to .55)
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv * uScale + uOffset;
      vec4 c = texture2D(map, uv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));   // same weights as CSS filter: grayscale(1), so the hand-over to the <video> is invisible
      c.rgb = mix(c.rgb, vec3(l), uGray) * uDim;
      gl_FragColor = vec4(c.rgb, c.a * uOpacity);
    }`;

  // the red backdrop: one full-screen quad whose edge is computed in the fragment shader (no DOM
  // clip-path repaints per frame). works.js passes the edge parameters every frame.
  const bgMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.ShaderMaterial({
    transparent: true, depthTest: false,
    uniforms: { uRes: { value: new T.Vector2(1, 1) }, uColor: { value: new T.Vector3(0.8, 0.1, 0.086) }, uY0: { value: 0 }, uAmp: { value: 0 }, uPhase: { value: 0 }, uDipX: { value: -9999 }, uDipW: { value: 1 }, uDip: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy * 2.0, 0.0, 1.0); }`,
    fragmentShader: `
      uniform vec2 uRes; uniform vec3 uColor; uniform float uY0, uAmp, uPhase, uDipX, uDipW, uDip;
      varying vec2 vUv;
      void main(){
        float x = vUv.x * uRes.x, y = (1.0 - vUv.y) * uRes.y;
        float g = exp(-pow((x - uDipX) / uDipW, 2.0));
        float edge = uY0 + uDip * g + uAmp * sin(vUv.x * 6.2832 * 1.6 + uPhase) + uAmp * 0.4 * sin(vUv.x * 6.2832 * 3.1 - uPhase * 1.7);
        float a = smoothstep(edge - 0.75, edge + 0.75, y);
        gl_FragColor = vec4(uColor, a);
      }`,
  }));
  bgMesh.frustumCulled = false; bgMesh.visible = false; bgMesh.renderOrder = -1;
  scene.add(bgMesh);
  // the exact CSS red (no colour management: the names blend against it with `difference`, so it has to match)
  const cssRed = () => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--red').trim();
    const m = c.match(/(\d+)\D+(\d+)\D+(\d+)/);
    return m ? [m[1] / 255, m[2] / 255, m[3] / 255] : null;
  };

  const textures = new Map();
  const loader = new T.TextureLoader();
  function tex(src) {
    if (!textures.has(src)) {
      // a <video> element (the homepage film) is sampled live, so it keeps playing from the same second
      const t = src instanceof HTMLVideoElement ? new T.VideoTexture(src) : loader.load(src, (tt) => { tt.needsUpdate = true; });
      t.colorSpace = T.SRGBColorSpace;
      t.minFilter = T.LinearFilter;
      textures.set(src, t);
    }
    return textures.get(src);
  }

  const pool = [];
  function mesh(i) {
    if (!pool[i]) {
      const m = new T.Mesh(geometry, new T.ShaderMaterial({
        vertexShader: vert, fragmentShader: frag, transparent: true, depthTest: false,
        uniforms: { map: { value: null }, uRect: { value: new T.Vector4() }, uHover: { value: 0 }, uVel: { value: 0 }, uTime: { value: 0 }, uScale: { value: new T.Vector2(1, 1) }, uOffset: { value: new T.Vector2(0, 0) }, uOpacity: { value: 1 }, uGray: { value: 0 }, uDim: { value: 1 }, uMouse: { value: new T.Vector2(-9999, -9999) }, uLens: { value: 0 } },
      }));
      m.frustumCulled = false;
      scene.add(m);
      pool[i] = m;
    }
    return pool[i];
  }

  function resize() {
    const W = window.innerWidth, H = window.innerHeight;
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = H;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const t0 = performance.now();
  let warmed = false;
  window.WHIPLASH_GL = {
    // compile the shaders and decode the pictures before they are first needed (no hitch on the click)
    warm(srcs) {
      if (warmed) return; warmed = true;
      (srcs || []).forEach((src) => { if (src) tex(src); });
      mesh(0); mesh(1);
      try { renderer.compile(scene, camera); } catch (_) {}
      try { const c = cssRed(); if (c) bgMesh.material.uniforms.uColor.value.set(c[0], c[1], c[2]); } catch (_) {}
    },
    draw(items, vel, mouse, lens, bg) {
      const time = (performance.now() - t0) / 1000;
      // backdrop
      if (bg) {
        const u = bgMesh.material.uniforms;
        u.uRes.value.set(window.innerWidth, window.innerHeight);
        u.uY0.value = bg.y0; u.uAmp.value = bg.amp; u.uPhase.value = bg.phase;
        u.uDipX.value = bg.dipX; u.uDipW.value = bg.dipW; u.uDip.value = bg.dip;
        bgMesh.visible = true;
      } else bgMesh.visible = false;
      pool.forEach((m) => { m.visible = false; });
      items.forEach((it, i) => {
        const m = mesh(i);
        const u = m.material.uniforms;
        const t = tex(it.src);
        u.map.value = t;
        // cover-fit once the image size is known
        const img = t.image;
        const iw = img && (img.videoWidth || img.width), ih = img && (img.videoHeight || img.height);
        if (iw && ih) {
          const ia = iw / ih, ra = it.rect.w / it.rect.h;
          if (ia > ra) { u.uScale.value.set(ra / ia, 1); u.uOffset.value.set((1 - ra / ia) / 2, 0); }
          else { u.uScale.value.set(1, ia / ra); u.uOffset.value.set(0, (1 - ia / ra) / 2); }
        }
        // a slice of a bigger picture (the filmstrip frame): keep the cover-fit of the full rect, show only the slice
        if (it.full && it.full.h > 0) {
          const t = (it.rect.y - it.full.y) / it.full.h, bt = (it.rect.y + it.rect.h - it.full.y) / it.full.h;
          u.uOffset.value.y += u.uScale.value.y * (1 - bt);
          u.uScale.value.y *= (bt - t);
        }
        u.uRect.value.set(it.rect.x, it.rect.y, it.rect.w, it.rect.h);
        u.uHover.value = it.hover;
        u.uVel.value = it.film ? 0 : vel;
        u.uTime.value = time;
        u.uOpacity.value = it.opacity;
        u.uGray.value = it.gray || 0;
        u.uDim.value = it.dim == null ? 1 : it.dim;
        if (mouse) u.uMouse.value.set(mouse.x, mouse.y);
        u.uLens.value = it.film ? 0 : (lens || 0);
        m.visible = true;
      });
      renderer.render(scene, camera);
    },
    clear() { pool.forEach((m) => { m.visible = false; }); bgMesh.visible = false; renderer.render(scene, camera); },
    hasBg: true,
  };
  page.classList.add('gl');
})();
