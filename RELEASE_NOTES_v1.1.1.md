# ACKS Markdown Editor v1.1.1

This accessibility and workflow patch resolves the five highest-priority issues
from the 2026-09-22 UX audit.

## Mobile accessibility and layout

- The closed article cabinet is now `inert`, hidden from assistive technology,
  and absent from keyboard order.
- Opening the cabinet moves focus to a visible close button. Escape, the close
  button and the scrim all return focus to the cabinet trigger.
- Cabinet focus is contained while the drawer is open.
- High-frequency mobile targets are at least 44 × 44 px; article download and
  delete actions have more separation and delete uses a danger colour.
- The mobile workspace now reserves a real footer area for the mode dock.
- While editing a block or source, the mode dock hides and the formatting dock
  occupies the reserved footer alone, so neither dock covers article content.

## Safer imports

- **Import as a new article** is now the default destination.
- The imported article opens in the local cabinet while the previous article
  remains available.
- Replace and append remain explicit options.
- DOCX-specific style preservation is hidden until a DOCX file is selected.
- Append imports remap colliding image IDs and fail closed on missing resources.

## Responsive header

- A 1000–1180 px breakpoint moves the save status into the document strip and
  keeps every primary header action on one line.

## Verification

- 83 Node assertions pass across eight suites.
- Browser acceptance passed at mobile widths 320, 390 and 430 px and desktop
  widths 1000, 1064, 1180 and 1440 px.
- A real Markdown file was imported as a new article without replacing the
  existing article.
- `npm audit` reports zero known vulnerabilities.

Full changes: https://github.com/shynloc/ACKS-Markdown-Editor/blob/v1.1.1/CHANGELOG.md
