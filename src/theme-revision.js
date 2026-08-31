/* Theme edition 2: independent reading colors, editorial profiles and stable surfaces. */
(() => {
  const MD = globalThis.MD;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  MD.LEGACY_THEMES = clone(MD.THEMES);
  MD.THEME_VERSION = 2;
  const serif = '"Songti SC", "Noto Serif SC", SimSun, Georgia, serif';
  const sans =
    '-apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans SC", sans-serif';
  const mono = 'ui-monospace, Menlo, "PingFang SC", monospace';
  const profiles = {
    gold: {
      bg: "#FCFBF8",
      text: "#403A32",
      heading: "#332D25",
      accent: "#B28B45",
      emphasis: "#80591F",
      title: "folio",
      font: serif,
      rule: "swash",
      category: "长文",
      description: "暖白与深金 · 细线书刊排版",
    },
    blue: {
      bg: "#FFFFFF",
      text: "#2C3747",
      heading: "#162B46",
      accent: "#2865BB",
      emphasis: "#205397",
      title: "manual",
      section: "#205397",
      category: "技术",
      description: "白底蓝墨 · 清晰的技术手册",
    },
    dark: {
      bg: "#121923",
      text: "#DEE5EF",
      heading: "#F4F7FC",
      accent: "#86AFE9",
      emphasis: "#A2C5F7",
      title: "quiet",
      codeBg: "#0C121B",
      category: "深色阅读",
      description: "稳定深色表面 · 柔和蓝色重点",
    },
    "clean-green": {
      bg: "#FCFDFB",
      text: "#314337",
      heading: "#203F30",
      accent: "#3C8260",
      emphasis: "#2D694B",
      title: "botanical",
      font: serif,
      category: "长文",
      description: "自然绿与留白 · 轻盈的知识文章",
    },
    "red-white": {
      bg: "#FFFCFA",
      text: "#3E3335",
      heading: "#292328",
      accent: "#B53543",
      emphasis: "#A12937",
      title: "editorial",
      font: serif,
      category: "评论",
      description: "黑字红线 · 新闻与观点的层级",
    },
    graphite: {
      bg: "#FFFFFF",
      text: "#343940",
      heading: "#1A2028",
      accent: "#58616E",
      emphasis: "#3B4654",
      title: "minimal",
      codeBg: "#F3F5F7",
      category: "长文",
      description: "中性灰阶 · 清楚而克制",
    },
    zen: {
      bg: "#FAFAF6",
      text: "#465044",
      heading: "#344438",
      accent: "#65725E",
      emphasis: "#465C47",
      title: "air",
      font: serif,
      art: "ink-gesture",
      category: "文艺长文",
      description: "疏朗宋体 · 少量自然墨迹",
    },
    receipt: {
      bg: "#FAF5EA",
      text: "#43362F",
      heading: "#4B2F2A",
      accent: "#944636",
      emphasis: "#853C30",
      title: "archive",
      font: serif,
      art: "paper-edge",
      category: "复古专题",
      description: "档案信笺 · 纸边与细密分隔",
    },
    "olive-notes": {
      bg: "#F8F8EF",
      text: "#3D4430",
      heading: "#344023",
      accent: "#697746",
      emphasis: "#4D5D2E",
      title: "notebook",
      section: "#46552D",
      category: "手记",
      description: "橄榄与纸白 · 有秩序的笔记",
    },
    "ms-blue-purple": {
      bg: "#FCFCFF",
      text: "#353C50",
      heading: "#202D4A",
      accent: "#365CA5",
      accent2: "#695291",
      emphasis: "#4F3D7C",
      section: "#594681",
      title: "report",
      codeBg: "#F0F0F8",
      category: "专业报告",
      description: "蓝紫双墨 · 专业报告与数据",
    },
    dopamine: {
      bg: "#FFFCF6",
      text: "#3D3330",
      heading: "#362823",
      accent: "#CE5A27",
      emphasis: "#973B16",
      title: "accent",
      titleBg: "#FFF0D7",
      rule: "stars",
      category: "短篇",
      description: "温暖橙色 · 集中的活力表达",
    },
    "song-ink": {
      bg: "#FAF9F4",
      text: "#3D473F",
      heading: "#243A2C",
      accent: "#657D66",
      emphasis: "#3E6347",
      title: "literary",
      font: serif,
      art: "ink-gesture",
      indent: true,
      category: "文艺长文",
      description: "青绿墨色 · 现代宋式排版",
    },
    "neu-soft": {
      bg: "#F6F7FA",
      text: "#3E4253",
      heading: "#30354E",
      accent: "#797BAA",
      emphasis: "#555982",
      title: "soft",
      quoteBg: "#ECEEF6",
      category: "轻阅读",
      description: "柔和灰紫 · 轻材质与清晰文字",
    },
    "neo-brutalism": {
      bg: "#FFFEF7",
      text: "#292A26",
      heading: "#1D241C",
      accent: "#D5AD21",
      emphasis: "#695015",
      title: "poster",
      titleBg: "#F5D960",
      quoteBg: "#F8E0E9",
      quoteBorder: "#A13962",
      category: "短篇",
      description: "黄、粉、黑 · 可读的海报式表达",
    },
    y3k: {
      bg: "#101B24",
      text: "#DCE9EC",
      heading: "#F0FAFC",
      accent: "#64C8D6",
      emphasis: "#93DEE7",
      title: "signal",
      font: mono,
      art: "glass-ribbon",
      category: "科技专题",
      description: "冷青与墨蓝 · 小型玻璃光饰",
    },
    maximalism: {
      bg: "#FFFAF4",
      text: "#393039",
      heading: "#692541",
      accent: "#AC315E",
      accent2: "#267B87",
      emphasis: "#922B52",
      title: "press",
      quoteBg: "#EAF3F1",
      quoteBorder: "#377B80",
      category: "短篇",
      description: "双色活字海报 · 局部强调与节奏",
    },
    collage: {
      bg: "#FAF3E5",
      text: "#454132",
      heading: "#344C3C",
      accent: "#56775B",
      emphasis: "#3F6849",
      title: "journal",
      art: "paper-edge",
      quoteBg: "#F0E7D7",
      category: "手帐专题",
      description: "同一套纸材 · 温和的手帐记录",
    },
    guochao: {
      bg: "#FBF7EE",
      text: "#433830",
      heading: "#522A29",
      accent: "#AD3B40",
      emphasis: "#923136",
      title: "cultural",
      font: serif,
      art: "ink-gesture",
      category: "文化专题",
      description: "朱砂与墨 · 克制的文化表达",
    },
    dreamglow: {
      bg: "#1C192A",
      text: "#E4DEEE",
      heading: "#F4EDF9",
      accent: "#B3A0DC",
      emphasis: "#D2C0EE",
      title: "nocturne",
      font: serif,
      art: "glass-ribbon",
      category: "夜间专题",
      description: "暗紫与浅墨 · 局部光感，稳定阅读",
    },
  };
  function validColor(value) {
    return (
      typeof value === "string" && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)
    );
  }
  function readingColor(color, background, target = 4.6) {
    if (!validColor(background)) background = "#FFFFFF";
    if (!validColor(color)) color = "#253044";
    if (MD.contrast(color, background) >= target) return color;
    const end =
      MD.contrast("#111111", background) > MD.contrast("#FFFFFF", background)
        ? "#111111"
        : "#FFFFFF";
    let lo = 0,
      hi = 1,
      best = end;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2,
        candidate = MD.mix(color, end, mid);
      if (MD.contrast(candidate, background) >= target) {
        best = candidate;
        hi = mid;
      } else lo = mid;
    }
    return best;
  }
  function stabilize(theme) {
    const t = clone(theme);
    if (Number(t.themeVersion) !== 2) return t;
    t.bgMode = "solid";
    t.texture = null;
    t.shadow = "none";
    t.text = readingColor(t.text, t.bg);
    t.heading = readingColor(t.heading, t.bg);
    t.emphasis = readingColor(t.emphasis || t.accent, t.bg);
    t.sectionHeading = readingColor(t.sectionHeading || t.heading, t.bg);
    t.link = readingColor(t.link || t.emphasis, t.bg);
    t.muted = readingColor(t.muted || t.text, t.bg);
    t.titleBg = validColor(t.titleBg) ? t.titleBg : t.bg;
    t.titleText = readingColor(t.titleText || t.heading, t.titleBg);
    t.thBg = validColor(t.thBg) ? t.thBg : t.bg;
    t.thText = readingColor(t.thText || t.heading, t.thBg);
    t.quoteBg = validColor(t.quoteBg) ? t.quoteBg : t.bg;
    t.quoteText = readingColor(t.quoteText || t.text, t.quoteBg);
    t.codeText = readingColor(t.codeText || t.text, t.codeBg);
    t.codeBlockText = readingColor(t.codeBlockText || t.text, t.codeBlockBg);
    for (const key of ["tkKw", "tkStr", "tkCmt", "tkNum", "tkTag", "tkPunc"])
      t[key] = readingColor(t[key] || t.codeBlockText, t.codeBlockBg);
    // Zebra rows and inline marks must remain readable too.
    for (const key of ["text", "emphasis", "link"])
      t[key] = readingColor(t[key], t.zebra || t.bg);
    t.markText = readingColor(t.markText || t.text, t.markBg);
    return t;
  }
  function make(id, p) {
    const old = MD.LEGACY_THEMES[id] || MD.LEGACY_THEMES.gold;
    const dark = MD.luminance(p.bg) < 0.4;
    const accent = p.accent,
      heading = p.heading,
      bg = p.bg;
    const codeBg =
      p.codeBg || MD.mix(bg, dark ? "#000000" : heading, dark ? 0.22 : 0.045);
    const t = {
      ...clone(old),
      name: old.name,
      themeVersion: 2,
      editorialProfile: id,
      bg,
      text: p.text,
      heading,
      accent,
      accent2: p.accent2 || accent,
      emphasis: p.emphasis,
      sectionHeading: p.section || heading,
      titleText: heading,
      titleBg: p.titleBg || bg,
      muted: MD.mix(p.text, bg, 0.22),
      bodySize: 16,
      lineHeight: 1.85,
      letterSpacing: 0.2,
      h1: 30,
      h2: 22,
      h3: 18,
      h4: 16,
      fontFamily: sans,
      headingFamily: p.font || sans,
      radius: 3,
      hrColor: MD.mix(bg, heading, 0.25),
      link: p.emphasis,
      markBg: MD.mix(bg, accent, dark ? 0.28 : 0.15),
      markText: p.text,
      thBg: MD.mix(bg, accent, dark ? 0.18 : 0.08),
      thText: heading,
      zebra: MD.mix(bg, accent, 0.028),
      border: MD.mix(bg, heading, 0.18),
      codeBg: MD.mix(bg, heading, 0.055),
      codeText: p.emphasis,
      codeBlockBg: codeBg,
      codeBlockText: p.text,
      tkKw: p.emphasis,
      tkStr: dark ? "#A6D9C4" : "#366951",
      tkCmt: MD.mix(p.text, codeBg, 0.3),
      tkNum: dark ? "#E0C196" : "#825B36",
      tkTag: p.emphasis,
      tkPunc: p.text,
      quoteBorder: p.quoteBorder || accent,
      quoteBg: p.quoteBg || MD.mix(bg, accent, dark ? 0.1 : 0.045),
      quoteText: p.text,
      h1Style: [
        "air",
        "literary",
        "archive",
        "cultural",
        "nocturne",
        "botanical",
      ].includes(p.title)
        ? "center"
        : "left",
      headingMark: "plain",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: !!p.indent,
      shadow: "none",
      layout: "editorial",
      titleStyle: p.title,
      bgMode: "solid",
      texture: null,
      titleSwash: false,
      dividerDeco: p.rule || null,
      ornamentAsset: p.art || null,
      showDecorations: true,
      showTemplateText: false,
      quoteSeal: null,
      quoteSplatter: null,
      headerTear: null,
      stickerText: null,
      quoteTape: false,
      kickerText: null,
      footerText: null,
      lead: false,
      h2num: false,
      codeFrame: "paper",
      tableShape: "minimal",
      listGlyph: "none",
      codeInline: "plain",
      h3Mark: "none",
      thead: "flat",
    };
    return stabilize(t);
  }
  MD.THEME_META = {};
  for (const [id, p] of Object.entries(profiles)) {
    MD.THEMES[id] = make(id, p);
    MD.THEME_META[id] = {
      category: p.category,
      description: p.description,
      decorativeAsset: p.art || null,
      version: 2,
    };
  }
  for (const recipe of Object.values(MD.RECIPES))
    delete recipe.overrides.footerText;
  const originalBuild = MD.buildTheme,
    originalMix = MD.mixTheme;
  MD.buildTheme = (description, options) => {
    const generated = originalBuild(description, options);
    return stabilize({
      ...MD.THEMES.graphite,
      ...generated,
      themeVersion: 2,
      editorialProfile: "custom",
      titleStyle: "minimal",
      layout: "editorial",
      h1: 30,
      h2: 22,
      h3: 18,
      h4: 16,
      bgMode: "solid",
      texture: null,
      shadow: "none",
      headingMark: "plain",
      codeFrame: "paper",
      ornamentAsset: null,
      kickerText: null,
      footerText: null,
      quoteSeal: null,
      stickerText: null,
      showTemplateText: false,
      showDecorations: true,
      emphasis: generated.accent,
      sectionHeading: generated.heading,
      titleBg: generated.bg,
      titleText: generated.heading,
    });
  };
  MD.mixTheme = (palette, layout, material) => {
    const result = originalMix(palette, layout, material),
      p = MD.THEMES[palette],
      l = MD.THEMES[layout],
      m = MD.THEMES[material];
    if (
      Number(p?.themeVersion) !== 2 ||
      Number(l?.themeVersion) !== 2 ||
      Number(m?.themeVersion) !== 2
    )
      return result;
    for (const key of [
      "emphasis",
      "sectionHeading",
      "titleText",
      "titleBg",
      "muted",
      "thText",
      "markText",
    ])
      result[key] = p[key];
    result.themeVersion = 2;
    result.editorialProfile = l.editorialProfile;
    result.titleStyle = l.titleStyle;
    result.ornamentAsset = m.ornamentAsset;
    result.showDecorations = true;
    result.showTemplateText = false;
    result.kickerText = null;
    result.footerText = null;
    result.quoteSeal = null;
    result.stickerText = null;
    return stabilize(result);
  };
  MD.stabilizeTheme = stabilize;
  MD.readingColor = readingColor;
})();
