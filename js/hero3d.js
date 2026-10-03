/* Estakhrjo Hero 3D — اقیانوس ذره‌ای WebGL (Three.js r128) */
(function () {
  'use strict';
  const canvas = document.getElementById('gl');
  if (!canvas || typeof THREE === 'undefined') return;

  let renderer, scene, camera, points, bubbles = [], raf, W, H, mouseX = 0, mouseY = 0;
  let visible = true;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x050d1a, 0.028);
  camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
  camera.position.set(0, 8, 26);

  // ---------- موج: شبکه ذرات سینوسی ----------
  const COLS = 140, ROWS = 80, GAP = 1.1;
  const count = COLS * ROWS;
  const pos = new Float32Array(count * 3);
  const cols = new Float32Array(count * 3);
  let i = 0;
  for (let x = 0; x < COLS; x++) for (let z = 0; z < ROWS; z++) {
    pos[i * 3] = (x - COLS / 2) * GAP;
    pos[i * 3 + 1] = 0;
    pos[i * 3 + 2] = (z - ROWS / 2) * GAP;
    const d = (x / COLS) * 0.5 + (z / ROWS) * 0.5;
    cols[i * 3] = 0.05 + d * 0.25;        // R
    cols[i * 3 + 1] = 0.55 + d * 0.35;    // G
    cols[i * 3 + 2] = 0.85 + d * 0.15;    // B
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.PointsMaterial({ size: 0.14, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
  points = new THREE.Points(geo, mat);
  points.position.y = -4;
  scene.add(points);

  // ---------- حباب‌های شناور ----------
  const bubbleGeo = new THREE.SphereGeometry(0.3, 12, 12);
  const bubbleMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.28 });
  for (let b = 0; b < 26; b++) {
    const m = new THREE.Mesh(bubbleGeo, bubbleMat);
    m.position.set((Math.random() - .5) * 60, Math.random() * 16 - 4, (Math.random() - .5) * 40);
    m.scale.setScalar(0.3 + Math.random() * 0.9);
    m.userData = { sp: 0.2 + Math.random() * 0.6, ph: Math.random() * Math.PI * 2 };
    bubbles.push(m);
    scene.add(m);
  }

  function resize() {
    W = canvas.clientWidth; H = canvas.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  document.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth - .5) * 2;
    mouseY = (e.clientY / window.innerHeight - .5) * 2;
  }, { passive: true });

  // توقف رندر وقتی بیرون ویوپورت است
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }, { threshold: 0 }).observe(canvas);

  let t = 0;
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!visible) return;
    t += 0.012;
    const p = points.geometry.attributes.position.array;
    let j = 0;
    for (let x = 0; x < COLS; x++) for (let z = 0; z < ROWS; z++) {
      const px = (x - COLS / 2) * GAP, pz = (z - ROWS / 2) * GAP;
      p[j * 3 + 1] =
        Math.sin(px * 0.18 + t * 1.4) * 1.4 +
        Math.sin(pz * 0.22 + t * 1.1) * 0.9 +
        Math.sin((px + pz) * 0.1 + t * 0.8) * 1.2;
      j++;
    }
    points.geometry.attributes.position.needsUpdate = true;
    points.rotation.y = mouseX * 0.04;

    bubbles.forEach((m, k) => {
      m.position.y += Math.sin(t * m.userData.sp * 2 + m.userData.ph) * 0.006 + 0.006;
      m.position.x += Math.cos(t * m.userData.sp + k) * 0.004;
      if (m.position.y > 14) m.position.y = -5;
    });

    camera.position.x += (mouseX * 4 - camera.position.x) * 0.04;
    camera.position.y += (8 - mouseY * 3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }
  tick();
})();
