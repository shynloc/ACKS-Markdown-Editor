const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.join(__dirname, ".."),
  read = (p) => fs.readFileSync(path.join(root, p), "utf8"),
  c = vm.createContext({
    document: { getElementById: () => null, querySelectorAll: () => [] },
    URL,
    console,
  });
for (const p of [
  "vendor/marked.js",
  "src/theme-core.js",
  "src/theme-revision.js",
  "src/theme-catalog.compiled.js",
  "src/editor-model.js",
])
  vm.runInContext(read(p), c);
vm.runInContext(
  read("src/app.compiled.js").replace(
    /const storedLibrary\s*=/,
    "globalThis.TEST={normalizeDocument,validateTheme};return;const storedLibrary=",
  ),
  c,
);
const MD = c.MD,
  T = c.TEST,
  out = [];
function test(name, fn) {
  fn();
  out.push({ name, result: "passed" });
}
const catalog = JSON.parse(read("src/milestone-theme-catalog.json"));
test("all 24 supported Milestone editions are distinct selectable snapshots", () => {
  const ids = catalog.flatMap((t) =>
    (t.mode === "both" ? ["light", "dark"] : [t.mode]).map(
      (m) => "milestone-" + t.key + "-" + m,
    ),
  );
  assert.equal(ids.length, 24);
  for (const id of ids) {
    assert.ok(MD.THEMES[id]);
    assert.equal(MD.THEME_META[id].collection, "milestone");
    assert.ok(
      MD.THEMES[id].name.includes(
        MD.THEME_META[id].mode === "light" ? "浅色" : "深色",
      ),
    );
  }
});
test("ACKS has 19 different artworks; only Milestone family editions share a signature", () => {
  const ids = Object.keys(MD.LEGACY_THEMES),
    s = ids.map((id) => MD.THEMES[id].signature);
  assert.equal(new Set(s).size, 19);
  const digest = s.map((k) => {
    const d = MD.SIGNATURES[k];
    return d.type === "image"
      ? d.asset
      : crypto.createHash("sha256").update(d.svg).digest("hex");
  });
  assert.equal(new Set(digest).size, 19);
  assert.equal(Object.keys(MD.SIGNATURES).length, 32);
  for (const [id, t] of Object.entries(MD.THEMES)) {
    assert.ok(MD.SIGNATURES[t.signature]);
    assert.notEqual(t.ornamentAsset, "ink-gesture");
    if (id.startsWith("milestone-"))
      assert.equal(t.signature, "ms-" + t.milestoneKey);
  }
});
test("24 document round trips preserve source, theme identity and personal spacing", () => {
  for (const [id, t] of Object.entries(MD.THEMES).filter(([id]) =>
    id.startsWith("milestone-"),
  )) {
    const input = {
      source: "# 私有草稿\n\n内容不应改变。",
      themeId: id,
      themeSnapshot: t,
      recipeId: "essay",
      overrides: { bodySize: 20, lineHeight: 2, showDecorations: false },
    };
    const doc = T.normalizeDocument(JSON.parse(JSON.stringify(input)));
    assert.equal(doc.source, input.source);
    assert.equal(doc.themeSnapshot.milestoneKey, t.milestoneKey);
    assert.equal(doc.themeSnapshot.milestoneVariant, t.milestoneVariant);
    assert.equal(doc.themeSnapshot.signature, t.signature);
    assert.equal(doc.overrides.lineHeight, 2);
    assert.equal(doc.overrides.showDecorations, false);
  }
});
test("edition-2 built-ins upgrade artwork without losing prose or old snapshot", () => {
  const old = {
    ...MD.THEMES.zen,
    catalogVersion: undefined,
    signature: undefined,
    ornamentAsset: "ink-gesture",
  };
  const doc = T.normalizeDocument({
    source: "# 旧稿",
    themeId: "zen",
    themeSnapshot: old,
    overrides: { bodySize: 18 },
    recipeId: "tech",
  });
  assert.equal(doc.themeSnapshot.catalogVersion, 3);
  assert.equal(doc.themeSnapshot.signature, "zen");
  assert.equal(doc.themeSnapshot.ornamentAsset, null);
  assert.equal(doc.source, "# 旧稿");
  assert.equal(doc.overrides.bodySize, 18);
  assert.equal(doc.themeSnapshotBeforeUpgrade.ornamentAsset, "ink-gesture");
});
test("custom imported Milestone snapshot retains layout and signature", () => {
  const t = { ...MD.THEMES["milestone-euro-dark"], name: "我的欧式主题" };
  const clean = T.validateTheme(JSON.parse(JSON.stringify(t)));
  const doc = T.normalizeDocument({
    source: "正文",
    themeId: "custom-ms-test",
    themeSnapshot: clean,
  });
  assert.equal(doc.themeSnapshot.milestoneKey, "euro");
  assert.equal(doc.themeSnapshot.milestoneVariant, "dark");
  assert.equal(doc.themeSnapshot.signature, "ms-euro");
  assert.equal(doc.themeSnapshot.name, "我的欧式主题");
});
test("cross-library mixes preserve selected palette, layout and material independently", () => {
  for (const [p, l, m] of [
    ["dark", "milestone-cnclassic-light", "zen"],
    ["milestone-clean-dark", "song-ink", "ms-blue-purple"],
  ]) {
    const t = MD.mixTheme(p, l, m);
    assert.equal(t.bg, MD.THEMES[p].bg);
    assert.equal(t.milestoneKey, MD.THEMES[l].milestoneKey);
    assert.equal(t.signature, MD.THEMES[m].signature);
    const checked = T.validateTheme(t);
    assert.equal(checked.milestoneKey, t.milestoneKey);
    assert.equal(checked.signature, t.signature);
    assert.ok(MD.contrast(checked.text, checked.bg) >= 4.5);
  }
});
test("theme routing and SVG identities accept only registered identifiers", () => {
  const t = T.validateTheme({
    ...MD.THEMES.gold,
    signature: "<svg onload=alert(1)>",
    milestoneKey: 'clean"] body',
    milestoneVariant: "dark;display:none",
  });
  assert.equal(t.signature, null);
  assert.equal(t.milestoneKey, null);
  assert.equal(t.milestoneVariant, null);
});
test("old custom edition-2 artwork is not forcibly replaced", () => {
  const old = {
    ...MD.THEMES.zen,
    catalogVersion: 0,
    signature: null,
    ornamentAsset: "ink-gesture",
    name: "保留手工主题",
  };
  delete old.signature;
  const d = T.normalizeDocument({
    source: "手稿",
    themeId: "custom-old-art",
    themeSnapshot: old,
  });
  assert.equal(d.themeSnapshot.ornamentAsset, "ink-gesture");
  assert.equal(d.themeSnapshot.signature, null);
  assert.equal(d.themeSnapshot.name, old.name);
});
console.log(JSON.stringify({ passed: out.length, results: out }, null, 2));
