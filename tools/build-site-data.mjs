#!/usr/bin/env node
/**
 * Builds the static dataset that powers the explorer, atlas, and site stats.
 * Source of truth is always the repository content itself; nothing is rewritten.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const outDir = path.join(root, "docs", "assets", "data");
const meta = JSON.parse(fs.readFileSync(path.join(here, "site-meta.json"), "utf8"));

const CATEGORIES = [
  { id: "kubernetes", dir: "Kubernetes", label: "Kubernetes", blurb: "Workloads, networking, storage, and rollout mechanics." },
  { id: "ansible", dir: "ansible", label: "Ansible", blurb: "Declarative automation: modules, loops, facts, and conditionals." },
  { id: "puppet", dir: "puppet", label: "Puppet", blurb: "Configuration as code with resources, classes, and nodes." },
  { id: "cka", dir: "Certified-Kubernetes-Administrator-(CKA)-Mock-Exam", label: "CKA Exam", blurb: "Timed, task-shaped exercises for cluster administration." },
  { id: "cks", dir: "CKS-Challenges", label: "CKS Security", blurb: "Supply chain, AppArmor, and least-privilege enforcement." },
  { id: "guestbook", dir: "deploy-guest-book-app-on-kubernetes", label: "Guestbook App", blurb: "A complete multi-tier application deployed on Kubernetes." }
];

const LANG = {
  ".yml": "yaml", ".yaml": "yaml", ".sh": "bash", ".pp": "puppet",
  ".txt": "text", ".md": "markdown", ".json": "json"
};

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, acc);
    else acc.push(rel);
  }
  return acc;
}

function humanTitle(file) {
  return path.basename(file).replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function validations(content) {
  return content.split("\n")
    .map((line) => line.trim())
    .filter((line) => /^#.*(validate|verify|run:|check:)/i.test(line))
    .map((line) => line.replace(/^#\s*/, ""))
    .slice(0, 4);
}

const files = [];
const counts = { files: 0, lines: 0, bytes: 0, categories: {}, levels: { beginner: 0, intermediate: 0, advanced: 0 } };

for (const category of CATEGORIES) {
  for (const rel of walk(category.dir)) {
    const content = fs.readFileSync(path.join(root, rel), "utf8");
    const ext = path.extname(rel).toLowerCase();
    const info = meta[rel] || {};
    const lines = content.split("\n").length;
    const entry = {
      path: rel.split(path.sep).join("/"),
      name: path.basename(rel),
      category: category.id,
      categoryLabel: category.label,
      lang: LANG[ext] || "text",
      title: info.title || humanTitle(rel),
      description: info.description || `Reference artifact: ${humanTitle(rel)}.`,
      tags: info.tags || [],
      level: info.level || "intermediate",
      modernization: info.modernization || "",
      validations: validations(content),
      lines,
      bytes: Buffer.byteLength(content),
      content
    };
    files.push(entry);
    counts.files += 1;
    counts.lines += lines;
    counts.bytes += entry.bytes;
    counts.categories[category.id] = (counts.categories[category.id] || 0) + 1;
    if (counts.levels[entry.level] !== undefined) counts.levels[entry.level] += 1;
  }
}

files.sort((a, b) => a.path.localeCompare(b.path));
const quiz = JSON.parse(fs.readFileSync(path.join(root, "docs", "assets", "data", "quiz.json"), "utf8"));
const stats = {
  files: counts.files,
  lines: counts.lines,
  kb: Math.round(counts.bytes / 1024),
  categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, blurb: c.blurb, count: counts.categories[c.id] || 0 })),
  levels: counts.levels,
  questions: quiz.questions.length,
  labs: JSON.parse(fs.readFileSync(path.join(root, "docs", "assets", "data", "labs.json"), "utf8")).labs.length
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify({ stats, files }));
fs.writeFileSync(path.join(outDir, "stats.json"), JSON.stringify(stats));
console.log(`Built ${stats.files} artifacts, ${stats.lines} lines, ${stats.questions} questions, ${stats.labs} labs.`);
