/* Cluster Runner: a 3D lane runner where collected concepts build a neural map. */
import * as THREE from "./three.module.min.js";

const $ = (sel) => document.querySelector(sel);
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const LANES = [-2.6, 0, 2.6];

const CONCEPTS = [
  { id: "pod", label: "Pod", color: 0x22d3ee, def: "A Pod is the smallest deployable unit: one or more containers sharing a network and storage." },
  { id: "deployment", label: "Deployment", color: 0x38bdf8, def: "A Deployment manages ReplicaSets so you can roll out a new version and roll back with history." },
  { id: "replicaset", label: "ReplicaSet", color: 0x0ea5e9, def: "A ReplicaSet keeps a fixed number of identical pods running at all times." },
  { id: "service", label: "Service", color: 0x22d3ee, def: "A Service gives pods a stable virtual IP and DNS name, selected by labels." },
  { id: "namespace", label: "Namespace", color: 0x67e8f9, def: "A Namespace scopes names, quotas and permissions inside a cluster." },
  { id: "configmap", label: "ConfigMap", color: 0x34d399, def: "A ConfigMap stores non-secret configuration and can mount it as files or environment variables." },
  { id: "secret", label: "Secret", color: 0xfbbf24, def: "A Secret stores sensitive values. Base64 is encoding, not encryption, so protect the etcd store." },
  { id: "ingress", label: "Ingress", color: 0x8b5cf6, def: "An Ingress routes HTTP traffic from outside the cluster to services using rules and TLS." },
  { id: "probe", label: "Probe", color: 0xfb7185, def: "A liveness probe restarts a stuck container. A readiness probe removes it from service endpoints." },
  { id: "volume", label: "Volume", color: 0xa78bfa, def: "A Volume gives containers storage that can outlive a single container restart, depending on its type." },
  { id: "pvc", label: "PersistentVolume", color: 0xc4b5fd, def: "A PersistentVolume is cluster storage. A PersistentVolumeClaim is a request that binds to it." },
  { id: "hpa", label: "Autoscaler", color: 0xf59e0b, def: "A HorizontalPodAutoscaler adds or removes replicas based on metrics such as CPU." },
  { id: "rbac", label: "RBAC", color: 0xfb7185, def: "RBAC grants permissions to users and service accounts through roles and bindings." },
  { id: "networkpolicy", label: "NetworkPolicy", color: 0xf472b6, def: "A NetworkPolicy restricts which pods can talk to which, when the CNI enforces it." },
  { id: "apparmor", label: "AppArmor", color: 0xef4444, def: "AppArmor confines what a container process may access on the node." },
  { id: "idempotency", label: "Idempotency", color: 0x34d399, def: "An idempotent task can run many times and leave the same result. A changed count of zero is a good run." },
  { id: "inventory", label: "Inventory", color: 0x10b981, def: "An Ansible inventory lists hosts and groups. It is the map for every play." },
  { id: "facts", label: "Facts", color: 0x6ee7b7, def: "An Ansible fact is data gathered from a host, used to drive conditionals and templates." },
  { id: "handler", label: "Handler", color: 0x059669, def: "A handler runs once at the end of a play, usually to restart a service after a change." },
  { id: "template", label: "Template", color: 0x2dd4bf, def: "A template renders variables into a file, so one play can configure many hosts." },
  { id: "manifest", label: "Manifest", color: 0xa78bfa, def: "A Puppet manifest declares desired state with resources. Puppet decides how to get there." },
  { id: "resource", label: "Resource", color: 0x8b5cf6, def: "A Puppet resource is one piece of state: a package, service, file or user." },
  { id: "node", label: "Node", color: 0x7c3aed, def: "A Puppet node definition assigns classes and data to a specific machine." },
  { id: "hiera", label: "Hiera", color: 0xc4b5fd, def: "Hiera separates data from code so the same manifest works across environments." },
  { id: "noop", label: "Noop", color: 0xfbbf24, def: "Noop mode shows what Puppet would change without changing it." },
  { id: "trivy", label: "Image scan", color: 0xfb7185, def: "Scan the image before it reaches the cluster, then pin the digest you actually deployed." },
  { id: "least-privilege", label: "Least privilege", color: 0xfda4af, def: "Grant only the permission needed, to only the identity that needs it, for only as long as needed." },
  { id: "checkpoint", label: "Checkpoint", color: 0xf59e0b, def: "A checkpoint is retrieval practice: answer without notes, then read the explanation." }
];

const state = {
  mode: "idle",
  running: false,
  lane: 1,
  laneTarget: 1,
  x: 0,
  distance: 0,
  bonus: 0,
  speed: 17,
  lives: 3,
  shield: 0,
  invuln: 0,
  shake: 0,
  conceptsRun: [],
  conceptIndex: 0,
  shuffle: [],
  spawnObstacle: 0.8,
  spawnOrb: 1.2,
  challengeEvery: 4,
  nextChallenge: 4,
  answeredChallenge: 0,
  voice: true,
  questions: [],
  usedQuestions: new Set(),
  challenge: null,
  answered: false,
  last: performance.now(),
  visible: true,
  raf: 0,
  scoreTick: 0,
  allTime: new Set()
};

const ui = {};
let renderer, scene, camera, player, grid, stars, glowTex;
let obstacles = [];
let orbs = [];
let effects = [];

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ------------------------------------------------------------------ speech */
function voiceAvailable() {
  return "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}
function speak(text) {
  if (!state.voice || !voiceAvailable()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.98;
    u.pitch = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* voice is optional */ }
  const log = $("#speech-log");
  if (log) log.textContent = text;
}

/* ------------------------------------------------------------------- data */
function progress() {
  return window.KK.progress.get();
}
function saveBest(score) {
  window.KK.progress.patch((p) => {
    p.game.best = Math.max(p.game.best || 0, score);
    p.game.plays = (p.game.plays || 0) + 1;
    p.game.concepts = Array.from(new Set((p.game.concepts || []).concat(state.conceptsRun.map((c) => c.id))));
    p.xp += 10 + state.conceptsRun.length * 2;
  });
}
function hydrateFromStorage() {
  const p = progress();
  state.voice = p.game.voice !== false;
  (p.game.concepts || []).forEach((id) => state.allTime.add(id));
  const best = p.game.best || 0;
  $("#game-best").textContent = String(best);
  $("#side-best").textContent = String(best);
  $("#side-total").textContent = String(state.allTime.size);
  const toggle = $("#voice-toggle");
  toggle.checked = state.voice;
  if (!voiceAvailable()) {
    toggle.checked = false;
    toggle.disabled = true;
    state.voice = false;
  }
}

/* ------------------------------------------------------------------- scene */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function initScene() {
  const canvas = $("#game-canvas");
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  } catch (e) {
    canvas.style.display = "none";
    $("#game-start").innerHTML = '<div class="game-card"><h2>WebGL is required</h2><p>This browser could not start WebGL. The quiz and atlas still work without it.</p><a class="btn btn-primary" href="./quiz.html">Open the quiz</a></div>';
    return false;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setClearColor(0x03060c, 1);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x03060c, 22, 76);
  camera = new THREE.PerspectiveCamera(55, 1, 0.1, 140);
  camera.position.set(0, 4.4, 8.8);

  glowTex = glowTexture();

  const gridGeo = new THREE.GridHelper(60, 60, 0x0b4a5a, 0x08222c);
  gridGeo.material.transparent = true;
  gridGeo.material.opacity = 0.5;
  gridGeo.position.set(0, -1, -25);
  scene.add(gridGeo);
  grid = gridGeo;

  const railMat = new THREE.LineBasicMaterial({ color: 0x155e75, transparent: true, opacity: 0.5 });
  [-4.4, 4.4].forEach((x) => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x, -0.75, -75),
      new THREE.Vector3(x, -0.75, 10)
    ]);
    scene.add(new THREE.Line(g, railMat));
  });

  player = new THREE.Group();
  const ship = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.1, 5),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  ship.rotation.x = -Math.PI / 2;
  ship.position.y = 0.5;
  player.add(ship);
  const cage = new THREE.Mesh(
    new THREE.ConeGeometry(0.52, 1.45, 5),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9, wireframe: true, transparent: true, opacity: 0.35 })
  );
  cage.rotation.x = -Math.PI / 2;
  cage.position.y = 0.5;
  player.add(cage);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0x22d3ee, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.y = 0.5;
  halo.scale.setScalar(2.4);
  player.add(halo);
  player.position.set(0, 0, 0);
  scene.add(player);

  const starCount = 340;
  const pos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 46;
    pos[i * 3 + 1] = Math.random() * 20 - 1;
    pos[i * 3 + 2] = -Math.random() * 95 + 6;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x9fb0c7, size: 0.055, transparent: true, opacity: 0.7, depthWrite: false }));
  scene.add(stars);

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  if ("ResizeObserver" in window) new ResizeObserver(resize).observe(canvas.parentElement);
  else window.addEventListener("resize", resize, { passive: true });

  return true;
}

function makeObstacle(lane) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.46, 0),
    new THREE.MeshBasicMaterial({ color: 0x7f1d1d, transparent: true, opacity: 0.55 })
  );
  const cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.58, 0),
    new THREE.MeshBasicMaterial({ color: 0xfb7185, wireframe: true, transparent: true, opacity: 0.95 })
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xfb7185, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(1.8);
  group.add(core, cage, glow);
  group.position.set(LANES[lane], 0.25, -70 - Math.random() * 8);
  group.userData = { kind: "obstacle", spin: (Math.random() - 0.5) * 2.4 };
  scene.add(group);
  obstacles.push(group);
}

function makeOrb(lane, concept) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({ color: concept.color })
  );
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: concept.color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.setScalar(2.1);
  group.add(mesh, glow);
  group.position.set(LANES[lane], 0.65, -72);
  group.userData = { kind: "orb", concept, spin: 1.4 + Math.random() };
  scene.add(group);
  orbs.push(group);
}

function effect(position, color) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  sprite.position.copy(position);
  sprite.scale.setScalar(1);
  scene.add(sprite);
  effects.push({ sprite, life: 0, ttl: 0.45 });
}

function clearRunObjects() {
  obstacles.forEach((o) => scene.remove(o));
  orbs.forEach((o) => scene.remove(o));
  effects.forEach((e) => scene.remove(e.sprite));
  obstacles = [];
  orbs = [];
  effects = [];
}

/* ------------------------------------------------------------------- neural */
function conceptById(id) {
  return CONCEPTS.find((c) => c.id === id);
}

function drawNeural(t) {
  const canvas = $("#neural-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 180;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const cy = h / 2;
  const learned = new Set(state.conceptsRun.map((c) => c.id));
  const all = CONCEPTS;
  const positions = all.map((c, i) => {
    if (i === 0) return { x: cx, y: cy };
    const angle = i * 2.399963;
    const r = 14 + (i / (all.length - 1)) * 66;
    return { x: cx + Math.cos(angle) * r * 1.55, y: cy + Math.sin(angle) * r * 0.82 };
  });

  const isLearned = (i) => learned.has(all[i].id) || state.allTime.has(all[i].id);

  all.forEach((c, i) => {
    if (!isLearned(i)) return;
    [i - 1, i - 3].forEach((j) => {
      if (j < 0 || !isLearned(j)) return;
      const a = positions[i], b = positions[j];
      const alpha = 0.18 + Math.sin(t / 600 + i) * 0.08;
      ctx.strokeStyle = "rgba(34,211,238," + Math.max(0.08, alpha) + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    });
  });

  all.forEach((c, i) => {
    const p = positions[i];
    const on = isLearned(i);
    const fresh = learned.has(c.id);
    const color = "#" + (c.color || 0x94a3b8).toString(16).padStart(6, "0");
    if (on) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, fresh ? 3.6 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = fresh ? 0.95 : 0.55;
      ctx.fill();
      ctx.globalAlpha = 1;
      if (fresh) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 7 + Math.sin(t / 350) * 1.5, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.35;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148,163,184,0.25)";
      ctx.fill();
    }
  });

  const last = state.conceptsRun[state.conceptsRun.length - 1];
  if (last) {
    const i = all.findIndex((c) => c.id === last.id);
    const p = positions[i];
    if (p) {
      ctx.font = "600 9px ui-monospace, monospace";
      ctx.fillStyle = "#e9eff9";
      ctx.textAlign = p.x > cx ? "right" : "left";
      ctx.fillText(last.label, p.x + (p.x > cx ? -6 : 6), p.y - 6);
    }
  }
  ctx.font = "600 9px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "rgba(148,163,184,0.55)";
  ctx.textAlign = "center";
  ctx.fillText("your map", cx, h - 6);
}

function neuralLoop(t) {
  if (!state.visible) { requestAnimationFrame(neuralLoop); return; }
  drawNeural(t || 0);
  requestAnimationFrame(neuralLoop);
}

/* -------------------------------------------------------------------- game */
function updateHud() {
  const score = Math.floor(state.distance) + state.bonus;
  $("#hud-score").textContent = String(score);
  $("#hud-level").textContent = String(1 + Math.floor(state.distance / 320));
  $("#hud-lives").textContent = state.lives > 0 ? "●".repeat(state.lives) : "—";
  $("#hud-concepts").textContent = String(state.conceptsRun.length);
  $("#hud-shield").hidden = state.shield <= 0;
  $("#side-score").textContent = String(score);
  $("#side-concepts").textContent = String(state.conceptsRun.length);
  $("#side-total").textContent = String(state.allTime.size);
  $("#side-best").textContent = String(Math.max(progress().game.best || 0, score));
}

function resetRun() {
  clearRunObjects();
  state.mode = "running";
  state.lane = 1;
  state.laneTarget = 1;
  state.x = 0;
  state.distance = 0;
  state.bonus = 0;
  state.speed = 17;
  state.lives = 3;
  state.shield = 0;
  state.invuln = 0;
  state.shake = 0;
  state.conceptsRun = [];
  state.conceptIndex = 0;
  state.shuffle = CONCEPTS.slice().sort(() => Math.random() - 0.5);
  state.spawnObstacle = 0.7;
  state.spawnOrb = 1.1;
  state.nextChallenge = 4;
  state.answeredChallenge = 0;
  state.challenge = null;
  state.answered = false;
  state.last = performance.now();
  state.usedQuestions = new Set();
  player.position.x = 0;
  $("#game-start").hidden = true;
  $("#game-over").hidden = true;
  $("#game-challenge").hidden = true;
  $("#run-status").textContent = "running";
  $("#concept-log").textContent = "";
  updateHud();
  speak("Run started. Collect the glowing concepts. Avoid the red failing pods.");
}

function nextConcept() {
  if (state.conceptIndex >= state.shuffle.length) {
    state.shuffle = CONCEPTS.slice().sort(() => Math.random() - 0.5);
    state.conceptIndex = 0;
  }
  return state.shuffle[state.conceptIndex++];
}

function collect(orb) {
  const concept = orb.userData.concept;
  effect(orb.position, concept.color);
  scene.remove(orb);
  orbs = orbs.filter((o) => o !== orb);

  const unique = !state.conceptsRun.some((c) => c.id === concept.id);
  state.bonus += unique ? 100 : 25;
  if (unique) {
    state.conceptsRun.push(concept);
    state.allTime.add(concept.id);
    window.KK.progress.patch((p) => {
      p.game.concepts = Array.from(new Set((p.game.concepts || []).concat([concept.id])));
    });
    speak(concept.label + ". " + concept.def);
    const chip = document.createElement("span");
    chip.textContent = concept.label;
    $("#concept-log").appendChild(chip);
    if ($("#concept-log").children.length > 8) $("#concept-log").firstChild.remove();
  }
  updateHud();
  if (unique && state.conceptsRun.length >= state.nextChallenge && state.mode === "running") {
    openChallenge();
  }
}

function hitObstacle(obstacle) {
  if (state.invuln > 0) return;
  effect(obstacle.position, 0xfb7185);
  scene.remove(obstacle);
  obstacles = obstacles.filter((o) => o !== obstacle);
  state.invuln = 1.15;
  state.shake = 0.34;
  if (state.shield > 0) {
    state.shield = 0;
    flash("shield");
    speak("Shield absorbed the hit.");
  } else {
    state.lives -= 1;
    flash("hit");
    speak(state.lives > 0 ? "Hit. " + state.lives + (state.lives === 1 ? " life left." : " lives left.") : "All lives lost.");
  }
  updateHud();
  if (state.lives <= 0) endRun();
}

function flash(kind) {
  const el = $("#game-flash");
  if (!el) return;
  el.className = "game-flash show " + kind;
  setTimeout(() => { el.className = "game-flash"; }, 380);
}

function move(dir) {
  if (state.mode !== "running") return;
  state.laneTarget = Math.max(0, Math.min(2, state.laneTarget + dir));
}

function openChallenge() {
  if (!state.questions.length) {
    state.nextChallenge += state.challengeEvery;
    return;
  }
  let pool = state.questions.filter((q) => !state.usedQuestions.has(q.id));
  if (!pool.length) { state.usedQuestions.clear(); pool = state.questions.slice(); }
  const q = pool[Math.floor(Math.random() * pool.length)];
  state.usedQuestions.add(q.id);
  state.challenge = q;
  state.answered = false;
  state.mode = "challenge";
  state.nextChallenge += state.challengeEvery;
  flash("check");
  speak("Checkpoint. " + q.question);

  $("#ch-kicker").textContent = "Checkpoint · " + q.concept;
  $("#ch-question").textContent = q.question;
  $("#ch-options").textContent = "";
  const keys = ["A", "B", "C", "D"];
  q.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option";
    b.innerHTML = '<span class="key">' + keys[i] + "</span><span>" + escapeHtml(text) + "</span>";
    b.addEventListener("click", () => answerChallenge(i, b));
    $("#ch-options").appendChild(b);
  });
  $("#ch-explain").className = "explanation";
  $("#ch-verdict").className = "verdict";
  $("#ch-verdict").textContent = "";
  $("#ch-why").textContent = "";
  $("#ch-continue").hidden = true;
  $("#ch-quiz").href = "./quiz.html?topic=" + q.topic;
  $("#game-challenge").hidden = false;
  $("#run-status").textContent = "checkpoint";
}

function answerChallenge(index, button) {
  if (state.answered || !state.challenge) return;
  state.answered = true;
  const q = state.challenge;
  const ok = index === q.answer;
  const buttons = Array.from($("#ch-options").querySelectorAll(".option"));
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === q.answer) b.classList.add("is-correct");
    else if (i === index) b.classList.add("is-wrong");
  });
  const verdict = $("#ch-verdict");
  verdict.textContent = ok ? "Correct" : "Not quite";
  verdict.className = "verdict " + (ok ? "ok" : "no");
  $("#ch-why").textContent = q.explanation + (q.file ? " Source: " + q.file : "");
  $("#ch-explain").className = "explanation show";
  if (ok) {
    state.bonus += 300;
    state.shield = 1;
    speak("Correct. " + q.explanation);
  } else {
    state.bonus = Math.max(0, state.bonus - 150);
    speak("Not quite. " + q.explanation);
  }
  state.answeredChallenge += 1;
  updateHud();
  $("#ch-continue").hidden = false;
  $("#ch-continue").focus();
}

function resumeAfterChallenge() {
  if (state.mode !== "challenge") return;
  state.mode = "running";
  state.last = performance.now();
  $("#game-challenge").hidden = true;
  $("#run-status").textContent = "running";
}

function endRun() {
  state.mode = "over";
  const score = Math.floor(state.distance) + state.bonus;
  saveBest(score);
  $("#over-score").textContent = String(score);
  $("#over-best").textContent = String(Math.max(progress().game.best || 0, score));
  $("#over-title").textContent = state.conceptsRun.length >= 8 ? "Strong run." : "Run complete.";
  $("#over-copy").textContent = "You collected " + state.conceptsRun.length + " concept" + (state.conceptsRun.length === 1 ? "" : "s") + " and answered " + state.answeredChallenge + " checkpoint" + (state.answeredChallenge === 1 ? "" : "s") + ".";
  const wrap = $("#over-concepts");
  wrap.textContent = "";
  state.conceptsRun.slice(-10).forEach((c) => {
    const s = document.createElement("span");
    s.textContent = c.label;
    wrap.appendChild(s);
  });
  $("#game-over").hidden = false;
  $("#run-status").textContent = "complete";
  updateHud();
  speak("Run complete. You learned " + state.conceptsRun.length + " concepts and scored " + score + ".");
}

/* ------------------------------------------------------------------- frame */
function animate(t) {
  state.raf = 0;
  if (!state.visible || document.hidden) { state.last = t; return; }
  const dt = Math.min(0.05, Math.max(0, (t - state.last) / 1000));
  state.last = t;

  if (state.mode === "running") {
    state.speed = 17 + Math.floor(state.distance / 320) * 1.9;
    state.distance += state.speed * dt;
    state.spawnObstacle -= dt;
    state.spawnOrb -= dt;
    state.invuln = Math.max(0, state.invuln - dt);
    state.shake = Math.max(0, state.shake - dt);

    if (state.spawnObstacle <= 0) {
      const lane = Math.floor(Math.random() * 3);
      makeObstacle(lane);
      if (state.distance > 600 && Math.random() < 0.28) {
        makeObstacle((lane + 1 + Math.floor(Math.random() * 2)) % 3);
      }
      state.spawnObstacle = Math.max(0.5, 1.05 - Math.floor(state.distance / 500) * 0.08) * (0.85 + Math.random() * 0.5);
    }
    if (state.spawnOrb <= 0) {
      makeOrb(Math.floor(Math.random() * 3), nextConcept());
      state.spawnOrb = 1.15 + Math.random() * 0.6;
    }

    const targetX = LANES[state.laneTarget];
    state.x += (targetX - state.x) * Math.min(1, dt * 9);
    player.position.x = state.x;

    obstacles.forEach((o) => {
      o.position.z += state.speed * dt;
      o.rotation.x += o.userData.spin * dt;
      o.rotation.y += o.userData.spin * 0.7 * dt;
      if (o.position.z > 9) {
        scene.remove(o);
        obstacles = obstacles.filter((x) => x !== o);
      } else if (o.position.z > -1 && o.position.z < 1.4 && Math.abs(o.position.x - state.x) < 0.82) {
        hitObstacle(o);
      }
    });

    orbs.forEach((o) => {
      o.position.z += state.speed * dt;
      o.position.y = 0.65 + Math.sin(t / 300 + o.position.z) * 0.12;
      o.children[0].rotation.x += o.userData.spin * dt;
      o.children[0].rotation.y += o.userData.spin * dt;
      if (o.position.z > 9) {
        scene.remove(o);
        orbs = orbs.filter((x) => x !== o);
      } else if (o.position.z > -1 && o.position.z < 1.4 && Math.abs(o.position.x - state.x) < 0.85) {
        collect(o);
      }
    });

    grid.position.z += state.speed * dt * 0.25;
    if (grid.position.z > 5) grid.position.z -= 30;

    const starPos = stars.geometry.attributes.position;
    for (let i = 0; i < starPos.count; i++) {
      let z = starPos.getZ(i) + state.speed * dt * 0.45;
      if (z > 8) z = -90;
      starPos.setZ(i, z);
    }
    starPos.needsUpdate = true;

    state.scoreTick += dt;
    if (state.scoreTick > 0.1) {
      state.scoreTick = 0;
      updateHud();
    }
  }

  effects.forEach((e) => {
    e.life += dt;
    const k = e.life / e.ttl;
    e.sprite.scale.setScalar(1 + k * 4);
    e.sprite.material.opacity = Math.max(0, 0.9 * (1 - k));
    if (k >= 1) {
      scene.remove(e.sprite);
      effects = effects.filter((x) => x !== e);
    }
  });

  player.position.y = reduced ? 0 : Math.sin(t / 500) * 0.07;
  camera.position.x += (state.x * 0.32 - camera.position.x) * Math.min(1, dt * 4);
  camera.position.y = 4.4 + (reduced ? 0 : Math.sin(t / 1200) * 0.06);
  camera.lookAt(state.x * 0.22, 0.45, -12);

  if (state.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * state.shake;
    camera.position.y += (Math.random() - 0.5) * state.shake * 0.5;
  }

  renderer.render(scene, camera);
  state.raf = requestAnimationFrame(animate);
}

function startLoop() {
  if (state.raf) return;
  state.last = performance.now();
  state.raf = requestAnimationFrame(animate);
}

/* -------------------------------------------------------------------- wire */
function wire() {
  $("#game-start-btn").addEventListener("click", () => {
    resetRun();
    startLoop();
  });
  $("#game-again").addEventListener("click", () => {
    resetRun();
    startLoop();
  });
  $("#ch-continue").addEventListener("click", resumeAfterChallenge);
  $("#move-left").addEventListener("pointerdown", (e) => { e.preventDefault(); move(-1); });
  $("#move-right").addEventListener("pointerdown", (e) => { e.preventDefault(); move(1); });
  $("#focus-game").addEventListener("click", () => $("#game-app").scrollIntoView({ behavior: "smooth", block: "start" }));

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") { e.preventDefault(); move(-1); }
    else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") { e.preventDefault(); move(1); }
    else if (e.key.toLowerCase() === "p") {
      if (state.mode === "running") {
        state.mode = "paused";
        $("#run-status").textContent = "paused";
        window.KK.toast("Paused — press P to resume");
        speak("Paused.");
      } else if (state.mode === "paused") {
        state.mode = "running";
        state.last = performance.now();
        $("#run-status").textContent = "running";
        speak("Resumed.");
      }
    } else if (e.key.toLowerCase() === "m") {
      const toggle = $("#voice-toggle");
      toggle.checked = !toggle.checked;
      toggle.dispatchEvent(new Event("change"));
    } else if (e.key === "Enter" && state.mode === "idle") {
      resetRun();
      startLoop();
    } else if (e.key === "Enter" && state.mode === "over") {
      resetRun();
      startLoop();
    }
  });

  $("#voice-toggle").addEventListener("change", (e) => {
    state.voice = e.target.checked;
    window.KK.progress.patch((p) => { p.game.voice = state.voice; });
    if (!state.voice && voiceAvailable()) window.speechSynthesis.cancel();
    else if (state.voice) speak("Voice narration on.");
  });

  const canvas = $("#game-canvas");
  let swipeX = null;
  canvas.addEventListener("pointerdown", (e) => { swipeX = e.clientX; });
  canvas.addEventListener("pointerup", (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    if (Math.abs(dx) > 30) move(dx > 0 ? 1 : -1);
    swipeX = null;
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      state.visible = entries[0].isIntersecting;
      if (state.visible) startLoop();
    }, { threshold: 0.02 }).observe(canvas);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) startLoop(); });
}

/* -------------------------------------------------------------------- init */
async function init() {
  hydrateFromStorage();
  const ok = initScene();
  if (!ok) return;

  try {
    const res = await fetch("./assets/data/quiz.json");
    if (res.ok) {
      const data = await res.json();
      state.questions = (data.questions || []).filter((q) => Array.isArray(q.options) && q.options.length === 4);
    }
  } catch (e) { state.questions = []; }

  wire();
  renderer.render(scene, camera);
  startLoop();
  requestAnimationFrame(neuralLoop);
  drawNeural(0);
}

init();
