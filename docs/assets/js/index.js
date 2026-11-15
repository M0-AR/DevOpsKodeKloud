/* Index page: live iframe demo tabs, stats hydration, coverage bars. */
(function () {
  "use strict";
  const KK = window.KK;
  const $ = KK.$;
  const $$ = KK.$$;

  /* ------------------------------------------------------------- live demo */
  function initDemo() {
    const tablist = $('[role="tablist"]');
    if (!tablist) return;
    const tabs = $$('[role="tab"]', tablist);
    const panel = $("#demo-panel");
    const poster = $("#demo-poster");
    const posterImg = $("#demo-poster-img");
    const posterText = $("#demo-poster-text");
    const launch = $("#demo-launch");
    const loading = $("#demo-loading");
    const url = $("#demo-url");
    const caption = $("#demo-caption");
    const open = $("#demo-open");
    const full = $("#demo-full");

    let active = tabs[0];
    let launched = false;
    let iframe = null;
    let loadTimer = 0;

    function data(tab) {
      return {
        page: tab.getAttribute("data-page"),
        title: tab.getAttribute("data-title"),
        url: tab.getAttribute("data-url"),
        poster: tab.getAttribute("data-poster"),
        caption: tab.getAttribute("data-caption")
      };
    }

    function showPoster(tab) {
      const d = data(tab);
      poster.hidden = false;
      posterImg.src = d.poster;
      posterImg.alt = "Screenshot of the " + d.title.toLowerCase() + " page";
      posterText.textContent = "The real " + d.title.toLowerCase() + " is one click away. The poster is a placeholder, not the demo.";
      launch.textContent = "";
      launch.insertAdjacentHTML("beforeend",
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"/></svg> Launch interactive demo');
    }

    function destroyIframe() {
      if (iframe && iframe.parentNode) iframe.parentNode.removeChild(iframe);
      iframe = null;
      clearTimeout(loadTimer);
      loading.classList.remove("is-active");
    }

    function mountIframe() {
      const d = data(active);
      destroyIframe();
      poster.hidden = true;
      loading.classList.add("is-active");
      iframe = document.createElement("iframe");
      iframe.className = "demo-iframe";
      iframe.title = d.title + " — live page";
      iframe.src = "./" + d.page;
      iframe.setAttribute("loading", "eager");
      iframe.setAttribute("allow", "fullscreen");
      iframe.addEventListener("load", () => {
        clearTimeout(loadTimer);
        loading.classList.remove("is-active");
      });
      panel.appendChild(iframe);
      loadTimer = setTimeout(() => loading.classList.remove("is-active"), 12000);
    }

    function activate(tab, focus) {
      active = tab;
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      panel.setAttribute("aria-labelledby", tab.id);
      const d = data(tab);
      url.textContent = d.url;
      caption.innerHTML = "<strong>" + KK.escapeHtml(d.title) + ".</strong> " + KK.escapeHtml(d.caption);
      open.href = "./" + d.page;
      full.href = "./" + d.page;
      if (launched) mountIframe();
      else showPoster(tab);
      if (focus) tab.focus();
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => activate(tab, false));
      tab.addEventListener("keydown", (e) => {
        const i = tabs.indexOf(tab);
        let next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (!next) return;
        e.preventDefault();
        activate(next, true);
      });
    });

    launch.addEventListener("click", () => {
      launched = true;
      mountIframe();
    });

    showPoster(active);
  }

  /* ----------------------------------------------------------------- stats */
  async function initStats() {
    const bars = $("#coverage");
    const map = { files: "files", lines: "lines", labs: "labs", questions: "questions" };
    try {
      const res = await fetch("./assets/data/stats.json");
      if (!res.ok) return;
      const stats = await res.json();
      Object.keys(map).forEach((key) => {
        const el = document.querySelector('[data-stat="' + key + '"]');
        if (el) el.textContent = KK.formatNumber(stats[key]);
      });
      if (bars && stats.categories) {
        const max = Math.max.apply(null, stats.categories.map((c) => c.count));
        bars.textContent = "";
        stats.categories.forEach((cat) => {
          const row = document.createElement("div");
          row.className = "coverage-row";
          row.innerHTML =
            '<span class="label">' + KK.escapeHtml(cat.label) + "</span>" +
            '<div class="bar-track"><div class="bar-fill" data-w="' + Math.round((cat.count / max) * 100) + '"></div></div>' +
            '<span class="count">' + cat.count + "</span>";
          bars.appendChild(row);
        });
        requestAnimationFrame(() => {
          $$(".bar-fill", bars).forEach((b) => { b.style.width = b.getAttribute("data-w") + "%"; });
        });
      }
    } catch (e) { /* static values remain */ }
  }

  function initTerminalPulse() {
    const term = $("#hero-term");
    if (!term || KK.prefersReducedMotion()) return;
    const lines = $$("div", term);
    lines.forEach((line, i) => { line.style.animationDelay = (i * 60) + "ms"; });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initDemo();
    initStats();
    initTerminalPulse();
  });
})();
