(function () {
  "use strict";

  function escapeHtml(s) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function escapeMin(s) {
    // 仅转义 & < >（保留引号，供代码高亮内部使用）
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- 代码高亮（轻量 token 化） ---------- */
  const KEYWORDS = {
    js: [
      "function",
      "const",
      "let",
      "var",
      "return",
      "if",
      "else",
      "for",
      "while",
      "do",
      "switch",
      "case",
      "break",
      "continue",
      "new",
      "class",
      "extends",
      "import",
      "export",
      "from",
      "try",
      "catch",
      "finally",
      "throw",
      "async",
      "await",
      "typeof",
      "instanceof",
      "this",
      "null",
      "undefined",
      "true",
      "false",
      "in",
      "of",
      "default",
      "delete",
      "void",
      "yield",
      "static",
      "get",
      "set",
      "super",
    ],
    python: [
      "def",
      "return",
      "if",
      "elif",
      "else",
      "for",
      "while",
      "import",
      "from",
      "as",
      "class",
      "try",
      "except",
      "finally",
      "raise",
      "with",
      "lambda",
      "pass",
      "break",
      "continue",
      "global",
      "nonlocal",
      "yield",
      "assert",
      "del",
      "not",
      "and",
      "or",
      "is",
      "in",
      "None",
      "True",
      "False",
    ],
    css: ["@media", "@import", "@keyframes", "important"],
    bash: [
      "echo",
      "cd",
      "ls",
      "rm",
      "cp",
      "mv",
      "mkdir",
      "touch",
      "sudo",
      "apt",
      "yum",
      "npm",
      "node",
      "git",
      "export",
      "cat",
      "grep",
      "sed",
      "awk",
      "chmod",
      "curl",
      "wget",
      "if",
      "then",
      "fi",
      "for",
      "done",
      "while",
    ],
    html: [
      "html",
      "head",
      "body",
      "div",
      "span",
      "p",
      "a",
      "img",
      "ul",
      "ol",
      "li",
      "table",
      "tr",
      "td",
      "th",
      "h1",
      "h2",
      "h3",
      "h4",
      "section",
      "code",
      "pre",
      "br",
      "hr",
      "strong",
      "em",
      "blockquote",
      "script",
      "style",
      "link",
      "meta",
      "title",
      "input",
      "button",
      "form",
      "nav",
      "header",
      "footer",
      "main",
      "aside",
    ],
  };

  function highlightCode(code, lang) {
    if (!lang || !KEYWORDS[lang]) return escapeMin(code);
    if (lang === "html" || lang === "markup") {
      return escapeMin(code).replace(
        /(&lt;\/?)([a-z][a-z0-9-]*)/g,
        '$1<span class="tk-tag">$2</span>',
      );
    }
    const kw = KEYWORDS[lang];
    const tokRe =
      /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`|\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|0x[0-9a-fA-F]+|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*|[(){}\[\].,;:+\-*/=<>!&|?]+)/g;
    // 在原始文本上做 token 化，输出时再转义 —— 避免把 &gt; &lt; &amp; 拆碎
    return code.replace(tokRe, function (m) {
      const e = escapeMin(m);
      if (/^["'`]/.test(m)) return '<span class="tk-str">' + e + "</span>";
      if (/^\/\//.test(m) || /^#/.test(m) || /^\/\*/.test(m))
        return '<span class="tk-cmt">' + e + "</span>";
      if (/^\d/.test(m) || /^0x/.test(m))
        return '<span class="tk-num">' + e + "</span>";
      if (/^[A-Za-z_$]/.test(m)) {
        if (kw.indexOf(m) !== -1) return '<span class="tk-kw">' + e + "</span>";
        return e;
      }
      return '<span class="tk-punc">' + e + "</span>";
    });
  }

  /* ---------- 公众号白名单序列化辅助（纯逻辑） ---------- */
  function compact4(a, b, c, d) {
    const all = [a, b, c, d].map(function (v) {
      return v || "0px";
    });
    if (all[0] === all[1] && all[1] === all[2] && all[2] === all[3])
      return all[0];
    if (all[0] === all[2] && all[1] === all[3]) return all[0] + " " + all[1];
    return all.join(" ");
  }
  function compactBorder(cs) {
    const out = [];
    ["Top", "Right", "Bottom", "Left"].forEach(function (side) {
      const w = cs["border" + side + "Width"];
      const s = cs["border" + side + "Style"];
      if (w && w !== "0px" && s && s !== "none") {
        out.push(
          "border-" +
            side.toLowerCase() +
            ":" +
            w +
            " " +
            s +
            " " +
            cs["border" + side + "Color"],
        );
      }
    });
    return out.join(";");
  }

  /* ---------- 颜色工具（主题生成器用） ---------- */
  function hexToRgb(hex) {
    let h = String(hex).replace("#", "").trim();
    if (h.length === 3)
      h = h
        .split("")
        .map(function (c) {
          return c + c;
        })
        .join("");
    const n = parseInt(h, 16);
    if (isNaN(n) || h.length !== 6) return null;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgbToHex(r, g, b) {
    const c = function (v) {
      const s = Math.max(0, Math.min(255, Math.round(v))).toString(16);
      return s.length === 1 ? "0" + s : s;
    };
    return "#" + c(r) + c(g) + c(b);
  }
  function mix(c1, c2, t) {
    // 线性插值：t=0 → c1，t=1 → c2
    const a = hexToRgb(c1),
      b = hexToRgb(c2);
    if (!a || !b) return c1;
    return rgbToHex(
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    );
  }
  function tint(hex, t) {
    return mix(hex, "#ffffff", t);
  } // 变浅
  function shade(hex, t) {
    return mix(hex, "#000000", t);
  } // 变深
  function luminance(hex) {
    const a = hexToRgb(hex);
    if (!a) return 0;
    return (a[0] * 0.299 + a[1] * 0.587 + a[2] * 0.114) / 255;
  }
  function contrast(a, b) {
    // WCAG 相对亮度对比度
    const la = lum(a),
      lb = lum(b);
    const hi = Math.max(la, lb),
      lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  function lum(hex) {
    const c = hexToRgb(hex);
    if (!c) return 0;
    const g = c.map(function (v) {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * g[0] + 0.7152 * g[1] + 0.0722 * g[2];
  }

  /* ---------- 气质描述解析 ---------- */
  function parseStyleDescription(text) {
    const t = String(text || "").toLowerCase();
    const colorWords = [
      ["克莱因蓝", "#002fa7"],
      ["天蓝", "#0284c7"],
      ["蓝", "#0078d4"],
      ["红", "#dc2626"],
      ["绿", "#059669"],
      ["紫", "#5c2d91"],
      ["金", "#f0b849"],
      ["黄", "#f5b301"],
      ["橙", "#ea580c"],
      ["青", "#0d9488"],
      ["粉", "#db2777"],
      ["灰", "#52525b"],
      ["米", "#b59d7c"],
      ["棕", "#8a5a2b"],
      ["橄榄", "#5f6b3f"],
      ["墨", "#1f2937"],
    ];
    let accent = null;
    for (let i = 0; i < colorWords.length; i++) {
      if (t.indexOf(colorWords[i][0]) !== -1) {
        accent = colorWords[i][1];
        break;
      }
    }
    const knobs = {
      dark: /暗|深色|夜间|夜|黑底|暗夜/.test(t),
      paper: /纸质|复古|手帐|手账|奶油|暖|怀旧/.test(t),
      zen: /留白|禅|呼吸|空灵|极简|素/.test(t),
      tech: /科技|极客|终端|代码|geek/.test(t),
      editorial: /杂志|编辑|印刷|高对比|刊/.test(t),
    };
    return { accent: accent, knobs: knobs };
  }

  /* ---------- 主题生成器：从描述/主色推导完整令牌 ---------- */
  function buildTheme(desc, opts) {
    const o = opts || {};
    const parsed = parseStyleDescription(desc);
    const accent = o.accent || parsed.accent || "#059669";
    const k = parsed.knobs;
    const dark = !!k.dark,
      paper = !!k.paper,
      zen = !!k.zen;
    const tech = !!k.tech,
      editorial = !!k.editorial;
    const codeDark = dark || tech || editorial;
    const light = luminance(accent) > 0.72;
    const accentDeep = shade(accent, 0.38);
    const SERIF =
      'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif';
    const accent2 = shade(accent, 0.22);
    const design = {
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily: null,
    };
    if (editorial) {
      design.h1Style = "left";
      design.headingMark = "underline";
      design.quoteStyle = "plain";
      design.dividerStyle = "solid";
      design.headingFamily = SERIF;
    }
    if (zen) {
      design.headingMark = "plain";
      design.quoteStyle = "plain";
      design.tableStyle = "plain";
      design.paraIndent = false;
      design.headingFamily = SERIF;
    }
    if (paper) {
      design.headingMark = "underline";
      design.quoteStyle = "card";
      design.dividerStyle = "ornament";
      design.headingFamily = SERIF;
    }
    if (tech) {
      design.quoteStyle = "box";
      design.tableStyle = "headeronly";
      design.dividerStyle = "solid";
    }
    if (dark) {
      design.quoteStyle = "box";
    }
    return {
      name:
        o.name ||
        (desc
          ? String(desc)
              .trim()
              .split(/[\s,，。；;、/]+/)[0]
              .slice(0, 8)
          : "自定义") + "主题",
      accent: accent,
      accent2: accent2,
      text: dark ? "#c9d1d9" : "#3f3f3f",
      heading: dark ? "#e6edf3" : editorial ? "#111111" : "#1a1a1a",
      bg: dark ? "#0d1117" : paper ? "#faf6ef" : "#ffffff",
      bodySize: 16,
      lineHeight: zen ? 1.9 : 1.8,
      letterSpacing: zen ? 0.8 : 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: zen ? 8 : 6,
      hrColor: dark ? "#30363d" : tint(accent, 0.8),
      link: dark ? tint(accent, 0.72) : shade(accent, 0.12),
      markBg: dark ? "#3a3a2e" : "#fff8d6",
      thBg: dark ? "#161b22" : tint(accent, 0.92),
      zebra: dark ? "#11161d" : tint(accent, 0.965),
      border: dark ? "#30363d" : tint(accent, 0.8),
      codeBg: dark ? "#161b22" : tint(accent, 0.94),
      codeText: dark ? "#ff7b72" : accentDeep,
      codeBlockBg: codeDark ? "#161b22" : paper ? "#f1ead9" : "#f6f8fa",
      codeBlockText: codeDark ? "#c9d1d9" : "#24292e",
      tkKw: codeDark ? "#ff7b72" : shade(accent, 0.3),
      tkStr: codeDark ? "#a5d6ff" : "#0969da",
      tkCmt: codeDark ? "#8b949e" : "#6e7781",
      tkNum: codeDark ? "#79c0ff" : "#0550ae",
      tkTag: codeDark ? "#7ee787" : "#116329",
      tkPunc: codeDark ? "#c9d1d9" : "#24292e",
      quoteBorder: accent,
      quoteBg: dark ? "#161b22" : tint(accent, 0.93),
      quoteText: dark ? "#aab4c0" : accentDeep,
      h1Style: design.h1Style,
      headingMark: design.headingMark,
      quoteStyle: design.quoteStyle,
      tableStyle: design.tableStyle,
      dividerStyle: design.dividerStyle,
      listMark: design.listMark,
      paraIndent: design.paraIndent,
      shadow: design.shadow,
      headingFamily: design.headingFamily,
    };
  }

  /* ---------- SVG 装饰生成器（纸质/水墨/印章/喷溅/撕裂/花饰） ---------- */
  const SVG_NS = 'xmlns="http://www.w3.org/2000/svg"';
  function decoSVG(key, opts) {
    const o = opts || {};
    const c = o.color || "#888";
    const c2 = o.color2 || c;
    switch (key) {
      case "swash": // 宋式细线花饰
        return (
          "<svg " +
          SVG_NS +
          ' width="180" height="14" viewBox="0 0 180 14"><line x1="12" y1="7" x2="70" y2="7" stroke="' +
          c +
          '" stroke-width="1"/><line x1="110" y1="7" x2="168" y2="7" stroke="' +
          c +
          '" stroke-width="1"/><rect x="86" y="4" width="8" height="6" fill="' +
          c +
          '"/></svg>'
        );
      case "brush": // 水墨笔触分隔线
        return (
          "<svg " +
          SVG_NS +
          ' width="220" height="16" viewBox="0 0 220 16"><path d="M8 9 C 60 4, 120 12, 212 7" fill="none" stroke="' +
          c +
          '" stroke-width="2" stroke-linecap="round" opacity="0.85"/><path d="M24 12 C 84 9, 150 13, 206 10" fill="none" stroke="' +
          c +
          '" stroke-width="1" stroke-linecap="round" opacity="0.35"/></svg>'
        );
      case "stars": // 多巴胺星点分隔线
        return (
          "<svg " +
          SVG_NS +
          ' width="210" height="14" viewBox="0 0 210 14"><circle cx="24" cy="7" r="3.2" fill="' +
          c +
          '"/><circle cx="70" cy="7" r="1.8" fill="' +
          c +
          '" opacity="0.7"/><path d="M104 2 l2.4 4.6 5.2 0.7 -3.8 3.6 0.9 5.1 -4.7 -2.4 -4.7 2.4 0.9 -5.1 -3.8 -3.6 5.2 -0.7z" fill="' +
          c2 +
          '"/><circle cx="142" cy="7" r="1.8" fill="' +
          c +
          '" opacity="0.7"/><circle cx="186" cy="7" r="3.2" fill="' +
          c +
          '"/></svg>'
        );
      case "pill": // 触感拟态柔线
        return (
          "<svg " +
          SVG_NS +
          ' width="130" height="10" viewBox="0 0 130 10"><rect x="0" y="3" width="130" height="4" rx="2" fill="' +
          c +
          '" opacity="0.35"/><rect x="55" y="2" width="20" height="6" rx="3" fill="' +
          c +
          '" opacity="0.7"/></svg>'
        );
      case "seal": // 中式印章（方/圆两形）
        if (o.shape === "round") {
          return (
            "<svg " +
            SVG_NS +
            ' width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="28" fill="' +
            c +
            '"/><circle cx="32" cy="32" r="23" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.85"/><text x="32" y="41" font-size="26" fill="#fff" text-anchor="middle" font-family="Songti SC, SimSun, serif">' +
            (o.text || "雅") +
            "</text></svg>"
          );
        }
        return (
          "<svg " +
          SVG_NS +
          ' width="64" height="64" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="6" fill="' +
          c +
          '"/><rect x="10.5" y="10.5" width="43" height="43" rx="3" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.85"/><text x="32" y="41" font-size="26" fill="#fff" text-anchor="middle" font-family="Songti SC, SimSun, serif">' +
          (o.text || "雅") +
          "</text></svg>"
        );
      case "waxseal": // 欧洲蜡印（锯齿边）
        return (
          "<svg " +
          SVG_NS +
          ' width="78" height="78" viewBox="0 0 78 78"><circle cx="39" cy="39" r="33" fill="' +
          c +
          '"/><circle cx="39" cy="39" r="33" fill="none" stroke="' +
          c +
          '" stroke-width="9" stroke-dasharray="3.4 6.2" opacity="0.9"/><circle cx="39" cy="39" r="25" fill="none" stroke="#fff" stroke-width="1" opacity="0.35"/><path d="M39 23 l4.4 8.8 9.8 1.4 -7.1 6.9 1.7 9.7 -8.8 -4.6 -8.8 4.6 1.7 -9.7 -7.1 -6.9 9.8 -1.4z" fill="#fff" opacity="0.9"/></svg>'
        );
      case "splatter": // 墨水喷溅
        return (
          "<svg " +
          SVG_NS +
          ' width="120" height="80" viewBox="0 0 120 80"><circle cx="40" cy="40" r="13" fill="' +
          c +
          '" opacity="0.85"/><ellipse cx="64" cy="30" rx="10" ry="7" fill="' +
          c +
          '" opacity="0.6"/><ellipse cx="30" cy="60" rx="8" ry="6" fill="' +
          c +
          '" opacity="0.5"/><circle cx="80" cy="52" r="5" fill="' +
          c +
          '" opacity="0.45"/><circle cx="20" cy="22" r="4" fill="' +
          c +
          '" opacity="0.55"/><circle cx="92" cy="20" r="3" fill="' +
          c +
          '" opacity="0.4"/><circle cx="12" cy="48" r="2.6" fill="' +
          c +
          '" opacity="0.5"/><circle cx="104" cy="44" r="2.2" fill="' +
          c +
          '" opacity="0.4"/><circle cx="52" cy="66" r="2" fill="' +
          c +
          '" opacity="0.35"/><circle cx="72" cy="68" r="1.6" fill="' +
          c +
          '" opacity="0.3"/></svg>'
        );
      case "tear": // 杂志撕裂条
        return (
          "<svg " +
          SVG_NS +
          ' width="300" height="26" viewBox="0 0 300 26"><path d="M0 0 L300 0 L300 9 L286 13 L272 8 L258 14 L244 7 L230 13 L216 8 L202 14 L188 7 L174 13 L160 8 L146 14 L132 7 L118 13 L104 8 L90 14 L76 7 L62 13 L48 8 L34 14 L20 7 L8 12 L0 8 Z" fill="' +
          c +
          '"/></svg>'
        );
      case "zigzag": // 粗野锯齿线
        return (
          "<svg " +
          SVG_NS +
          ' width="240" height="12" viewBox="0 0 240 12"><path d="M0 2 L30 10 L60 2 L90 10 L120 2 L150 10 L180 2 L210 10 L240 2" fill="none" stroke="' +
          c +
          '" stroke-width="3"/></svg>'
        );
      case "blob": // Y3K 液态团
        return (
          "<svg " +
          SVG_NS +
          ' width="120" height="70" viewBox="0 0 120 70"><path d="M28 12 C 52 2, 78 8, 92 24 C 106 40, 96 56, 76 60 C 56 64, 30 60, 20 46 C 10 32, 8 20, 28 12 Z" fill="' +
          c +
          '" opacity="0.85"/><path d="M64 18 C 82 10, 102 20, 104 36 C 106 50, 92 58, 76 56 C 60 54, 52 44, 56 32 C 58 24, 58 22, 64 18 Z" fill="' +
          c2 +
          '" opacity="0.5"/></svg>'
        );
      case "aurora": // 浮光幻梦极光
        return (
          "<svg " +
          SVG_NS +
          ' width="200" height="60" viewBox="0 0 200 60"><defs><linearGradient id="ag" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="' +
          c +
          '"/><stop offset="1" stop-color="' +
          c2 +
          '"/></linearGradient></defs><ellipse cx="60" cy="30" rx="60" ry="18" fill="url(#ag)" opacity="0.6"/><ellipse cx="142" cy="34" rx="55" ry="14" fill="url(#ag)" opacity="0.35"/></svg>'
        );
      case "tape": // 手帐胶带
        return (
          "<svg " +
          SVG_NS +
          ' width="120" height="26" viewBox="0 0 120 26"><rect x="4" y="6" width="112" height="16" rx="1" fill="' +
          c +
          '" opacity="0.5" transform="rotate(-4 60 13)"/></svg>'
        );
      case "waves": // 山水波纹
        return (
          "<svg " +
          SVG_NS +
          ' width="220" height="26" viewBox="0 0 220 26"><path d="M0 14 C 20 8, 40 8, 60 14 C 80 20, 100 20, 120 14 C 140 8, 160 8, 180 14 C 200 20, 212 20, 220 16" fill="none" stroke="' +
          c +
          '" stroke-width="2"/><path d="M0 21 C 24 16, 48 16, 72 21 C 96 26, 120 26, 144 21 C 168 16, 192 16, 220 20" fill="none" stroke="' +
          c +
          '" stroke-width="1.2" opacity="0.5"/></svg>'
        );
      case "sticker": // 旋转徽章贴纸
        return (
          "<svg " +
          SVG_NS +
          ' width="96" height="96" viewBox="0 0 96 96"><g transform="rotate(12 48 48)"><circle cx="48" cy="48" r="40" fill="' +
          c +
          '"/><circle cx="48" cy="48" r="34" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 5" opacity="0.9"/><text x="48" y="54" font-size="18" fill="#fff" text-anchor="middle" font-family="serif" font-weight="bold">' +
          (o.text || "NEW") +
          "</text></g></svg>"
        );
      case "shards": // 极繁碎片分隔线
        return (
          "<svg " +
          SVG_NS +
          ' width="200" height="14" viewBox="0 0 200 14"><path d="M10 7 L30 2 L52 10 L74 3 L98 11 L124 4 L150 10 L174 3 L196 8" fill="none" stroke="' +
          c +
          '" stroke-width="2"/><polygon points="30,2 40,8 30,10" fill="' +
          c +
          '" opacity="0.8"/><polygon points="98,11 106,4 112,12" fill="' +
          c +
          '" opacity="0.8"/></svg>'
        );
      default:
        return "";
    }
  }
  function svgDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }
  function bgTexture(key) {
    if (key === "paper") {
      // 宣纸颗粒
      return (
        "<svg " +
        SVG_NS +
        ' width="180" height="180"><filter id="p"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.045"/></feComponentTransfer></filter><rect width="180" height="180" filter="url(#p)"/></svg>'
      );
    }
    if (key === "grain") {
      // 细腻噪点
      return (
        "<svg " +
        SVG_NS +
        ' width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope="0.028"/></feComponentTransfer></filter><rect width="160" height="160" filter="url(#g)"/></svg>'
      );
    }
    if (key === "dots") {
      // 彩点纸
      return (
        "<svg " +
        SVG_NS +
        ' width="170" height="170"><circle cx="16" cy="20" r="3" fill="#FFB38A" opacity="0.5"/><circle cx="76" cy="64" r="2.2" fill="#FFD58A" opacity="0.5"/><circle cx="126" cy="26" r="3" fill="#FF9EC4" opacity="0.45"/><circle cx="42" cy="126" r="2.6" fill="#FFB38A" opacity="0.4"/><circle cx="116" cy="116" r="3" fill="#FFD58A" opacity="0.45"/><circle cx="156" cy="148" r="2" fill="#FF9EC4" opacity="0.4"/></svg>'
      );
    }
    if (key === "grid") {
      // 粗野可见网格
      return (
        "<svg " +
        SVG_NS +
        ' width="120" height="120"><path d="M0 0 H120 M0 0 V120 M30 0 V120 M60 0 V120 M90 0 V120 M0 30 H120 M0 60 H120 M0 90 H120" stroke="#111" stroke-width="1" opacity="0.05"/></svg>'
      );
    }
    if (key === "scanline") {
      // 赛博扫描线
      return (
        "<svg " +
        SVG_NS +
        ' width="120" height="120"><path d="M0 2 H120 M0 8 H120 M0 14 H120 M0 20 H120 M0 26 H120" stroke="#00F0FF" stroke-width="1" opacity="0.045"/></svg>'
      );
    }
    if (key === "pattern") {
      // 几何纹样
      return (
        "<svg " +
        SVG_NS +
        ' width="140" height="140"><path d="M0 70 L35 20 L70 70 L35 120 Z" fill="#C9A227" opacity="0.06"/><path d="M70 70 L105 20 L140 70 L105 120 Z" fill="#C3272B" opacity="0.05"/><circle cx="35" cy="70" r="8" fill="#C9A227" opacity="0.05"/></svg>'
      );
    }
    if (key === "burst") {
      // 幻梦粒子
      return (
        "<svg " +
        SVG_NS +
        ' width="150" height="150"><circle cx="20" cy="30" r="1.6" fill="#fff" opacity="0.6"/><circle cx="80" cy="20" r="1" fill="#fff" opacity="0.5"/><circle cx="120" cy="60" r="1.8" fill="#fff" opacity="0.55"/><circle cx="40" cy="90" r="1.2" fill="#fff" opacity="0.4"/><circle cx="110" cy="110" r="1.4" fill="#fff" opacity="0.5"/><circle cx="60" cy="130" r="1" fill="#fff" opacity="0.4"/><circle cx="140" cy="20" r="1.2" fill="#fff" opacity="0.5"/></svg>'
      );
    }
    if (key === "bamboo") {
      // 竹纸纤维（禅意）
      return (
        "<svg " +
        SVG_NS +
        ' width="160" height="200"><path d="M12 0 V200 M44 0 V200 M76 0 V200 M108 0 V200 M140 0 V200" stroke="#5F7F6E" stroke-width="1" opacity="0.05"/></svg>'
      );
    }
    if (key === "kraft") {
      // 牛皮纸斑点（拼贴）
      return (
        "<svg " +
        SVG_NS +
        ' width="150" height="150"><circle cx="20" cy="40" r="1.2" fill="#7A5C3A" opacity="0.12"/><circle cx="90" cy="20" r="1" fill="#7A5C3A" opacity="0.1"/><circle cx="60" cy="100" r="1.4" fill="#7A5C3A" opacity="0.12"/><circle cx="130" cy="80" r="1" fill="#7A5C3A" opacity="0.1"/><circle cx="40" cy="130" r="1.2" fill="#7A5C3A" opacity="0.1"/></svg>'
      );
    }
    if (key === "aztec") {
      // 几何密纹（极繁）
      return (
        "<svg " +
        SVG_NS +
        ' width="140" height="140"><path d="M0 70 L35 0 L70 70 Z M70 70 L105 0 L140 70 Z M35 140 L70 70 L105 140 Z" fill="#E91E63" opacity="0.05"/></svg>'
      );
    }
    if (key === "lines") {
      // 编辑部细线（红白）
      return (
        "<svg " +
        SVG_NS +
        ' width="120" height="160"><path d="M0 20 H120 M0 60 H120 M0 100 H120 M0 140 H120" stroke="#111" stroke-width="1" opacity="0.05"/></svg>'
      );
    }
    if (key === "linen") {
      // 亚麻经纬（橄榄）
      return (
        "<svg " +
        SVG_NS +
        ' width="120" height="120"><path d="M0 10 H120 M0 30 H120 M0 50 H120 M0 70 H120 M0 90 H120 M0 110 H120 M10 0 V120 M30 0 V120 M50 0 V120 M70 0 V120 M90 0 V120 M110 0 V120" stroke="#5F6B3F" stroke-width="1" opacity="0.04"/></svg>'
      );
    }
    if (key === "perforation") {
      // 票据齿孔
      return (
        "<svg " +
        SVG_NS +
        ' width="160" height="160"><path d="M40 0 V160" stroke="#C0392B" stroke-width="1" stroke-dasharray="2 6" opacity="0.2"/><path d="M120 0 V160" stroke="#C0392B" stroke-width="1" stroke-dasharray="2 6" opacity="0.2"/></svg>'
      );
    }
    if (key === "goldfoil") {
      // 金箔斜缎光
      return (
        "<svg " +
        SVG_NS +
        ' width="160" height="160"><path d="M-20 40 L80 0 M-20 80 L120 0 M-20 120 L160 0 M0 160 L160 40 M40 160 L160 80 M80 160 L160 120" stroke="#C9A227" stroke-width="1" opacity="0.07"/></svg>'
      );
    }
    if (key === "wave") {
      // 山形流水（淡）
      return (
        "<svg " +
        SVG_NS +
        ' width="180" height="180"><path d="M0 40 C 30 28, 60 28, 90 40 C 120 52, 150 52, 180 40 M0 90 C 30 78, 60 78, 90 90 C 120 102, 150 102, 180 90 M0 140 C 30 128, 60 128, 90 140 C 120 152, 150 152, 180 140" fill="none" stroke="#5F7F6E" stroke-width="1" opacity="0.05"/></svg>'
      );
    }
    if (key === "leaf") {
      // 叶片
      return (
        "<svg " +
        SVG_NS +
        ' width="140" height="140"><path d="M30 30 C 44 18, 66 22, 70 40 C 74 58, 60 66, 46 60 C 34 54, 24 40, 30 30 Z" fill="#059669" opacity="0.05"/><path d="M90 80 C 104 68, 126 72, 130 90 C 134 108, 120 116, 106 110 C 94 104, 84 90, 90 80 Z" fill="#059669" opacity="0.05"/></svg>'
      );
    }
    if (key === "diag") {
      // 斜纹
      return (
        "<svg " +
        SVG_NS +
        ' width="120" height="120"><path d="M0 40 L40 0 M0 80 L80 0 M0 120 L120 0 M40 120 L120 40 M80 120 L120 80" stroke="#111" stroke-width="1" opacity="0.045"/></svg>'
      );
    }
    return "";
  }

  /* ---------- 配方系统：按文章类型覆盖版式参数（不碰配色） ---------- */
  const RECIPES = {
    default: { name: "默认", overrides: {} },
    tutorial: {
      name: "教程步骤",
      overrides: {
        h2num: true,
        quoteStyle: "box",
        tableStyle: "zebra",
        paraIndent: false,
        footerText: "· 教程 · END ·",
        codeFrame: "terminal",
      },
    },
    opinion: {
      name: "观点评论",
      overrides: {
        layout: "rail",
        lead: true,
        paraIndent: true,
        footerText: "— 观点 · 深度 · 有态度 —",
      },
    },
    data: {
      name: "数据复盘",
      overrides: {
        h2num: true,
        lead: true,
        tableStyle: "headeronly",
        dividerStyle: "solid",
        footerText: "· 数据复盘 ·",
      },
    },
    list: {
      name: "清单推荐",
      overrides: {
        h2num: true,
        listMark: "square",
        tableStyle: "headeronly",
        quoteStyle: "card",
        footerText: "· 清单 · END ·",
      },
    },
    essay: {
      name: "深度长文",
      overrides: {
        lead: true,
        paraIndent: true,
        quoteStyle: "card",
        footerText: "· END ·",
      },
    },
    tech: {
      name: "技术文档",
      overrides: {
        h2num: true,
        quoteStyle: "box",
        tableStyle: "zebra",
        paraIndent: false,
        codeFrame: "terminal",
        dividerStyle: "solid",
        listMark: "square",
        footerText: "· 技术文档 ·",
      },
    },
    news: {
      name: "新闻简报",
      overrides: {
        lead: true,
        quoteStyle: "card",
        tableStyle: "headeronly",
        dividerStyle: "dots",
        footerText: "· 新闻简报 ·",
      },
    },
    product: {
      name: "产品文案",
      overrides: {
        lead: true,
        quoteStyle: "pill",
        tableStyle: "minimal",
        listMark: "check",
        dividerStyle: "wave",
        footerText: "· 产品文案 ·",
      },
    },
  };
  function composeRecipe(theme, recipeKey) {
    const r = RECIPES[recipeKey] || RECIPES["default"];
    return mergeTheme(theme, r.overrides);
  }

  /* ---------- 主题混搭引擎：色板 × 版式 × 素材 自由组合 ---------- */
  const PALETTE_KEYS = [
    "accent",
    "accent2",
    "text",
    "heading",
    "bg",
    "hrColor",
    "link",
    "markBg",
    "thBg",
    "zebra",
    "border",
    "codeBg",
    "codeText",
    "codeBlockBg",
    "codeBlockText",
    "tkKw",
    "tkStr",
    "tkCmt",
    "tkNum",
    "tkTag",
    "tkPunc",
    "quoteBorder",
    "quoteBg",
    "quoteText",
  ];
  const LAYOUT_KEYS = [
    "bodySize",
    "lineHeight",
    "letterSpacing",
    "h1",
    "h2",
    "h3",
    "h4",
    "radius",
    "h1Style",
    "headingMark",
    "quoteStyle",
    "tableStyle",
    "dividerStyle",
    "listMark",
    "paraIndent",
    "shadow",
    "layout",
    "titleStyle",
    "bgMode",
    "lead",
    "h2num",
    "kickerText",
    "footerText",
    "headingFamily",
    "h3Mark",
    "thead",
  ];
  const MATERIAL_KEYS = [
    "texture",
    "titleSwash",
    "dividerDeco",
    "quoteSeal",
    "quoteSplatter",
    "headerTear",
    "stickerText",
    "quoteTape",
    "codeFrame",
    "tableShape",
    "listGlyph",
    "codeInline",
  ];
  function mixTheme(pKey, lKey, mKey) {
    const p = THEMES[pKey] || THEMES["gold"];
    const l = THEMES[lKey] || p;
    const m = THEMES[mKey] || p;
    const out = Object.assign({}, p);
    LAYOUT_KEYS.forEach(function (k) {
      if (k in l) out[k] = l[k];
    });
    MATERIAL_KEYS.forEach(function (k) {
      if (k in m) out[k] = m[k];
    });
    out.name = "混搭 · " + p.name + " × " + l.name + " × " + m.name;
    return out;
  }

  /* ---------- 主题合并：模型/用户 JSON 与基线合并，只接受合法字段 ---------- */
  function mergeTheme(base, overrides) {
    const out = Object.assign({}, base);
    if (!overrides || typeof overrides !== "object") return out;
    const strKeys = [
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
    ];
    const boolKeys = ["paraIndent", "lead", "h2num", "titleSwash", "quoteTape"];
    const numKeys = [
      "bodySize",
      "lineHeight",
      "letterSpacing",
      "h1",
      "h2",
      "h3",
      "h4",
      "radius",
    ];
    const objKeys = ["quoteSeal"];
    Object.keys(overrides).forEach(function (k) {
      const v = overrides[k];
      if (!(k in out)) return;
      if (strKeys.indexOf(k) !== -1) {
        if (typeof v === "string" && v) out[k] = v;
        return;
      }
      if (boolKeys.indexOf(k) !== -1) {
        if (typeof v === "boolean") out[k] = v;
        return;
      }
      if (numKeys.indexOf(k) !== -1) {
        const n = Number(v);
        if (!isNaN(n) && n > 0) out[k] = n;
        return;
      }
      if (objKeys.indexOf(k) !== -1) {
        if (v && typeof v === "object" && typeof v.type === "string")
          out[k] = v;
        return;
      }
      if (typeof v === "string" && hexToRgb(v)) out[k] = v; // 颜色类
    });
    return out;
  }

  /* ---------- 主题令牌 ---------- */
  const THEMES = {
    gold: {
      name: "金色 · 经典",
      accent: "#f0b849",
      text: "#3f3f3f",
      heading: "#333",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#e0e0e0",
      link: "#576b95",
      markBg: "#fffdd1",
      thBg: "#f7f7f7",
      zebra: "#fafafa",
      border: "#e2e2e2",
      codeBg: "#f8f8f8",
      codeText: "#a31e40",
      codeBlockBg: "#f6f8fa",
      codeBlockText: "#24292e",
      tkKw: "#d73a49",
      tkStr: "#032f62",
      tkCmt: "#6a737d",
      tkNum: "#005cc5",
      tkTag: "#22863a",
      tkPunc: "#24292e",
      quoteBorder: "#f0b849",
      quoteBg: "#fdf8e8",
      quoteText: "#6b5b3e",
    },
    blue: {
      name: "蓝色 · 科技",
      accent: "#2F54EB",
      text: "#333333",
      heading: "#1a1a1a",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#dde3ee",
      link: "#2F54EB",
      markBg: "#fff9db",
      thBg: "#f0f5ff",
      zebra: "#f8faff",
      border: "#d9e2f5",
      codeBg: "#f2f5fb",
      codeText: "#9f1e3e",
      codeBlockBg: "#f6f8ff",
      codeBlockText: "#24292e",
      tkKw: "#cf222e",
      tkStr: "#0a3069",
      tkCmt: "#6e7781",
      tkNum: "#0550ae",
      tkTag: "#116329",
      tkPunc: "#24292e",
      quoteBorder: "#2F54EB",
      quoteBg: "#f0f5ff",
      quoteText: "#3a4a6b",
    },
    dark: {
      name: "暗夜 · 深色",
      accent: "#7aa2f7",
      text: "#c9d1d9",
      heading: "#e6edf3",
      bg: "#0d1117",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#30363d",
      link: "#58a6ff",
      markBg: "#3a3a2e",
      thBg: "#161b22",
      zebra: "#11161d",
      border: "#30363d",
      codeBg: "#161b22",
      codeText: "#ff8078",
      codeBlockBg: "#161b22",
      codeBlockText: "#c9d1d9",
      tkKw: "#ff7b72",
      tkStr: "#a5d6ff",
      tkCmt: "#8b949e",
      tkNum: "#79c0ff",
      tkTag: "#7ee787",
      tkPunc: "#c9d1d9",
      quoteBorder: "#7aa2f7",
      quoteBg: "#161b22",
      quoteText: "#aab4c0",
    },
    "clean-green": {
      name: "清新绿 · 教程",
      accent: "#059669",
      text: "#3a3f3d",
      heading: "#0f3d2e",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#d9ebe2",
      link: "#047857",
      markBg: "#d1f2e3",
      thBg: "#ecf7f3",
      zebra: "#f6faf8",
      border: "#d8eae2",
      codeBg: "#eef4f1",
      codeText: "#085c48",
      codeBlockBg: "#0e2f25",
      codeBlockText: "#d7e6de",
      tkKw: "#7ee787",
      tkStr: "#a5d6ff",
      tkCmt: "#8b949e",
      tkNum: "#79c0ff",
      tkTag: "#56d364",
      tkPunc: "#c9d1d9",
      quoteBorder: "#059669",
      quoteBg: "#eef8f4",
      quoteText: "#2a604d",
    },
    "red-white": {
      name: "红白 · 观点",
      accent: "#DC2626",
      text: "#3f3f3f",
      heading: "#111111",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#e8d5d5",
      link: "#b91c1c",
      markBg: "#ffe3e3",
      thBg: "#fdf1f1",
      zebra: "#faf6f6",
      border: "#f0dcdc",
      codeBg: "#faf5f5",
      codeText: "#a61919",
      codeBlockBg: "#2a2020",
      codeBlockText: "#f0e4e4",
      tkKw: "#ff7b72",
      tkStr: "#a5d6ff",
      tkCmt: "#9a8f8f",
      tkNum: "#79c0ff",
      tkTag: "#7ee787",
      tkPunc: "#e8dcdc",
      quoteBorder: "#DC2626",
      quoteBg: "#fdf3f3",
      quoteText: "#8a3a3a",
    },
    graphite: {
      name: "石墨极简",
      accent: "#52525B",
      text: "#3f3f3f",
      heading: "#18181b",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.4,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#dcdce0",
      link: "#3f3f46",
      markBg: "#f4f4f5",
      thBg: "#f4f4f5",
      zebra: "#fafafa",
      border: "#e4e4e7",
      codeBg: "#f4f4f5",
      codeText: "#52525b",
      codeBlockBg: "#18181b",
      codeBlockText: "#e4e4e7",
      tkKw: "#d4d4d8",
      tkStr: "#a1a1aa",
      tkCmt: "#71717a",
      tkNum: "#d4d4d8",
      tkTag: "#a1a1aa",
      tkPunc: "#e4e4e7",
      quoteBorder: "#52525B",
      quoteBg: "#f6f6f7",
      quoteText: "#52525b",
    },
    zen: {
      name: "留白禅意",
      accent: "#4A5D52",
      text: "#4a4f4b",
      heading: "#2f3b33",
      bg: "#fdfcf9",
      bodySize: 16,
      lineHeight: 1.9,
      letterSpacing: 0.8,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#e2e4dc",
      link: "#3f5147",
      markBg: "#f2f0df",
      thBg: "#f4f6f2",
      zebra: "#f9faf7",
      border: "#e4e7de",
      codeBg: "#f4f6f1",
      codeText: "#45574c",
      codeBlockBg: "#f2f4ef",
      codeBlockText: "#2f3b33",
      tkKw: "#3f5d4e",
      tkStr: "#4a6d8c",
      tkCmt: "#8a938c",
      tkNum: "#3f5d8c",
      tkTag: "#5d7a4a",
      tkPunc: "#4a4f4b",
      quoteBorder: "#4A5D52",
      quoteBg: "#f4f6f2",
      quoteText: "#4d5b52",
    },
    receipt: {
      name: "票据 · 复古",
      accent: "#c0392b",
      text: "#2b2b2b",
      heading: "#1a1a1a",
      bg: "#faf6ef",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.4,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#d9cbb2",
      link: "#a93226",
      markBg: "#ffe9a8",
      thBg: "#f3ead9",
      zebra: "#f7f1e4",
      border: "#e2d6bf",
      codeBg: "#f4ecdb",
      codeText: "#774025",
      codeBlockBg: "#f1ead9",
      codeBlockText: "#1a1a1a",
      tkKw: "#a93226",
      tkStr: "#0b5d1e",
      tkCmt: "#8a7f6b",
      tkNum: "#0b4d8c",
      tkTag: "#5d7a1e",
      tkPunc: "#2b2b2b",
      quoteBorder: "#c0392b",
      quoteBg: "#fbf3e8",
      quoteText: "#6e5337",
    },
    "olive-notes": {
      name: "橄榄手记",
      accent: "#5f6b3f",
      text: "#3f4238",
      heading: "#26281f",
      bg: "#fbfaf6",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#dedfd2",
      link: "#4d5834",
      markBg: "#eee9c8",
      thBg: "#f0f1e8",
      zebra: "#f7f7f1",
      border: "#e0e1d4",
      codeBg: "#f2f2ea",
      codeText: "#4a5532",
      codeBlockBg: "#2b2d23",
      codeBlockText: "#e3e4d8",
      tkKw: "#b6c47f",
      tkStr: "#9db4d8",
      tkCmt: "#8f937c",
      tkNum: "#9db4d8",
      tkTag: "#8fa86a",
      tkPunc: "#d8dac8",
      quoteBorder: "#5f6b3f",
      quoteBg: "#f2f3ea",
      quoteText: "#505843",
    },
    "ms-blue-purple": {
      name: "微软蓝紫科技",
      accent: "#0078D4",
      text: "#1B1F24",
      heading: "#0f1420",
      bg: "#ffffff",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 6,
      hrColor: "#c7d8e8",
      link: "#0078D4",
      markBg: "#fff4c2",
      thBg: "#EFF6FC",
      zebra: "#F7FAFD",
      border: "#C7E0F4",
      codeBg: "#eef4fa",
      codeText: "#005494",
      codeBlockBg: "#1B1F24",
      codeBlockText: "#e8eaed",
      tkKw: "#569cd6",
      tkStr: "#ce9178",
      tkCmt: "#6a9955",
      tkNum: "#b5cea8",
      tkTag: "#4ec9b0",
      tkPunc: "#d4d4d4",
      quoteBorder: "#0078D4",
      quoteBg: "#EFF6FC",
      quoteText: "#2b5b8c",
    },
    dopamine: {
      name: "多巴胺 · 活力",
      accent: "#FF5A2E",
      text: "#3A3A3A",
      heading: "#1F1F1F",
      bg: "#FFFDF9",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 10,
      hrColor: "#FFE3D6",
      link: "#c43a00",
      markBg: "#FFF1A8",
      thBg: "#FFEDE4",
      zebra: "#FFF7F2",
      border: "#FFE0D2",
      codeBg: "#FFF3EC",
      codeText: "#973014",
      codeBlockBg: "#2D2A26",
      codeBlockText: "#F5EDE6",
      tkKw: "#FF9E64",
      tkStr: "#FFD58A",
      tkCmt: "#9A8F82",
      tkNum: "#FFC24B",
      tkTag: "#8FD694",
      tkPunc: "#E8DED4",
      quoteBorder: "#FF5A2E",
      quoteBg: "#FFF0E8",
      quoteText: "#934025",
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily: null,
    },
    "song-ink": {
      name: "宋式 · 雅",
      accent: "#5F7F6E",
      text: "#3B3F3D",
      heading: "#2A2F2C",
      bg: "#FAF9F6",
      bodySize: 16,
      lineHeight: 1.9,
      letterSpacing: 0.8,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#E0E2DC",
      link: "#4A6B5B",
      markBg: "#F2EFE3",
      thBg: "#F0F2EC",
      zebra: "#F7F8F4",
      border: "#E2E4DC",
      codeBg: "#F2F3EE",
      codeText: "#3c574a",
      codeBlockBg: "#F2F3EE",
      codeBlockText: "#2A2F2C",
      tkKw: "#5F7F6E",
      tkStr: "#3E6B8C",
      tkCmt: "#8A938C",
      tkNum: "#6E7F8C",
      tkTag: "#6E7F5E",
      tkPunc: "#3B3F3D",
      quoteBorder: "#8AA29E",
      quoteBg: "#F5F5F0",
      quoteText: "#4e5b54",
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "plain",
      tableStyle: "plain",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
    },
    "neu-soft": {
      name: "触感拟态 · 温润",
      accent: "#6C7CF0",
      text: "#3f434e",
      heading: "#2E3340",
      bg: "#EDF0F4",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 10,
      hrColor: "#D8DEE8",
      link: "#3d4ac0",
      markBg: "#E8EDFF",
      thBg: "#E2E8F2",
      zebra: "#F0F3F8",
      border: "#D5DCE8",
      codeBg: "#E8EDF5",
      codeText: "#2436d1",
      codeBlockBg: "#E3E9F2",
      codeBlockText: "#2E3340",
      tkKw: "#5B6BF0",
      tkStr: "#2E6BA8",
      tkCmt: "#7A8294",
      tkNum: "#3E5F8C",
      tkTag: "#4A8C5E",
      tkPunc: "#2E3340",
      quoteBorder: "#BCC8F5",
      quoteBg: "#F4F6FC",
      quoteText: "#515873",
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "card",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "soft",
      headingFamily: null,
    },
    "neo-brutalism": {
      name: "新丑风 · 粗野",
      accent: "#FFD100",
      text: "#111111",
      heading: "#111111",
      bg: "#F4F1EA",
      bodySize: 16,
      lineHeight: 1.75,
      letterSpacing: 0.3,
      h1: 24,
      h2: 20,
      h3: 17,
      h4: 15,
      radius: 0,
      hrColor: "#111111",
      link: "#111111",
      markBg: "#FFD100",
      thBg: "#FFD100",
      zebra: "#EAE6DC",
      border: "#111111",
      codeBg: "#EAE6DC",
      codeText: "#111111",
      codeBlockBg: "#111111",
      codeBlockText: "#FFD100",
      tkKw: "#FFD100",
      tkStr: "#7CFFCB",
      tkCmt: "#9A968C",
      tkNum: "#FFB3E6",
      tkTag: "#7CFFCB",
      tkPunc: "#F4F1EA",
      quoteBorder: "#111111",
      quoteBg: "#FF76AE",
      quoteText: "#3a0517",
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "card",
      tableStyle: "hard",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: false,
      shadow: "hard",
      headingFamily: null,
      titleStyle: "marker",
      texture: "grid",
      dividerDeco: "zigzag",
    },
    y3k: {
      name: "Y3K · 赛博液态",
      accent: "#00F0FF",
      text: "#D6E4FF",
      heading: "#FFFFFF",
      bg: "#0A0A12",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.6,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#2A2A4A",
      link: "#00F0FF",
      markBg: "#2A1E3F",
      thBg: "#12122A",
      zebra: "#0E0E1E",
      border: "#2A2A4A",
      codeBg: "#12122A",
      codeText: "#00F0FF",
      codeBlockBg: "#06060C",
      codeBlockText: "#D6E4FF",
      tkKw: "#FF2E88",
      tkStr: "#00F0FF",
      tkCmt: "#5A5A7A",
      tkNum: "#FFD100",
      tkTag: "#7CFFCB",
      tkPunc: "#D6E4FF",
      quoteBorder: "#FF2E88",
      quoteBg: "#12122A",
      quoteText: "#E8CFFF",
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "neon",
      tableStyle: "zebra",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: false,
      shadow: "none",
      headingFamily: null,
      titleStyle: "chrome",
      texture: "scanline",
      dividerDeco: "blob",
    },
    maximalism: {
      name: "极繁 · 叠层",
      accent: "#D31B5E",
      text: "#2B2B2B",
      heading: "#111111",
      bg: "#FFFDF5",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 24,
      h2: 19,
      h3: 16,
      h4: 14,
      radius: 0,
      hrColor: "#111111",
      link: "#3F51B5",
      markBg: "#FFD100",
      thBg: "#00BCD4",
      zebra: "#FFF3D6",
      border: "#111111",
      codeBg: "#FFF3D6",
      codeText: "#a31042",
      codeBlockBg: "#1F1F1F",
      codeBlockText: "#F5F5F5",
      tkKw: "#FF5E8A",
      tkStr: "#4FC3F7",
      tkCmt: "#9E9E9E",
      tkNum: "#FFD100",
      tkTag: "#7CFFCB",
      tkPunc: "#F5F5F5",
      quoteBorder: "#E91E63",
      quoteBg: "#FFE3EC",
      quoteText: "#8E1F45",
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: false,
      shadow: "none",
      headingFamily: null,
      titleStyle: "overlap",
      texture: "pattern",
      dividerDeco: "stars",
    },
    collage: {
      name: "拼贴 · 手帐",
      accent: "#2F6B4F",
      text: "#3A3A3A",
      heading: "#1F1F1F",
      bg: "#F3E9D2",
      bodySize: 16,
      lineHeight: 1.8,
      letterSpacing: 0.5,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 3,
      hrColor: "#C9B896",
      link: "#2F6B4F",
      markBg: "#FFE8A3",
      thBg: "#E7D9BC",
      zebra: "#F0E7D2",
      border: "#C9B896",
      codeBg: "#EFE3C8",
      codeText: "#24523c",
      codeBlockBg: "#EADFC6",
      codeBlockText: "#2B2B2B",
      tkKw: "#A33B2B",
      tkStr: "#2F6B4F",
      tkCmt: "#8A7F6B",
      tkNum: "#7A5C8A",
      tkTag: "#5D7A1E",
      tkPunc: "#3A3A3A",
      quoteBorder: "#A33B2B",
      quoteBg: "#F7EFDA",
      quoteText: "#605136",
      h1Style: "center",
      headingMark: "underline",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: true,
      shadow: "none",
      headingFamily: null,
      texture: "grain",
      dividerDeco: "tape",
      quoteTape: true,
      stickerText: "手帐",
    },
    guochao: {
      name: "先锋国潮",
      accent: "#C3272B",
      text: "#33302A",
      heading: "#1F1D18",
      bg: "#FAF6EF",
      bodySize: 16,
      lineHeight: 1.85,
      letterSpacing: 0.6,
      h1: 22,
      h2: 18,
      h3: 16,
      h4: 14,
      radius: 0,
      hrColor: "#C9A227",
      link: "#A3252A",
      markBg: "#F6E9C8",
      thBg: "#F5E0E0",
      zebra: "#F5EFE0",
      border: "#C9A227",
      codeBg: "#F3ECD9",
      codeText: "#942126",
      codeBlockBg: "#2B2820",
      codeBlockText: "#EDE4CF",
      tkKw: "#C9A227",
      tkStr: "#E8B64C",
      tkCmt: "#8A8171",
      tkNum: "#C9A227",
      tkTag: "#A3C27A",
      tkPunc: "#EDE4CF",
      quoteBorder: "#C3272B",
      quoteBg: "#F8F1E2",
      quoteText: "#7A4A32",
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
      titleSwash: true,
      texture: "pattern",
      dividerDeco: "waves",
      quoteSeal: { type: "chinese", text: "潮", color: "#C3272B" },
    },
    dreamglow: {
      name: "浮光幻梦",
      accent: "#695CD9",
      text: "#D9D2F5",
      heading: "#F2EEFF",
      bg: "#0E0B1E",
      bodySize: 16,
      lineHeight: 1.9,
      letterSpacing: 0.8,
      h1: 24,
      h2: 19,
      h3: 16,
      h4: 14,
      radius: 10,
      hrColor: "#3A3160",
      link: "#9F8FFF",
      markBg: "#3A3160",
      thBg: "#1C1538",
      zebra: "#14102A",
      border: "#332A5C",
      codeBg: "#1C1538",
      codeText: "#a899ff",
      codeBlockBg: "#0A0814",
      codeBlockText: "#E4DFF8",
      tkKw: "#FF8FAB",
      tkStr: "#7CE7DC",
      tkCmt: "#6E6396",
      tkNum: "#FFD100",
      tkTag: "#9FE6A8",
      tkPunc: "#E4DFF8",
      quoteBorder: "#7C6CFF",
      quoteBg: "#1C1538",
      quoteText: "#C4B9E8",
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "card",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: false,
      shadow: "soft",
      headingFamily: null,
      titleStyle: "glow",
      bgMode: "gradient",
      texture: "burst",
      dividerDeco: "aurora",
    },
  };

  /* 设计令牌：每套主题的真实结构样式（标题装饰/引用形态/表格/分隔线/列表/缩进/阴影/字体）+ SVG 装饰层 + 版式 */
  const DESIGN = {
    gold: {
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      titleStyle: "boxed",
      texture: "goldfoil",
      thead: "grad",
      tableShape: "rounded",
      codeFrame: "terminal",
      h3Mark: "block",
      accent2: "#D99A2B",
    },
    blue: {
      h1Style: "center",
      headingMark: "pill",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      h2num: true,
      codeFrame: "terminal",
      titleStyle: "ribbon",
      bgMode: "radial",
      thead: "grad",
      tableShape: "rounded",
      accent2: "#1B4FD8",
    },
    dark: {
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "box",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      codeFrame: "terminal",
      titleStyle: "glow",
      bgMode: "radial",
      thead: "outline",
      accent2: "#4A9CF5",
    },
    "clean-green": {
      h1Style: "center",
      headingMark: "pill",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      tableShape: "rounded",
      titleStyle: "ribbon",
      texture: "leaf",
      thead: "grad",
      codeFrame: "paper",
      accent2: "#0B8A5C",
    },
    "red-white": {
      h1Style: "left",
      headingMark: "underline",
      quoteStyle: "leftbar",
      tableStyle: "zebra",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headerTear: "#DC2626",
      layout: "rail",
      lead: true,
      texture: "diag",
      footerText: "— 观点 · 深度 · 有态度 —",
      codeFrame: "paper",
      titleStyle: "boxed",
      thead: "grad",
      tableShape: "banded",
      accent2: "#9B1C1C",
    },
    graphite: {
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "plain",
      tableStyle: "plain",
      dividerStyle: "solid",
      listMark: "circle",
      paraIndent: false,
      shadow: "none",
      lead: true,
      codeFrame: "minimal",
      tableShape: "minimal",
      titleStyle: "boxed",
      texture: "lines",
      thead: "outline",
      h3Mark: "block",
      accent2: "#71717A",
    },
    zen: {
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "plain",
      tableStyle: "plain",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: false,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
      texture: "bamboo",
      titleSwash: true,
      kickerText: "· 空 灵 ·",
      codeFrame: "paper",
      tableShape: "minimal",
      codeInline: "pill",
      titleStyle: "boxed",
      thead: "outline",
      h3Mark: "block",
      accent2: "#5F7F6E",
    },
    receipt: {
      h1Style: "center",
      headingMark: "underline",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "ornament",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
      quoteSeal: { type: "wax", color: "#8B1E2D" },
      layout: "framed-double",
      texture: "perforation",
      footerText: "· 本票据有效 ·",
      codeFrame: "paper",
      tableShape: "minimal",
      listGlyph: "check",
      titleStyle: "boxed",
      thead: "grad",
      accent2: "#8F2D20",
    },
    "olive-notes": {
      h1Style: "left",
      headingMark: "pill",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: true,
      shadow: "none",
      layout: "rail",
      texture: "linen",
      footerText: "· 编者按 ·",
      codeFrame: "paper",
      tableShape: "rounded",
      titleStyle: "boxed",
      thead: "grad",
      h3Mark: "block",
      accent2: "#4C5731",
    },
    "ms-blue-purple": {
      h1Style: "center",
      headingMark: "band",
      quoteStyle: "box",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      h2num: true,
      codeFrame: "terminal",
      tableShape: "rounded",
      titleStyle: "grad",
      bgMode: "radial",
      thead: "grad",
      accent2: "#5C2D91",
    },
    dopamine: {
      h1Style: "center",
      headingMark: "band",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      texture: "dots",
      dividerDeco: "stars",
      quoteSplatter: "#FF5A2E",
      kickerText: "FUN · ENERGY",
      h2num: true,
      codeFrame: "terminal",
      tableShape: "rounded",
      listGlyph: "check",
      codeInline: "marker",
      titleStyle: "ribbon",
      bgMode: "halftone",
      thead: "grad",
      accent2: "#FF9EC4",
    },
    "song-ink": {
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "plain",
      tableStyle: "plain",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
      texture: "paper",
      titleSwash: true,
      dividerDeco: "brush",
      quoteSeal: { type: "chinese", text: "雅", color: "#C0392B" },
      layout: "framed",
      kickerText: "大 雅 · 宋",
      lead: true,
      codeFrame: "paper",
      tableShape: "minimal",
      codeInline: "pill",
      titleStyle: "boxed",
      thead: "outline",
      h3Mark: "block",
      accent2: "#455F4E",
    },
    "neu-soft": {
      h1Style: "center",
      headingMark: "pill",
      quoteStyle: "card",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: true,
      shadow: "soft",
      texture: "grain",
      dividerDeco: "pill",
      layout: "softcard",
      codeFrame: "paper",
      tableShape: "rounded",
      codeInline: "pill",
      titleStyle: "boxed",
      h3Mark: "block",
      accent2: "#8A93F5",
    },
    "neo-brutalism": {
      h1Style: "center",
      headingMark: "band",
      quoteStyle: "card",
      tableStyle: "hard",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: false,
      shadow: "hard",
      headingFamily:
        '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
      titleStyle: "ribbon",
      texture: "grid",
      dividerDeco: "zigzag",
      layout: "framed-hard",
      footerText: "NO RULES · JUST IMPACT",
      codeFrame: "brutal",
      tableShape: "minimal",
      listGlyph: "arrow",
      thead: "flat",
      accent2: "#111111",
    },
    y3k: {
      h1Style: "center",
      headingMark: "bar",
      quoteStyle: "neon",
      tableStyle: "zebra",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: false,
      shadow: "none",
      headingFamily:
        '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace',
      titleStyle: "chrome",
      texture: "scanline",
      dividerDeco: "blob",
      layout: "cyber",
      kickerText: "// SYSTEM ONLINE",
      codeFrame: "neon",
      listGlyph: "check",
      bgMode: "radial",
      thead: "grad",
      tableShape: "rounded",
      accent2: "#FF2E88",
    },
    maximalism: {
      h1Style: "center",
      headingMark: "band",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: false,
      shadow: "none",
      headingFamily: null,
      titleStyle: "overlap",
      texture: "aztec",
      dividerDeco: "shards",
      h2num: true,
      footerText: "MORE · MORE · MORE",
      codeFrame: "terminal",
      tableShape: "stripes",
      bgMode: "halftone",
      thead: "grad",
      h3Mark: "block",
      accent2: "#FFB300",
    },
    collage: {
      h1Style: "center",
      headingMark: "underline",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "square",
      paraIndent: true,
      shadow: "none",
      headingFamily: null,
      texture: "kraft",
      dividerDeco: "tape",
      quoteTape: true,
      stickerText: "手帐",
      footerText: "· 手帐 · 2026 ·",
      codeFrame: "sticky",
      tableShape: "minimal",
      listGlyph: "check",
      titleStyle: "boxed",
      thead: "flat",
      accent2: "#8A4B2B",
    },
    guochao: {
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "card",
      tableStyle: "headeronly",
      dividerStyle: "solid",
      listMark: "disc",
      paraIndent: true,
      shadow: "none",
      headingFamily:
        'Georgia, "Times New Roman", "Noto Serif SC", "Songti SC", SimSun, serif',
      titleSwash: true,
      texture: "pattern",
      dividerDeco: "waves",
      quoteSeal: {
        type: "chinese",
        text: "潮",
        color: "#C3272B",
        shape: "round",
      },
      layout: "banner",
      kickerText: "國 · 潮",
      codeFrame: "paper",
      tableShape: "minimal",
      titleStyle: "banner",
      thead: "grad",
      accent2: "#C9A227",
    },
    dreamglow: {
      h1Style: "center",
      headingMark: "plain",
      quoteStyle: "card",
      tableStyle: "zebra",
      dividerStyle: "dashed",
      listMark: "disc",
      paraIndent: false,
      shadow: "soft",
      headingFamily: null,
      titleStyle: "glow",
      bgMode: "radial",
      texture: "burst",
      dividerDeco: "aurora",
      layout: "cyber",
      kickerText: "✦ DREAMGLOW ✦",
      codeFrame: "neon",
      tableShape: "rounded",
      codeInline: "pill",
      thead: "grad",
      accent2: "#4FD1C5",
    },
  };
  Object.keys(THEMES).forEach(function (k) {
    // 顺序：默认设计 → 主题自带设计（优先）→ DESIGN 显式配置（兜底/覆盖）
    THEMES[k] = Object.assign(
      {},
      {
        h1Style: "center",
        headingMark: "bar",
        quoteStyle: "leftbar",
        tableStyle: "zebra",
        dividerStyle: "dashed",
        listMark: "disc",
        paraIndent: true,
        shadow: "none",
        headingFamily: null,
        texture: null,
        titleSwash: false,
        dividerDeco: null,
        quoteSeal: null,
        quoteSplatter: null,
        headerTear: null,
        titleStyle: null,
        bgMode: "solid",
        quoteTape: false,
        stickerText: null,
        layout: "classic",
        kickerText: null,
        footerText: null,
        lead: false,
        h2num: false,
        codeFrame: null,
        tableShape: null,
        listGlyph: null,
        codeInline: null,
        accent2: null,
        h3Mark: null,
        thead: "flat",
      },
      THEMES[k],
      DESIGN[k] || {},
    );
    // 补全 secondary 强调色（未显式设置时用主色加深 22%）
    if (!THEMES[k].accent2) THEMES[k].accent2 = shade(THEMES[k].accent, 0.22);
  });

  globalThis.MD = {
    escapeHtml: escapeHtml,
    escapeMin: escapeMin,
    highlightCode: highlightCode,
    compact4: compact4,
    compactBorder: compactBorder,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    mix: mix,
    tint: tint,
    shade: shade,
    luminance: luminance,
    contrast: contrast,
    parseStyleDescription: parseStyleDescription,
    buildTheme: buildTheme,
    mergeTheme: mergeTheme,
    decoSVG: decoSVG,
    svgDataUri: svgDataUri,
    bgTexture: bgTexture,
    RECIPES: RECIPES,
    composeRecipe: composeRecipe,
    mixTheme: mixTheme,
    THEMES: THEMES,
  };
})();
