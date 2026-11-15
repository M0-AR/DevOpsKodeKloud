# Contributing

Thanks for wanting to improve the DevOps Field Manual. This project is built
for learners, so clarity, accuracy and safety matter more than cleverness.

## What is welcome

- New practice artifacts (Kubernetes, Ansible, Puppet, CKA, CKS, Guestbook).
- Fixes for deprecated APIs, end-of-life images and broken YAML.
- Better explanations, hints or modernizations for existing artifacts.
- New quiz questions, labs or cheat-sheet commands that are tied to a real
  artifact in this repository.
- Accessibility, performance, documentation and mobile improvements.
- Corrections to factual or security guidance.

Please open an issue before starting a large change. Small fixes can go
straight to a pull request.

## Ground rules

- **Never commit real secrets, tokens, kubeconfigs or private keys.** Use
  placeholders and explain how a reader should supply the value.
- **Do not claim a lab touches a real cluster.** Every lab is a simulation.
- **Keep it understandable.** Explain jargon the first time you use it.
- **Prefer current APIs.** Kubernetes `batch/v1` for CronJobs and Jobs,
  supported container images, and explicit resource requests/limits when they
  teach something useful.
- **One change per pull request.** Do not mix refactors, content and design in
  one review.
- **Respect the licence.** By contributing you agree that your work is
  released under the MIT licence.

## Add or change an artifact

1. Put the file in the correct directory:
   - `Kubernetes/`
   - `ansible/`
   - `puppet/`
   - `Certified-Kubernetes-Administrator-(CKA)-Mock-Exam/`
   - `CKS-Challenges/`
   - `deploy-guest-book-app-on-kubernetes/`
2. Add an entry to `tools/site-meta.json` keyed by the exact repository path.
   Include a short title, a one-sentence description, tags, a level and — when
   the file is outdated — a specific modernization note.
3. Rebuild the generated dataset:

   ```bash
   node tools/build-site-data.mjs
   ```

4. Run the integrity checks:

   ```bash
   node tools/validate-site.mjs
   ```

5. Preview the site:

   ```bash
   python3 -m http.server 8899 --directory docs
   ```

   Then open <http://127.0.0.1:8899/> and check the explorer, the new lab or
   question, and the atlas search.

6. Commit both the artifact and the regenerated files in
   `docs/assets/data/`.

## Add a lab

Labs live in `docs/assets/data/labs.json`. Each lab needs:

- `id`, `title`, `category`, `difficulty` and a short `brief`.
- At least two steps.
- For every step: `task`, `explain`, one or more `accept` regular expressions,
  and an optional recorded `output`.
- A command that is safe to teach and unambiguous to validate.

Test it end to end in the browser. Type both the correct command and an
incorrect one. Check the hint, restart, completion and XP reward.

## Add a quiz question

Add the question to `docs/assets/data/quiz.json` with:

- Four options and exactly one correct `answer` index.
- An explanation that says **why** the right answer is right and why the
  common wrong answer is wrong.
- A `file` pointing to the artifact a reader should open next.
- A topic, concept and difficulty that already exist in the dataset.

Avoid trivia. Prefer questions that test a decision a practitioner makes.

## Style

- YAML: two-space indentation, no tabs, quote values only when needed.
- Shell: `#!/usr/bin/env bash` and `set -euo pipefail` for scripts that change
  state.
- Puppet: one resource per logical change, explicit owners and modes.
- JavaScript: plain ES modules, no build step, no external runtime
  dependencies.
- HTML/CSS: semantic elements, visible focus states, keyboard operable, no
  external fonts or trackers.
- Images and GIFs: optimise before committing. Screenshots at 1440×900, GIFs
  at 800 px wide and under 3 MB each.

## Pull request checklist

- [ ] The change is focused and described in the PR template.
- [ ] `node tools/build-site-data.mjs` has been run.
- [ ] `node tools/validate-site.mjs` passes.
- [ ] The affected page works on desktop and at 390 px width.
- [ ] Keyboard-only navigation still works.
- [ ] No secrets, personal data or tracking were added.
- [ ] Documentation or README was updated if behaviour changed.

## Review and release

Maintainers review for accuracy, safety and learner clarity. Releases are
tagged with semantic versions. A tag builds the container image and publishes
the release with a documentation archive and checksums.

Questions? Open a discussion or an issue. Be kind; the project follows the
[Code of Conduct](CODE_OF_CONDUCT.md).
