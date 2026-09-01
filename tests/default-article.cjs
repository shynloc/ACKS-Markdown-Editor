const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.join(__dirname, "..");
const context = vm.createContext({
  atob,
  btoa,
  TextEncoder,
  TextDecoder,
  console,
});

for (const filename of [
  "vendor/marked.js",
  "vendor/fflate.js",
  "src/editor-model.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context);
}

const compiled = fs.readFileSync(
  path.join(root, "src/app.compiled.js"),
  "utf8",
);
const bundleStart = compiled.indexOf("const DEFAULT_SOURCE=");
const bundleEnd = compiled.indexOf("  const MINI_SOURCE", bundleStart);
assert.ok(
  bundleStart >= 0 && bundleEnd > bundleStart,
  "default bundle is embedded",
);
vm.runInContext(
  `${compiled.slice(bundleStart, bundleEnd)}globalThis.DEFAULT_BUNDLE={source:DEFAULT_SOURCE,assets:DEFAULT_ASSETS};`,
  context,
);

const sourceFile = fs.readFileSync(
  path.join(root, "src/default-article.md"),
  "utf8",
);
const bundled = context.DEFAULT_BUNDLE;
assert.equal(
  bundled.source,
  sourceFile,
  "built source matches maintained article",
);
assert.deepEqual(Object.keys(bundled.assets).sort(), [
  "img-cover",
  "img-links",
  "img-workflow",
]);

for (const [id, asset] of Object.entries(bundled.assets)) {
  assert.match(asset.mime, /^image\/(?:jpeg|webp)$/);
  assert.ok(asset.data.startsWith(`data:${asset.mime};base64,`));
  assert.ok(asset.data.length > 10_000, `${id} contains image bytes`);
}

for (const reference of [
  "asset:img-cover",
  "asset:img-workflow",
  "asset:img-links",
]) {
  assert.ok(sourceFile.includes(reference), `${reference} is referenced`);
}

const rendered = context.marked.parse(sourceFile);
for (const semanticElement of [
  "<h1>",
  "<h2>",
  "<blockquote>",
  "<table>",
  "<pre><code",
  "<ul>",
  "<ol>",
  "<mark>",
  "<u>",
]) {
  assert.ok(
    rendered.includes(semanticElement),
    `${semanticElement} is demonstrated`,
  );
}
assert.ok(rendered.includes('type="checkbox"'), "task list is demonstrated");
assert.ok(rendered.includes("data-md-color"), "custom colour is demonstrated");
assert.ok(
  rendered.includes("data-md-decoration"),
  "custom decoration is demonstrated",
);

const parser = new context.marked.Marked();
const packaged = context.EDITOR_MODEL.packageDocument(
  bundled,
  parser,
  context.fflate,
);
const roundTrip = context.EDITOR_MODEL.unpackDocument(
  packaged,
  parser,
  context.fflate,
);
const withoutAssetIds = (source) =>
  source.replace(/asset:img-[a-z0-9-]+/g, "asset:IMAGE");
assert.equal(
  withoutAssetIds(roundTrip.source),
  withoutAssetIds(bundled.source),
);
assert.equal(Object.keys(roundTrip.assets).length, 3);
context.EDITOR_MODEL.assertResources(
  roundTrip.source,
  roundTrip.assets,
  parser,
);
assert.deepEqual(
  Object.values(roundTrip.assets)
    .map((asset) => asset.data)
    .sort(),
  Object.values(bundled.assets)
    .map((asset) => asset.data)
    .sort(),
);

console.log(
  JSON.stringify(
    {
      passed: 12,
      articleCharacters: sourceFile.length,
      assets: Object.keys(bundled.assets),
      packageBytes: packaged.length,
    },
    null,
    2,
  ),
);
