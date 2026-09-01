# Production deployment

This guide deploys ACKS Markdown Editor as an immutable Docker image behind a
host-managed Caddy reverse proxy.

## Preconditions

- The release tag and source commit are published and verified.
- Docker Engine and Docker Compose are installed.
- Caddy owns public ports 80 and 443.
- The DNS record points to the intended origin and the CDN SSL mode validates the origin certificate.
- `127.0.0.1:5703` is free.
- The previous release path, image tag and Caddy configuration are recorded for rollback.

## Build an immutable image

```bash
VERSION=1.1.0
VCS_REF=$(git rev-parse HEAD)
IMAGE_TAG="acks-markdown-editor:${VERSION}-${VCS_REF:0:7}"

cat > deployment.env <<EOF
VERSION=$VERSION
VCS_REF=$VCS_REF
IMAGE_TAG=$IMAGE_TAG
APP_PORT=5703
EOF

docker compose \
  --project-name acks-markdown-editor \
  --env-file deployment.env \
  -f deploy/compose.production.yml \
  build --pull
```

## Start and validate privately

```bash
docker compose \
  --project-name acks-markdown-editor \
  --env-file deployment.env \
  -f deploy/compose.production.yml \
  up -d

curl --fail --silent --show-error http://127.0.0.1:5703/healthz
curl --fail --silent --show-error http://127.0.0.1:5703/ > /dev/null
docker inspect --format '{{json .State.Health}}' acks-markdown-editor
```

Confirm that the port is bound only to loopback and that the container has a
read-only root filesystem, no capabilities and `no-new-privileges`.

## Add Caddy

1. Copy `deploy/mdeditor.Caddyfile` to `/etc/caddy/mdeditor.Caddyfile`.
2. Back up `/etc/caddy/Caddyfile`.
3. Add `import /etc/caddy/mdeditor.Caddyfile` to the main Caddyfile.
4. Run `caddy validate --config /etc/caddy/Caddyfile`.
5. Reload only after validation succeeds.

```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

## Public acceptance

Validate independently through the public hostname:

```bash
curl --fail --silent --show-error https://mdeditor.acks.com.cn/healthz
curl --fail --silent --show-error https://mdeditor.acks.com.cn/ > /dev/null
```

Also verify:

- valid origin and CDN TLS;
- expected security and cache headers;
- writing, source, render and theme flows;
- local save plus reload;
- Markdown, TXT and DOCX import preview;
- complete-document and image-package round trips;
- WeChat copy/paste in the actual WeChat editor;
- iPhone Safari input, keyboard, file selection and VoiceOver basics;
- no new errors in Caddy or container logs.

## Rollback

1. Restore the previous Caddy configuration and validate it.
2. Restore the previous Compose release directory and immutable image tag.
3. Run Compose `up -d` for the previous release.
4. Reload Caddy only after private health checks pass.
5. Re-run public HTTPS and critical workflow checks.

Do not delete previous images or release directories until the new release has
passed its observation period.
