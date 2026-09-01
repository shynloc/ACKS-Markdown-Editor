# ACKS Markdown Editor v1.1.0

This release turns the editor from a single persistent draft into a real local
article workspace. Users can start a blank article immediately, save explicitly,
and return to multiple articles stored in the same browser.

## Local article cabinet

- **New** creates an empty article without deleting or replacing the current one.
- **Save** explicitly writes the active article to browser storage; automatic save
  remains enabled.
- The expandable article cabinet lists every local article with its title,
  modification time and approximate storage size.
- Articles can be opened, backed up individually or deleted after a clear warning.
- The active article and its identity survive page reloads.

## Storage and safety

- Multi-document contents and image resources use IndexedDB instead of trying to
  fit an entire article library into `localStorage`.
- The active draft still uses Web Locks and revision comparison to prevent an old
  tab from silently overwriting a newer one.
- Existing v1.0 drafts migrate into the article cabinet automatically.
- A persistent warning explains that articles are stored only in the current
  browser and can be lost when browser/site data is cleared, in private browsing,
  or after switching devices or browsers.
- **Download current article** exports Markdown, images and layout settings as a
  complete `.acks.json` backup.
- Manual Save requests durable browser storage where the browser supports it, but
  the interface continues to recommend downloadable backups.

## Responsive interface

- Desktop keeps the article cabinet and current outline together in the left rail.
- Mobile opens the same cabinet as a drawer with a dismissible backdrop.
- New and Save remain directly available as labelled controls on desktop and
  accessible icon controls on mobile.

## Verification

- 78 Node assertions pass across seven suites.
- New, Save, article switching and reload persistence passed in-browser acceptance.
- The 390 × 844 mobile view has no horizontal overflow and keeps the storage
  warning visible inside the article drawer.
- `npm audit` reports zero known vulnerabilities.

Full changes: https://github.com/shynloc/ACKS-Markdown-Editor/blob/v1.1.0/CHANGELOG.md
