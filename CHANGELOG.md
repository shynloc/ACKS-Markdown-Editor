# Changelog

All notable changes to ACKS Markdown Editor are documented here.

## [1.2.0] - 2026-09-22

### Improved

- Moved **View all 43 themes** directly below the three quick theme cards.
- Added browser-local recent themes and theme favourites with dedicated filters.
- Restored the previous mode, output kind and scroll position when theme editing is cancelled.
- Restyled Source as a clear monospace code editor with character and image counts.
- Changed Import to open its explanation first instead of immediately opening the system file picker.
- Grouped the More menu into Version, Import, Export and Example sections and unified article/backup terminology.
- Added explicit unsaved, saving and saved button states; Save is subdued and disabled when no changes remain.
- Added mobile long-title treatment for writing and rendered themes.
- Added a visible, announced loading state while WeChat output is generated.
- Reduced empty space for short rendered articles and simplified theme-card sample content.

### Accessibility

- Exposed work modes, output kinds and style categories as keyboard-operable tablists.
- Exposed theme and recipe choices as radio groups.
- Added Left/Right/Home/End keyboard navigation for segmented tabs.
- Disabled the text-colour picker until custom colour is enabled and corrected the no-selection apply label.

### Verification

- Expanded the audit-remediation suite to ten assertions and the complete Node suite to 88 assertions.
- Rechecked theme entry placement, cancel restoration, Source styling, explicit import entry, grouped menus, save-state transitions, theme favourites, long titles and runtime logs in a real browser.

## [1.1.1] - 2026-09-22

### Fixed

- Removed the closed mobile article cabinet from the accessibility tree and keyboard order with `inert` and `aria-hidden`.
- Added focus entry, focus return, focus containment, Escape handling and a visible mobile cabinet close button.
- Reserved a real mobile footer area for the mode dock and hid the mode dock while editing a block, preventing content and toolbar overlap.
- Increased high-frequency mobile targets to at least 44 × 44 px and separated download from destructive delete actions.
- Added a 1000–1180 px header breakpoint so save state no longer wraps and primary actions remain visible.
- Hid DOCX-only preservation controls until a DOCX file is selected.

### Changed

- Import now defaults to **Import as a new article**, keeping the active article in the local cabinet.
- Replace and append remain available and continue to preserve a pre-import version.
- Added a tested destination helper that remaps colliding image resources during append imports.

### Verification

- Added five import-destination assertions, bringing the Node suite to 83 assertions across eight suites.
- Verified 320 px, 390 px and 430 px mobile layouts plus 1000 px, 1064 px, 1180 px and 1440 px desktop breakpoints.
- Verified closed-drawer AX isolation, keyboard order, Escape focus return, 44 px targets and a real Markdown import-to-new-article flow.

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
[1.1.1]: https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.1.1
[1.2.0]: https://github.com/shynloc/ACKS-Markdown-Editor/releases/tag/v1.2.0
