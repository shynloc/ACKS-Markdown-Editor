# ACKS Markdown Editor v1.0.0

The first stable release of ACKS Markdown Editor: a local-first Markdown writing
and article-formatting workspace with DOCX import and WeChat-ready output.

## Highlights

- Focused writing, Markdown source and rendered article modes.
- 43 article themes, 9 layout recipes and 32 distinct visual signatures.
- Markdown, TXT, DOCX and ACKS document import with preview before apply.
- Optional preservation of explicit Word colours, sizes and font categories.
- Complete-document JSON, Markdown/image ZIP and rich HTML export.
- Protected cross-tab saving, conflict recovery copies and document history.
- Responsive desktop/mobile interface and improved keyboard/accessibility semantics.

## Reliability and security

- Fixed image loss from tables, quotes and nested structures during ZIP export.
- Fixed document-level undo skipping the immediately previous state.
- Prevented stale tabs from silently overwriting newer documents.
- Rejected macro-enabled, encrypted/corrupt and entity-bearing DOCX inputs.
- Sanitised Markdown and DOCX conversion output through strict allowlists.
- Added 59 Node regression tests plus browser conversion acceptance checks.

## Deployment

A hardened Docker/Nginx deployment is included with loopback-only port binding,
read-only filesystem, dropped capabilities, `no-new-privileges`, health checks
and Caddy configuration.

## Known boundaries

- DOCX import preserves semantic content rather than Word's pixel-perfect page layout.
- Exact fonts, headers/footers, floating objects, complex equations and charts may be simplified.
- Direct `file://` use is not part of the production acceptance path.
- Back up the current document before importing or changing browser/origin.

Full changes: https://github.com/shynloc/ACKS-Markdown-Editor/blob/v1.0.0/CHANGELOG.md
