/* Quiz engine: retrieval practice, spaced repetition, local-first progress. */
(function () {
  "use strict";
  const KK = window.KK;
  const $ = KK.$;
  const $$ = KK.$$;

  const TOPICS = [
    { id: "kubernetes", label: "Kubernetes" },
    { id: "ansible", label: "Ansible" },
    { id: "puppet", label: "Puppet" },
    { id: "exam", label: "CKA Exam" },
    { id: "security", label: "CKS Security" }
  ];
  const DAY = 86400000;

  const state = {
    questions: [],
    topic: "all",
    difficulty: "all",
    length: 10,
    mode: "practice",
    queue: [],
    index: 0,
    selected: -1,
    answered: false,
    answers: [],
    xp: 0
  };
  const els = {};

  function topicLabel(id) {
    const t = TOPICS.find((x) => x.id === id);
    return t ? t.label : id;
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pool() {
    return state.questions.filter((q) => {
      if (state.topic !== "all" && q.topic !== state.topic) return false;
      if (state.difficulty !== "all" && q.difficulty !== state.difficulty) return false;
      return true;
    });
  }

  /* ------------------------------------------------------------------ setup */
  function renderTopicChips() {
    els.topicChips.textContent = "";
    const all = [{ id: "all", label: "All topics" }].concat(TOPICS);
    for (const t of all) {
      const count = t.id === "all" ? state.questions.length : state.questions.filter((q) => q.topic === t.id).length;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", String(state.topic === t.id));
      b.innerHTML = KK.escapeHtml(t.label) + ' <span class="chip-count">' + count + "</span>";
      b.addEventListener("click", () => {
        state.topic = t.id;
        renderTopicChips();
      });
      els.topicChips.appendChild(b);
    }
  }

  function startSession(queue, mode) {
    if (!queue.length) {
      KK.toast("No questions available for those filters.");
      return;
    }
    state.queue = queue;
    state.mode = mode || "practice";
    state.index = 0;
    state.answers = [];
    state.xp = 0;
    els.setup.hidden = true;
    els.results.hidden = true;
    els.play.hidden = false;
    renderQuestion();
  }

  function startFromSetup() {
    const filtered = pool();
    const queue = shuffle(filtered).slice(0, state.length);
    startSession(queue, "practice");
  }

  function startDue() {
    const now = Date.now();
    const p = KK.progress.get();
    const due = state.questions.filter((q) => {
      if (state.topic !== "all" && q.topic !== state.topic) return false;
      const s = p.quiz.srs[q.id];
      return s && s.due <= now;
    });
    if (!due.length) {
      KK.toast("Nothing is due yet. Complete a session first, or come back later.");
      return;
    }
    startSession(shuffle(due), "review");
  }

  /* --------------------------------------------------------------- question */
  function renderQuestion() {
    const q = state.queue[state.index];
    state.selected = -1;
    state.answered = false;

    els.qTopic.textContent = topicLabel(q.topic);
    els.qConcept.textContent = q.concept;
    els.qLevel.textContent = q.difficulty;
    els.qNum.textContent = (state.index + 1) + " / " + state.queue.length;
    els.qText.textContent = q.question;
    els.qProgress.style.width = (state.index / state.queue.length) * 100 + "%";

    els.options.textContent = "";
    q.options.forEach((text, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "option";
      b.setAttribute("aria-pressed", "false");
      b.dataset.index = String(i);
      b.innerHTML = '<span class="key">' + (i + 1) + "</span><span>" + KK.escapeHtml(text) + "</span>";
      b.addEventListener("click", () => selectOption(i));
      els.options.appendChild(b);
    });

    els.explanation.classList.remove("show");
    els.submit.hidden = false;
    els.submit.disabled = true;
    els.next.hidden = true;
    els.qText.setAttribute("tabindex", "-1");
    els.qText.focus({ preventScroll: true });
  }

  function selectOption(i) {
    if (state.answered) return;
    state.selected = i;
    $$(".option", els.options).forEach((b, idx) => {
      b.classList.toggle("is-selected", idx === i);
      b.setAttribute("aria-pressed", String(idx === i));
    });
    els.submit.disabled = false;
  }

  function submitAnswer() {
    if (state.answered) return;
    if (state.selected < 0) {
      KK.toast("Choose an answer first.");
      return;
    }
    const q = state.queue[state.index];
    const correct = state.selected === q.answer;
    state.answered = true;

    $$(".option", els.options).forEach((b, idx) => {
      b.disabled = true;
      b.classList.remove("is-selected");
      if (idx === q.answer) b.classList.add("is-correct");
      if (idx === state.selected && !correct) b.classList.add("is-wrong");
    });

    state.answers.push({ q, selected: state.selected, correct });
    const earned = correct ? 10 : 2;
    state.xp += earned;
    recordAnswer(q, correct);
    els.qProgress.style.width = ((state.index + 1) / state.queue.length) * 100 + "%";

    els.verdict.textContent = correct ? "Correct" : "Not quite — the answer is " + (q.answer + 1) + ".";
    els.verdict.className = "verdict " + (correct ? "ok" : "no");
    els.qWhy.textContent = q.explanation;
    if (q.file) {
      els.source.href = "./explorer.html#file=" + encodeURIComponent(q.file);
      els.source.textContent = "Read " + q.file.split("/").pop();
      els.source.hidden = false;
    } else {
      els.source.hidden = true;
    }
    els.explanation.classList.add("show");
    els.submit.hidden = true;
    els.next.hidden = false;
    els.next.textContent = state.index + 1 >= state.queue.length ? "See results" : "Next question";
    els.next.focus({ preventScroll: true });
    refreshStats();
  }

  function recordAnswer(q, correct) {
    KK.progress.patch((p) => {
      const z = p.quiz;
      z.answered += 1;
      if (correct) z.correct += 1;
      const t = z.byTopic[q.topic] || { answered: 0, correct: 0 };
      t.answered += 1;
      if (correct) t.correct += 1;
      z.byTopic[q.topic] = t;

      const prev = z.srs[q.id] || { interval: 0, seen: 0 };
      const now = Date.now();
      let interval = 0;
      let due = now + 10 * 60000;
      if (correct) {
        interval = prev.interval ? Math.min(prev.interval * 2.2, 120) : 1;
        due = now + interval * DAY;
        z.mistakes = z.mistakes.filter((id) => id !== q.id);
      } else if (!z.mistakes.includes(q.id)) {
        z.mistakes.push(q.id);
      }
      z.srs[q.id] = { due, interval, seen: (prev.seen || 0) + 1, last: now };

      z.history.push({ id: q.id, correct, at: now });
      if (z.history.length > 200) z.history = z.history.slice(-200);

      p.xp += correct ? 10 : 2;
      const today = new Date().toISOString().slice(0, 10);
      if (p.streak.last !== today) {
        const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
        p.streak.count = p.streak.last === yesterday ? p.streak.count + 1 : 1;
        p.streak.last = today;
      }
    });
  }

  function nextQuestion() {
    if (state.index + 1 >= state.queue.length) {
      showResults();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  /* ---------------------------------------------------------------- results */
  function showResults() {
    els.play.hidden = true;
    els.setup.hidden = true;
    els.results.hidden = false;

    const total = state.answers.length;
    const correct = state.answers.filter((a) => a.correct).length;
    const pct = total ? Math.round((correct / total) * 100) : 0;
    els.scorePct.textContent = pct + "%";
    els.scoreFrac.textContent = correct + " / " + total;
    const circumference = 2 * Math.PI * 52;
    els.ring.style.strokeDasharray = String(circumference);
    els.ring.style.strokeDashoffset = String(circumference * (1 - pct / 100));
    els.scoreRing.setAttribute("aria-label", "Score: " + pct + " percent, " + correct + " of " + total + " correct");

    let title = "This is where learning starts.";
    if (pct >= 90) title = "Excellent command.";
    else if (pct >= 70) title = "Solid. A few gaps left.";
    else if (pct >= 50) title = "Halfway there.";
    els.resultTitle.textContent = title;
    els.resultCopy.textContent =
      "You answered " + correct + " of " + total + " correctly and earned " + state.xp +
      " XP. Incorrect answers are scheduled to return in ten minutes; correct answers return after a longer interval.";

    els.reviewList.textContent = "";
    state.answers.forEach((a) => {
      const item = document.createElement("div");
      item.className = "review-item";
      const yours = a.q.options[a.selected];
      const right = a.q.options[a.q.answer];
      item.innerHTML =
        '<p class="ri-q">' + KK.escapeHtml(a.q.question) + "</p>" +
        '<p class="ri-line">Your answer: <b class="' + (a.correct ? "ok" : "no") + '">' + KK.escapeHtml(yours) + "</b></p>" +
        (a.correct ? "" : '<p class="ri-line">Correct answer: <b class="ok">' + KK.escapeHtml(right) + "</b></p>") +
        '<p class="ri-why">' + KK.escapeHtml(a.q.explanation) + "</p>" +
        (a.q.file ? '<p class="ri-line" style="margin-top:6px"><a href="./explorer.html#file=' + encodeURIComponent(a.q.file) + '">' + KK.escapeHtml(a.q.file) + "</a></p>" : "");
      els.reviewList.appendChild(item);
    });

    const wrong = state.answers.filter((a) => !a.correct);
    els.retryWrong.hidden = wrong.length === 0;
    els.retryWrong.onclick = () => startSession(shuffle(wrong.map((a) => a.q)), "retry");
    refreshStats();
    els.resultTitle.focus({ preventScroll: false });
  }

  function backToSetup() {
    state.queue = [];
    state.answers = [];
    state.index = 0;
    els.play.hidden = true;
    els.results.hidden = true;
    els.setup.hidden = false;
  }

  /* ---------------------------------------------------------------- sidebar */
  function refreshStats() {
    const p = KK.progress.get();
    const q = p.quiz;
    els.statXp.textContent = KK.formatNumber(p.xp);
    els.statStreak.textContent = String(p.streak.count || 0);
    els.statAccuracy.textContent = q.answered ? Math.round((q.correct / q.answered) * 100) + "%" : "—";
    els.statAnswered.textContent = KK.formatNumber(q.answered);

    els.topicBars.textContent = "";
    for (const t of TOPICS) {
      const stat = q.byTopic[t.id] || { answered: 0, correct: 0 };
      const pct = stat.answered ? Math.round((stat.correct / stat.answered) * 100) : 0;
      const row = document.createElement("div");
      row.className = "topic-bar";
      row.innerHTML =
        '<div class="tb-head"><b>' + KK.escapeHtml(t.label) + "</b><span>" + stat.correct + "/" + stat.answered + "</span></div>" +
        '<div class="progress-line"><i style="width:' + pct + '%"></i></div>';
      els.topicBars.appendChild(row);
    }

    const grid = els.streakGrid;
    grid.textContent = "";
    const counts = {};
    for (const h of q.history || []) {
      const d = new Date(h.at).toISOString().slice(0, 10);
      counts[d] = (counts[d] || 0) + 1;
    }
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
      const n = counts[d] || 0;
      const cell = document.createElement("i");
      if (n > 0) cell.className = "on";
      if (n >= 5) cell.className = "hot";
      cell.title = d + ": " + n + " answer" + (n === 1 ? "" : "s");
      grid.appendChild(cell);
    }

    const now = Date.now();
    const due = Object.values(q.srs).filter((s) => s.due <= now).length;
    els.dueCount.textContent = String(due);
    els.dueInline.textContent = String(due);
  }

  /* ----------------------------------------------------------------- events */
  function wire() {
    els.start.addEventListener("click", startFromSetup);
    els.reviewDue.addEventListener("click", startDue);
    els.submit.addEventListener("click", submitAnswer);
    els.next.addEventListener("click", nextQuestion);
    els.quit.addEventListener("click", () => {
      if (!state.answers.length) backToSetup();
      else showResults();
    });
    els.newSession.addEventListener("click", backToSetup);
    els.reset.addEventListener("click", () => {
      if (!window.confirm("Reset all saved XP, quiz history, lab progress, and game scores in this browser?")) return;
      KK.progress.reset();
      refreshStats();
      KK.toast("Progress reset");
    });

    els.difficulty.addEventListener("change", () => { state.difficulty = els.difficulty.value; });
    els.length.addEventListener("change", () => { state.length = parseInt(els.length.value, 10); });

    document.addEventListener("keydown", (e) => {
      if (els.play.hidden) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      if (/^[1-4]$/.test(e.key) && !state.answered) {
        e.preventDefault();
        selectOption(parseInt(e.key, 10) - 1);
        return;
      }
      if (e.key === "Enter") {
        if (!els.next.hidden) {
          e.preventDefault();
          nextQuestion();
        } else if (!els.submit.hidden && state.selected >= 0) {
          e.preventDefault();
          submitAnswer();
        }
      }
    });

    document.addEventListener("kk:progress", refreshStats);
  }

  async function init() {
    els.setup = $("#quiz-setup");
    els.play = $("#quiz-play");
    els.results = $("#quiz-results");
    els.topicChips = $("#topic-chips");
    els.difficulty = $("#difficulty");
    els.length = $("#length");
    els.start = $("#start-quiz");
    els.reviewDue = $("#review-due");
    els.dueCount = $("#due-count");
    els.dueInline = $("#due-inline");
    els.qTopic = $("#q-topic");
    els.qConcept = $("#q-concept");
    els.qLevel = $("#q-level");
    els.qNum = $("#q-num");
    els.qProgress = $("#q-progress");
    els.qText = $("#q-text");
    els.options = $("#q-options");
    els.explanation = $("#q-explanation");
    els.verdict = $("#q-verdict");
    els.qWhy = $("#q-why");
    els.source = $("#q-source");
    els.submit = $("#q-submit");
    els.next = $("#q-next");
    els.quit = $("#q-quit");
    els.resultTitle = $("#result-title");
    els.resultCopy = $("#result-copy");
    els.scorePct = $("#score-pct");
    els.scoreFrac = $("#score-frac");
    els.scoreRing = $("#score-ring");
    els.ring = $("#ring-fg");
    els.reviewList = $("#review-list");
    els.retryWrong = $("#retry-wrong");
    els.newSession = $("#new-session");
    els.statXp = $("#stat-xp");
    els.statStreak = $("#stat-streak");
    els.statAccuracy = $("#stat-accuracy");
    els.statAnswered = $("#stat-answered");
    els.topicBars = $("#topic-bars");
    els.streakGrid = $("#streak-grid");
    els.reset = $("#reset-progress");

    els.resultTitle.setAttribute("tabindex", "-1");

    try {
      const res = await fetch("./assets/data/quiz.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      state.questions = data.questions;
    } catch (e) {
      els.setup.innerHTML = '<p class="muted">The question bank could not be loaded. Try the repository on GitHub instead.</p>';
      return;
    }

    $("#q-total").textContent = String(state.questions.length);
    const param = new URLSearchParams(location.search).get("topic");
    if (param && TOPICS.some((t) => t.id === param)) state.topic = param;

    renderTopicChips();
    refreshStats();
    wire();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
