# syntax=docker/dockerfile:1
FROM nginx:1.30-alpine

LABEL org.opencontainers.image.title="DevOps Field Manual"
LABEL org.opencontainers.image.description="Interactive, open-source DevOps field manual with live explorer, labs, quiz, 3D atlas and game."
LABEL org.opencontainers.image.source="https://github.com/M0-AR/DevOpsKodeKloud"
LABEL org.opencontainers.image.url="https://m0-ar.github.io/DevOpsKodeKloud/"
LABEL org.opencontainers.image.licenses="MIT"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docs/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

STOPSIGNAL SIGQUIT
