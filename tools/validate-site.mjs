#!/usr/bin/env node
/**
 * Static integrity checks for the published site.
 * Runs without a browser or network. Fails loudly on missing data or broken
 * local references so a broken page cannot be released.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const docs = path.join(root, "docs");
const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);
const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(docs, "assets", "data", file), "utf8"));
  } catch (e) {
    fail(`${file}: ${e.message}`);
    return null;
  }
};

const pages = ["index", "explorer", "lab", "quiz", "atlas", "game", "cheatsheet", "404"];
const manifest = readJson("manifest.json");
const stats = readJson("stats.json");
const labs = readJson("labs.json");
const quiz = readJson("quiz.json");

for (const page of pages) {
  const file = path.join(docs, `${page}.html`);
  if (!fs.existsSync(file)) {
    fail(`missing page: docs/${page}.html`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  if (!/<title>[^<]{5,}<\/title>/.test(html)) fail(`docs/${page}.html: missing or empty <title>`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) fail(`docs/${page}.html: missing meta description`);
  if (!/<html lang="en">/.test(html)) fail(`docs/${page}.html: missing lang="en"`);
}

if (!manifest || !stats || !labs || !quiz) {
  console.error(errors.join("\n"));
  process.exit(1);
}

if (manifest.files.length !== stats.files) {
  fail(`manifest has ${manifest.files.length} files but stats says ${stats.files}`);
}
if (stats.files !== 67) warn(`artifact count changed: ${stats.files} (README says 67)`);
if (stats.labs !== labs.labs.length) fail("stats.labs does not match labs.json");
if (stats.questions !== quiz.questions.length) fail("stats.questions does not match quiz.json");

let totalLines = 0;
for (const item of manifest.files) {
  const file = path.join(root, item.path);
  if (!fs.existsSync(file)) {
    fail(`artifact missing: ${item.path}`);
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  totalLines += content.split("\n").length;
  if (!item.title || !item.description) fail(`manifest metadata incomplete: ${item.path}`);
  if (!["beginner", "intermediate", "advanced"].includes(item.level)) fail(`bad level for ${item.path}: ${item.level}`);
}
if (totalLines !== stats.lines) fail(`stats.lines is ${stats.lines}, counted ${totalLines}`);

for (const q of quiz.questions) {
  if (!Array.isArray(q.options) || q.options.length !== 4) fail(`quiz ${q.id}: expected 4 options`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail(`quiz ${q.id}: invalid answer index`);
  if (!q.explanation || q.explanation.length < 30) fail(`quiz ${q.id}: explanation too short`);
  if (q.file && !fs.existsSync(path.join(root, q.file))) fail(`quiz ${q.id}: source file missing (${q.file})`);
}

for (const lab of labs.labs) {
  if (!Array.isArray(lab.steps) || lab.steps.length < 2) fail(`lab ${lab.id}: needs at least two steps`);
  for (const [i, step] of (lab.steps || []).entries()) {
    if (!step.task || !step.explain) fail(`lab ${lab.id} step ${i + 1}: missing task or explain`);
    if (!Array.isArray(step.accept) || !step.accept.length) fail(`lab ${lab.id} step ${i + 1}: missing accept patterns`);
    for (const pattern of step.accept || []) {
      try { new RegExp(pattern); } catch (e) { fail(`lab ${lab.id} step ${i + 1}: bad regex (${e.message})`); }
    }
  }
}

const required = [
  "assets/css/site.css",
  "assets/js/site.js",
  "assets/js/three.module.min.js",
  "assets/js/three.core.min.js",
  "assets/img/favicon.svg",
  "assets/img/social-preview.png",
  "assets/video/devops-field-manual-demo.mp4",
  "assets/gifs/live-demo.gif",
  "assets/gifs/lab.gif",
  "assets/gifs/quiz.gif",
  "assets/gifs/atlas.gif",
  "assets/gifs/game.gif"
];
for (const rel of required) {
  if (!fs.existsSync(path.join(docs, rel))) fail(`required asset missing: docs/${rel}`);
}
for (const shot of ["home", "explorer", "lab", "quiz", "atlas", "game", "cheatsheet", "mobile"]) {
  const file = path.join(docs, "assets", "img", "screens", `${shot}.png`);
  if (!fs.existsSync(file)) fail(`screenshot missing: assets/img/screens/${shot}.png`);
}

let checkedLinks = 0;
for (const page of pages) {
  const file = path.join(docs, `${page}.html`);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, "utf8");
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean || clean.endsWith("/")) continue;
    const target = clean.startsWith("/") ? path.join(docs, clean) : path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(target)) fail(`docs/${page}.html: broken link ${ref}`);
    checkedLinks += 1;
  }
}

if (!fs.existsSync(path.join(root, "README.md"))) fail("README.md is missing");
if (!fs.existsSync(path.join(root, "LICENSE"))) fail("LICENSE is missing");

console.log(
  `Validated ${manifest.files.length} artifacts (${stats.lines} lines), ` +
  `${labs.labs.length} labs, ${quiz.questions.length} questions, ` +
  `${pages.length} pages, ${checkedLinks} local links, ${required.length} required assets.`
);
if (warnings.length) console.log("Warnings:\n- " + warnings.join("\n- "));
if (errors.length) {
  console.error("Errors:\n- " + errors.join("\n- "));
  process.exit(1);
}
