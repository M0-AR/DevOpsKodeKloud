/* 3D concept atlas: a real WebGL graph built from the artifact manifest. */
import * as THREE from "./three.module.min.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const COLORS = {
  kubernetes: 0x22d3ee,
  ansible: 0x34d399,
  puppet: 0xa78bfa,
  cka: 0xfbbf24,
  cks: 0xfb7185,
  guestbook: 0x38bdf8
};
const TOPIC_PARAM = { kubernetes: "kubernetes", ansible: "ansible", puppet: "puppet", cka: "exam", cks: "security", guestbook: "kubernetes" };

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function labelTexture(text, hex) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.font = "600 54px ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = hex;
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 16;
  ctx.fillText(text, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function showFallback(message) {
  const wrap = $("#atlas-fallback");
  if (wrap) wrap.hidden = false;
  const canvas = $("#atlas-canvas");
  if (canvas) canvas.style.display = "none";
  if (message) {
    const p = document.createElement("p");
    p.textContent = message;
    wrap.insertBefore(p, wrap.firstChild);
  }
}

async function boot() {
  const canvas = $("#atlas-canvas");
  if (!canvas) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) {
    showFallback("WebGL is unavailable in this browser.");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x000000, 0);

  let data;
  try {
    const res = await fetch("./assets/data/manifest.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (e) {
    showFallback("The atlas data could not be loaded. The full list is below.");
    return;
  }

  const files = data.files || [];
  const stats = data.stats || { categories: [] };
  const categories = (stats.categories || []).filter((c) => c.count > 0);
  $("#atlas-nodes").textContent = String(files.length + categories.length);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 200);
  const group = new THREE.Group();
  scene.add(group);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2(-10, -10);
  const meshes = [];
  const nodes = [];
  const glowTex = glowTexture();
  const sphereGeo = new THREE.SphereGeometry(1, 18, 14);

  const hubRadius = 6.2;
  const catNodes = {};
  categories.forEach((cat, i) => {
    const angle = (i / categories.length) * Math.PI * 2 - Math.PI / 2;
    const pos = new THREE.Vector3(Math.cos(angle) * hubRadius, Math.sin(i * 1.7) * 1.1, Math.sin(angle) * hubRadius);
    const node = makeNode({
      id: "cat-" + cat.id,
      type: "category",
      title: cat.label,
      desc: cat.blurb,
      category: cat.id,
      position: pos,
      size: 0.42,
      color: COLORS[cat.id] || 0x22d3ee,
      count: cat.count,
      stats: cat
    });
    catNodes[cat.id] = node;
  });

  const perCat = {};
  categories.forEach((c) => { perCat[c.id] = files.filter((f) => f.category === c.id); });

  files.forEach((file) => {
    const hub = catNodes[file.category];
    if (!hub) return;
    const list = perCat[file.category];
    const index = list.indexOf(file);
    const spread = 2.15;
    const theta = (index / Math.max(1, list.length)) * Math.PI * 2 + file.path.length * 0.11;
    const y = ((index % 5) - 2) * 0.62 + Math.sin(index * 1.7) * 0.24;
    const r = spread + (index % 3) * 0.42;
    const pos = hub.position.clone().add(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
    makeNode({
      id: "file-" + file.path,
      type: "file",
      title: file.title,
      desc: file.description,
      category: file.category,
      categoryLabel: file.categoryLabel,
      level: file.level,
      path: file.path,
      tags: file.tags || [],
      modernization: file.modernization || "",
      position: pos,
      size: 0.14,
      color: COLORS[file.category] || 0x94a3b8,
      file
    });
  });

  function makeNode(opts) {
    const mat = new THREE.MeshBasicMaterial({ color: opts.color, transparent: true, opacity: 0.95 });
    const mesh = new THREE.Mesh(sphereGeo, mat);
    mesh.position.copy(opts.position);
    mesh.scale.setScalar(opts.size);
    mesh.userData.node = opts;
    group.add(mesh);
    meshes.push(mesh);

    const glowMat = new THREE.SpriteMaterial({
      map: glowTex, color: opts.color, transparent: true,
      opacity: opts.type === "category" ? 0.5 : 0.28,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(opts.position);
    glow.scale.setScalar(opts.type === "category" ? 2.6 : 0.75);
    group.add(glow);

    let label = null;
    if (opts.type === "category") {
      const hex = "#" + opts.color.toString(16).padStart(6, "0");
      const labelMat = new THREE.SpriteMaterial({ map: labelTexture(opts.title, hex), transparent: true, opacity: 0.95, depthWrite: false });
      label = new THREE.Sprite(labelMat);
      label.position.copy(opts.position).add(new THREE.Vector3(0, 0.85, 0));
      label.scale.set(2.9, 0.72, 1);
      group.add(label);
    }

    const node = Object.assign({}, opts, { mesh, glow, label, baseSize: opts.size });
    nodes.push(node);
    return node;
  }

  /* ------------------------------------------------------------------ edges */
  const edgePositions = [];
  const edgeColors = [];
  const color = new THREE.Color();
  function addEdge(a, b) {
    const ca = new THREE.Color(COLORS[a.category] || 0x22d3ee);
    edgePositions.push(a.position.x, a.position.y, a.position.z, b.position.x, b.position.y, b.position.z);
    edgeColors.push(ca.r, ca.g, ca.b, ca.r, ca.g, ca.b);
  }
  categories.forEach((cat) => {
    const hub = catNodes[cat.id];
    perCat[cat.id].forEach((f) => {
      const node = nodes.find((n) => n.path === f.path);
      if (node) addEdge(hub, node);
    });
  });

  const seenPair = new Set();
  const fileNodes = nodes.filter((n) => n.type === "file");
  fileNodes.forEach((node, i) => {
    let links = 0;
    for (let j = i + 1; j < fileNodes.length && links < 2; j++) {
      const other = fileNodes[j];
      const shared = (node.tags || []).filter((t) => (other.tags || []).includes(t)).length;
      if (shared >= 2) {
        const key = [node.id, other.id].sort().join("|");
        if (seenPair.has(key)) continue;
        seenPair.add(key);
        addEdge(node, other);
        links++;
      }
    }
  });

  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));
  edgeGeo.setAttribute("color", new THREE.Float32BufferAttribute(edgeColors, 3));
  const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
  group.add(new THREE.LineSegments(edgeGeo, edgeMat));

  let highlight = null;
  function setHighlight(node) {
    if (highlight) { group.remove(highlight); highlight.geometry.dispose(); highlight.material.dispose(); highlight = null; }
    if (!node) return;
    const pts = [];
    if (node.type === "category") {
      fileNodes.filter((n) => n.category === node.category).forEach((n) => {
        pts.push(node.position.x, node.position.y, node.position.z, n.position.x, n.position.y, n.position.z);
      });
    } else {
      const hub = catNodes[node.category];
      if (hub) pts.push(node.position.x, node.position.y, node.position.z, hub.position.x, hub.position.y, hub.position.z);
      fileNodes.filter((n) => n !== node && (n.tags || []).some((t) => (node.tags || []).includes(t))).slice(0, 12).forEach((n) => {
        pts.push(node.position.x, node.position.y, node.position.z, n.position.x, n.position.y, n.position.z);
      });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    highlight = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xe9eff9, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    group.add(highlight);
  }

  /* ------------------------------------------------------------------ stars */
  const starPos = new Float32Array(520 * 3);
  for (let i = 0; i < 520; i++) {
    starPos[i * 3] = (Math.random() - 0.5) * 60;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
    starPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x94a3b8, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false })));

  /* ---------------------------------------------------------------- orbit */
  const orbit = {
    theta: 0.55, phi: 1.12, radius: 20,
    thetaGoal: 0.55, phiGoal: 1.12, radiusGoal: 20,
    target: new THREE.Vector3(), targetGoal: new THREE.Vector3(),
    dragging: false, moved: 0, lastX: 0, lastY: 0, idle: 0, interacted: false
  };

  function applyCamera() {
    orbit.theta += (orbit.thetaGoal - orbit.theta) * 0.08;
    orbit.phi += (orbit.phiGoal - orbit.phi) * 0.08;
    orbit.radius += (orbit.radiusGoal - orbit.radius) * 0.08;
    orbit.target.lerp(orbit.targetGoal, 0.07);
    const sp = Math.sin(orbit.phi);
    camera.position.set(
      orbit.target.x + Math.cos(orbit.theta) * sp * orbit.radius,
      orbit.target.y + Math.cos(orbit.phi) * orbit.radius,
      orbit.target.z + Math.sin(orbit.theta) * sp * orbit.radius
    );
    camera.lookAt(orbit.target);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener("resize", resize, { passive: true });

  /* ---------------------------------------------------------------- select */
  const info = {
    kind: $("#node-kind"), title: $("#node-title"), desc: $("#node-desc"),
    files: $("#node-files"), open: $("#node-open")
  };
  let selected = null;

  function select(node, focusCamera) {
    selected = node;
    nodes.forEach((n) => {
      const on = n === node;
      n.mesh.material.opacity = on ? 1 : (n.type === "category" ? 0.95 : 0.82);
      if (!on) {
        n.mesh.scale.setScalar(n.baseSize);
        if (n.glow) n.glow.material.opacity = n.type === "category" ? 0.5 : 0.28;
      }
    });
    setHighlight(node);
    if (!node) return;
    info.kind.textContent = node.type === "category" ? "Category hub · " + node.count + " artifacts" : node.categoryLabel + " · " + node.level;
    info.title.textContent = node.title;
    info.desc.textContent = node.desc + (node.modernization ? " 2026 note: " + node.modernization : "");
    info.files.textContent = "";

    if (node.type === "category") {
      perCat[node.category].slice(0, 10).forEach((f) => {
        const a = document.createElement("a");
        a.href = "./explorer.html#file=" + encodeURIComponent(f.path);
        a.textContent = f.path;
        info.files.appendChild(a);
      });
      if (perCat[node.category].length > 10) {
        const p = document.createElement("p");
        p.className = "faint";
        p.style.fontSize = "0.72rem";
        p.textContent = "+ " + (perCat[node.category].length - 10) + " more in the explorer";
        info.files.appendChild(p);
      }
      info.open.href = "./explorer.html";
      info.open.textContent = "Browse this topic";
    } else {
      const path = document.createElement("a");
      path.href = "./explorer.html#file=" + encodeURIComponent(node.path);
      path.textContent = node.path;
      info.files.appendChild(path);
      (node.tags || []).slice(0, 5).forEach((tag) => {
        const s = document.createElement("span");
        s.className = "tag";
        s.textContent = tag;
        info.files.appendChild(s);
      });
      info.open.href = "./explorer.html#file=" + encodeURIComponent(node.path);
      info.open.textContent = "Open this file";
    }
    const practice = $(".node-info a[href^='./quiz.html']");
    if (practice) practice.href = "./quiz.html?topic=" + (TOPIC_PARAM[node.category] || "kubernetes");

    if (focusCamera) {
      orbit.targetGoal.copy(node.position).multiplyScalar(0.62);
      orbit.radiusGoal = node.type === "category" ? 14 : 9.5;
    }
  }

  function resetView() {
    selected = null;
    setHighlight(null);
    orbit.targetGoal.set(0, 0, 0);
    orbit.thetaGoal = 0.55;
    orbit.phiGoal = 1.12;
    orbit.radiusGoal = 20;
    nodes.forEach((n) => {
      n.mesh.material.opacity = 0.95;
      n.mesh.scale.setScalar(n.baseSize);
      if (n.glow) n.glow.material.opacity = n.type === "category" ? 0.5 : 0.28;
    });
    info.kind.textContent = "Start here";
    info.title.textContent = "Select a node";
    info.desc.textContent = "Click any glowing node to see what it is, why it matters, and which real file to read. Category hubs show everything inside that topic.";
    info.files.textContent = "";
    info.open.href = "./explorer.html";
    info.open.textContent = "Open in explorer";
    $("#atlas-search").value = "";
  }

  /* ---------------------------------------------------------------- events */
  canvas.addEventListener("pointerdown", (e) => {
    orbit.dragging = true;
    orbit.moved = 0;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.interacted = true;
    orbit.idle = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    if (orbit.dragging) {
      const dx = e.clientX - orbit.lastX;
      const dy = e.clientY - orbit.lastY;
      orbit.moved += Math.abs(dx) + Math.abs(dy);
      orbit.thetaGoal -= dx * 0.006;
      orbit.phiGoal = Math.max(0.22, Math.min(Math.PI - 0.22, orbit.phiGoal - dy * 0.006));
      orbit.lastX = e.clientX;
      orbit.lastY = e.clientY;
      return;
    }
    hover(e);
  });
  canvas.addEventListener("pointerup", (e) => {
    orbit.dragging = false;
    if (orbit.moved < 6) click(e);
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointerleave", () => { pointer.set(-10, -10); });
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    orbit.radiusGoal = Math.max(7, Math.min(42, orbit.radiusGoal * (1 + e.deltaY * 0.0012)));
    orbit.interacted = true;
    orbit.idle = 0;
  }, { passive: false });

  function raycast(e) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(meshes, false);
    return hits.length ? hits[0].object.userData.node : null;
  }
  function hover(e) {
    if (e) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    const node = raycast();
    canvas.style.cursor = node ? "pointer" : "grab";
    const tag = $("#atlas-hover");
    if (tag) tag.textContent = node ? node.title + (node.type === "file" ? " · " + node.path : "") : "Drag to orbit · scroll to zoom · click a node";
  }
  function click(e) {
    if (e) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }
    const node = raycast();
    if (node) select(node, true);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "r" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) resetView();
  });

  const search = $("#atlas-search");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    const tokens = q.split(/\s+/).filter(Boolean);
    let first = null;
    fileNodes.forEach((n) => {
      const hay = [n.title, n.path, n.desc, (n.tags || []).join(" "), n.categoryLabel].join(" ").toLowerCase();
      const ok = !tokens.length || tokens.every((t) => hay.includes(t));
      n.mesh.material.opacity = ok ? 0.95 : 0.08;
      n.mesh.scale.setScalar(ok ? n.baseSize : n.baseSize * 0.6);
      if (n.glow) n.glow.material.opacity = ok ? 0.28 : 0.02;
      if (ok && tokens.length && !first) first = n;
    });
    edgeMat.opacity = tokens.length ? 0.07 : 0.2;
    if (first) select(first, true);
    else if (!tokens.length) resetView();
  });

  /* ------------------------------------------------------------- fallback list */
  const fallbackList = $("#atlas-fallback-list");
  if (fallbackList) {
    categories.forEach((cat) => {
      const h = document.createElement("h3");
      h.textContent = cat.label + " (" + cat.count + ")";
      fallbackList.appendChild(h);
      const ul = document.createElement("ul");
      perCat[cat.id].forEach((f) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "./explorer.html#file=" + encodeURIComponent(f.path);
        a.textContent = f.title;
        li.appendChild(a);
        const s = document.createElement("span");
        s.className = "faint";
        s.textContent = " — " + f.path;
        li.appendChild(s);
        ul.appendChild(li);
      });
      fallbackList.appendChild(ul);
    });
  }

  $("#atlas-legend").innerHTML = categories.map((c) => {
    const hex = "#" + (COLORS[c.id] || 0x94a3b8).toString(16).padStart(6, "0");
    return '<span><i style="background:' + hex + '"></i>' + escapeHtml(c.label) + " " + c.count + "</span>";
  }).join("");

  /* ------------------------------------------------------------------ loop */
  let raf = 0;
  let last = performance.now();
  let visible = true;
  function start() {
    if (raf) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(t) {
    raf = 0;
    if (!visible || document.hidden) return;
    const dt = Math.min(60, t - last);
    last = t;
    orbit.idle += dt;
    if (!reduced && !orbit.dragging && orbit.idle > 5000) {
      orbit.thetaGoal += 0.00035 * dt;
    }
    applyCamera();
    if (selected) {
      const pulse = 1 + Math.sin(t * 0.004) * 0.16;
      selected.mesh.scale.setScalar(selected.baseSize * pulse);
      if (selected.glow) selected.glow.material.opacity = 0.55;
    }
    renderer.render(scene, camera);
    if (!reduced) raf = requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (visible) start();
    }, { threshold: 0.02 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) start(); });

  applyCamera();
  renderer.render(scene, camera);
  start();

  /* deep link: ?node=file-path */
  const param = new URLSearchParams(location.search).get("node");
  if (param) {
    const node = nodes.find((n) => n.path === param || n.id === param);
    if (node) select(node, true);
  }
}

boot();
