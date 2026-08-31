# Changelog

All notable changes to ACKS Markdown Editor are documented here.

## [1.0.0] - 2026-09-01

### Added

- Local-first Markdown writing, source and rendered article modes.
- 43 built-in article themes, 9 layout recipes and 32 visual signature families.
- Markdown, TXT, DOCX and ACKS document import with a review-before-apply flow.
- Optional preservation of explicit Word text colours, sizes and font categories.
- WeChat-ready HTML output and Markdown/image ZIP export.
- Local document history, conflict backups and protected multi-tab saving.
- Responsive desktop and mobile interfaces.

### Security and reliability

- Sanitised Markdown and imported DOCX HTML through strict allowlists.
- Rejected macro-enabled, encrypted/corrupt or entity-bearing DOCX inputs.
- Preserved images embedded in tables, quotes and nested structures during ZIP round trips.
- Added cross-tab revision checks, immediate-state undo and resource completeness checks.
- Added 59 Node regression tests and browser conversion assertions.

[1.0.0]: https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.0.0
