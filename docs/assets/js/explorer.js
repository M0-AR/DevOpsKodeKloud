/* Artifact explorer: real repository files, searchable and deep-linkable. */
(function () {
  "use strict";
  const KK = window.KK;
  const $ = KK.$;
  const $$ = KK.$$;
  const GH = "https://github.com/M0-AR/DevOpsKodeKloud/blob/master/";

  const state = {
    files: [],
    categories: [],
    stats: null,
    query: "",
    category: "all",
    level: "all",
    sort: "path",
    selected: null
  };

  const els = {};
  let observer = null;

  function encodePath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  function topicFor(category) {
    if (category === "cka") return "exam";
    if (category === "cks") return "security";
    return category === "guestbook" ? "kubernetes" : category;
  }

  function haystack(file) {
    return [file.path, file.title, file.description, file.categoryLabel, file.level, (file.tags || []).join(" ")]
      .join(" ").toLowerCase();
  }

  function matches(file) {
    if (state.category !== "all" && file.category !== state.category) return false;
    if (state.level !== "all" && file.level !== state.level) return false;
    const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = haystack(file);
    return tokens.every((t) => hay.includes(t));
  }

  function sortedFiles() {
    const list = state.files.filter(matches);
    const copy = list.slice();
    if (state.sort === "title") copy.sort((a, b) => a.title.localeCompare(b.title));
    else if (state.sort === "lines") copy.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
    else copy.sort((a, b) => a.path.localeCompare(b.path));
    return copy;
  }

  function fileByPath(path) {
    return state.files.find((f) => f.path === path);
  }

  /* ------------------------------------------------------------------ chips */
  function renderChips() {
    const wrap = els.chips;
    wrap.textContent = "";
    const all = [{ id: "all", label: "All", count: state.files.length }].concat(state.categories);
    for (const cat of all) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.category = cat.id;
      btn.setAttribute("aria-pressed", String(state.category === cat.id));
      btn.innerHTML = KK.escapeHtml(cat.label) + ' <span class="chip-count">' + cat.count + "</span>";
      btn.addEventListener("click", () => {
        state.category = cat.id;
        renderChips();
        refresh(false);
      });
      wrap.appendChild(btn);
    }
  }

  /* ------------------------------------------------------------------- tree */
  function renderTree() {
    const tree = els.tree;
    tree.textContent = "";
    for (const cat of state.categories) {
      const files = state.files
        .filter((f) => f.category === cat.id)
        .sort((a, b) => a.path.localeCompare(b.path));
      const group = document.createElement("div");
      group.className = "side-group";
      group.dataset.category = cat.id;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-expanded", "true");
      btn.innerHTML = "<span>" + KK.escapeHtml(cat.label) + '</span><span class="count">' + files.length + "</span>";
      const items = document.createElement("div");
      items.className = "side-items";

      for (const file of files) {
        const a = document.createElement("a");
        a.href = "#file=" + encodeURIComponent(file.path);
        a.dataset.path = file.path;
        a.innerHTML = '<span class="ficon">' + KK.escapeHtml((file.lang || "txt").slice(0, 3)) + '</span><span class="fname">' + KK.escapeHtml(file.name) + "</span>";
        a.title = file.title;
        items.appendChild(a);
      }

      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!open));
        items.hidden = open;
      });
      group.appendChild(btn);
      group.appendChild(items);
      tree.appendChild(group);
    }
  }

  function filterTree(visiblePaths) {
    const set = new Set(visiblePaths);
    $$(".side-items a", els.tree).forEach((a) => {
      a.hidden = !set.has(a.dataset.path);
    });
    $$(".side-group", els.tree).forEach((group) => {
      const any = Array.from(group.querySelectorAll(".side-items a")).some((a) => !a.hidden);
      group.hidden = !any;
    });
  }

  /* ------------------------------------------------------------------- list */
  function renderList(files) {
    els.list.textContent = "";
    els.empty.hidden = files.length > 0;
    els.resultCount.textContent = files.length + (files.length === 1 ? " match" : " matches");

    const frag = document.createDocumentFragment();
    for (const file of files) {
      const item = document.createElement("div");
      item.className = "artifact-item";
      item.setAttribute("role", "listitem");
      const a = document.createElement("a");
      a.className = "artifact-row";
      a.href = "#file=" + encodeURIComponent(file.path);
      a.dataset.path = file.path;
      if (state.selected && state.selected.path === file.path) a.setAttribute("aria-current", "true");
      a.innerHTML =
        '<span class="type">' + KK.escapeHtml(file.lang || "txt") + "</span>" +
        '<span><h3>' + KK.escapeHtml(file.title) + "</h3><p>" + KK.escapeHtml(file.description) + "</p></span>" +
        '<span class="meta">' + KK.escapeHtml(file.level) + "<br>" + file.lines + " lines</span>";
      item.appendChild(a);
      frag.appendChild(item);
    }
    els.list.appendChild(frag);
    filterTree(files.map((f) => f.path));
    els.treeCount.textContent = files.length + " visible";
  }

  /* ----------------------------------------------------------------- viewer */
  function renderViewer(file, scroll) {
    state.selected = file;
    els.viewer.hidden = false;
    els.viewerTitle.textContent = file.title;
    els.viewerPath.textContent = file.path;
    els.viewerDesc.textContent = file.description;
    els.viewerGithub.href = GH + encodePath(file.path);
    els.viewerLang.textContent = file.lang || "text";
    els.viewerLines.textContent = file.lines + " lines · " + (file.bytes / 1024).toFixed(1) + " KB";
    els.viewerPractice.href = "./quiz.html?topic=" + encodeURIComponent(topicFor(file.category));

    els.viewerTags.textContent = "";
    for (const tag of file.tags || []) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tag";
      b.textContent = tag;
      b.addEventListener("click", () => {
        els.search.value = tag;
        state.query = tag;
        refresh(false);
        els.search.focus();
      });
      els.viewerTags.appendChild(b);
    }

    if (file.modernization) {
      els.viewerNote.innerHTML =
        '<div class="viewer-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg><span><b>2026 compatibility note</b><span>' +
        KK.escapeHtml(file.modernization) + "</span></span></div>";
    } else {
      els.viewerNote.textContent = "";
    }

    if (file.validations && file.validations.length) {
      const box = document.createElement("div");
      box.className = "validation-list";
      box.innerHTML = "<h3>How this artifact was checked</h3>" +
        file.validations.map((v) => "<code>" + KK.escapeHtml(v) + "</code>").join("");
      els.viewerValidations.textContent = "";
      els.viewerValidations.appendChild(box);
    } else {
      els.viewerValidations.textContent = "";
    }

    els.viewerCode.innerHTML = KK.highlight(file.content, file.lang);

    $$(".artifact-row", els.list).forEach((a) => {
      if (a.dataset.path === file.path) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    $$(".side-items a", els.tree).forEach((a) => {
      if (a.dataset.path === file.path) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });

    if (scroll) {
      const behavior = KK.prefersReducedMotion() ? "auto" : "smooth";
      els.viewer.scrollIntoView({ behavior, block: "start" });
      const heading = els.viewerTitle;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  }

  function selectPath(path, scroll) {
    const file = fileByPath(path);
    if (file) renderViewer(file, scroll);
    else KK.toast("That artifact was not found.");
  }

  /* ---------------------------------------------------------------- filters */
  function refresh(selectFirst) {
    const files = sortedFiles();
    renderList(files);
    if (state.selected && !files.some((f) => f.path === state.selected.path)) {
      if (files.length) renderViewer(files[0], false);
    } else if (!state.selected && selectFirst && files.length) {
      renderViewer(files[0], false);
    }
  }

  function resetFilters() {
    state.query = "";
    state.category = "all";
    state.level = "all";
    state.sort = "path";
    els.search.value = "";
    els.level.value = "all";
    els.sort.value = "path";
    renderChips();
    refresh(false);
    els.search.focus();
  }

  /* ------------------------------------------------------------------ events */
  function wire() {
    els.search.addEventListener("input", KK.debounce(() => {
      state.query = els.search.value.trim();
      refresh(false);
    }, 90));

    els.level.addEventListener("change", () => {
      state.level = els.level.value;
      refresh(false);
    });
    els.sort.addEventListener("change", () => {
      state.sort = els.sort.value;
      refresh(false);
    });
    $("#clear-filters").addEventListener("click", resetFilters);

    els.chips.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const btns = $$(".chip", els.chips);
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = e.key === "ArrowRight" ? (i + 1) % btns.length : (i - 1 + btns.length) % btns.length;
      btns[next].focus();
    });

    els.list.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const links = $$(".artifact-row", els.list).filter((a) => !a.closest("[hidden]"));
      const i = links.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = e.key === "ArrowDown" ? Math.min(i + 1, links.length - 1) : Math.max(i - 1, 0);
      links[next].focus();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        els.search.focus();
      }
      if (e.key === "Escape" && document.activeElement === els.search && els.search.value) {
        els.search.value = "";
        state.query = "";
        refresh(false);
      }
    });

    els.viewerCopy.addEventListener("click", () => {
      if (state.selected) KK.copy(state.selected.content, "Artifact copied");
    });
    els.viewerDownload.addEventListener("click", () => {
      if (!state.selected) return;
      const blob = new Blob([state.selected.content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = state.selected.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      KK.toast("Downloaded " + state.selected.name);
    });

    window.addEventListener("hashchange", () => {
      const path = decodeHash();
      if (path) selectPath(path, true);
    });

    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#file="]');
      if (!a) return;
      e.preventDefault();
      const path = a.dataset.path;
      history.replaceState(null, "", "#file=" + encodeURIComponent(path));
      selectPath(path, true);
    });
  }

  function decodeHash() {
    const m = location.hash.match(/^#file=(.+)$/);
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (e) { return ""; }
  }

  async function init() {
    els.chips = $("#category-chips");
    els.tree = $("#tree");
    els.treeCount = $("#tree-count");
    els.list = $("#artifact-list");
    els.empty = $("#empty");
    els.resultCount = $("#result-count");
    els.search = $("#search");
    els.level = $("#level");
    els.sort = $("#sort");
    els.viewer = $("#viewer");
    els.viewerTitle = $("#viewer-title");
    els.viewerPath = $("#viewer-path");
    els.viewerDesc = $("#viewer-desc");
    els.viewerTags = $("#viewer-tags");
    els.viewerNote = $("#viewer-note");
    els.viewerValidations = $("#viewer-validations");
    els.viewerCode = $("#viewer-code");
    els.viewerLang = $("#viewer-lang");
    els.viewerLines = $("#viewer-lines");
    els.viewerGithub = $("#viewer-github");
    els.viewerCopy = $("#viewer-copy");
    els.viewerDownload = $("#viewer-download");

    const practice = document.createElement("a");
    practice.className = "btn btn-ghost btn-sm";
    practice.id = "viewer-practice";
    practice.href = "./quiz.html";
    practice.textContent = "Practise this topic";
    els.viewer.querySelector(".viewer-actions").appendChild(practice);
    els.viewerPractice = practice;

    try {
      const res = await fetch("./assets/data/manifest.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.files = data.files;
      state.stats = data.stats;
      state.categories = data.stats.categories;
    } catch (e) {
      els.list.innerHTML = '<p class="muted">The artifact index could not be loaded. Open the repository on GitHub instead.</p>';
      return;
    }

    els.artifactTotal = $("#artifact-total");
    els.artifactTotal.textContent = state.files.length + " artifacts indexed";
    $("#artifact-lines").textContent = KK.formatNumber(state.stats.lines);

    renderChips();
    renderTree();
    wire();
    refresh(true);

    const initial = decodeHash();
    if (initial) selectPath(initial, false);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
