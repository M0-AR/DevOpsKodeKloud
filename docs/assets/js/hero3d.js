/* Hero background: a live, lightweight WebGL cluster. Pauses off-screen. */
import * as THREE from "./three.module.min.js";

const canvas = document.getElementById("hero-canvas");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function boot() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power" });
  } catch (e) {
    canvas.hidden = true;
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
  camera.position.set(0, 0.4, 10);

  const group = new THREE.Group();
  scene.add(group);

  const rand = (a, b) => a + Math.random() * (b - a);
  const nodes = [];
  const count = window.innerWidth < 760 ? 58 : 96;
  for (let i = 0; i < count; i++) {
    const r = 3.4 + Math.random() * 1.9;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(rand(-1, 1));
    nodes.push(new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 0.75,
      r * Math.sin(phi) * Math.sin(theta)
    ));
  }

  const nodeGeo = new THREE.BufferGeometry().setFromPoints(nodes);
  const nodeMat = new THREE.PointsMaterial({
    color: 0x67e8f9, size: 0.075, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  group.add(new THREE.Points(nodeGeo, nodeMat));

  const linePositions = [];
  for (let i = 0; i < nodes.length; i++) {
    let links = 0;
    for (let j = i + 1; j < nodes.length && links < 2; j++) {
      if (nodes[i].distanceTo(nodes[j]) < 2.35) {
        linePositions.push(nodes[i].x, nodes[i].y, nodes[i].z, nodes[j].x, nodes[j].y, nodes[j].z);
        links++;
      }
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.LineSegments(lineGeo, lineMat));

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.15, 1),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6, wireframe: true, transparent: true, opacity: 0.22 })
  );
  group.add(core);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 0),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, wireframe: true, transparent: true, opacity: 0.28 })
  );
  group.add(inner);

  const rings = [];
  for (let i = 0; i < 2; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6 + i * 0.7, 0.006, 6, 140),
      new THREE.MeshBasicMaterial({ color: i ? 0x8b5cf6 : 0x22d3ee, transparent: true, opacity: 0.28 })
    );
    ring.rotation.x = Math.PI / 2.6 + i * 0.35;
    ring.rotation.y = i * 0.5;
    group.add(ring);
    rings.push(ring);
  }

  const starCount = 420;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = rand(-18, 18);
    starPos[i * 3 + 1] = rand(-12, 12);
    starPos[i * 3 + 2] = rand(-16, -2);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x94a3b8, size: 0.045, transparent: true, opacity: 0.5, depthWrite: false
  }));
  scene.add(stars);

  const state = { x: 0, y: 0, tx: 0, ty: 0, visible: true };
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  window.addEventListener("pointermove", (e) => {
    state.tx = (e.clientX / window.innerWidth - 0.5) * 1.4;
    state.ty = (e.clientY / window.innerHeight - 0.5) * 0.9;
  }, { passive: true });

  let raf = 0;
  function startLoop() {
    if (reduced || raf) return;
    raf = requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      state.visible = entries[0].isIntersecting;
      if (state.visible) startLoop();
    }, { threshold: 0.02 }).observe(canvas);
  }

  function frame(t) {
    raf = 0;
    if (!state.visible || document.hidden) return;
    const time = t * 0.001;
    group.rotation.y = time * 0.09;
    group.rotation.x = Math.sin(time * 0.22) * 0.08;
    core.rotation.y = -time * 0.14;
    core.rotation.z = time * 0.08;
    inner.rotation.x = time * 0.2;
    rings.forEach((ring, i) => { ring.rotation.z = time * (i ? -0.1 : 0.13); });
    stars.rotation.z = time * 0.005;

    state.x += (state.tx - state.x) * 0.04;
    state.y += (state.ty - state.y) * 0.04;
    camera.position.x = state.x;
    camera.position.y = 0.4 + state.y;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.visible) startLoop();
  });

  renderer.render(scene, camera);
  startLoop();
}

if (canvas) {
  if (reduced) boot();
  else {
    const start = () => boot();
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1200 });
    else setTimeout(start, 120);
  }
}
