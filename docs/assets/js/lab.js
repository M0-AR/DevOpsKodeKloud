/* Lab simulator: validates the exact command shape, then explains why it works. */
(function () {
  "use strict";
  const KK = window.KK;
  const $ = KK.$;
  const $$ = KK.$$;

  const CATEGORY = {
    kubernetes: "Kubernetes",
    ansible: "Ansible",
    puppet: "Puppet",
    exam: "CKA Exam",
    security: "CKS Security",
    guestbook: "Guestbook App"
  };

  const state = {
    labs: [],
    lab: null,
    step: 0,
    history: [],
    historyIndex: -1,
    hintShown: false
  };
  const els = {};

  function esc(s) { return KK.escapeHtml(s); }

  function doneMap() {
    return KK.progress.get().labs.done || {};
  }

  /* ------------------------------------------------------------------ list */
  function renderList() {
    const done = doneMap();
    els.list.textContent = "";
    state.labs.forEach((lab) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "lab-item";
      b.dataset.id = lab.id;
      b.setAttribute("aria-current", String(state.lab && state.lab.id === lab.id));
      b.innerHTML =
        "<b>" + esc(lab.title) + "</b>" +
        "<span>" + esc(CATEGORY[lab.category] || lab.category) + " · " + esc(lab.time) +
        (done[lab.id] ? ' · <span class="done">completed</span>' : "") + "</span>";
      b.addEventListener("click", () => loadLab(lab.id));
      els.list.appendChild(b);
    });
    const total = state.labs.length;
    const count = state.labs.filter((l) => done[l.id]).length;
    els.progressLabel.textContent = count + "/" + total;
    els.doneCount.textContent = String(count);
  }

  /* --------------------------------------------------------------- terminal */
  function append(text, cls) {
    const lines = String(text).split("\n");
    for (const line of lines) {
      const div = document.createElement("div");
      div.className = "term-line " + (cls || "out");
      div.textContent = line || " ";
      els.body.appendChild(div);
    }
    els.body.scrollTop = els.body.scrollHeight;
  }

  function promptLine(cmd) {
    append("student@controlplane:~$ " + cmd, "prompt");
  }

  function clearTerminal() {
    els.body.textContent = "";
  }

  function boot() {
    clearTerminal();
    append("DevOps Field Manual — lab simulator v2.0", "sys");
    append("No cluster is contacted. Outputs are recorded from the real workflow.");
    append("Lab: " + state.lab.title, "sys");
    append("Objective: " + state.lab.objective);
    append("Type help for simulator commands. Type hint if you are stuck.", "out");
    append("");
    append("Step 1: " + state.lab.steps[0].task, "sys");
  }

  /* ------------------------------------------------------------------- lab */
  function loadLab(id, updateUrl) {
    const lab = state.labs.find((l) => l.id === id) || state.labs[0];
    if (!lab) return;
    state.lab = lab;
    state.step = 0;
    state.hintShown = false;
    state.history = [];
    state.historyIndex = -1;

    els.kicker.textContent = CATEGORY[lab.category] || lab.category;
    els.title.textContent = lab.title;
    els.brief.textContent = lab.brief;
    els.difficulty.textContent = lab.difficulty;
    els.time.textContent = lab.time;
    els.concept.textContent = lab.concept;
    els.termTitle.textContent = "student@controlplane — " + lab.id;

    els.task.hidden = false;
    els.complete.hidden = true;
    els.input.disabled = false;
    els.input.placeholder = "Type a command, then press Enter";

    renderTask();
    boot();
    renderList();
    renderProgress();

    $$(".lab-item", els.list).forEach((b) => {
      b.setAttribute("aria-current", String(b.dataset.id === lab.id));
    });

    if (updateUrl !== false) {
      try {
        if (location.protocol === "http:" || location.protocol === "https:") {
          history.replaceState(null, "", "?lab=" + encodeURIComponent(lab.id));
        }
      } catch (e) { /* deep links are a convenience */ }
    }

    setTimeout(() => {
      if (!KK.prefersReducedMotion()) els.input.focus({ preventScroll: true });
    }, 40);
  }

  function renderTask() {
    const step = state.lab.steps[state.step];
    els.taskLabel.textContent = "Step " + (state.step + 1) + " of " + state.lab.steps.length;
    els.taskText.textContent = step.task;
    els.feedback.className = "feedback";
    els.feedback.textContent = "";
    els.hintBtn.textContent = "Show hint";
    state.hintShown = false;
    renderProgress();
  }

  function renderProgress() {
    if (!state.lab) return;
    const pct = (state.step / state.lab.steps.length) * 100;
    els.labProgress.style.width = pct + "%";
  }

  function showHint() {
    const step = state.lab.steps[state.step];
    if (!step || els.complete.hidden === false) return;
    state.hintShown = true;
    els.feedback.className = "feedback hintbox show";
    els.feedback.textContent = "Hint: " + step.hint;
    els.hintBtn.textContent = "Hide hint";
    append("hint: " + step.hint, "hint");
    els.input.focus();
  }

  /* ----------------------------------------------------------------- check */
  function compile(patterns) {
    const out = [];
    for (const p of patterns || []) {
      try { out.push(new RegExp(p)); } catch (e) { /* malformed pattern is skipped */ }
    }
    return out;
  }

  function submit(cmd) {
    const raw = cmd.trim();
    if (!raw) return;
    els.input.value = "";

    if (raw === "clear") {
      clearTerminal();
      return;
    }

    promptLine(raw);

    if (raw === "help") {
      append("Simulator commands:", "sys");
      append("  help    show this list");
      append("  hint    show a nudge for the current step");
      append("  clear   clear the terminal output");
      append("  restart reload the current lab");
      append("  labs    list the lab catalogue");
      append("Anything else is validated as the command for this step.");
      return;
    }
    if (raw === "labs") {
      append(state.labs.map((l) => l.id + " — " + l.title).join("\n"), "out");
      return;
    }
    if (raw === "restart") {
      loadLab(state.lab.id, false);
      return;
    }
    if (raw === "hint") {
      showHint();
      return;
    }

    state.history.push(raw);
    if (state.history.length > 40) state.history.shift();
    state.historyIndex = -1;

    if (!els.complete.hidden) {
      append("This lab is complete. Choose another lab from the catalogue.", "sys");
      return;
    }

    const step = state.lab.steps[state.step];
    const normalized = raw.replace(/\s+/g, " ").trim();
    const ok = compile(step.accept).some((re) => re.test(normalized));

    if (!ok) {
      els.feedback.className = "feedback no show";
      els.feedback.textContent = "Not the expected command for this step. Type hint for a nudge, or re-read the task.";
      append("That command does not satisfy this step.", "err");
      return;
    }

    if (step.output) append(step.output, "out");
    append("Step " + (state.step + 1) + " complete.", "sys");
    els.feedback.className = "feedback ok show";
    els.feedback.textContent = "Correct. " + step.explain;

    state.step += 1;
    renderProgress();

    if (state.step >= state.lab.steps.length) {
      completeLab();
      return;
    }

    const next = state.lab.steps[state.step];
    els.taskLabel.textContent = "Step " + (state.step + 1) + " of " + state.lab.steps.length;
    els.taskText.textContent = next.task;
    els.hintBtn.textContent = "Show hint";
    state.hintShown = false;
    append("Next — step " + (state.step + 1) + ": " + next.task, "sys");
  }

  /* -------------------------------------------------------------- complete */
  function completeLab() {
    const id = state.lab.id;
    const p = KK.progress.get();
    const first = !p.labs.done[id];

    KK.progress.patch((q) => {
      q.labs.done[id] = true;
      if (first) {
        q.labs.xp += 50;
        q.xp += 50;
        const today = new Date().toISOString().slice(0, 10);
        if (q.streak.last !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          q.streak.count = q.streak.last === yesterday ? q.streak.count + 1 : 1;
          q.streak.last = today;
        }
      }
    });

    append("");
    append("Lab complete: " + state.lab.title, "sys");
    append(first ? "Awarded 50 XP." : "Already completed earlier; replay is free.", "out");

    els.task.hidden = true;
    els.complete.hidden = false;
    els.completeCopy.textContent = first
      ? "Every step validated. You earned 50 XP for this lab."
      : "Every step validated again. Progress is saved in this browser.";
    els.input.disabled = true;
    els.input.placeholder = "Lab complete — choose another lab";
    els.labProgress.style.width = "100%";
    renderList();
  }

  function nextLab() {
    const i = state.labs.findIndex((l) => l.id === state.lab.id);
    loadLab(state.labs[(i + 1) % state.labs.length].id);
  }

  /* ----------------------------------------------------------------- events */
  function wire() {
    els.form.addEventListener("submit", (e) => {
      e.preventDefault();
      submit(els.input.value);
      els.input.focus();
    });

    els.hintBtn.addEventListener("click", () => {
      if (state.hintShown) {
        els.feedback.className = "feedback";
        els.feedback.textContent = "";
        els.hintBtn.textContent = "Show hint";
        state.hintShown = false;
      } else {
        showHint();
      }
    });

    els.restart.addEventListener("click", () => {
      loadLab(state.lab.id, false);
      KK.toast("Lab restarted");
    });

    els.nextLab.addEventListener("click", nextLab);

    els.input.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!state.history.length) return;
      e.preventDefault();
      if (e.key === "ArrowUp") {
        state.historyIndex = state.historyIndex < 0
          ? state.history.length - 1
          : Math.max(0, state.historyIndex - 1);
      } else {
        state.historyIndex = Math.min(state.history.length - 1, state.historyIndex + 1);
      }
      els.input.value = state.history[state.historyIndex] || "";
      const end = els.input.value.length;
      els.input.setSelectionRange(end, end);
    });
  }

  async function init() {
    els.list = $("#lab-list");
    els.progressLabel = $("#lab-progress-label");
    els.doneCount = $("#lab-done");
    els.kicker = $("#lab-kicker");
    els.title = $("#lab-title");
    els.brief = $("#lab-brief");
    els.difficulty = $("#lab-difficulty");
    els.time = $("#lab-time");
    els.concept = $("#lab-concept");
    els.termTitle = $("#term-title");
    els.body = $("#term-body");
    els.form = $("#term-form");
    els.input = $("#term-input");
    els.task = $("#lab-task");
    els.taskLabel = $("#task-label");
    els.taskText = $("#task-text");
    els.feedback = $("#feedback");
    els.hintBtn = $("#hint-btn");
    els.restart = $("#restart-lab");
    els.complete = $("#lab-complete");
    els.completeCopy = $("#complete-copy");
    els.nextLab = $("#next-lab");
    els.labProgress = $("#lab-progress");

    try {
      const res = await fetch("./assets/data/labs.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.labs = data.labs;
      $("#lab-notice").textContent = data.notice;
    } catch (e) {
      els.list.innerHTML = '<p class="muted" style="padding:12px">The lab catalogue could not be loaded.</p>';
      return;
    }

    $("#lab-total").textContent = String(state.labs.length);
    wire();
    const param = new URLSearchParams(location.search).get("lab");
    loadLab(param || state.labs[0].id);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
