# ACKS Markdown Editor

[![Release](https://img.shields.io/github/v/release/shynloc/ACKS-Markdown-Editor)](https://github.com/shynloc/ACKS-Markdown-Editor/releases)
[![License](https://img.shields.io/badge/license-MIT-black.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](Dockerfile)
[![Local first](https://img.shields.io/badge/data-local--first-F04B00)](#data-and-privacy)

A local-first Markdown editor and article formatter designed for focused writing,
rich theme rendering and WeChat-ready HTML output.

**Live:** <https://mdeditor.acks.com.cn/>

## Highlights

- **Three working modes:** focused writing, full Markdown source and rendered article.
- **43 article themes:** 19 ACKS themes plus 24 light/dark Milestone-inspired editions.
- **Distinct visual language:** 32 theme-signature families instead of repeated ornaments.
- **Document import:** Markdown, TXT, DOCX and ACKS JSON/ZIP with preview before apply.
- **DOCX preservation:** headings, paragraphs, emphasis, lists, links, tables and common images;
  optional preservation of explicit text colour, size and font category.
- **WeChat workflow:** rich HTML copy/export, image placeholders and theme-aware output.
- **Portable images:** short `asset:img-*` references with complete JSON and ZIP round trips.
- **Conflict protection:** cross-tab revision checks, recovery copies and document history.
- **Responsive interface:** desktop, tablet and mobile layouts with keyboard-accessible controls.
- **Single-file release:** the production app is built into `md-editor.html` with no runtime CDN.
- **Publishable introduction:** a built-in long-form article demonstrates semantic Markdown,
  extended text styles, three local images and the complete publishing workflow.

## Technology stack

| Layer         | Technology                                                |
| ------------- | --------------------------------------------------------- |
| Interface     | HTML5, CSS, vanilla JavaScript                            |
| Markdown      | Marked 18                                                 |
| Sanitisation  | DOMPurify 3                                               |
| DOCX import   | Mammoth 1.12                                              |
| Archives      | fflate 0.8                                                |
| Icons         | Phosphor Icons                                            |
| Build         | Python 3                                                  |
| Tests         | Node.js built-in assertions and browser acceptance checks |
| Container     | Nginx Unprivileged, Docker Compose                        |
| Reverse proxy | Caddy                                                     |

## Quick start

The editor relies on an origin for local storage and safe multi-tab locking. Use
localhost or HTTPS instead of opening the file directly when possible.

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8080/md-editor.html>.

For the production-shaped container:

```bash
VCS_REF=$(git rev-parse HEAD)
IMAGE_TAG="acks-markdown-editor:1.0.1-${VCS_REF:0:7}"

docker build \
  --build-arg VERSION=1.0.1 \
  --build-arg VCS_REF="$VCS_REF" \
  -t "$IMAGE_TAG" .

docker run --rm \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m \
  --tmpfs /var/cache/nginx:rw,noexec,nosuid,nodev,size=16m \
  --tmpfs /var/run:rw,noexec,nosuid,nodev,size=4m \
  -p 127.0.0.1:5703:8080 \
  "$IMAGE_TAG"
```

Check `http://127.0.0.1:5703/healthz` before adding a reverse proxy.

## Usage guide

### Write and format

1. Open **Write** and click a block to edit it.
2. Use the floating toolbar for common Markdown or open the full formatting panel.
3. Use **Source** when direct Markdown editing is faster.
4. Press `Cmd/Ctrl + S` to request an immediate local save.

### Apply an article theme

1. Open **Theme** from the top bar or bottom mode dock.
2. Preview the three quick themes or expand the complete library.
3. Filter by ACKS/Milestone and light/dark appearance.
4. Adjust body size, line spacing, paragraph indentation and decorative elements.
5. Select **Apply layout** to save the choice to the document.

### Import a document

Use the visible **Import** button or **More → Import Markdown / document**.

| Input              | Behaviour                                                             |
| ------------------ | --------------------------------------------------------------------- |
| `.md`, `.markdown` | Imported as Markdown                                                  |
| `.txt`             | Imported as literal text; UTF-8, UTF-16 and GBK/GB18030 are supported |
| `.docx`            | Converted locally, previewed, then applied or appended                |
| `.acks.json`       | Restores content, resources and layout metadata                       |
| ACKS `.zip`        | Restores Markdown, image files and layout metadata                    |

For DOCX, the editor preserves common semantic formatting and image bytes. Word
page layout, exact fonts, headers/footers, floating positions, complex equations,
charts and embedded objects may be simplified or omitted. Every known adjustment
is shown before import. Legacy `.doc`, macro-enabled, encrypted and corrupt DOCX
files are not imported.

### Export and publish

- **Copy to WeChat:** generates rich HTML plus plain text for the clipboard.
- **Download Markdown / image package:** emits Markdown or a ZIP with referenced images.
- **Download complete document:** emits the safest ACKS JSON backup.
- **Download WeChat HTML:** saves the generated rich HTML locally.

Always keep a complete-document backup before major imports, browser changes or
production publishing.

## Data and privacy

- Documents, themes, resources and history are stored in the browser's local storage.
- DOCX and text conversion happens in the browser; selected files are not uploaded.
- External images in an imported Markdown document are not loaded during import preview.
  They may contact their remote host after the document is accepted and rendered.
- The optional model connection sends only the theme description entered in the theme
  generator. Its API key remains in page memory and is not persisted.
- When another tab changes the document, automatic saving pauses and the current tab
  keeps a recovery copy instead of silently overwriting the newer document.
- If locking or storage is unavailable, the editor fails closed and asks for a backup.

## Development

Requirements: Python 3, Node.js 20+ and npm 10+.

```bash
npm install
npm test
```

`npm test` rebuilds the single-file app and runs all six Node test suites.
The maintained source is under `src/`; `md-editor.html` is generated by:

```bash
python3 build.py
```

Do not edit generated `src/app.compiled.js` or `src/theme-catalog.compiled.js`.

The Milestone adapter generator is optional and requires an authorised source checkout:

```bash
node scripts/generate-milestone-adapter.cjs /path/to/Milestone
```

## Deployment guide

The included production Compose file binds Nginx only to `127.0.0.1:5703` and
runs with a read-only filesystem, all Linux capabilities dropped and
`no-new-privileges` enabled.

```bash
cp deploy/deployment.env.example deployment.env
# Fill VERSION, VCS_REF and IMAGE_TAG.

docker compose \
  --project-name acks-markdown-editor \
  --env-file deployment.env \
  -f deploy/compose.production.yml \
  up -d --build
```

Validate the direct health endpoint before proxying it. A Caddy example for
`mdeditor.acks.com.cn` is provided at [`deploy/mdeditor.Caddyfile`](deploy/mdeditor.Caddyfile).
Run `caddy validate` before reloading Caddy and keep the application port private.

See [`deploy/DEPLOYMENT.md`](deploy/DEPLOYMENT.md) for the release, verification
and rollback sequence.

## Browser support

Use a current version of Safari, Chrome, Edge or Firefox. HTTPS and localhost are
recommended. Direct `file://` use is not part of the production acceptance path
because browser storage and Web Locks behaviour varies by browser.

## Reporting errors

Read [`SUPPORT.md`](SUPPORT.md), then open a
[bug report](https://github.com/shynloc/ACKS-Markdown-Editor/issues/new?template=bug_report.yml).

Include:

- release version;
- browser, operating system and open method;
- minimal reproduction steps;
- expected and actual results;
- a sanitised test document when import/export is involved.

Never post API keys, access tokens, private documents or personal data. Use GitHub
Private Vulnerability Reporting for security issues; see [`SECURITY.md`](SECURITY.md).

## Release

The current release is [`v1.0.1`](https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.0.1).
See [`CHANGELOG.md`](CHANGELOG.md) for details.

## License

[MIT](LICENSE) © 2026 ACKS.
