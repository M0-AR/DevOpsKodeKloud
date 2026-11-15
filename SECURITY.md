# Security policy

## Supported versions

Security fixes are applied to the latest release and the `master` branch.

| Version | Supported |
| --- | --- |
| 2.x | Yes |
| 1.x | No |

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting:

<https://github.com/M0-AR/DevOpsKodeKloud/security/advisories/new>

Include:

- What is affected (page, workflow, container image or artifact).
- Steps to reproduce or a proof of concept.
- The impact you believe it has.
- Any suggested fix, if you have one.

You can expect an acknowledgement within five business days. If the report is
valid, we will agree a disclosure timeline with you and credit you in the
advisory and changelog unless you prefer to stay anonymous.

## Scope

In scope:

- The static site under `docs/` and the GHCR container image.
- GitHub Actions workflows in `.github/workflows/`.
- Stored data and browser storage behaviour.
- Artifacts that could cause harm when copied into a real cluster.

Out of scope:

- The educational artifacts are **not production-ready by design**. Missing
  hardening, placeholder secrets, old image tags and intentionally broken YAML
  used for troubleshooting exercises are documented, not vulnerabilities.
- Vulnerabilities in third-party tools or vendors named in the content.
- Social engineering or physical attacks.
- Denial of service against GitHub Pages or GitHub itself.

## Safety model

- The labs are a **browser simulation**. No Kubernetes API, cloud account or
  remote host is contacted.
- Progress is stored in `localStorage` under `dfm.progress.v1`. It never leaves
  the browser and there is no account system.
- The site loads no external fonts, scripts, images or analytics.
- Every page sets a Content Security Policy; the container adds security
  headers at the edge.
- The demo embeds only same-origin pages in an iframe.

## If you deploy this yourself

- Do not apply the example manifests to a production cluster without review.
- Replace every placeholder secret; never reuse the sample values.
- Pin images by digest and use a supported Kubernetes release.
- Serve the container behind TLS and keep the base image updated.
- The MIT licence means you own the operational risk of your deployment.
