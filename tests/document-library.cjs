const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert/strict");

const root = path.join(__dirname, "..");
const context = vm.createContext({ TextEncoder, console });
vm.runInContext(
  fs.readFileSync(path.join(root, "src/document-library.js"), "utf8"),
  context,
);
const library = context.DOCUMENT_LIBRARY;
const results = [];

function test(name, fn) {
  fn();
  results.push({ name, result: "passed" });
}

test("title comes from the first level-one heading", () => {
  assert.equal(
    library.titleFromSource("前言\n\n# **真正标题**\n\n正文"),
    "真正标题",
  );
  assert.equal(library.titleFromSource("只有正文"), "未命名文章");
});

test("preview is compact and does not expose image URLs", () => {
  const preview = library.previewFromSource(
    "# 标题\n\n![封面](asset:img-secret)\n\n**正文** 内容",
  );
  assert.equal(preview, "标题 [图片] 正文 内容");
  assert.ok(!preview.includes("asset:"));
});

test("record metadata preserves creation time across saves", () => {
  const first = library.makeRecord(
    "doc-123456",
    { source: "# 第一版", updatedAt: "2026-09-01T01:00:00.000Z" },
    null,
    "2026-09-01T00:00:00.000Z",
  );
  const second = library.makeRecord(
    "doc-123456",
    { source: "# 第二版", updatedAt: "2026-09-01T02:00:00.000Z" },
    first,
    "2026-09-01T02:00:00.000Z",
  );
  assert.equal(second.createdAt, "2026-09-01T00:00:00.000Z");
  assert.equal(second.updatedAt, "2026-09-01T02:00:00.000Z");
  assert.equal(second.title, "第二版");
});

test("stored documents are deep clones", () => {
  const document = { source: "# 原稿", assets: { image: { data: "abc" } } };
  const record = library.makeRecord("doc-abcdef", document, null);
  document.assets.image.data = "changed";
  assert.equal(record.document.assets.image.data, "abc");
});

test("record size includes embedded resources", () => {
  const small = library.makeRecord("doc-small1", { source: "# A" }, null);
  const large = library.makeRecord(
    "doc-large1",
    { source: "# A", assets: { image: { data: "x".repeat(4096) } } },
    null,
  );
  assert.ok(large.bytes > small.bytes + 4000);
});

test("generated IDs use the supplied secure UUID source", () => {
  assert.equal(
    library.createId({
      randomUUID: () => "11111111-2222-4333-8444-555555555555",
    }),
    "doc-11111111-2222-4333-8444-555555555555",
  );
});

test("invalid IDs and documents fail closed", () => {
  assert.throws(() => library.makeRecord("bad", { source: "x" }, null));
  assert.throws(() => library.makeRecord("doc-valid1", {}, null));
});

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
