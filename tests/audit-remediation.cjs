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
  URL,
  console,
});
for (const filename of [
  "vendor/marked.js",
  "src/editor-model.js",
  "src/document-import.js",
])
  vm.runInContext(fs.readFileSync(path.join(root, filename), "utf8"), context);

const parser = new context.marked.Marked();
const model = context.EDITOR_MODEL;
const importer = context.DOCUMENT_IMPORT;
const pixelA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aoxsAAAAASUVORK5CYII=";
const pixelB =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const results = [];

function test(name, fn) {
  fn();
  results.push({ name, result: "passed" });
}

test("new import keeps the incoming document separate", () => {
  const current = { source: "# 当前文章", assets: {}, themeId: "gold" };
  const incoming = { source: "# 新文章", assets: {}, themeId: "blue" };
  assert.equal(
    importer.destination(current, incoming, "new", parser),
    incoming,
  );
  assert.equal(current.source, "# 当前文章");
});

test("replace import returns the reviewed incoming document", () => {
  const incoming = { source: "# 替换内容", assets: {} };
  assert.equal(
    importer.destination(
      { source: "old", assets: {} },
      incoming,
      "replace",
      parser,
    ),
    incoming,
  );
});

test("append import remaps colliding image IDs without mutating either input", () => {
  const current = {
    source: "# 当前文章\n\n![A](asset:img-001)",
    assets: { "img-001": { data: pixelA, mime: "image/png", name: "A" } },
    themeId: "gold",
  };
  const incoming = {
    source: "# 导入内容\n\n![B](asset:img-001)",
    assets: { "img-001": { data: pixelB, mime: "image/png", name: "B" } },
    themeId: "blue",
  };
  const merged = importer.destination(current, incoming, "append", parser);
  assert.equal(merged.themeId, "gold");
  assert.ok(merged.source.includes("asset:img-001"));
  assert.ok(merged.source.includes("asset:img-002"));
  assert.deepEqual(Object.keys(merged.assets).sort(), ["img-001", "img-002"]);
  assert.equal(Object.keys(current.assets).length, 1);
  assert.equal(Object.keys(incoming.assets).length, 1);
  model.assertResources(merged.source, merged.assets, parser);
});

test("append import fails closed when an image resource is missing", () => {
  assert.throws(
    () =>
      importer.destination(
        { source: "# 当前", assets: {} },
        { source: "![缺图](asset:img-404)", assets: {} },
        "append",
        parser,
      ),
    /资源不完整/,
  );
});

test("the import dialog defaults to creating a new article", () => {
  const html = fs.readFileSync(
    path.join(root, "src/import-dialog.html"),
    "utf8",
  );
  const select = html.match(
    /<select id="import-destination">([\s\S]*?)<\/select>/,
  )?.[1];
  assert.ok(select);
  const values = [...select.matchAll(/<option value="([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(values, ["new", "replace", "append"]);
});

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
