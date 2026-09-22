FROM nginxinc/nginx-unprivileged:1.28.0-alpine@sha256:c97ff0bf7cbae369953c6da1232ec14ad9f971d66360c5698db0856a4cd657a0

ARG VERSION=1.1.1
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="ACKS Markdown Editor" \
      org.opencontainers.image.description="Local-first Markdown editor and WeChat article formatter" \
      org.opencontainers.image.version="$VERSION" \
      org.opencontainers.image.revision="$VCS_REF" \
      org.opencontainers.image.source="https://github.com/shynloc/ACKS-Markdown-Editor" \
      org.opencontainers.image.licenses="MIT"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/security-headers.conf
COPY md-editor.html /usr/share/nginx/html/index.html

USER 101
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O - http://127.0.0.1:8080/healthz | grep -q '"status":"ok"' || exit 1
