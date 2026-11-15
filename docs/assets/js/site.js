/* DevOps Field Manual — shared runtime. No dependencies. */
(function () {
  "use strict";

  const KK = {};
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  KK.$ = $;
  KK.$$ = $$;
  KK.escapeHtml = function (value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };
  KK.formatNumber = (n) => new Intl.NumberFormat("en-US").format(n);
  KK.debounce = function (fn, wait) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  };
  KK.prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- storage */
  const KEY = "dfm.progress.v1";
  const EMPTY = () => ({
    xp: 0,
    streak: { count: 0, last: "" },
    quiz: { answered: 0, correct: 0, byTopic: {}, history: [], srs: {}, mistakes: [] },
    labs: { done: {}, xp: 0 },
    game: { best: 0, concepts: [] },
    lastSeen: ""
  });
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY();
      const parsed = JSON.parse(raw);
      const base = EMPTY();
      return {
        ...base, ...parsed,
        streak: { ...base.streak, ...(parsed.streak || {}) },
        quiz: { ...base.quiz, ...(parsed.quiz || {}) },
        labs: { ...base.labs, ...(parsed.labs || {}) },
        game: { ...base.game, ...(parsed.game || {}) }
      };
    } catch (e) {
      return EMPTY();
    }
  }
  function write(value) {
    try { localStorage.setItem(KEY, JSON.stringify(value)); } catch (e) { /* storage disabled */ }
    document.dispatchEvent(new CustomEvent("kk:progress", { detail: value }));
    return value;
  }
  KK.progress = {
    get: read,
    set: write,
    patch(mutator) {
      const next = read();
      mutator(next);
      next.lastSeen = new Date().toISOString();
      return write(next);
    },
    addXp(amount) {
      return KK.progress.patch((p) => {
        p.xp += amount;
        const today = new Date().toISOString().slice(0, 10);
        if (p.streak.last !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          p.streak.count = p.streak.last === yesterday ? p.streak.count + 1 : 1;
          p.streak.last = today;
        }
      });
    },
    reset() { return write(EMPTY()); }
  };

  /* ---------------------------------------------------------------- toast */
  let toastEl = null;
  KK.toast = function (message, ms) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => toastEl.classList.remove("show"), ms || 2200);
  };

  /* ---------------------------------------------------------------- copy */
  KK.copy = async function (text, label) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (err) { /* noop */ }
      area.remove();
    }
    KK.toast(label || "Copied to clipboard");
  };

  /* ---------------------------------------------------------------- syntax */
  const RULES = {
    yaml: [
      { cls: "str", re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g },
      { cls: "com", re: /#.*$/g },
      { cls: "key", re: /[A-Za-z_][\w.\-/]*(?=\s*:)/g },
      { cls: "var", re: /\$\{[^}]+\}|\{\{[^}]+\}\}/g },
      { cls: "bool", re: /\b(?:true|false|null|yes|no|on|off)\b/g },
      { cls: "num", re: /\b\d+(?:\.\d+)?(?:m|Mi|Gi|Ti|s|h)?\b/g }
    ],
    bash: [
      { cls: "str", re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g },
      { cls: "com", re: /#.*$/g },
      { cls: "var", re: /\$\{[^}]+\}|\$\w+/g },
      { cls: "flag", re: /(?:^|\s)--?[A-Za-z][\w-]*/g },
      { cls: "cmd", re: /^[\w.\-/]+/g },
      { cls: "num", re: /\b\d+(?:\.\d+)?\b/g }
    ],
    puppet: [
      { cls: "str", re: /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g },
      { cls: "com", re: /#.*$/g },
      { cls: "var", re: /\$\w+|\$\{[^}]+\}/g },
      { cls: "res", re: /\b(?:package|service|file|user|group|exec|class|node|include|require|ensure|present|installed|running|enabled|absent)\b/g },
      { cls: "key", re: /=>|->|~>/g },
      { cls: "num", re: /\b\d+\b/g }
    ],
    text: [
      { cls: "com", re: /^#.*$/g },
      { cls: "cmd", re: /\b(?:kubectl|ansible|ansible-playbook|puppet|trivy|grep|awk|jq|echo|cat|ls|cd)\b/g },
      { cls: "flag", re: /(?:^|\s)--?[A-Za-z][\w-]*/g },
      { cls: "str", re: /"[^"]*"|'[^']*'/g },
      { cls: "num", re: /\b\d+\b/g }
    ],
    markdown: [
      { cls: "key", re: /^#{1,6}\s.*$/g },
      { cls: "str", re: /`[^`]*`/g },
      { cls: "com", re: /^>.*$/g }
    ],
    json: [
      { cls: "str", re: /"(?:[^"\\]|\\.)*"/g },
      { cls: "num", re: /\b-?\d+(?:\.\d+)?\b/g },
      { cls: "bool", re: /\b(?:true|false|null)\b/g }
    ]
  };

  function segment(line, rules) {
    const matches = [];
    for (const rule of rules) {
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(line)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, cls: rule.cls, text: m[0] });
        if (m[0].length === 0) rule.re.lastIndex++;
      }
    }
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const kept = [];
    let end = -1;
    for (const m of matches) {
      if (m.start >= end) { kept.push(m); end = m.end; }
    }
    let out = "";
    let cursor = 0;
    for (const m of kept) {
      out += KK.escapeHtml(line.slice(cursor, m.start));
      out += '<span class="tok-' + m.cls + '">' + KK.escapeHtml(m.text) + "</span>";
      cursor = m.end;
    }
    out += KK.escapeHtml(line.slice(cursor));
    return out || " ";
  }

  KK.highlight = function (code, lang) {
    const rules = RULES[lang] || RULES.text;
    const lines = String(code).replace(/\r\n/g, "\n").split("\n");
    return lines.map((line, i) =>
      '<div class="code-line"><span class="ln" aria-hidden="true">' + (i + 1) +
      '</span><span class="lc">' + segment(line, rules) + "</span></div>"
    ).join("");
  };

  /* ---------------------------------------------------------------- layout */
  function initNav() {
    const btn = $(".menu-btn");
    const links = $("#nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });
    document.addEventListener("click", (e) => {
      if (!links.classList.contains("is-open")) return;
      if (!links.contains(e.target) && !btn.contains(e.target)) {
        links.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initReveal() {
    const nodes = $$(".reveal");
    if (!nodes.length) return;
    if (KK.prefersReducedMotion() || !("IntersectionObserver" in window)) {
      nodes.forEach((n) => n.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    nodes.forEach((n) => io.observe(n));
  }

  function initCopyButtons() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      const text = btn.getAttribute("data-copy");
      if (text) KK.copy(text);
    });
  }

  function initEmbedded() {
    if (window.self === window.top) return;
    if (document.querySelector(".embedded-open")) return;
    const link = document.createElement("a");
    link.className = "embedded-open";
    link.href = location.href;
    link.target = "_blank";
    link.rel = "noopener";
    link.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg> Open full screen';
    document.body.appendChild(link);
  }


  /* -------------------------------------------------------------- palette */
  const PAGES = [
    { label: "Home", path: "./index.html", desc: "Overview, live demo and beginner guide", icon: "home" },
    { label: "Artifact explorer", path: "./explorer.html", desc: "Read and copy every file", icon: "file" },
    { label: "Practice lab", path: "./lab.html", desc: "12 guided, validated labs", icon: "terminal" },
    { label: "Practice quiz", path: "./quiz.html", desc: "Spaced repetition with explanations", icon: "help" },
    { label: "3D concept atlas", path: "./atlas.html", desc: "Orbit the whole field", icon: "globe" },
    { label: "Cluster Runner", path: "./game.html", desc: "3D game with a neural map", icon: "game" },
    { label: "Command cheat sheet", path: "./cheatsheet.html", desc: "Copy-ready commands and traps", icon: "list" }
  ];
  const ICONS = {
    home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/>',
    file: '<path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2Z"/><path d="M8 7h7M8 11h7"/>',
    terminal: '<path d="m5 7 4 4-4 4M12 15h6"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-.9.6-1.5 1.2-1.5 2.5M12 17h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18"/>',
    game: '<path d="M7 8h10l3 9-3 2-2-3H9l-2 3-3-2 3-9Z"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>'
  };

  function paletteIcon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + (ICONS[name] || ICONS.code) + "</svg>";
  }

  function initPalette() {
    const actions = $(".nav-actions");
    const box = document.createElement("div");
    box.className = "palette";
    box.id = "palette";
    box.hidden = true;
    box.innerHTML =
      '<div class="palette-box" role="dialog" aria-modal="true" aria-label="Search the field manual">' +
        '<div class="palette-input-row">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>' +
          '<label class="sr-only" for="palette-input">Search pages and artifacts</label>' +
          '<input id="palette-input" type="search" placeholder="Search pages, files, concepts…" autocomplete="off" spellcheck="false">' +
          '<span class="kbd">Esc</span>' +
        '</div>' +
        '<div class="palette-list" id="palette-list" role="listbox" aria-label="Results"></div>' +
        '<div class="palette-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> move</span><span><span class="kbd">↵</span> open</span><span><span class="kbd">Ctrl</span><span class="kbd">K</span> toggle</span></div>' +
      '</div>';
    document.body.appendChild(box);

    if (actions) {
      const trigger = document.createElement("button");
      trigger.type = "button";
      trigger.className = "nav-github";
      trigger.setAttribute("aria-label", "Search the field manual (Ctrl K)");
      trigger.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
      trigger.addEventListener("click", openPalette);
      actions.insertBefore(trigger, actions.firstChild);
    }

    const input = $("#palette-input");
    const list = $("#palette-list");
    let artifacts = null;
    let loading = false;
    let results = [];
    let active = 0;
    let previousFocus = null;

    async function loadArtifacts() {
      if (artifacts || loading) return;
      loading = true;
      try {
        const res = await fetch("./assets/data/manifest.json");
        if (res.ok) {
          const data = await res.json();
          artifacts = (data.files || []).map((f) => ({
            label: f.title,
            path: "./explorer.html#file=" + encodeURIComponent(f.path),
            desc: f.categoryLabel + " · " + f.path,
            search: [f.title, f.path, f.description, (f.tags || []).join(" "), f.categoryLabel].join(" ").toLowerCase(),
            icon: "file"
          }));
        } else {
          artifacts = [];
        }
      } catch (e) {
        artifacts = [];
      }
      loading = false;
      render();
    }

    function match(item, q) {
      if (!q) return true;
      const hay = item.search || (item.label + " " + item.desc + " " + item.path).toLowerCase();
      return q.split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      const pages = PAGES.filter((p) => match({ ...p, search: (p.label + " " + p.desc + " " + p.path).toLowerCase() }, q));
      const files = (artifacts || []).filter((f) => match(f, q)).slice(0, q ? 9 : 5);
      results = pages.map((p) => ({ ...p, group: "Pages" })).concat(files.map((f) => ({ ...f, group: "Artifacts" })));
      active = 0;
      list.textContent = "";

      if (!results.length) {
        list.innerHTML = '<div class="palette-empty">' + (loading || artifacts === null ? "Indexing artifacts…" : "No match. Try a concept like service, acl or cronjob.") + "</div>";
        return;
      }

      let group = "";
      results.forEach((item, index) => {
        if (item.group !== group) {
          group = item.group;
          const h = document.createElement("div");
          h.className = "palette-group";
          h.textContent = group;
          list.appendChild(h);
        }
        const a = document.createElement("a");
        a.className = "palette-item" + (index === active ? " is-active" : "");
        a.href = item.path;
        a.setAttribute("role", "option");
        a.setAttribute("aria-selected", String(index === active));
        a.innerHTML = '<span class="pi-icon">' + paletteIcon(item.icon) + '</span><span class="pi-label">' + KK.escapeHtml(item.label) + "<small>" + KK.escapeHtml(item.desc) + "</small></span>";
        a.addEventListener("mouseenter", () => setActive(index));
        list.appendChild(a);
      });
    }

    function setActive(i) {
      if (!results.length) return;
      active = (i + results.length) % results.length;
      $$(".palette-item", list).forEach((el, idx) => {
        const on = idx === active;
        el.classList.toggle("is-active", on);
        el.setAttribute("aria-selected", String(on));
        if (on && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
      });
    }

    function openPalette() {
      previousFocus = document.activeElement;
      box.hidden = false;
      box.classList.add("is-open");
      input.value = "";
      render();
      loadArtifacts();
      setTimeout(() => input.focus(), 20);
    }

    function closePalette() {
      box.classList.remove("is-open");
      box.hidden = true;
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (box.classList.contains("is-open")) closePalette();
        else openPalette();
        return;
      }
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); closePalette(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Enter") {
        const item = results[active];
        if (item) { e.preventDefault(); location.href = item.path; }
      }
    });

    input.addEventListener("input", KK.debounce(render, 60));
    box.addEventListener("click", (e) => { if (e.target === box) closePalette(); });
  }

  function initYear() {
    $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });
  }

  function initServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => { /* offline support is optional */ });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initNav();
    initReveal();
    initCopyButtons();
    initEmbedded();
    initPalette();
    initYear();
    initServiceWorker();
  });

  window.KK = KK;
})();
