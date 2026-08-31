const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const context = vm.createContext({
  document: { getElementById: () => null, querySelectorAll: () => [] },
  URL,
  console,
});
vm.runInContext(read("vendor/marked.js"), context);
vm.runInContext(read("src/theme-core.js"), context);
vm.runInContext(read("src/theme-revision.js"), context);
vm.runInContext(read("src/theme-catalog.compiled.js"), context);
vm.runInContext(read("src/editor-model.js"), context);
const app = read("src/app.compiled.js").replace(
  /const storedLibrary\s*=/,
  "globalThis.TEST={parser,validateTheme,safeUrl,builtins};return;const storedLibrary=",
);
vm.runInContext(app, context);
const { parser, validateTheme, safeUrl, builtins } = context.TEST;
const checks = [],
  pending = [];
function test(name, fn) {
  const result = fn();
  if (result?.then)
    pending.push(result.then(() => checks.push({ name, result: "passed" })));
  else checks.push({ name, result: "passed" });
}
test("43 built-in themes and 9 recipes remain", () => {
  assert.equal(Object.keys(builtins).length, 43);
  assert.equal(Object.keys(context.MD.RECIPES).length, 9);
});
test("indented blockquote terminates and retains content", () => {
  context.fixture = " > 带前导空格的引用";
  const html = vm.runInContext("TEST.parser.parse(fixture)", context, {
    timeout: 200,
  });
  assert.match(html, /<blockquote>/);
  assert.match(html, /带前导空格/);
});
test("nested lists retain following siblings", () => {
  assert.match(parser.parse("- 父项\n  - 子项\n- 后续项"), /后续项/);
});
test("inline code preserves literal emphasis markers", () => {
  const html = parser.parse("`**原样**`");
  assert.match(html, /\*\*原样\*\*/);
  assert.doesNotMatch(html, /<strong>/);
});
test("fence language cannot inject nodes", () => {
  const html = parser.parse('```x"><img src=x onerror=alert(1)>\ncode\n```');
  assert.doesNotMatch(html, /<img|onerror/);
});
test("raw HTML is not executed as HTML", () => {
  assert.doesNotMatch(parser.parse("<img src=x onerror=alert(1)>"), /<img/);
});
test("active URL schemes are rejected", () => {
  for (const url of [
    "javascript:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,test",
    "file:///etc/passwd",
  ])
    assert.equal(safeUrl(url), "");
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
test("SVG image data is rejected; raster data is allowed", () => {
  assert.equal(safeUrl("data:image/svg+xml,<svg>", true), "");
  assert.ok(safeUrl("data:image/png;base64,AAAA", true));
});
test("custom theme markup and unbounded numbers are rejected", () => {
  const theme = validateTheme({
    name: "<img src=x>",
    bodySize: 100000,
    lineHeight: 0,
    quoteSeal: {
      type: "chinese",
      color: 'red" onload=alert(1)',
      text: "<svg>",
    },
  });
  assert.equal(theme.bodySize, 24);
  assert.equal(theme.lineHeight, 1.2);
  assert.doesNotMatch(theme.name, /[<>]/);
  assert.equal(theme.quoteSeal.color, "#C0392B");
  assert.doesNotMatch(theme.quoteSeal.text, /[<>]/);
});
test("task list status survives parsing", () => {
  const html = parser.parse("- [x] 完成\n- [ ] 待办");
  assert.match(html, /☑/);
  assert.match(html, /☐/);
});
test("storage failures are not reported as a successful save", async () => {
  const status = { textContent: "", classList: { add() {}, remove() {} } };
  const ctx = vm.createContext({
    state: {},
    clone: (v) => JSON.parse(JSON.stringify(v)),
    documentStore: {
      save: async () => {
        throw new Error("QuotaExceededError");
      },
    },
    clearTimeout() {},
    saveTimer: null,
    localStorage: {
      setItem() {
        throw new Error("QuotaExceededError");
      },
    },
    STORE: "test",
    dirty: true,
    $: () => status,
  });
  const source = read("src/app.js");
  vm.runInContext(
    source.slice(
      source.indexOf("async function saveNow()"),
      source.indexOf("function scheduleSave()"),
    ) + "globalThis.result=saveNow()",
    ctx,
  );
  assert.equal(await ctx.result, false);
  assert.equal(ctx.dirty, true);
  assert.match(status.textContent, /保存失败/);
});
test("snapshot failure returns false and reports error", () => {
  const notices = [];
  const ctx = vm.createContext({
    finishBlock() {},
    loadHistory: () => [],
    state: { source: "草稿" },
    clone: (v) => v,
    localStorage: {
      setItem() {
        throw new Error("QuotaExceededError");
      },
    },
    HISTORY: "test",
    toast: (m) => notices.push(m),
  });
  const source = read("src/app.js");
  vm.runInContext(
    source.slice(
      source.indexOf("function saveSnapshot("),
      source.indexOf("function openHistory()"),
    ) + "globalThis.result=saveSnapshot()",
    ctx,
  );
  assert.equal(ctx.result, false);
  assert.match(notices[0], /保存失败/);
});
Promise.all(pending)
  .then(() =>
    console.log(JSON.stringify({ checks, passed: checks.length }, null, 2)),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
