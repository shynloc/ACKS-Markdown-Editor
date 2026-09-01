(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const MD = globalThis.MD;
  const MODEL = globalThis.EDITOR_MODEL;
  const THEME_ASSETS = {}; // THEME_ASSETS_BUNDLE
  const themeAssetCache = new Map();
  function themeAssetURL(key) {
    if (!Object.hasOwn(THEME_ASSETS, key)) return "";
    if (!themeAssetCache.has(key)) {
      const decoded = atob(THEME_ASSETS[key]);
      const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
      themeAssetCache.set(
        key,
        URL.createObjectURL(new Blob([bytes], { type: "image/png" })),
      );
    }
    return themeAssetCache.get(key);
  }
  const ICONS = {}; // ICONS_BUNDLE
  const esc = (value) => MD.escapeHtml(String(value ?? ""));
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const icons = (root) =>
    root.querySelectorAll("[data-icon]").forEach((el) => {
      if (el.querySelector(":scope > .icon")) return;
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICONS[el.dataset.icon] || "";
      el.prepend(icon);
    });
  icons(document);
  const DEFAULT_SOURCE = ""; // DEFAULT_SOURCE_BUNDLE
  const DEFAULT_ASSETS = {}; // DEFAULT_ASSETS_BUNDLE
  const MINI_SOURCE =
    "# 让技术有用，也有温度\n\n工具的价值，在于让每一次表达更轻松。\n\n## 从内容开始\n\n把复杂留给系统，把清晰留给读者。\n\n> 让排版，服务内容。";
  const STORE = "acks-md-document-v3",
    LIBRARY = "acks-md-themes-v2",
    HISTORY = "acks-md-history-v3",
    ACTIVE_DOCUMENT = "acks-md-active-document-v1";
  const MAX_SOURCE = 3 * 1024 * 1024;
  let mode = "write",
    previewKind = "rich",
    draft = null,
    panelTab = "themes",
    fullLibrary = false;
  let activeBlock = null,
    composing = false,
    dirty = false,
    saveTimer,
    toastTimer,
    copyTimer,
    restoreFocus = null;
  let checkpointSuppressed = false;
  let undoStack = [],
    redoStack = [],
    lastCheckpoint = "",
    legacyHistory = false,
    initialStorageError = false;
  let initialDocumentRaw;
  let articleLibrary = null,
    activeDocumentId = null,
    libraryRefresh = 0,
    libraryStorageError = false;
  let blocks = [],
    sourceSelection = { start: 0, end: 0 };

  // Only the documented, restricted inline formatting tags are accepted as HTML.
  // Markdown is parsed once; DOMPurify remains the final boundary before DOM insertion.
  let suppressRemoteImages = false;
  const renderer = new marked.Renderer();
  renderer.html = ({ text }) => MODEL.inlineHTML(text) ?? esc(text);
  renderer.image = ({ href, title, text }) => {
    if (suppressRemoteImages && /^https?:/i.test(href || ""))
      return `<img data-remote-image="true" alt="${esc(text)}（导入后加载外链图片）">`;
    const id = /^asset:(img-[a-z0-9-]+)$/.exec(href || "");
    return `<img ${id ? `data-md-asset="${id[1]}"` : `src="${esc(safeUrl(href, true))}"`} alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""}>`;
  };
  renderer.code = ({ text, lang }) => {
    const language = (lang || "").split(/\s/)[0];
    const safe = /^[\w+-]{1,32}$/.test(language) ? language : "";
    return (
      '<pre class="md-pre"><code class="md-code' +
      (safe ? " lang-" + safe : "") +
      '">' +
      MD.highlightCode(text, safe) +
      "</code></pre>\n"
    );
  };
  renderer.checkbox = ({ checked }) =>
    '<span class="task-mark">' + (checked ? "☑" : "☐") + " </span>";
  renderer.codespan = ({ text }) =>
    '<code class="md-ci">' + esc(text) + "</code>";
  const parser = new marked.Marked({ gfm: true, breaks: true, renderer });
  const CLEAN = {
    USE_PROFILES: { html: true, svg: true, svgFilters: true },
    FORBID_TAGS: [
      "script",
      "style",
      "foreignObject",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "select",
      "animate",
      "set",
      "image",
      "use",
    ],
    FORBID_ATTR: ["name", "srcdoc"],
    ALLOW_DATA_ATTR: true,
  };
  /*__SVG_SAFETY__*/
  function safeUrl(raw, image = false) {
    const value = String(raw || "").trim();
    if (
      image &&
      /^data:image\/(?:png|jpe?g|gif|webp);base64,[a-z\d+/=\s]+$/i.test(value)
    )
      return value;
    if (!image && /^(?:#[^\s]*|mailto:[^\s]+)$/i.test(value)) return value;
    try {
      const u = new URL(value);
      return /^https?:$/.test(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  }
  function cleanHTML(html, documentAssets = state.assets) {
    const fragment = DOMPurify.sanitize(html, {
      ...CLEAN,
      RETURN_DOM_FRAGMENT: true,
    });
    scopeSvgReferences(fragment);
    fragment.querySelectorAll("[href]").forEach((el) => {
      if (el.namespaceURI === SVG_NAMESPACE) return;
      const url = safeUrl(el.getAttribute("href"));
      if (url) {
        el.setAttribute("href", url);
        el.setAttribute("rel", "noopener noreferrer");
      } else el.removeAttribute("href");
    });
    fragment.querySelectorAll("img").forEach((el) => {
      const themeAsset = el.getAttribute("data-theme-asset");
      if (themeAsset && Object.hasOwn(THEME_ASSETS, themeAsset)) {
        el.src = themeAssetURL(themeAsset);
        el.alt = "";
        el.setAttribute("aria-hidden", "true");
        return;
      }
      const assetId = el.getAttribute("data-md-asset");
      const asset =
        assetId && Object.hasOwn(documentAssets || {}, assetId)
          ? documentAssets[assetId]
          : null;
      const url = safeUrl(asset ? asset.data : el.getAttribute("src"), true);
      if (assetId && !asset)
        el.setAttribute(
          "alt",
          (el.getAttribute("alt") || "图片") + "（资源缺失：" + assetId + "）",
        );
      if (url) el.setAttribute("src", url);
      else el.removeAttribute("src");
      el.setAttribute("referrerpolicy", "no-referrer");
    });
    fragment
      .querySelectorAll(
        "span[data-md-color],span[data-md-font],span[data-md-size],span[data-md-decoration]",
      )
      .forEach((el) => {
        const {
          mdColor: color,
          mdFont: font,
          mdSize: size,
          mdDecoration: decoration,
        } = el.dataset;
        if (/^#[a-f\d]{6}$/i.test(color || "")) el.style.color = color;
        if (Object.hasOwn(MODEL.FONT, font))
          el.style.fontFamily = MODEL.FONT[font];
        if (
          /^\d{1,2}(?:\.\d)?$/.test(size || "") &&
          Number(size) >= 8 &&
          Number(size) <= 64
        )
          el.style.fontSize = size + "px";
        if (decoration === "wavy") {
          el.style.textDecorationLine = "underline";
          el.style.textDecorationStyle = "wavy";
          el.style.textUnderlineOffset = ".2em";
        }
        if (decoration === "dots") {
          el.style.textEmphasisStyle = "filled dot";
          el.style.webkitTextEmphasisStyle = "filled dot";
          el.style.textEmphasisPosition = "under right";
          el.style.webkitTextEmphasisPosition = "under right";
        }
      });
    return fragment;
  }
  function markdownHTML(source) {
    if (source.length > MAX_SOURCE)
      throw new Error("文档超过 3 MB，请拆分文章或移除大型内嵌图片");
    return parser.parse(source);
  }
  function fillArticle(root, source) {
    root.replaceChildren(cleanHTML(markdownHTML(source)));
    root.querySelectorAll("p").forEach((n) => n.classList.add("md-p"));
    root
      .querySelectorAll("blockquote")
      .forEach((n) => n.classList.add("md-bq"));
    root.querySelectorAll("table").forEach((n) => n.classList.add("md-table"));
    root.querySelectorAll("hr").forEach((n) => n.classList.add("md-hr"));
    root.querySelectorAll("img").forEach((n) => n.classList.add("md-img"));
  }
  // Existing theme structure and tokens, shared by thumbnails, full preview and export.
  /*__THEME_RENDER__*/

  const builtins = clone(MD.THEMES);
  const legacyBase = {
    ...clone(MD.LEGACY_THEMES.gold),
    themeVersion: 1,
    editorialProfile: "legacy",
    showDecorations: true,
    showTemplateText: true,
  };
  const themeStringKeys = new Set([
    "name",
    "fontFamily",
    "headingFamily",
    "h1Style",
    "headingMark",
    "quoteStyle",
    "tableStyle",
    "dividerStyle",
    "listMark",
    "shadow",
    "layout",
    "titleStyle",
    "bgMode",
    "kickerText",
    "footerText",
    "texture",
    "dividerDeco",
    "stickerText",
    "codeFrame",
    "tableShape",
    "listGlyph",
    "codeInline",
    "h3Mark",
    "thead",
    "editorialProfile",
    "ornamentAsset",
    "milestoneKey",
    "milestoneVariant",
    "signature",
  ]);
  const textKeys = new Set(["name", "kickerText", "footerText", "stickerText"]);
  const numericLimits = {
    bodySize: [12, 24],
    lineHeight: [1.2, 2.5],
    letterSpacing: [0, 4],
    h1: [18, 48],
    h2: [16, 36],
    h3: [14, 30],
    h4: [12, 26],
    radius: [0, 30],
  };
  function validateTheme(input, base = builtins.gold) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("主题必须是 JSON 对象");
    const out = clone(base);
    // Older custom themes had no signature field; never inherit a built-in motif.
    if (!Object.hasOwn(input, "signature")) out.signature = null;
    for (const key of Object.keys(out)) {
      if (!Object.hasOwn(input, key)) continue;
      const v = input[key];
      if (key === "catalogVersion") {
        out[key] = Number(v) === MD.CATALOG_VERSION ? MD.CATALOG_VERSION : 0;
        continue;
      }
      if (key === "signature") {
        out[key] =
          typeof v === "string" && Object.hasOwn(MD.SIGNATURES, v) ? v : null;
        continue;
      }
      if (key === "milestoneKey") {
        out[key] =
          typeof v === "string" &&
          Object.values(builtins).some((t) => t.milestoneKey === v)
            ? v
            : null;
        continue;
      }
      if (key === "milestoneVariant") {
        out[key] = ["light", "dark"].includes(v) ? v : null;
        continue;
      }
      if (key === "themeVersion") {
        out[key] = Number(v) === 2 ? 2 : 1;
        continue;
      }
      if (key === "ornamentAsset") {
        out[key] =
          typeof v === "string" && Object.hasOwn(THEME_ASSETS, v) ? v : null;
        continue;
      }
      if (key === "quoteSeal") {
        if (v === null) {
          out[key] = null;
          continue;
        }
        if (v && typeof v === "object")
          out[key] = {
            type: v.type === "wax" ? "wax" : "chinese",
            text: String(v.text || "雅")
              .replace(/[<>]/g, "")
              .slice(0, 5),
            color: /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(v.color || "")
              ? v.color
              : "#C0392B",
            shape: v.shape === "round" ? "round" : "square",
          };
      } else if (numericLimits[key]) {
        const n = Number(v),
          [min, max] = numericLimits[key];
        if (Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n));
      } else if (themeStringKeys.has(key)) {
        if (v === null) {
          out[key] = null;
          continue;
        }
        if (typeof v === "string" && v.length <= 200 && !/[<>;{}\\]/.test(v))
          out[key] = v.replace(/"/g, "'");
      } else if (typeof out[key] === "boolean") {
        if (typeof v === "boolean") out[key] = v;
      } else if (
        typeof v === "string" &&
        /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(v)
      ) {
        out[key] = v;
      }
    }
    out.name = String(out.name || "自定义主题").slice(0, 60);
    return out;
  }
  function getJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      if (key === STORE) initialDocumentRaw = value;
      return value === null ? fallback : JSON.parse(value);
    } catch {
      initialStorageError = true;
      return fallback;
    }
  }
  const storedLibrary = getJSON(LIBRARY, {});
  if (
    storedLibrary &&
    typeof storedLibrary === "object" &&
    !Array.isArray(storedLibrary)
  ) {
    Object.entries(storedLibrary)
      .slice(0, 80)
      .forEach(([id, t]) => {
        if (/^(?:custom|mix)-[\w-]+$/.test(id)) {
          try {
            MD.THEMES[id] = validateTheme(
              t,
              Number(t.themeVersion) === 2 ? builtins.gold : legacyBase,
            );
          } catch {}
        }
      });
  }
  function normalizeDocument(input, options = {}) {
    if (
      !input ||
      typeof input.source !== "string" ||
      input.source.length > MODEL.MAX_DOCUMENT
    )
      throw new Error("无效的文档内容，或文档超过 3 MB");
    let theme = Object.hasOwn(MD.THEMES, input.themeId)
      ? input.themeId
      : /^(?:custom|mix)-[\w-]+$/.test(input.themeId || "") &&
          input.themeSnapshot
        ? input.themeId
        : "gold";
    const base = MD.THEMES[theme] || builtins.gold;
    const upgradeBuiltin =
      Object.hasOwn(builtins, theme) &&
      Number(input.themeSnapshot?.catalogVersion || 0) < MD.CATALOG_VERSION;
    const themeSnapshotBeforeUpgrade =
      upgradeBuiltin && input.themeSnapshot
        ? validateTheme(
            input.themeSnapshot,
            Number(input.themeSnapshot.themeVersion) === 2
              ? builtins.gold
              : legacyBase,
          )
        : input.themeSnapshotBeforeUpgrade
          ? validateTheme(
              input.themeSnapshotBeforeUpgrade,
              Number(input.themeSnapshotBeforeUpgrade.themeVersion) === 2
                ? builtins.gold
                : legacyBase,
            )
          : undefined;
    let themeSnapshot = upgradeBuiltin
      ? clone(base)
      : validateTheme(
          input.themeSnapshot || base,
          Number((input.themeSnapshot || base).themeVersion) === 2
            ? base
            : legacyBase,
        );
    if (!Object.hasOwn(MD.THEMES, theme) && options.registerTheme !== false)
      MD.THEMES[theme] = clone(themeSnapshot);
    let recipe = Object.hasOwn(MD.RECIPES, input.recipeId)
      ? input.recipeId
      : "default";
    const overrides = {};
    if (input.overrides && typeof input.overrides === "object")
      for (const key of [
        "bodySize",
        "lineHeight",
        "paraIndent",
        "showDecorations",
        "showTemplateText",
      ]) {
        const v = input.overrides[key];
        if (
          ["paraIndent", "showDecorations", "showTemplateText"].includes(key)
        ) {
          if (typeof v === "boolean") overrides[key] = v;
        } else if (
          Number.isFinite(Number(v)) &&
          Object.hasOwn(input.overrides, key)
        ) {
          const [a, b] = numericLimits[key];
          overrides[key] = Math.min(b, Math.max(a, Number(v)));
        }
      }
    const media = MODEL.normalizeAssets(
      input.source.replace(/\r\n?/g, "\n"),
      input.assets || {},
      parser,
    );
    if (media.source.length > MAX_SOURCE) throw new Error("正文超过 3 MB");
    return {
      version: 3,
      source: media.source,
      assets: media.assets,
      themeId: theme,
      themeSnapshot,
      ...(themeSnapshotBeforeUpgrade ? { themeSnapshotBeforeUpgrade } : {}),
      recipeId: recipe,
      overrides,
      updatedAt: input.updatedAt || new Date().toISOString(),
    };
  }
  let state;
  try {
    const saved = getJSON(STORE, null) || getJSON("acks-md-document-v2", null);
    if (saved) state = normalizeDocument(saved);
    else {
      let old = null;
      try {
        old = localStorage.getItem("md-editor-src");
      } catch {
        initialStorageError = true;
      }
      state = normalizeDocument({
        source: old === null ? DEFAULT_SOURCE : old,
        assets: old === null ? clone(DEFAULT_ASSETS) : {},
        themeId: "gold",
        recipeId: "default",
      });
    }
  } catch {
    initialStorageError = true;
    state = normalizeDocument({
      source: DEFAULT_SOURCE,
      assets: clone(DEFAULT_ASSETS),
      themeId: "gold",
    });
  }
  lastCheckpoint = JSON.stringify(state);
  function effective(settings = draft || state) {
    const base =
      settings.themeSnapshot || MD.THEMES[settings.themeId] || builtins.gold;
    return MD.stabilizeTheme(
      validateTheme(
        {
          ...base,
          ...MD.RECIPES[settings.recipeId].overrides,
          ...settings.overrides,
        },
        base,
      ),
    );
  }
  function renderTheme(root, source, settings = draft || state) {
    const t = effective(settings);
    paintTokens(root, t);
    const doc = document.createElement("section");
    doc.className = t.milestoneKey ? "ms-doc" : "md-doc";
    if (t.milestoneKey)
      doc.dataset.milestone =
        t.milestoneKey + "-" + (t.milestoneVariant || "light");
    doc.dataset.revision = String(t.themeVersion || 1);
    doc.dataset.profile = t.editorialProfile || "legacy";
    fillArticle(doc, source);
    applyDesignAttrs(doc, t);
    applyDecorations(doc, t);
    applyLayout(doc, t);
    const title = doc.querySelector("h1");
    if (
      (t.layout === "framed" || t.themeVersion === 2) &&
      title &&
      !title.children.length &&
      title.textContent.includes("，") &&
      title.textContent.length < 25
    ) {
      const value = title.textContent,
        at = value.indexOf("，") + 1;
      title.replaceChildren();
      for (const text of [value.slice(0, at), value.slice(at)]) {
        const line = document.createElement("span");
        line.className =
          "title-line" + (text.length > 9 ? " title-line-long" : "");
        line.textContent = text;
        title.append(line);
      }
    }
    // Decorations are also untrusted after a custom-theme import.
    const safe = cleanHTML(doc.outerHTML);
    root.replaceChildren(safe);
    root
      .querySelectorAll("a")
      .forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));
    return root.firstElementChild;
  }
  function toast(message, error = false) {
    const el = $("toast");
    el.textContent = message;
    el.classList.toggle("error", error);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 4200);
  }
  let documentStore;
  function storageConflict(info) {
    dirty = true;
    $("save-conflict").classList.remove("hidden");
    $("conflict-message").textContent =
      info.reason === "unsupported"
        ? "此浏览器无法提供安全的多窗口保存，请下载文稿备份。"
        : info.recovered
          ? "其他窗口已更新文稿。自动保存已暂停，本窗口内容已留存冲突备份。"
          : "其他窗口已更新文稿。自动保存已暂停，请先下载本窗口内容。";
    for (const id of ["save-state", "mobile-save"]) {
      $(id).textContent = "保存暂停 · 文稿冲突";
      $(id).classList.add("error");
    }
  }
  try {
    documentStore = DOCUMENT_STORE.create({
      storage: localStorage,
      key: STORE,
      initialValue:
        initialDocumentRaw === undefined ? null : initialDocumentRaw,
      locks: navigator.locks,
      notify: storageConflict,
    });
  } catch {
    initialStorageError = true;
  }
  async function saveNow() {
    clearTimeout(saveTimer);
    const snapshot = clone(state);
    const contentBefore = JSON.stringify({ ...state, updatedAt: "" });
    snapshot.updatedAt = new Date().toISOString();
    try {
      if (!documentStore) throw new Error("存储不可用");
      const result = await documentStore.save(snapshot);
      if (!result.ok) return false;
      if (JSON.stringify({ ...state, updatedAt: "" }) !== contentBefore)
        return false;
      state.updatedAt = snapshot.updatedAt;
      if (articleLibrary && activeDocumentId) {
        try {
          await articleLibrary.put(activeDocumentId, snapshot);
          libraryStorageError = false;
          renderLibrary();
        } catch {
          libraryStorageError = true;
        }
      }
      dirty = false;
      for (const id of ["save-state", "mobile-save"]) {
        $(id).textContent = libraryStorageError
          ? "当前稿已保存 · 文章柜异常"
          : "已保存到此浏览器";
        $(id).classList.toggle("error", libraryStorageError);
      }
      return true;
    } catch {
      for (const id of ["save-state", "mobile-save"]) {
        $(id).textContent = "保存失败 · 请下载备份";
        $(id).classList.add("error");
      }
      dirty = true;
      return false;
    }
  }
  function scheduleSave() {
    dirty = true;
    $("save-state").textContent = "保存中…";
    $("mobile-save").textContent = "保存中…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), 500);
  }
  function checkpoint() {
    if (checkpointSuppressed) return;
    const next = JSON.stringify({ ...state, updatedAt: "" });
    if (undoStack.at(-1) === next) return;
    undoStack.push(next);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = [];
    lastCheckpoint = next;
  }
  window.addEventListener("storage", (event) => {
    if (event.key === STORE) documentStore?.check(state);
  });
  $("conflict-download").addEventListener("click", () => {
    try {
      download(
        JSON.stringify(MODEL.portableDocument(state, parser), null, 2),
        fileTitle() + "-本窗口备份.acks.json",
      );
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("conflict-load").addEventListener("click", async () => {
    try {
      if (
        !(await ask(
          "本窗口内容会留存在文档历史的冲突备份中，然后载入较新版本。继续吗？",
        ))
      )
        return;
      const next = documentStore.acceptLatest(state, normalizeDocument);
      activeBlock = null;
      draft = null;
      state = next;
      dirty = false;
      undoStack = [];
      redoStack = [];
      for (const id of ["save-state", "mobile-save"]) {
        $(id).textContent = "已保存到本机";
        $(id).classList.remove("error");
      }
      $("save-conflict").classList.add("hidden");
      $("style-panel").classList.add("hidden");
      document.body.classList.remove("styling", "sheet-expanded");
      setMode("write");
      toast("已载入较新版本；本窗口旧稿在文档历史中。");
    } catch (e) {
      toast(e.message, true);
    }
  });
  function updateTitle() {
    $("asset-note").classList.toggle(
      "hidden",
      !state.source.includes("asset:img-"),
    );
    const heading = state.source.match(/^#\s+(.+)$/m);
    $("document-title").textContent = heading
      ? heading[1].replace(/[*_`]/g, "")
      : "未命名文档";
    $("theme-current").title = "选择文章主题、配方与排版微调";
    $("theme-label").textContent =
      (draft ? "预览：" : "") +
      effective().name +
      " / " +
      MD.RECIPES[(draft || state).recipeId].name;
  }
  function setSource(source, { record = true } = {}) {
    if (source.length > MAX_SOURCE) {
      toast("内容超过 3 MB，无法继续插入。请先下载备份。", true);
      return false;
    }
    if (record) checkpoint();
    source = source.replace(/\r\n?/g, "\n");
    if (source.includes("data:image/")) {
      try {
        const media = MODEL.normalizeAssets(source, state.assets || {}, parser);
        state.source = media.source;
        state.assets = media.assets;
      } catch (e) {
        toast("图片转换失败：" + e.message, true);
        return false;
      }
    } else state.source = source;
    updateTitle();
    scheduleSave();
    return true;
  }
  function tokenize() {
    blocks = [];
    let offset = 0;
    const tokens = parser.lexer(state.source);
    for (const token of tokens) {
      const start = offset;
      offset += token.raw.length;
      if (token.type === "space") continue;
      blocks.push({
        start,
        end: offset,
        raw: token.raw,
        type: token.type,
        token,
        links: tokens.links,
      });
    }
  }
  function renderOutline() {
    const root = $("outline-items");
    root.replaceChildren();
    let offset = 0;
    for (const token of parser.lexer(state.source)) {
      const start = offset;
      offset += token.raw.length;
      if (token.type !== "heading") continue;
      const button = document.createElement("button");
      button.className = "level-" + token.depth;
      button.textContent = token.text.replace(/[*_`]/g, "");
      button.addEventListener("click", () => {
        if (mode !== "write") setMode("write");
        const el = $("writer").querySelector('[data-start="' + start + '"]');
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      root.append(button);
    }
    if (!root.children.length) {
      const p = document.createElement("p");
      p.className = "panel-help";
      p.textContent = "添加标题后，大纲会出现在这里。";
      root.append(p);
    }
  }
  function renderWriter() {
    tokenize();
    const root = $("writer");
    root.replaceChildren();
    if (!blocks.length) {
      const empty = document.createElement("section"),
        title = document.createElement("h2"),
        help = document.createElement("p"),
        editor = document.createElement("textarea");
      empty.className = "empty-document";
      title.textContent = "开始一篇新文章";
      help.textContent =
        "输入 Markdown，或先写下一个标题。内容会自动保存到此浏览器。";
      editor.className = "block-editor empty-document-editor";
      editor.spellcheck = false;
      editor.placeholder = "# 输入文章标题\n\n从这里开始写作…";
      editor.setAttribute("aria-label", "编辑空白 Markdown 文章");
      let started = false;
      editor.addEventListener("focus", () =>
        $("format-dock").classList.remove("hidden"),
      );
      editor.addEventListener("input", () => {
        if (!started) {
          checkpoint();
          started = true;
        }
        setSource(editor.value, { record: false });
        resizeEditor(editor);
      });
      editor.addEventListener("compositionstart", () => (composing = true));
      editor.addEventListener("compositionend", () => {
        composing = false;
        setSource(editor.value, { record: false });
        resizeEditor(editor);
      });
      editor.addEventListener("blur", () => {
        setTimeout(() => {
          if (document.activeElement.closest?.("#format-dock")) return;
          $("format-dock").classList.add("hidden");
          if (state.source.trim()) renderWriter();
        }, 80);
      });
      empty.append(title, help, editor);
      root.append(empty);
      renderOutline();
      requestAnimationFrame(() => editor.focus());
      return;
    }
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i],
        el = document.createElement("div");
      el.className = "write-block";
      el.dataset.index = i;
      el.dataset.start = block.start;
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute(
        "aria-label",
        "编辑" +
          (block.type === "heading" ? "标题" : "段落") +
          "：" +
          block.raw.replace(/[#*`]/g, "").slice(0, 35),
      );
      // Use the full document's reference definitions for per-block display.
      const one = [block.token];
      one.links = block.links;
      el.replaceChildren(cleanHTML(parser.parser(one)));
      el.querySelectorAll("a").forEach((a) => {
        a.removeAttribute("href");
        a.removeAttribute("tabindex");
      });
      root.append(el);
    }
    renderOutline();
  }
  function resizeEditor(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(55, ta.scrollHeight + 4) + "px";
  }
  function beginBlock(index) {
    if (composing) return;
    if (activeBlock && activeBlock.index === index) return;
    let targetStart = blocks[index]?.start;
    if (activeBlock && targetStart > activeBlock.start) {
      const ta = $("writer").querySelector("textarea");
      targetStart +=
        (ta?.value.length || 0) - (activeBlock.end - activeBlock.start);
    }
    finishBlock();
    if (targetStart !== undefined) {
      const updated = blocks.findIndex((b) => b.start === targetStart);
      if (updated >= 0) index = updated;
    }
    const block = blocks[index];
    if (!block) return;
    const el = $("writer").querySelector('[data-index="' + index + '"]');
    if (!el) return;
    checkpoint();
    activeBlock = {
      ...block,
      index,
      prefix: state.source.slice(0, block.start),
      suffix: state.source.slice(block.end),
    };
    const ta = document.createElement("textarea");
    ta.className = "block-editor";
    ta.spellcheck = false;
    ta.setAttribute("aria-label", "编辑当前 Markdown 段落");
    ta.value = block.raw;
    el.replaceChildren(ta);
    el.removeAttribute("role");
    el.removeAttribute("tabindex");
    ta.addEventListener("input", () => {
      setSource(activeBlock.prefix + ta.value + activeBlock.suffix, {
        record: false,
      });
      const normalized = state.source.slice(
        activeBlock.prefix.length,
        state.source.length - activeBlock.suffix.length,
      );
      if (ta.value !== normalized) ta.value = normalized;
      resizeEditor(ta);
    });
    ta.addEventListener("compositionstart", () => (composing = true));
    ta.addEventListener("compositionend", () => {
      composing = false;
      setSource(activeBlock.prefix + ta.value + activeBlock.suffix, {
        record: false,
      });
      resizeEditor(ta);
    });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !composing) {
        e.preventDefault();
        finishBlock();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !composing) {
        e.preventDefault();
        finishBlock();
      }
    });
    $("format-dock").classList.remove("hidden");
    ta.focus();
    ta.setSelectionRange(ta.value.length, ta.value.length);
    resizeEditor(ta);
  }
  function finishBlock() {
    if (!activeBlock || composing) return;
    activeBlock = null;
    $("format-dock").classList.add("hidden");
    renderWriter();
    saveNow();
  }
  $("writer").addEventListener("click", (e) => {
    if (e.target.closest("a")) e.preventDefault();
    const el = e.target.closest(".write-block");
    if (el && !e.target.closest("textarea"))
      beginBlock(Number(el.dataset.index));
  });
  $("writer").addEventListener("keydown", (e) => {
    if (
      (e.key === "Enter" || e.key === " ") &&
      e.target.classList.contains("write-block")
    ) {
      e.preventDefault();
      beginBlock(Number(e.target.dataset.index));
    }
  });
  $("append-block").addEventListener("click", () => {
    finishBlock();
    const before = state.source.replace(/\s*$/, "");
    setSource(before + "\n\n开始写作…\n");
    renderWriter();
    beginBlock(blocks.length - 1);
    const ta = $("writer").querySelector("textarea");
    ta?.select();
  });
  $("finish-block").addEventListener("click", () => {
    finishBlock();
    $("format-dock").classList.add("hidden");
    editingTextarea()?.blur();
    saveNow();
  });
  function setMode(next) {
    if (composing) return;
    finishBlock();
    $("format-dock").classList.add("hidden");
    mode = next;
    document.body.classList.remove("mode-write", "mode-source", "mode-preview");
    document.body.classList.add("mode-" + mode);
    $("writing-pane").classList.toggle("hidden", mode !== "write");
    $("source-pane").classList.toggle("hidden", mode !== "source");
    $("preview-pane").classList.toggle("hidden", mode !== "preview");
    document
      .querySelectorAll("[data-mode]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.mode === mode)),
      );
    if (mode === "write") renderWriter();
    if (mode === "source") {
      $("src").value = state.source;
      $("src").setSelectionRange(sourceSelection.start, sourceSelection.end);
    }
    if (mode === "preview") renderPreview();
    updateTitle();
  }
  document
    .querySelectorAll("[data-mode]")
    .forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  $("src").addEventListener("input", () => {
    setSource($("src").value);
    if ($("src").value !== state.source) $("src").value = state.source;
    sourceSelection = {
      start: $("src").selectionStart,
      end: $("src").selectionEnd,
    };
  });
  $("src").addEventListener("compositionstart", () => (composing = true));
  $("src").addEventListener("compositionend", () => (composing = false));
  $("src").addEventListener(
    "select",
    () =>
      (sourceSelection = {
        start: $("src").selectionStart,
        end: $("src").selectionEnd,
      }),
  );
  function closeLibraryDrawer() {
    document.body.classList.remove("library-drawer-open");
    $("library-scrim").classList.add("hidden");
    if (matchMedia("(max-width: 720px)").matches)
      $("outline-toggle").setAttribute("aria-expanded", "false");
  }
  $("outline-toggle").addEventListener("click", () => {
    if (matchMedia("(max-width: 720px)").matches) {
      const open = document.body.classList.toggle("library-drawer-open");
      $("library-scrim").classList.toggle("hidden", !open);
      $("outline-toggle").setAttribute("aria-expanded", String(open));
      return;
    }
    const hidden = document.body.classList.toggle("outline-hidden");
    $("outline-toggle").setAttribute("aria-expanded", String(!hidden));
  });
  $("library-scrim").addEventListener("click", closeLibraryDrawer);
  function renderPreview() {
    try {
      renderTheme($("preview"), state.source);
      $("preview").classList.toggle("hidden", previewKind !== "rich");
      $("wxframe").classList.toggle("hidden", previewKind !== "export");
      $("preview-status").textContent = draft ? "预览中" : "已应用";
      $("preview-rich").setAttribute(
        "aria-pressed",
        String(previewKind === "rich"),
      );
      $("preview-export").setAttribute(
        "aria-pressed",
        String(previewKind === "export"),
      );
      $("export-notice").classList.toggle("hidden", previewKind !== "export");
      if (previewKind === "export") {
        const output = exportHTML();
        $("wxframe").srcdoc =
          '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;"><style>body{margin:0;background:#fff}*{box-sizing:border-box}</style></head><body>' +
          output.html +
          "</body></html>";
        $("export-notice").textContent = output.notice;
      }
    } catch (e) {
      toast("渲染失败：" + e.message, true);
    }
  }
  $("preview-rich").addEventListener("click", () => {
    previewKind = "rich";
    renderPreview();
  });
  $("preview-export").addEventListener("click", () => {
    previewKind = "export";
    renderPreview();
  });
  $("wxframe").addEventListener("load", () => {
    try {
      $("wxframe").style.height =
        Math.max(400, $("wxframe").contentDocument.body.scrollHeight + 10) +
        "px";
    } catch {}
  });

  function openStyles(event) {
    if (composing) return;
    restoreFocus = document.activeElement;
    finishBlock();
    draft = clone(state);
    previewKind = "rich";
    setMode("preview");
    document.body.classList.add("styling");
    $("style-panel").classList.remove("hidden");
    $("theme-current").setAttribute("aria-expanded", "true");
    fullLibrary = false;
    $("theme-collection").value = "all";
    $("theme-appearance").value = "all";
    $("theme-search").value = "";
    $("theme-search").classList.add("hidden");
    document.body.classList.remove("sheet-expanded");
    setStyleTab("themes");
    renderChoices();
    renderPreview();
    if (!event || event.detail === 0)
      $("style-cancel").focus({ preventScroll: true });
  }
  async function closeStyles(apply = false) {
    if (!draft) return;
    if (apply) {
      checkpoint();
      state = {
        ...state,
        themeId: draft.themeId,
        themeSnapshot: clone(draft.themeSnapshot),
        recipeId: draft.recipeId,
        overrides: clone(draft.overrides),
      };
      scheduleSave();
    }
    draft = null;
    document.body.classList.remove("styling", "sheet-expanded");
    $("style-panel").classList.add("hidden");
    $("theme-current").setAttribute("aria-expanded", "false");
    updateTitle();
    renderPreview();
    if (apply)
      toast(
        (await saveNow())
          ? "排版已应用并保存到本机"
          : "已应用，但保存失败，请下载完整文档",
        !dirty ? false : true,
      );
    restoreFocus?.focus?.({ preventScroll: true });
  }
  for (const id of ["theme-current", "style-open", "dock-style"])
    $(id).addEventListener("click", openStyles);
  $("style-cancel").addEventListener("click", () => closeStyles());
  $("style-apply").addEventListener("click", () => closeStyles(true));
  $("sheet-height").addEventListener("click", () =>
    document.body.classList.toggle("sheet-expanded"),
  );
  function setStyleTab(next) {
    panelTab = next;
    $("theme-expand-row").classList.toggle("hidden", next !== "themes");
    document
      .querySelectorAll("[data-style-tab]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.styleTab === next)),
      );
    for (const key of ["themes", "recipes", "tweaks"])
      $(key + "-tab").classList.toggle("hidden", key !== next);
    if (next === "recipes") renderRecipes();
    if (next === "tweaks") renderTweaks();
  }
  document
    .querySelectorAll("[data-style-tab]")
    .forEach((b) =>
      b.addEventListener("click", () => setStyleTab(b.dataset.styleTab)),
    );
  function selectTheme(id) {
    if (!draft) return;
    draft.themeId = id;
    draft.themeSnapshot = clone(MD.THEMES[id]);
    draft.overrides = {};
    updateTitle();
    renderChoices();
    renderPreview();
  }
  function renderChoices() {
    if (!draft) return;
    const all = Object.keys(MD.THEMES),
      query = $("theme-search").value.trim().toLowerCase();
    $("theme-total").textContent = all.length;
    $("expand-label").textContent = fullLibrary
      ? "收起全部主题"
      : "展开全部主题（" + all.length + " 款）";
    $("all-themes").setAttribute("aria-expanded", String(fullLibrary));
    $("theme-filters").classList.toggle("hidden", !fullLibrary);
    let keys = fullLibrary ? all : ["gold", "song-ink", "dark"];
    if (!fullLibrary && !keys.includes(draft.themeId))
      keys = [keys[0], draft.themeId, keys[2]];
    if (query)
      keys = all.filter((k) => MD.THEMES[k].name.toLowerCase().includes(query));
    if (fullLibrary) {
      const collection = $("theme-collection").value,
        appearance = $("theme-appearance").value;
      keys = keys.filter((k) => {
        const meta = MD.THEME_META[k];
        return (
          (collection === "all" ||
            (meta?.collection || "custom") === collection) &&
          (appearance === "all" ||
            (meta?.mode ||
              (MD.luminance(MD.THEMES[k].bg) < 0.4 ? "dark" : "light")) ===
              appearance)
        );
      });
    }
    const grid = $("theme-grid");
    grid.replaceChildren();
    for (const id of keys) {
      const t = MD.THEMES[id],
        b = document.createElement("button");
      b.className = "theme-card";
      b.title = MD.THEME_META[id]?.description || t.name;
      b.setAttribute("aria-label", "预览主题 " + t.name);
      b.setAttribute("aria-pressed", String(id === draft.themeId));
      const thumb = document.createElement("div");
      thumb.className = "theme-thumb";
      const surface = document.createElement("div");
      surface.className = "theme-surface";
      surface.setAttribute("aria-hidden", "true");
      renderTheme(surface, MINI_SOURCE, {
        themeId: id,
        themeSnapshot: t,
        recipeId: "default",
        overrides: {},
      });
      thumb.append(surface);
      const label = document.createElement("span");
      label.className = "theme-name";
      label.textContent = t.name;
      const check = document.createElement("span");
      check.className = "selected-mark";
      check.dataset.icon = "check";
      const family = document.createElement("small");
      family.className = "theme-collection-label";
      family.textContent =
        MD.THEME_META[id]?.collection === "milestone"
          ? "Milestone"
          : MD.THEME_META[id]?.collection === "acks"
            ? "ACKS"
            : "我的主题";
      b.append(thumb, label, family, check);
      b.addEventListener("click", () => selectTheme(id));
      grid.append(b);
    }
    icons(grid);
    $("theme-empty").classList.toggle("hidden", keys.length !== 0);
    $("theme-trial").textContent = "已预览「" + effective().name + "」";
    const meta = MD.THEME_META[draft.themeId];
    if (meta) $("theme-trial").textContent += " · " + meta.category;
    requestAnimationFrame(() =>
      grid.querySelectorAll(".theme-thumb").forEach((n) => {
        const scale = n.clientWidth / 375;
        n.firstElementChild.style.transform = "scale(" + scale + ")";
      }),
    );
  }
  $("all-themes").addEventListener("click", () => {
    fullLibrary = !fullLibrary;
    $("theme-search").classList.toggle("hidden", !fullLibrary);
    document.body.classList.toggle("sheet-expanded", fullLibrary);
    $("theme-search").value = "";
    $("theme-filters").classList.toggle("hidden", !fullLibrary);
    renderChoices();
  });
  $("theme-search").addEventListener("input", renderChoices);
  for (const id of ["theme-collection", "theme-appearance"])
    $(id).addEventListener("change", renderChoices);
  const RECIPE_DESCRIPTION = {
    default: "保留主题原有版式",
    tutorial: "步骤编号、代码与清晰引用",
    opinion: "首段导读与观点结构",
    data: "编号标题与数据表格",
    list: "编号、清单与卡片引用",
    essay: "导读、首行缩进与长文节奏",
    tech: "代码块、编号与技术说明",
    news: "导读和简报结构",
    product: "导读、列表与产品表达",
  };
  function renderRecipes() {
    const root = $("recipe-list");
    root.replaceChildren();
    for (const [id, r] of Object.entries(MD.RECIPES)) {
      const b = document.createElement("button");
      b.setAttribute("aria-pressed", String(draft.recipeId === id));
      const span = document.createElement("span");
      span.textContent = r.name;
      const small = document.createElement("small");
      small.textContent = RECIPE_DESCRIPTION[id];
      span.append(small);
      b.append(span);
      if (draft.recipeId === id) {
        const check = document.createElement("span");
        check.dataset.icon = "check";
        b.append(check);
      }
      b.addEventListener("click", () => {
        draft.recipeId = id;
        renderRecipes();
        renderPreview();
        updateTitle();
        $("theme-trial").textContent = "配方：" + r.name;
      });
      root.append(b);
    }
    icons(root);
  }
  function renderTweaks() {
    const t = effective();
    for (const [id, value, suffix] of [
      ["tweak-size", t.bodySize, " px"],
      ["tweak-line", t.lineHeight, ""],
    ]) {
      const select = $(id);
      select
        .querySelectorAll("[data-current-value]")
        .forEach((o) => o.remove());
      if (![...select.options].some((o) => o.value === String(value))) {
        const option = new Option(String(value) + suffix, String(value));
        option.dataset.currentValue = "true";
        select.add(option);
      }
      select.value = String(value);
    }
    $("tweak-indent").checked = t.paraIndent !== false;
    $("tweak-decor").checked = t.showDecorations !== false;
    $("tweak-decor-row").classList.toggle(
      "hidden",
      !t.signature &&
        !t.ornamentAsset &&
        !t.dividerDeco &&
        !t.titleSwash &&
        !t.quoteSeal,
    );
    $("tweak-copy").checked =
      t.showTemplateText === true ||
      (!t.themeVersion && t.showTemplateText !== false);
    $("tweak-copy-row").classList.toggle(
      "hidden",
      !t.kickerText && !t.footerText && !t.stickerText && !t.quoteSeal,
    );
  }
  for (const [id, key] of [
    ["tweak-size", "bodySize"],
    ["tweak-line", "lineHeight"],
    ["tweak-indent", "paraIndent"],
    ["tweak-decor", "showDecorations"],
    ["tweak-copy", "showTemplateText"],
  ])
    $(id).addEventListener("change", () => {
      draft.overrides[key] = [
        "paraIndent",
        "showDecorations",
        "showTemplateText",
      ].includes(key)
        ? $(id).checked
        : Number($(id).value);
      renderPreview();
      $("theme-trial").textContent = "微调尚未保存，点击应用排版";
    });
  $("tweak-reset").addEventListener("click", () => {
    draft.overrides = {};
    renderTweaks();
    renderPreview();
  });

  const EXPORT_TAGS = new Set(
    "section article p h1 h2 h3 h4 h5 h6 span strong em b i u del s sup sub blockquote ul ol li table thead tbody tr th td code pre br hr a img".split(
      " ",
    ),
  );
  function exportHTML() {
    const root = $("export-stage");
    root.classList.add("theme-surface");
    const doc = renderTheme(root, state.source);
    const theme = effective();
    const vertical = theme.milestoneKey === "cnvertical";
    if (vertical) doc.dataset.exportLayout = "horizontal";
    let images = 0;
    let mediaDecorations = 0;
    function serialize(node) {
      if (node.nodeType === 3) return esc(node.textContent);
      if (node.nodeType !== 1) return "";
      const tag = node.tagName.toLowerCase();
      if (node.classList.contains("md-dotbar")) return "";
      if (node.classList.contains("md-theme-art")) {
        mediaDecorations++;
        return "";
      }
      if (node.namespaceURI === "http://www.w3.org/2000/svg") {
        const svg = node.cloneNode(true);
        const size = getComputedStyle(node);
        svg.setAttribute("width", size.width);
        svg.setAttribute("height", size.height);
        return DOMPurify.sanitize(svg.outerHTML, {
          USE_PROFILES: { svg: true, svgFilters: true },
          FORBID_TAGS: [
            "script",
            "foreignObject",
            "animate",
            "set",
            "image",
            "use",
          ],
          FORBID_ATTR: ["href", "xlink:href", "style"],
        });
      }
      if (!EXPORT_TAGS.has(tag)) return "";
      if (tag === "img") {
        images++;
        return (
          '<span style="display:block;font-size:13px;color:#666;background:#f5f5f5;padding:18px;text-align:center;line-height:1.7">图片' +
          (node.alt ? "：" + esc(node.alt) : "") +
          "（请在公众号后台重新上传）</span>"
        );
      }
      if (tag === "br") return "<br>";
      const cs = getComputedStyle(node);
      let style = collectStyle(node, null);
      const add = [];
      if (cs.textDecorationStyle === "wavy")
        add.push("text-decoration-style:wavy", "text-underline-offset:.2em");
      if (cs.textEmphasisStyle && cs.textEmphasisStyle !== "none")
        add.push(
          "text-emphasis-style:" + cs.textEmphasisStyle,
          "-webkit-text-emphasis-style:" + cs.textEmphasisStyle,
          "text-emphasis-position:under right",
          "-webkit-text-emphasis-position:under right",
        );
      add.push("font-family:" + cs.fontFamily.replace(/"/g, "'"));
      if (tag === "pre") {
        add.push(
          "white-space:pre-wrap",
          "overflow-wrap:anywhere",
          "tab-size:2",
          "text-indent:0",
        );
      }
      if (tag === "code" && node.parentElement?.tagName === "PRE") {
        add.push(
          "display:block",
          "white-space:pre-wrap",
          "overflow-wrap:anywhere",
          "text-indent:0",
        );
      }
      if (tag === "table") add.push("border-collapse:collapse", "width:100%");
      if (["ul", "ol", "li"].includes(tag))
        add.push("list-style-type:" + cs.listStyleType);
      if (cs.display === "inline-block") add.push("display:inline-block");
      if (cs.writingMode !== "horizontal-tb")
        add.push("writing-mode:" + cs.writingMode);
      if (cs.display === "block" && tag === "span") add.push("display:block");
      if (
        node.classList.contains("title-line") &&
        !node.classList.contains("title-line-long")
      )
        add.push("white-space:nowrap");
      if (tag === "section" || tag === "article")
        add.push("max-width:100%", "overflow-wrap:anywhere");
      style += ";" + add.join(";");
      let attrs = "";
      if (tag === "a") {
        const href = safeUrl(node.getAttribute("href"));
        if (href) attrs += ' href="' + esc(href) + '"';
      }
      for (const key of ["start", "colspan", "rowspan"]) {
        const value = node.getAttribute(key);
        if (value && /^\d{1,3}$/.test(value))
          attrs += " " + key + '="' + value + '"';
      }
      let prefix = "";
      const before = getComputedStyle(node, "::before").content;
      if (
        before &&
        before !== "none" &&
        before !== "normal" &&
        /^['"]/.test(before)
      ) {
        prefix = esc(before.slice(1, -1));
      }
      let suffix = "";
      const after = getComputedStyle(node, "::after").content;
      if (
        after &&
        after !== "none" &&
        after !== "normal" &&
        /^['"]/.test(after)
      ) {
        suffix = esc(after.slice(1, -1));
      }
      if (tag === "hr") return '<hr style="' + esc(style) + '">';
      return (
        "<" +
        tag +
        attrs +
        ' style="' +
        esc(style) +
        '">' +
        prefix +
        Array.from(node.childNodes).map(serialize).join("") +
        suffix +
        "</" +
        tag +
        ">"
      );
    }
    const html = serialize(doc);
    const richEffects = !!(
      theme.texture ||
      theme.bgMode !== "solid" ||
      theme.shadow !== "none" ||
      ["chrome", "glow", "overlap", "grad"].includes(theme.titleStyle)
    );
    const notice = [
      vertical ? "中式竖排已为公众号转换为横排，保留配色与标题层级。" : "",
      images ? images + " 张图片需在公众号后台重新上传。" : "",
      mediaDecorations
        ? "纸边、墨迹或玻璃装饰仅用于完整效果；公众号输出保留正文排版。"
        : "",
      richEffects
        ? "纹理、渐变与部分装饰效果已简化；请检查公众号粘贴结果。"
        : "请在公众号后台确认最终显示效果。",
    ]
      .filter(Boolean)
      .join(" ");
    const plain = doc.innerText;
    root.replaceChildren();
    return { html, plain, notice, images };
  }
  async function copyArticle() {
    finishBlock();
    let output;
    try {
      output = exportHTML();
    } catch (e) {
      toast("无法导出：" + e.message, true);
      return;
    }
    let ok = false;
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([output.html], { type: "text/html" }),
            "text/plain": new Blob([output.plain], { type: "text/plain" }),
          }),
        ]);
        ok = true;
      }
    } catch {}
    if (!ok) {
      const holder = document.createElement("div");
      holder.contentEditable = "true";
      holder.style.cssText = "position:fixed;left:-20000px;top:0";
      holder.replaceChildren(cleanHTML(output.html));
      document.body.append(holder);
      const selection = window.getSelection(),
        old = selection.rangeCount
          ? selection.getRangeAt(0).cloneRange()
          : null;
      try {
        const range = document.createRange();
        range.selectNodeContents(holder);
        selection.removeAllRanges();
        selection.addRange(range);
        ok = document.execCommand("copy");
      } catch {
      } finally {
        selection.removeAllRanges();
        if (old)
          try {
            selection.addRange(old);
          } catch {}
        holder.remove();
      }
    }
    if (!ok) {
      toast("复制被浏览器拒绝。可从“更多”下载公众号 HTML。", true);
      return;
    }
    const label = $("copy").querySelector(".copy-label");
    label.textContent = "已复制";
    $("copy").setAttribute("aria-label", "已复制公众号内容");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      label.textContent = "复制到公众号";
      $("copy").setAttribute("aria-label", "复制到公众号");
    }, 2200);
    toast(
      "已复制。" +
        (output.images
          ? output.images + " 张图片需重新上传。"
          : "请在公众号后台粘贴并确认排版。"),
    );
  }
  $("copy").addEventListener("click", copyArticle);
  function download(text, name, type = "application/json") {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function fileTitle() {
    return (
      $("document-title")
        .textContent.replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 60) || "ACKS文章"
    );
  }
  function titleForDocument(document) {
    return DOCUMENT_LIBRARY.titleFromSource(document?.source || "");
  }
  function safeFileTitle(value) {
    return (
      String(value || "未命名文章")
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 60) || "未命名文章"
    );
  }
  function exportCompleteDocument(document = state, title = fileTitle()) {
    try {
      download(
        JSON.stringify(MODEL.portableDocument(document, parser), null, 2),
        safeFileTitle(title) + ".acks.json",
      );
      toast("已下载当前全文、图片资源与排版设置");
      return true;
    } catch (error) {
      toast("导出失败：" + error.message, true);
      return false;
    }
  }
  function formatDocumentDate(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "时间未知";
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    return sameDay
      ? "今天 " +
          date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "numeric", day: "numeric" });
  }
  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    return value < 1024 * 1024
      ? Math.max(1, Math.round(value / 1024)) + " KB"
      : (value / 1024 / 1024).toFixed(1) + " MB";
  }
  function setActiveDocumentId(id) {
    activeDocumentId = id;
    try {
      localStorage.setItem(ACTIVE_DOCUMENT, id);
    } catch {
      libraryStorageError = true;
    }
  }
  function resetDocumentSession(next, id) {
    activeBlock = null;
    draft = null;
    composing = false;
    state = normalizeDocument(next);
    dirty = false;
    undoStack = [];
    redoStack = [];
    lastCheckpoint = JSON.stringify(state);
    sourceSelection = { start: 0, end: 0 };
    setActiveDocumentId(id);
    $("save-conflict").classList.add("hidden");
    for (const key of ["save-state", "mobile-save"]) {
      $(key).textContent = "已保存到此浏览器";
      $(key).classList.remove("error");
    }
    setMode("write");
    closeLibraryDrawer();
  }
  async function writeCurrentMirror(document) {
    if (!documentStore) throw new Error("当前浏览器无法安全保存文稿");
    const result = await documentStore.save(document);
    if (!result.ok) throw new Error("文稿冲突，切换已暂停");
  }
  async function switchArticle(id) {
    if (!articleLibrary || !id || id === activeDocumentId) return;
    try {
      finishBlock();
      if (dirty && !(await saveNow())) return;
      const record = await articleLibrary.get(id);
      if (!record) throw new Error("没有找到这篇本机文章");
      const next = normalizeDocument(record.document);
      await writeCurrentMirror(next);
      resetDocumentSession(next, id);
      await renderLibrary();
      toast("已打开《" + record.title + "》");
    } catch (error) {
      toast(error.message || "文章切换失败", true);
    }
  }
  async function createNewArticle({ quiet = false } = {}) {
    if (!articleLibrary) {
      toast("本机文章柜尚未就绪，未清空当前稿件", true);
      return false;
    }
    try {
      finishBlock();
      if (dirty && !(await saveNow())) return false;
      const id = articleLibrary.createId();
      const next = normalizeDocument({
        source: "",
        assets: {},
        themeId: "gold",
        recipeId: "default",
      });
      next.updatedAt = new Date().toISOString();
      await articleLibrary.put(id, next);
      try {
        await writeCurrentMirror(next);
      } catch (error) {
        await articleLibrary.remove(id).catch(() => {});
        throw error;
      }
      resetDocumentSession(next, id);
      await renderLibrary();
      if (!quiet) toast("已新建空白文章；原文章仍保存在本机文章柜");
      return true;
    } catch (error) {
      toast("新建失败：" + error.message, true);
      return false;
    }
  }
  async function removeArticle(id) {
    if (!articleLibrary) return;
    const record = await articleLibrary.get(id);
    if (!record) return renderLibrary();
    if (
      !(await ask(
        "从此浏览器删除《" +
          record.title +
          "》？删除后无法从服务器找回，请先下载重要文章备份。",
      ))
    )
      return;
    try {
      if (id === activeDocumentId) {
        const others = (await articleLibrary.list()).filter(
          (item) => item.id !== id,
        );
        if (others.length) await switchArticle(others[0].id);
        else if (!(await createNewArticle({ quiet: true }))) return;
      }
      await articleLibrary.remove(id);
      await renderLibrary();
      toast("文章已从此浏览器删除");
    } catch (error) {
      toast("删除失败：" + error.message, true);
    }
  }
  async function exportStoredArticle(id) {
    if (!articleLibrary) return;
    try {
      const record =
        id === activeDocumentId
          ? { title: titleForDocument(state), document: state }
          : await articleLibrary.get(id);
      if (!record) throw new Error("没有找到这篇文章");
      exportCompleteDocument(record.document, record.title);
    } catch (error) {
      toast("导出失败：" + error.message, true);
    }
  }
  async function renderLibrary() {
    const refresh = ++libraryRefresh;
    const root = $("library-items");
    if (!articleLibrary) {
      $("library-status").textContent = libraryStorageError
        ? "文章柜不可用；当前稿仍会尝试自动保存"
        : "正在读取本机文章…";
      return;
    }
    try {
      const rows = await articleLibrary.list();
      if (refresh !== libraryRefresh) return;
      $("library-count").textContent = rows.length;
      root.replaceChildren();
      for (const entry of rows) {
        const row = document.createElement("article"),
          open = document.createElement("button"),
          title = document.createElement("span"),
          meta = document.createElement("span"),
          actions = document.createElement("div"),
          backup = document.createElement("button"),
          remove = document.createElement("button");
        row.className =
          "library-item" + (entry.id === activeDocumentId ? " active" : "");
        open.className = "library-item-open";
        open.setAttribute("aria-label", "打开文章：" + entry.title);
        title.className = "library-item-title";
        title.textContent = entry.title;
        meta.className = "library-item-meta";
        meta.textContent =
          formatDocumentDate(entry.updatedAt) +
          " · " +
          formatBytes(entry.bytes);
        open.append(title, meta);
        open.onclick = () => switchArticle(entry.id);
        actions.className = "library-item-actions";
        backup.dataset.icon = "download-simple";
        backup.title = "下载完整文章";
        backup.setAttribute(
          "aria-label",
          "下载《" + entry.title + "》完整备份",
        );
        backup.onclick = () => exportStoredArticle(entry.id);
        remove.dataset.icon = "x";
        remove.title = "从本机删除";
        remove.setAttribute("aria-label", "从本机删除《" + entry.title + "》");
        remove.onclick = () => removeArticle(entry.id);
        actions.append(backup, remove);
        row.append(open, actions);
        root.append(row);
        icons(row);
      }
      let storageText = "浏览器本地存储";
      try {
        const estimate = await navigator.storage?.estimate?.();
        const persisted = await navigator.storage?.persisted?.();
        if (estimate?.usage)
          storageText += " · 本站已用 " + formatBytes(estimate.usage);
        storageText += persisted ? " · 已获持久保护" : " · 请定期下载备份";
      } catch {}
      $("library-status").textContent = storageText;
    } catch {
      libraryStorageError = true;
      $("library-status").textContent = "文章柜读取失败，请立即下载当前全文";
    }
  }
  async function initializeLibrary() {
    try {
      articleLibrary = await DOCUMENT_LIBRARY.open();
      let requestedId = null;
      try {
        requestedId = localStorage.getItem(ACTIVE_DOCUMENT);
      } catch {}
      const rows = await articleLibrary.list();
      let record = requestedId ? await articleLibrary.get(requestedId) : null;
      if (!record && rows.length) record = await articleLibrary.get(rows[0].id);
      if (record && !requestedId) {
        const next = normalizeDocument(record.document);
        await writeCurrentMirror(next);
        resetDocumentSession(next, record.id);
      } else if (record) {
        const currentTime = Date.parse(state.updatedAt) || 0;
        const storedTime = Date.parse(record.updatedAt) || 0;
        if (storedTime > currentTime) {
          const next = normalizeDocument(record.document);
          await writeCurrentMirror(next);
          resetDocumentSession(next, record.id);
        } else {
          setActiveDocumentId(record.id);
          await articleLibrary.put(record.id, state);
        }
      } else {
        const id = articleLibrary.createId();
        setActiveDocumentId(id);
        await articleLibrary.put(id, state);
      }
      libraryStorageError = false;
      await renderLibrary();
    } catch {
      articleLibrary = null;
      libraryStorageError = true;
      $("library-status").textContent =
        "本机文章柜不可用；请使用“下载当前全文”保存备份";
      $("library-count").textContent = "!";
      toast("本机文章柜初始化失败，当前稿件未被清空。请先下载备份。", true);
    }
  }
  function ask(message) {
    return new Promise((resolve) => {
      const dialog = $("message-dialog");
      $("message-body").textContent = message;
      let done = false;
      const finish = (value) => {
        if (done) return;
        done = true;
        dialog.close();
        resolve(value);
      };
      $("message-ok").onclick = () => finish(true);
      $("message-cancel").onclick = () => finish(false);
      dialog.oncancel = (e) => {
        e.preventDefault();
        finish(false);
      };
      dialog.showModal();
    });
  }
  async function saveFromButton() {
    finishBlock();
    const saved = await saveNow();
    if (!saved) return toast("保存失败，请立即下载完整备份", true);
    try {
      await navigator.storage?.persist?.();
    } catch {}
    await renderLibrary();
    toast(
      libraryStorageError
        ? "当前稿已保存，但文章柜异常，请下载完整备份"
        : "文章已保存到此浏览器",
      libraryStorageError,
    );
  }
  $("save-document").addEventListener("click", saveFromButton);
  for (const id of ["new-document", "library-new"])
    $(id).addEventListener("click", () => createNewArticle());
  $("library-export").addEventListener("click", () => exportCompleteDocument());
  $("library-toggle").addEventListener("click", () => {
    const panel = document.querySelector(".library-panel");
    const collapsed = panel.classList.toggle("collapsed");
    $("library-toggle").setAttribute("aria-expanded", String(!collapsed));
  });
  function loadHistory() {
    const arr = getJSON(HISTORY, null) || getJSON("acks-md-history-v2", null);
    if (Array.isArray(arr)) return arr.slice(0, 20);
    const old = getJSON("md-editor-history", []);
    legacyHistory = true;
    return Array.isArray(old)
      ? old
          .filter((h) => h && typeof h.content === "string")
          .slice(0, 10)
          .map((h) => ({
            id: h.id || Date.now(),
            at: h.t || "",
            document: normalizeDocument({ source: h.content, themeId: "gold" }),
          }))
      : [];
  }
  function saveSnapshot({ quiet = false } = {}) {
    finishBlock();
    try {
      const arr = loadHistory();
      arr.unshift({
        id: Date.now() + "-" + Math.random().toString(36).slice(2, 6),
        at: new Date().toISOString(),
        documentId: activeDocumentId,
        document: clone(state),
      });
      localStorage.setItem(HISTORY, JSON.stringify(arr.slice(0, 20)));
      if (!quiet) toast("当前正文与排版已保存为历史版本");
      return true;
    } catch {
      toast("版本保存失败。请先下载完整文档备份。", true);
      return false;
    }
  }
  function openHistory() {
    finishBlock();
    renderHistory();
    $("history-dialog").showModal();
  }
  function renderHistory() {
    const arr = loadHistory().filter(
      (entry) => !entry.documentId || entry.documentId === activeDocumentId,
    );
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORE + "-recovery-")) {
          const entry = JSON.parse(localStorage.getItem(key));
          arr.unshift({
            id: key,
            at: entry.at,
            document: entry.document,
            recoveryKey: key,
          });
        }
      }
    } catch {}
    const root = $("history-list");
    root.replaceChildren();
    if (!arr.length) {
      const p = document.createElement("p");
      p.className = "history-empty";
      p.textContent = "还没有历史版本。点击上方按钮保存当前文档。";
      root.append(p);
      return;
    }
    arr.forEach((entry, index) => {
      if (!entry?.document || typeof entry.document.source !== "string") return;
      const row = document.createElement("article");
      row.className = "history-item";
      const date = document.createElement("small");
      date.textContent =
        (entry.recoveryKey ? "冲突 / 安全备份 · " : "") +
        (entry.at ? new Date(entry.at).toLocaleString() : "旧版快照");
      const summary = document.createElement("p");
      summary.textContent = entry.document.source
        .slice(0, 90)
        .replace(/\n/g, " ");
      const theme = document.createElement("small");
      theme.textContent = entry.document.themeSnapshot?.name || "旧版正文";
      const footer = document.createElement("footer"),
        restore = document.createElement("button"),
        remove = document.createElement("button");
      restore.className = "secondary";
      restore.textContent = "恢复此版本";
      remove.className = "secondary";
      remove.textContent = "删除";
      restore.onclick = () => {
        let next;
        try {
          next = normalizeDocument(entry.document);
        } catch (e) {
          toast(e.message, true);
          return;
        }
        if (!saveSnapshot({ quiet: true })) return;
        checkpoint();
        state = next;
        scheduleSave();
        $("history-dialog").close();
        setMode("write");
        toast("已恢复；恢复前的文档已保留在历史中");
      };
      remove.onclick = async () => {
        if (!(await ask("删除这个历史版本？当前文档不会改变。"))) return;
        try {
          if (entry.recoveryKey) {
            localStorage.removeItem(entry.recoveryKey);
            renderHistory();
            return;
          }
          const now = loadHistory();
          const key = now.findIndex((h) => String(h.id) === String(entry.id));
          if (key >= 0) now.splice(key, 1);
          localStorage.setItem(HISTORY, JSON.stringify(now));
          renderHistory();
        } catch {
          toast("删除失败，本地存储不可用", true);
        }
      };
      footer.append(restore, remove);
      row.append(date, summary, theme, footer);
      root.append(row);
    });
  }
  $("snapshot").addEventListener("click", () => {
    if (saveSnapshot()) renderHistory();
  });
  function closeMore() {
    $("more-menu").classList.add("hidden");
    $("more-open").setAttribute("aria-expanded", "false");
  }
  $("more-open").addEventListener("click", (e) => {
    e.stopPropagation();
    const opening = $("more-menu").classList.contains("hidden");
    $("more-menu").classList.toggle("hidden", !opening);
    $("more-open").setAttribute("aria-expanded", String(opening));
    if (opening) $("more-menu").querySelector("button").focus();
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#more-menu,#more-open")) closeMore();
  });
  $("more-menu").addEventListener("keydown", (e) => {
    const options = Array.from($("more-menu").querySelectorAll("button")),
      i = options.indexOf(document.activeElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      options[
        (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length
      ].focus();
    }
  });
  $("more-menu").addEventListener("click", async (e) => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    closeMore();
    finishBlock();
    if (action === "history") openHistory();
    if (action === "snapshot") saveSnapshot();
    if (action === "import") openImport();
    if (action === "export-md") {
      try {
        if (Object.keys(MODEL.portableDocument(state, parser).assets).length) {
          download(
            MODEL.packageDocument(state, parser, fflate),
            fileTitle() + ".zip",
            "application/zip",
          );
          toast("已打包 Markdown 与图片文件，解压后即可使用");
        } else
          download(
            state.source,
            fileTitle() + ".md",
            "text/markdown;charset=utf-8",
          );
      } catch (e) {
        toast("导出失败：" + e.message, true);
      }
    }
    if (action === "export-doc") {
      exportCompleteDocument();
    }
    if (action === "export-html") {
      const out = exportHTML();
      download(
        '<!doctype html><meta charset="utf-8">' + out.html,
        fileTitle() + ".html",
        "text/html;charset=utf-8",
      );
      toast(out.notice);
    }
    if (action === "sample") {
      if (!(await ask("将先保存当前版本，然后载入内置介绍文章。继续吗？")))
        return;
      if (!saveSnapshot({ quiet: true })) return;
      checkpoint();
      state = normalizeDocument({
        source: DEFAULT_SOURCE,
        assets: clone(DEFAULT_ASSETS),
        themeId: "gold",
      });
      scheduleSave();
      setMode("write");
    }
  });
  /*__IMPORT_UI__*/

  function openCustom() {
    if (!draft) openStyles();
    for (const id of ["mix-palette", "mix-layout", "mix-material"]) {
      const select = $(id);
      select.replaceChildren();
      for (const [key, t] of Object.entries(MD.THEMES)) {
        const op = document.createElement("option");
        op.value = key;
        op.textContent = t.name;
        select.append(op);
      }
      select.value = draft.themeId;
    }
    $("custom-dialog").showModal();
  }
  $("custom-open").addEventListener("click", openCustom);
  document
    .querySelectorAll(".dialog-close")
    .forEach((b) =>
      b.addEventListener("click", () => b.closest("dialog").close()),
    );
  function persistLibrary() {
    const custom = {};
    for (const [id, t] of Object.entries(MD.THEMES))
      if (!Object.hasOwn(builtins, id)) custom[id] = t;
    localStorage.setItem(LIBRARY, JSON.stringify(custom));
  }
  function addTheme(theme, prefix = "custom") {
    const t = validateTheme(
        theme,
        Number(theme.themeVersion) === 2 ? builtins.gold : legacyBase,
      ),
      id =
        prefix +
        "-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 5);
    MD.THEMES[id] = t;
    try {
      persistLibrary();
    } catch {
      delete MD.THEMES[id];
      throw new Error("主题库保存失败，请释放本地存储空间后重试");
    }
    selectTheme(id);
    $("custom-dialog").close();
    toast("主题已加入本机主题库，应用后保存到文章");
  }
  $("gen-run").addEventListener("click", async () => {
    const button = $("gen-run");
    button.disabled = true;
    button.textContent = "正在生成…";
    try {
      const desc = $("gen-desc").value;
      let theme = MD.buildTheme(desc, {
        accent: $("gen-accent").value,
        name: $("gen-name").value.trim() || undefined,
      });
      const key = $("llm-key").value.trim();
      if (key) {
        const base = (
          $("llm-base").value.trim() || "https://api.deepseek.com"
        ).replace(/\/+$/, "");
        const url = new URL(base);
        if (url.protocol !== "https:")
          throw new Error("模型接口必须使用 HTTPS");
        $("llm-status").textContent = "仅发送风格描述，正在调用模型…";
        const controller = new AbortController(),
          timer = setTimeout(() => controller.abort(), 25000);
        try {
          const res = await fetch(base + "/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + key,
            },
            body: JSON.stringify({
              model: $("llm-model").value.trim() || "deepseek-chat",
              messages: [
                {
                  role: "system",
                  content:
                    "根据风格描述输出排版主题JSON。仅允许name,accent,text,heading,bg,bodySize,lineHeight,h1,h2,paraIndent等主题令牌，不输出HTML或CSS。颜色使用十六进制。",
                },
                { role: "user", content: desc || "默认主题" },
              ],
              response_format: { type: "json_object" },
            }),
            signal: controller.signal,
          });
          if (!res.ok) throw new Error("接口返回 " + res.status);
          const data = await res.json();
          const raw = data.choices?.[0]?.message?.content;
          if (typeof raw !== "string") throw new Error("模型没有返回主题");
          theme = validateTheme(
            JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, "")),
            theme,
          );
          $("llm-status").textContent = "模型主题已通过字段校验";
        } catch (e) {
          $("llm-status").textContent =
            "模型调用失败，已使用本地规则：" + e.message;
          toast("模型调用失败，已回退本地主题规则");
        } finally {
          clearTimeout(timer);
        }
      }
      addTheme(theme);
    } catch (e) {
      toast("生成失败：" + e.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "生成并预览";
    }
  });
  $("mix-run").addEventListener("click", () => {
    try {
      addTheme(
        MD.mixTheme(
          $("mix-palette").value,
          $("mix-layout").value,
          $("mix-material").value,
        ),
        "mix",
      );
    } catch (e) {
      toast(e.message, true);
    }
  });
  $("theme-export").addEventListener("click", () => {
    const t = effective();
    download(
      JSON.stringify(t, null, 2),
      t.name.replace(/[\\/:*?"<>|]/g, "_") + ".theme.json",
    );
  });
  $("theme-import").addEventListener("click", () => $("theme-file").click());
  $("theme-file").addEventListener("change", async () => {
    const f = $("theme-file").files[0];
    $("theme-file").value = "";
    if (!f) return;
    if (f.size > 100000) {
      toast("主题 JSON 超过 100 KB", true);
      return;
    }
    try {
      const input = JSON.parse(await f.text());
      addTheme(input);
    } catch (e) {
      toast("主题导入失败：" + e.message, true);
    }
  });
  $("gen-img").addEventListener("change", async () => {
    const f = $("gen-img").files[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      toast("参考图请小于 8 MB", true);
      return;
    }
    const url = URL.createObjectURL(f);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const c = document.createElement("canvas");
      c.width = c.height = 48;
      const ctx = c.getContext("2d");
      ctx.drawImage(image, 0, 0, 48, 48);
      const rgba = ctx.getImageData(0, 0, 48, 48).data,
        buckets = new Map();
      for (let i = 0; i < rgba.length; i += 4) {
        if (rgba[i + 3] < 128) continue;
        const r = rgba[i] >> 5,
          g = rgba[i + 1] >> 5,
          b = rgba[i + 2] >> 5;
        if (Math.max(r, g, b) - Math.min(r, g, b) < 1) continue;
        const key = r * 64 + g * 8 + b;
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }
      const best = [...buckets].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (best !== undefined)
        $("gen-accent").value = MD.rgbToHex(
          (best >> 6) * 32 + 16,
          ((best >> 3) & 7) * 32 + 16,
          (best & 7) * 32 + 16,
        );
      toast("参考图已在本机提取主色");
    } catch {
      toast("无法读取参考图", true);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  function editingTextarea() {
    return (
      $("writer").querySelector(".block-editor") ||
      (mode === "source" ? $("src") : null)
    );
  }
  function insertText(text) {
    const ta = editingTextarea();
    if (ta) {
      const start = ta.selectionStart,
        end = ta.selectionEnd;
      if (state.source.length + text.length - (end - start) > MAX_SOURCE) {
        toast("插入后文档超过 3 MB，请缩小图片或拆分文档", true);
        return false;
      }
      ta.focus();
      ta.setSelectionRange(start, end);
      let native = false;
      try {
        native = document.execCommand("insertText", false, text);
      } catch {}
      if (!native) {
        ta.setRangeText(text, start, end, "end");
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return true;
    } else {
      if (!setSource(state.source.replace(/\s*$/, "") + "\n\n" + text + "\n"))
        return false;
      setMode("write");
      return true;
    }
  }
  /*__EDITING_TOOLS__*/
  async function insertImages(files) {
    let inserted = 0;
    for (const f of files) {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) {
        toast("支持 PNG、JPEG、WebP 和 GIF 图片", true);
        continue;
      }
      if (f.size > 1.5 * 1024 * 1024) {
        toast("单张图片请小于 1.5 MB，以免草稿无法保存", true);
        continue;
      }
      const uri = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      const name =
        f.name
          .replace(/\.[^.]+$/, "")
          .replace(/[\[\]<>\r\n]/g, "")
          .slice(0, 80) || "图片";
      const nextAssets = clone(state.assets || {});
      const id = MODEL.addAsset(nextAssets, uri, name);
      if (
        JSON.stringify(nextAssets).length + state.source.length >
        MODEL.MAX_DOCUMENT
      ) {
        toast("图片资源已超过文档大小限制，请拆分文章", true);
        continue;
      }
      checkpoint();
      state.assets = nextAssets;
      checkpointSuppressed = true;
      try {
        if (insertText("\n![" + name + "](asset:" + id + ")\n")) inserted++;
      } finally {
        checkpointSuppressed = false;
      }
    }
    if (inserted)
      toast("图片已保存为短引用，原图随文档保存；公众号发布时需重新上传");
  }
  $("image-file").addEventListener("change", () => {
    const files = Array.from($("image-file").files);
    $("image-file").value = "";
    insertImages(files).catch(() => toast("插入图片失败", true));
  });
  for (const root of [$("writer"), $("src")]) {
    root.addEventListener("dragover", (e) => e.preventDefault());
    root.addEventListener("drop", (e) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      insertImages(Array.from(e.dataTransfer.files)).catch(() =>
        toast("插入失败", true),
      );
    });
    root.addEventListener("paste", (e) => {
      const images = Array.from(e.clipboardData?.files || []).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (images.length) {
        e.preventDefault();
        insertImages(images).catch(() => toast("插入失败", true));
      }
    });
  }
  document.addEventListener("keydown", async (e) => {
    if (e.key === "Escape") {
      closeMore();
      if (draft && !document.querySelector("dialog[open]")) closeStyles();
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (await saveNow()) toast("已保存到本机");
      else toast("保存失败，请下载备份", true);
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      copyArticle();
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      e.key.toLowerCase() === "z" &&
      !e.target.closest("textarea,input") &&
      !document.querySelector("dialog[open]")
    ) {
      e.preventDefault();
      const from = e.shiftKey ? redoStack : undoStack,
        to = e.shiftKey ? undoStack : redoStack;
      if (from.length) {
        to.push(JSON.stringify(state));
        state = normalizeDocument(JSON.parse(from.pop()));
        lastCheckpoint = JSON.stringify(state);
        scheduleSave();
        setMode(mode);
      }
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && dirty) saveNow();
  });
  window.addEventListener("pagehide", () => {
    if (dirty) {
      documentStore?.protect(state);
      saveNow();
    }
  });
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      documentStore?.protect(state);
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("resize", () => {
    if (!matchMedia("(max-width: 720px)").matches) {
      document.body.classList.remove("library-drawer-open");
      $("library-scrim").classList.add("hidden");
      $("outline-toggle").setAttribute(
        "aria-expanded",
        String(!document.body.classList.contains("outline-hidden")),
      );
    }
    if (draft)
      requestAnimationFrame(() =>
        document
          .querySelectorAll(".theme-thumb")
          .forEach(
            (n) =>
              (n.firstElementChild.style.transform =
                "scale(" + n.clientWidth / 375 + ")"),
          ),
      );
  });
  if (window.visualViewport) {
    const adjust = () => {
      const keyboard = Math.max(
        0,
        window.innerHeight -
          window.visualViewport.height -
          window.visualViewport.offsetTop,
      );
      if (keyboard > 120 && editingTextarea()) {
        $("format-dock").style.bottom = keyboard + 8 + "px";
        $("mode-dock").style.visibility = "hidden";
      } else {
        $("format-dock").style.bottom = "";
        $("mode-dock").style.visibility = "";
      }
    };
    window.visualViewport.addEventListener("resize", adjust);
    window.visualViewport.addEventListener("scroll", adjust);
  }
  document.querySelector(".brand").addEventListener("click", (e) => {
    e.preventDefault();
    if (draft) closeStyles();
    setMode("write");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  setMode("write");
  updateTitle();
  $("save-state").textContent = initialStorageError
    ? "存储异常 · 请先下载备份"
    : "此浏览器 · 自动保存";
  $("save-state").classList.toggle("error", initialStorageError);
  $("mobile-save").textContent = initialStorageError
    ? "存储异常"
    : "浏览器本地";
  $("mobile-save").classList.toggle("error", initialStorageError);
  if (initialStorageError)
    toast("本地存储或旧文档读取异常，未覆盖原数据。请先下载备份。", true);
  if (matchMedia("(max-width: 720px)").matches)
    $("outline-toggle").setAttribute("aria-expanded", "false");
  initializeLibrary();
})();
