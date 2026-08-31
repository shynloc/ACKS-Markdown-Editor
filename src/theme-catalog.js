/* Catalog 3: ACKS signatures and independently addressable Milestone light/dark editions. */
(() => {
  const MD = globalThis.MD;
  const profiles = []; // MILESTONE_PROFILES
  const signatures = {}; // THEME_SIGNATURES
  MD.SIGNATURES = signatures;
  MD.CATALOG_VERSION = 3;
  const defaults = {
    catalogVersion: 3,
    milestoneKey: null,
    milestoneVariant: null,
    signature: null,
  };
  for (const [id, t] of Object.entries(MD.THEMES)) {
    Object.assign(t, defaults, {
      signature: id,
      ornamentAsset: null,
      dividerDeco: null,
    });
    const meta = MD.THEME_META[id];
    meta.collection = "acks";
    meta.mode = MD.luminance(t.bg) < 0.4 ? "dark" : "light";
    meta.family = id;
    meta.description =
      meta.description.split(" · ")[0] + " · " + signatures[id].name;
    meta.signature = signatures[id].name;
  }
  for (const p of profiles) {
    const t = {
      ...MD.THEMES.graphite,
      ...p,
      ...defaults,
      milestoneKey: p.key,
      milestoneVariant: p.variant,
      signature: "ms-" + p.key,
      editorialProfile: "milestone-" + p.key,
      layout: "milestone",
      titleStyle: "milestone",
      fontFamily: p.fontFamily || MD.THEMES.graphite.fontFamily,
      headingFamily:
        p.headingFamily || p.fontFamily || MD.THEMES.graphite.headingFamily,
      paraIndent: false,
      ornamentAsset: null,
      dividerDeco: null,
      lead: false,
      muted: p.text,
      markBg: MD.mix(p.bg, p.accent, 0.12),
      markText: p.text,
      hrColor: MD.mix(p.bg, p.accent, 0.4),
      border: MD.mix(p.bg, p.text, 0.19),
      tkKw: p.accent,
      tkStr: p.codeBlockText,
      tkNum: p.accent,
      tkTag: p.accent,
      tkPunc: p.codeBlockText,
      tkCmt: MD.mix(p.codeBlockText, p.codeBlockBg, 0.25),
    };
    delete t.id;
    delete t.key;
    delete t.variant;
    MD.THEMES[p.id] = MD.stabilizeTheme(t);
    MD.THEME_META[p.id] = {
      collection: "milestone",
      mode: p.variant,
      family: p.key,
      category: "Milestone · " + (p.variant === "dark" ? "深色" : "浅色"),
      signature: signatures[t.signature].name,
      description: p.name + " · " + signatures[t.signature].name,
    };
  }
  const oldMix = MD.mixTheme;
  MD.mixTheme = (palette, layout, material) => {
    const t = oldMix(palette, layout, material),
      l = MD.THEMES[layout],
      m = MD.THEMES[material];
    if (t.themeVersion === 2) {
      Object.assign(t, defaults, {
        signature: m.signature || null,
        milestoneKey: l.milestoneKey || null,
        milestoneVariant: l.milestoneVariant || null,
        ornamentAsset: m.ornamentAsset || null,
      });
      t.fontFamily = l.fontFamily;
      if (t.milestoneKey) t.layout = "milestone";
    }
    return MD.stabilizeTheme(t);
  };
  const oldBuild = MD.buildTheme;
  MD.buildTheme = (description, options) =>
    Object.assign(oldBuild(description, options), defaults);
})();
