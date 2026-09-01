# Changelog

All notable changes to ACKS Markdown Editor are documented here.

## [1.1.0] - 2026-09-01

### Added

- Added visible **New** and **Save** actions for starting a blank article and explicitly saving it.
- Added an expandable local article cabinet with article switching, modification time, size, backup and protected deletion.
- Added a persistent local-storage warning and a one-click complete article backup beside the article list.
- Added an empty-document writing state with a focused Markdown editor instead of forcing users to delete the introduction template.

### Changed

- Added IndexedDB-backed multi-document persistence while retaining the existing Web Locks conflict protection for the active draft.
- Migrated the current browser draft into the article cabinet automatically on first use.
- Scoped version history to the active article while keeping legacy and conflict-recovery snapshots accessible.
- Added a mobile article-cabinet drawer and accessible icon labels for New and Save.
- Manual Save now requests persistent browser storage where supported, without claiming that local data is server-backed.

### Reliability

- Added document-library validation tests for titles, previews, metadata, deep cloning, resource sizing and identifier safety.
- Verified new/save/switch/reload persistence in a real browser and confirmed the mobile layout has no horizontal overflow.

## [1.0.1] - 2026-09-01

### Added

- Replaced the minimal sample with a publishable project-introduction article.
- Added an original cover, architecture diagram and scannable experience/source card.
- Bundled all article images into the local document model for complete JSON and ZIP exports.

### Changed

- New documents now open with the Gold Classic theme and the introduction article.
- Renamed the sample action to **Load introduction article** while preserving the current draft first.
- Expanded regression coverage for the default article, semantic Markdown and image round trips.

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
[1.0.1]: https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.0.1
[1.1.0]: https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.1.0
