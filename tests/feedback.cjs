const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const root = path.join(__dirname, ".."),
  read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const c = vm.createContext({ atob, btoa, TextEncoder, TextDecoder, console });
for (const file of [
  "vendor/marked.js",
  "vendor/fflate.js",
  "src/editor-model.js",
])
  vm.runInContext(read(file), c);
const M = c.EDITOR_MODEL,
  parser = new c.marked.Marked(),
  zip = c.fflate;
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
const results = [];
function test(name, fn) {
  fn();
  results.push({ name, result: "passed" });
}
test("inline pictures migrate to short, deduplicated references", () => {
  const doc = M.normalizeAssets(`![A](${pixel})\n\n![B](${pixel})`, {}, parser);
  assert.equal(Object.keys(doc.assets).length, 1);
  assert.equal(doc.source, "![A](asset:img-001)\n\n![B](asset:img-001)");
  assert.equal(doc.assets["img-001"].data, pixel);
});
test("code samples containing image syntax remain literal", () => {
  const code =
    "```md\n![A](" +
    pixel +
    ")\n```\n\n`![A](" +
    pixel +
    ")`\n\n![A](" +
    pixel +
    ")";
  const doc = M.normalizeAssets(code, {}, parser);
  assert.ok(doc.source.startsWith("```md\n![A](" + pixel + ")\n```"));
  assert.ok(doc.source.includes("`![A](" + pixel + ")`"));
  assert.ok(doc.source.endsWith("![A](asset:img-001)"));
});
test("reference-style Markdown images migrate without losing definitions", () => {
  const doc = M.normalizeAssets(
    "![A][photo]\n\n[photo]: " + pixel + "\n",
    {},
    parser,
  );
  assert.ok(doc.source.includes("[photo]: asset:img-001"));
  assert.equal(Object.keys(doc.assets).length, 1);
});
test("quotation and list images retain their structures", () => {
  const input = "> ![A](" + pixel + ")\n\n- ![B](" + pixel + ")\n";
  const doc = M.normalizeAssets(input, {}, parser);
  assert.equal(doc.source, "> ![A](asset:img-001)\n\n- ![B](asset:img-001)\n");
});
test("ZIP contains relative Markdown and unchanged image bytes", () => {
  const doc = M.normalizeAssets("![A](" + pixel + ")", {}, parser);
  const packed = M.packageDocument(
    { ...doc, version: 3, themeId: "song-ink" },
    parser,
    zip,
  );
  const files = zip.unzipSync(packed);
  assert.equal(zip.strFromU8(files["article.md"]), "![A](images/img-001.png)");
  assert.equal(
    Buffer.from(files["images/img-001.png"]).toString("base64"),
    pixel.split(",")[1],
  );
  const restored = M.unpackDocument(packed, parser, zip);
  assert.equal(restored.source, doc.source);
  assert.equal(restored.assets["img-001"].data, pixel);
  assert.equal(restored.themeId, "song-ink");
});
test("missing resource prevents an incomplete export", () => {
  assert.throws(
    () =>
      M.packageDocument(
        { source: "![A](asset:img-404)", assets: {} },
        parser,
        zip,
      ),
    /资源缺失/,
  );
});
test("ZIP path traversal is rejected", () => {
  const bad = zip.zipSync({ "../article.md": zip.strToU8("x") });
  assert.throws(() => M.unpackDocument(bad, parser, zip), /无效路径/);
});
test("ordered list preserves selection and line boundaries", () => {
  const edit = M.formatEdit("前文\n苹果\n香蕉\n后文", 3, 8, "ordered");
  assert.equal(edit.value, "前文\n1. 苹果\n2. 香蕉\n后文");
});
test("headings replace existing level rather than nesting markers", () => {
  assert.equal(
    M.formatEdit("### 标题", 4, 6, "heading", { level: 2 }).value,
    "## 标题",
  );
});
test("inline wrapping leaves trailing newlines outside delimiters", () => {
  assert.equal(M.formatEdit("文字\n", 0, 3, "bold").value, "**文字**\n");
});
test("code fences survive selected backticks", () => {
  const edit = M.formatEdit("```", 0, 3, "code-block", { language: "js" });
  assert.ok(edit.value.includes("````js\n```\n````"));
});
test("table cell pipes remain escaped", () => {
  const edit = M.formatEdit("", 0, 0, "table", {
    cells: [
      ["A", "B"],
      ["x|y", "z"],
    ],
  });
  assert.ok(edit.value.includes("x\\|y"));
});
test("advanced text attributes use an explicit allowlist", () => {
  assert.equal(
    M.inlineHTML('<span data-md-color="#b9480d" onclick="alert(1)">'),
    null,
  );
  assert.equal(M.inlineHTML('<span style="background:url(x)">'), null);
  assert.equal(M.inlineHTML('<span data-md-size="100000">'), "<span>");
  assert.equal(
    M.inlineHTML('<span data-md-color="#b9480d" data-md-font="serif">'),
    '<span data-md-color="#b9480d" data-md-font="serif">',
  );
});
test("portable exports omit images removed from the current article", () => {
  const doc = M.normalizeAssets("![A](" + pixel + ")", {}, parser);
  const exported = M.portableDocument({ ...doc, source: "仅正文" }, parser);
  assert.equal(Object.keys(exported.assets).length, 0);
  assert.equal(Object.keys(doc.assets).length, 1);
});
console.log(JSON.stringify({ passed: results.length, results }, null, 2));
