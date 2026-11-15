# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [2.0.1] — 2026-11-16

### Fixed

- The embedded demo hides the nested page header and duplicate full-screen
  link, scrolls into view on launch, and the sticky header no longer lets
  page content ghost through.
- Bumped the offline cache so returning visitors receive the corrected
  styles and demo behaviour immediately.

## [2.0.0] — 2026-11-16

The release that turns the repository from a collection of scripts into a
complete, browser-native learning product.

### Added

- **Live site** at <https://m0-ar.github.io/DevOpsKodeKloud/> with a custom
  home page, artifact explorer, guided labs, quiz, 3D concept atlas, game and
  command cheat sheet.
- **Artifact explorer** for all 67 files: full-text search, category and level
  filters, repository tree, syntax highlighting, copy/download, source links
  and related quiz links.
- **12 guided labs** with a command validator, recorded outputs, hints,
  restart, catalogue and 50 XP completion reward.
- **39 explained questions** with spaced repetition, topic filters, a local
  profile, mistakes review and end-of-session report.
- **3D concept atlas** generated from the real manifest: 73 nodes, orbit
  controls, search focus, accessible node list and a reduced-motion fallback.
- **Cluster Runner**: a 3D lane game with concept orbs, failing pods,
  checkpoint questions, voice narration and a neural map that grows as you
  learn.
- **Command cheat sheet** with 69 copy-ready commands across Kubernetes,
  Ansible, Puppet and security.
- **Local-first progress** shared by labs, quiz and game using browser
  storage. No account, no network calls, no tracking.
- **Documentation set**: this changelog, contributing guide, code of conduct,
  security policy, issue and pull request templates, and a beginner guide.
- **Delivery pipeline**: GitHub Pages from `docs/`, validated data builds,
  tagged GitHub Releases with a documentation archive and checksums, and a
  public multi-arch container image on GHCR.
- **Media**: product screenshots, animated walkthroughs and a 42-second demo
  video, all stored in the repository.

### Changed

- README rewritten as a front door for beginners, practitioners and
  reviewers, with an abstract, learning paths, artifact inventory and an
  honest modernization audit.
- Repository metadata, live URL, topics and social preview configured.
- Laboratory XP, quiz sessions and game state now share one versioned
  progress model (`dfm.progress.v1`).

### Fixed

- Reserved `hidden` attributes are now enforced by the design system, so quiz
  controls and game overlays appear only when they are valid.
- Cheat sheet rendering no longer stops at a missing visible-count node;
  filtering, empty state and counts work as intended.
- Atlas and game canvases respect the viewport, pause off-screen and honour
  `prefers-reduced-motion`.
- All internal page, asset and data links resolve; the site has no broken
  local references.

### Security

- Added a strict Content Security Policy to every page and the container
  image, plus `nosniff`, referrer and permissions headers.
- Documented that labs are simulations: no cluster, cloud account or
  credential is contacted.
- Added a private vulnerability reporting process in `SECURITY.md`.

## [1.0.0] — 2024-01-01

Initial public collection of Kubernetes, Ansible, Puppet, CKA and CKS practice
files with a text-only README.
