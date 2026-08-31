const fs = require("fs"),
  vm = require("vm"),
  assert = require("assert/strict"),
  path = require("path");
const root = path.join(__dirname, "..");
const c = vm.createContext({ atob, btoa, TextEncoder, TextDecoder, console });
for (const n of [
  "vendor/marked.js",
  "vendor/fflate.js",
  "src/editor-model.js",
  "src/document-store.js",
  "src/document-import.js",
])
  vm.runInContext(fs.readFileSync(path.join(root, n), "utf8"), c);
const M = c.EDITOR_MODEL,
  p = new c.marked.Marked(),
  z = c.fflate,
  results = [];
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aoxsAAAAASUVORK5CYII=";
const assets = { "img-001": { data: pixel, mime: "image/png", name: "A" } };
function test(name, fn) {
  fn();
  results.push({ name, result: "passed" });
}
for (const [name, source] of Object.entries({
  table: "| 图 |\n| --- |\n| ![A](asset:img-001) |\n",
  quote: "> 说明\n>\n> ![A](asset:img-001)\n",
  nested: "> - 介绍\n>\n>   ![A](asset:img-001)\n",
  references: "![图][pic]\n\n[pic]: asset:img-001\n",
  codeAndReal: "`![A](asset:img-001)`\n\n> ![A](asset:img-001)\n",
  tableEscaped: "| A | B |\n|---|---|\n| 甲 \\| 乙 | ![A](asset:img-001) |",
}))
  test("image ZIP preserves " + name, () => {
    const b = M.packageDocument({ source, assets }, p, z),
      back = M.unpackDocument(b, p, z);
    assert.equal(back.source, source);
    assert.equal(Object.keys(back.assets).length, 1);
    assert.equal(back.assets["img-001"].data, pixel);
  });
test("missing files abort import before document replacement", () => {
  assert.throws(
    () =>
      M.unpackDocument(
        z.zipSync({ "article.md": z.strToU8("![x](images/img-001.png)") }),
        p,
        z,
      ),
    /缺少资源/,
  );
  assert.throws(
    () => M.assertResources("![x](asset:img-404)", {}, p),
    /资源缺失/,
  );
});
test("data images in tables migrate while inline code stays literal", () => {
  const src = "| 图 |\n|---|\n| ![A](" + pixel + ") |\n\n`![A](" + pixel + ")`";
  const d = M.normalizeAssets(src, {}, p);
  assert.equal(Object.keys(d.assets).length, 1);
  assert.ok(d.source.includes("| ![A](asset:img-001) |"));
  assert.ok(d.source.includes("`![A](" + pixel + ")`"));
});
test("new style extensions remain narrowly bounded", () => {
  assert.equal(M.inlineHTML("<sup>"), "<sup>");
  assert.equal(M.inlineHTML('<strong onclick="x">'), null);
  assert.equal(
    M.inlineHTML('<span data-md-size="14.7">'),
    '<span data-md-size="14.7">',
  );
  assert.equal(M.inlineHTML('<span data-md-size="9999">'), "<span>");
});
test("TXT syntax stays literal and UTF16 BOM decodes", () => {
  assert.ok(
    c.DOCUMENT_IMPORT.escape("# **a** <u>x</u> &copy;").includes("&amp;copy;"),
  );
  const a = c.DOCUMENT_IMPORT.decode(new Uint8Array([255, 254, 65, 0, 45, 78]));
  assert.equal(a.text, "A中");
});
test("document undo keeps immediate prior snapshots", () => {
  const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8"),
    ctx = vm.createContext({
      checkpointSuppressed: false,
      state: { source: "A" },
      undoStack: [],
      redoStack: [],
      lastCheckpoint: "",
    });
  vm.runInContext(
    app.slice(
      app.indexOf("function checkpoint()"),
      app.indexOf('  window.addEventListener("storage"'),
    ) +
      'checkpoint();state.source="B";checkpoint();state.source="C";globalThis.previous=JSON.parse(undoStack.pop()).source',
    ctx,
  );
  assert.equal(ctx.previous, "B");
});
(async () => {
  const map = new Map(),
    storage = {
      get length() {
        return map.size;
      },
      getItem: (k) => map.get(k) || null,
      setItem: (k, v) => map.set(k, v),
    };
  let chain = Promise.resolve();
  const locks = {
    request: (k, o, fn) => {
      const task = chain.then(fn);
      chain = task.catch(() => {});
      return task;
    },
  };
  const events = [];
  const a = c.DOCUMENT_STORE.create({ storage, key: "doc", locks, id: "a" }),
    b = c.DOCUMENT_STORE.create({
      storage,
      key: "doc",
      locks,
      id: "b",
      notify: (x) => events.push(x),
    });
  assert.equal((await a.save({ source: "A" })).ok, true);
  assert.equal((await b.save({ source: "B" })).ok, false);
  assert.equal(JSON.parse(storage.getItem("doc")).source, "A");
  assert.equal(JSON.parse(storage.getItem(b.recoveryKey)).document.source, "B");
  results.push({
    name: "stale window cannot overwrite and retains a recovery copy",
    result: "passed",
  });
  const fresh = c.DOCUMENT_STORE.create({
      storage,
      key: "doc",
      locks,
      id: "fresh",
    }),
    other = c.DOCUMENT_STORE.create({
      storage,
      key: "doc",
      locks,
      id: "other",
    });
  const both = await Promise.all([
    fresh.save({ source: "C" }),
    other.save({ source: "D" }),
  ]);
  assert.equal(both.filter((x) => x.ok).length, 1);
  results.push({
    name: "simultaneous windows serialize compare-and-save atomically",
    result: "passed",
  });
  const loaded = b.acceptLatest({ source: "B" });
  assert.equal(loaded.source, "C");
  assert.equal((await b.save({ source: "B merged" })).ok, true);
  results.push({
    name: "explicit load adopts latest revision after retaining local backup",
    result: "passed",
  });
  const staleStartup = c.DOCUMENT_STORE.create({
    storage,
    key: "doc",
    locks,
    id: "startup",
    initialValue: null,
  });
  assert.equal((await staleStartup.save({ source: "old startup" })).ok, false);
  assert.equal(JSON.parse(storage.getItem("doc")).source, "B merged");
  results.push({
    name: "a write during page initialization cannot become the stale draft base",
    result: "passed",
  });
  const noLock = c.DOCUMENT_STORE.create({
    storage,
    key: "x",
    id: "unsupported",
  });
  assert.equal((await noLock.save({ source: "protected" })).ok, false);
  assert.equal(storage.getItem("x"), null);
  results.push({
    name: "unsupported locking never silently falls back to unsafe writes",
    result: "passed",
  });
  console.log(JSON.stringify({ passed: results.length, results }, null, 2));
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
