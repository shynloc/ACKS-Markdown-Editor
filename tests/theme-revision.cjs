const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.join(__dirname, ".."),
  read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const c = vm.createContext({
  document: { getElementById: () => null, querySelectorAll: () => [] },
  URL,
  console,
});
for (const f of [
  "vendor/marked.js",
  "src/theme-core.js",
  "src/theme-revision.js",
  "src/theme-catalog.compiled.js",
  "src/editor-model.js",
])
  vm.runInContext(read(f), c);
const MD = c.MD,
  results = [];
function test(name, fn) {
  fn();
  results.push({ name, result: "passed" });
}
test("all 19 original theme IDs are retained in edition 2", () => {
  assert.equal(Object.keys(MD.THEMES).length, 43);
  for (const [id, t] of Object.entries(MD.THEMES)) {
    assert.equal(t.themeVersion, 2);
    if (MD.LEGACY_THEMES[id]) assert.equal(t.name, MD.LEGACY_THEMES[id].name);
  }
});
test("article surfaces contain no full-page gradients or textures", () => {
  for (const t of Object.values(MD.THEMES)) {
    assert.equal(t.bgMode, "solid");
    assert.equal(t.texture, null);
    assert.equal(t.shadow, "none");
  }
});
test("built-in themes and recipes do not append stock prose", () => {
  for (const t of Object.values(MD.THEMES)) {
    assert.equal(t.kickerText, null);
    assert.equal(t.footerText, null);
    assert.equal(t.stickerText, null);
    assert.equal(t.quoteSeal, null);
    assert.equal(t.showTemplateText, false);
  }
  for (const r of Object.values(MD.RECIPES))
    assert.equal(r.overrides.footerText, undefined);
});
const matrix = [];
test("387 theme/recipe combinations meet solid-surface reading contrast", () => {
  const pairs = [
    ["text", "bg"],
    ["heading", "bg"],
    ["emphasis", "bg"],
    ["link", "bg"],
    ["muted", "bg"],
    ["titleText", "titleBg"],
    ["sectionHeading", "bg"],
    ["thText", "thBg"],
    ["quoteText", "quoteBg"],
    ["codeText", "codeBg"],
    ["codeBlockText", "codeBlockBg"],
    ["markText", "markBg"],
    ...["tkKw", "tkStr", "tkCmt", "tkNum", "tkTag", "tkPunc"].map((key) => [
      key,
      "codeBlockBg",
    ]),
  ];
  for (const [id, t] of Object.entries(MD.THEMES))
    for (const [recipe, r] of Object.entries(MD.RECIPES)) {
      const resolved = MD.stabilizeTheme({ ...t, ...r.overrides });
      let minimum = 99;
      for (const [fg, bg] of pairs) {
        const ratio = MD.contrast(resolved[fg], resolved[bg]);
        assert.ok(ratio >= 4.5, `${id}/${recipe}: ${fg}/${bg}=${ratio}`);
        minimum = Math.min(minimum, ratio);
      }
      matrix.push({ id, recipe, min: Number(minimum.toFixed(3)) });
    }
  assert.equal(matrix.length, 387);
});
test("mixing preserves edition and stabilizes material/palette combinations", () => {
  const t = MD.mixTheme("neo-brutalism", "song-ink", "dreamglow");
  assert.equal(t.themeVersion, 2);
  assert.equal(t.titleStyle, "literary");
  assert.equal(t.signature, "dreamglow");
  assert.ok(MD.contrast(t.emphasis, t.bg) >= 4.5);
});
test("new generated themes adopt stable editorial defaults", () => {
  const t = MD.buildTheme("暗色科技", { accent: "#ffcc00", name: "测试" });
  assert.equal(t.themeVersion, 2);
  assert.equal(t.texture, null);
  assert.equal(t.kickerText, null);
  assert.ok(MD.contrast(t.codeBlockText, t.codeBlockBg) >= 4.5);
});
const app = read("src/app.compiled.js").replace(
  /const storedLibrary\s*=/,
  "globalThis.TEST={normalizeDocument,validateTheme};return;const storedLibrary=",
);
vm.runInContext(app, c);
test("built-in legacy drafts upgrade without changing Markdown or manual spacing", () => {
  const doc = c.TEST.normalizeDocument({
    source: "# 保留正文\n",
    themeId: "gold",
    themeSnapshot: MD.LEGACY_THEMES.gold,
    recipeId: "essay",
    overrides: { bodySize: 18, lineHeight: 2 },
  });
  assert.equal(doc.source, "# 保留正文\n");
  assert.equal(doc.themeSnapshot.themeVersion, 2);
  assert.equal(
    doc.themeSnapshotBeforeUpgrade.accent,
    MD.LEGACY_THEMES.gold.accent,
  );
  assert.equal(doc.overrides.bodySize, 18);
  assert.equal(doc.overrides.lineHeight, 2);
});
test("legacy custom snapshots are not forcibly restyled", () => {
  const old = { ...MD.LEGACY_THEMES.dark, name: "我的旧主题" };
  const doc = c.TEST.normalizeDocument({
    source: "正文",
    themeId: "custom-legacy-test",
    themeSnapshot: old,
    recipeId: "default",
  });
  assert.equal(doc.themeSnapshot.themeVersion, 1);
  assert.equal(doc.themeSnapshot.accent, old.accent);
  assert.equal(doc.themeSnapshot.name, old.name);
});
test("decoration toggles survive document normalization", () => {
  const doc = c.TEST.normalizeDocument({
    source: "正文",
    themeId: "song-ink",
    overrides: { showDecorations: false, showTemplateText: false },
  });
  assert.equal(doc.overrides.showDecorations, false);
});
console.log(
  JSON.stringify(
    { passed: results.length, results, combinations: matrix.length, matrix },
    null,
    2,
  ),
);
