# ACKS Markdown Editor v1.0.1

This release turns the built-in sample into a complete, publishable introduction
to ACKS Markdown Editor. It is both a real project story and a practical showcase
of the editor's Markdown, theme, image and publishing capabilities.

## New built-in article

- A long-form Chinese introduction explains the project's origin, architecture,
  technology stack, deployment, usage, privacy model and support path.
- The article demonstrates headings, tables, quotes, ordered and task lists,
  fenced code, links, highlights, underlines, strikethrough, custom colour and
  decorative text extensions.
- New users see the article with the Gold Classic theme on first launch.
- Existing users can choose **Load introduction article**; the editor saves the
  current draft to history before replacing it.

## Original visual assets

- A 1672 × 941 ACKS Markdown Editor cover created for the WeChat article.
- A 1200 × 800 architecture and publishing-flow diagram.
- A 1200 × 630 address card with visible experience/GitHub URLs and QR codes.
- All three images live in the local asset model and survive complete JSON and
  Markdown/image ZIP round trips.

## Reliability and maintenance

- Added a dedicated default-article regression suite for semantic Markdown,
  embedded assets and portable-document packaging.
- Upgraded PostCSS to 8.5.26 after a development-dependency security advisory;
  `npm audit` reports zero known vulnerabilities.
- The complete Node test suite, desktop browser acceptance, mobile 390 × 844
  layout check and WeChat image-placeholder output all pass.

## Publishing note

WeChat still removes local image bytes from pasted HTML. The article's three
images appear as explicit placeholders in WeChat output and should be uploaded
again in the official-account editor before publishing.

Full changes: https://github.com/shynloc/ACKS-Markdown-Editor/blob/v1.0.1/CHANGELOG.md
