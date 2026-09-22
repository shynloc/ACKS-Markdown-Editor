# ACKS Markdown Editor v1.2.0

This release completes the medium- and low-priority improvements from the
2026-09-22 UX audit. It tightens theme discovery, editing context, source editing,
save feedback, terminology and assistive-technology semantics.

## Themes and layout

- **View all 43 themes** now sits directly under the quick theme cards.
- Recent themes and favourites have dedicated filters.
- A selected theme can be favourited or unfavourited from the layout footer.
- Cancelling theme editing returns to the previous work mode, output kind and
  scroll position.
- Long mixed Chinese/English titles use a more compact mobile treatment.
- Short rendered articles no longer force an unnecessarily tall paper surface.
- Theme cards use a simpler sample so colour, title and ornament differences are
  easier to compare.

## Editing and navigation

- Source is presented as a bordered monospace editor with live character and
  local-image counts and no native resize handle.
- Import opens its privacy and format explanation first; the system file chooser
  opens only after the user selects **Choose file**.
- The More menu is grouped into Version, Import, Export and Example sections.
- Article, version and complete ACKS backup terminology is consistent across the
  primary workflow.
- Save visibly moves through unsaved, saving and saved states and is disabled
  when the current article is already saved.
- Empty articles expose one primary writing entry rather than a duplicate append
  action.

## Accessibility

- Work modes, output kinds and layout categories use tablist/tab semantics with
  Left/Right/Home/End keyboard navigation.
- Theme and recipe choices use radio-group semantics.
- WeChat output announces a loading state until its iframe is ready.
- The colour input is disabled until custom colour is enabled.
- With no text selection, the style action says **Apply at cursor**.

## Verification

- 88 Node assertions pass across eight suites.
- Browser acceptance covered theme placement and favourites, cancel restoration,
  Source styling, import entry, menu grouping, save-state transitions, long-title
  behaviour and runtime logs.
- `npm audit` reports zero known vulnerabilities.

Full changes: https://github.com/shynloc/ACKS-Markdown-Editor/blob/v1.2.0/CHANGELOG.md
