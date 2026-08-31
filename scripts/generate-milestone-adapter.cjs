// Optional maintainer tool. Usage:
// node scripts/generate-milestone-adapter.cjs /path/to/milestone/source
const fs = require("node:fs"),
  path = require("node:path"),
  postcss = require("postcss");
const root = path.resolve(__dirname, ".."),
  sourceRoot = process.argv[2];
if (!sourceRoot) {
  throw new Error("Pass the path to an authorized Milestone source checkout.");
}
const themes = JSON.parse(
  fs.readFileSync(path.join(root, "src/milestone-theme-catalog.json"), "utf8"),
);
const ast = postcss.parse(
  fs.readFileSync(path.join(sourceRoot, "app/markdown-themes.css"), "utf8"),
);
const rules = [];
ast.walkRules((r) => {
  for (const selector of r.selectors) {
    const m = selector.match(/\.md-preview\.theme-([\w]+)(.*)$/);
    if (m)
      rules.push({
        key: m[1],
        tail: m[2],
        dark: selector.includes("[data-theme="),
        decls: r.nodes
          .filter((x) => x.type === "decl")
          .map((d) => [d.prop, d.value]),
      });
  }
});
function style(key, mode, tail) {
  const out = {};
  for (const r of rules)
    if (r.key === key && r.tail === tail && (!r.dark || mode === "dark"))
      for (const [p, v] of r.decls) out[p] = v;
  return out;
}
const hex = (s, f) => (/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(s || "") ? s : f);
const size = (s, b, f) =>
  s?.endsWith("em") ? parseFloat(s) * b : s?.endsWith("px") ? parseFloat(s) : f;
const result = [];
let css =
  "/* Generated from Milestone @ 5aca8fc74939; declarations adapted to isolated selectors and semantic tokens. */\n";
for (const theme of themes)
  for (const mode of theme.mode === "both" ? ["light", "dark"] : [theme.mode]) {
    const key = theme.key,
      id = `milestone-${key}-${mode}`,
      base = style(key, mode, ""),
      h1 = style(key, mode, " h1"),
      h2 = style(key, mode, " h2"),
      quote = style(key, mode, " blockquote"),
      pre = style(key, mode, " pre"),
      ci = style(key, mode, " :not(pre)>code"),
      th = style(key, mode, " th"),
      row = style(key, mode, " tbody tr:nth-child(even)"),
      link = style(key, mode, " a");
    const bg = hex(base["background-color"], "#fff"),
      text = hex(base.color, mode === "dark" ? "#ddd" : "#333"),
      heading = hex(h1.color, text),
      accent = hex(link.color, heading),
      body = parseFloat(base["font-size"]) || 17;
    const t = {
      id,
      key,
      variant: mode,
      name: theme.nameZh + " · " + (mode === "dark" ? "深色" : "浅色"),
      bg,
      text,
      heading,
      accent,
      accent2: accent,
      emphasis: accent,
      sectionHeading: hex(h2.color, heading),
      titleText: heading,
      titleBg: hex(h1["background-color"], bg),
      thBg: hex(th["background-color"], bg),
      thText: hex(th.color, heading),
      quoteBg: hex(quote["background-color"], bg),
      quoteText: hex(quote.color, text),
      quoteBorder: accent,
      codeBg: hex(ci["background-color"], bg),
      codeText: hex(ci.color, text),
      codeBlockBg: hex(pre["background-color"], bg),
      codeBlockText: hex(pre.color, text),
      zebra: hex(row["background-color"], bg),
      bodySize: Math.min(body, 20),
      lineHeight: parseFloat(base["line-height"]) || 1.85,
      letterSpacing: 0.1,
      h1: Math.min(size(h1["font-size"], body, 30), 38),
      h2: Math.min(size(h2["font-size"], body, 23), 28),
      h3: 20,
      h4: 17,
      fontFamily: base["font-family"],
      headingFamily: h1["font-family"] || base["font-family"],
    };
    result.push(t);
    const sel = `.ms-doc[data-milestone="${key}-${mode}"]`;
    for (const r of rules.filter(
      (r) => r.key === key && (!r.dark || mode === "dark"),
    )) {
      // The reused traffic-light window decoration is deliberately removed from all imported families.
      if (r.tail === " pre::before") continue;
      const out = [];
      for (let [p, v] of r.decls) {
        if (p === "font-family")
          v = r.tail.includes("code")
            ? v
            : r.tail.includes("h")
              ? "var(--heading-font)"
              : "var(--body-font)";
        if (!r.tail && p === "font-size") v = "var(--body-size)";
        if (!r.tail && p === "line-height") v = "var(--line-height)";
        if (p === "color") {
          if (r.tail.includes("code"))
            v = r.tail.includes("pre")
              ? "var(--codeblock-text)"
              : "var(--code-text)";
          else if (r.tail.includes("blockquote")) v = "var(--quote-text)";
          else if (r.tail === " th") v = "var(--th-text)";
          else if (r.tail === " h1") v = "var(--title-text)";
          else if (r.tail === " h2") v = "var(--section-heading)";
          else if (/^ h[3-6]$/.test(r.tail)) v = "var(--heading)";
          else if (r.tail === " a" || r.tail === " a:hover") v = "var(--link)";
          else v = "var(--text)";
        }
        if (p === "background-color") {
          if (!r.tail) v = "var(--bg)";
          else if (r.tail === " pre") v = "var(--codeblock-bg)";
          else if (r.tail.includes("code")) v = "var(--code-bg)";
          else if (r.tail === " th") v = "var(--th-bg)";
          else if (r.tail.includes("blockquote")) v = "var(--quote-bg)";
          else if (r.tail.includes("nth-child")) v = "var(--zebra)";
          else if (r.tail === " h1") v = "var(--title-bg)";
          else if (r.tail === " h2") v = "var(--mark-bg)";
          else if (r.tail === " hr") v = "var(--hr-color)";
        }
        // Keep geometry; colors are driven by the current palette so cross-library mixing remains functional.
        if (p.includes("border") || p === "text-decoration-color")
          v = v.replace(/#[\da-f]+/gi, (c) =>
            c.length === 9 ? "var(--border)" : "var(--accent)",
          );
        if (
          ["h1", "h2", "h3", "h4"].some((h) => r.tail === " " + h) &&
          p === "font-size"
        )
          v = `var(--${r.tail.trim()})`;
        // Gradient text was not portable to WeChat; its family retains a solid accent title instead.
        if (
          (p === "background" || p === "background-image") &&
          v.includes("gradient")
        )
          continue;
        if (p.includes("background-clip")) continue;
        if (/#[\da-f]{5}\b/i.test(v)) continue;
        out.push(`${p}:${v}`);
      }
      css += sel + r.tail + "{" + out.join(";") + "}\n";
    }
  }
fs.writeFileSync(
  path.join(root, "src/milestone-profiles.json"),
  JSON.stringify(result, null, 2),
);
fs.writeFileSync(path.join(root, "src/milestone-generated.css"), css);
console.log(`Built ${result.length} isolated Milestone profiles`);
