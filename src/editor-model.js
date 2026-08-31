/* Pure document transformations shared by the UI and regression tests. */
globalThis.EDITOR_MODEL = (() => {
  "use strict";
  const MAX_DOCUMENT = 8 * 1024 * 1024;
  const ID = /^img-[a-z0-9-]+$/;
  const DATA = /^data:image\/(png|jpe?g|webp|gif);base64,([a-z\d+/=\s]+)$/i;
  const FONT = {
    system: "inherit",
    serif: '"Songti SC", "Noto Serif SC", SimSun, serif',
    mono: "ui-monospace, Menlo, Consolas, monospace",
  };

  function imageData(value) {
    const match = typeof value === "string" && value.match(DATA);
    if (!match)
      throw new Error("图片资源格式无效，仅支持 PNG、JPEG、WebP、GIF");
    return {
      mime:
        "image/" +
        (match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase()),
      base64: match[2].replace(/\s/g, ""),
    };
  }
  function cleanAssets(input = {}) {
    const output = {};
    let total = 0;
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("图片资源表无效");
    for (const [id, value] of Object.entries(input)) {
      if (!ID.test(id) || !value || typeof value.data !== "string")
        throw new Error("图片资源标识无效");
      const parsed = imageData(value.data);
      total += parsed.base64.length;
      if (total > MAX_DOCUMENT)
        throw new Error("图片资源超过 8 MB，请拆分文档");
      output[id] = {
        name: String(value.name || id)
          .replace(/[<>\r\n\0]/g, "")
          .slice(0, 120),
        mime: parsed.mime,
        data: "data:" + parsed.mime + ";base64," + parsed.base64,
      };
    }
    return output;
  }
  function addAsset(assets, data, name = "图片") {
    const parsed = imageData(data);
    const normalized = "data:" + parsed.mime + ";base64," + parsed.base64;
    const existing = Object.keys(assets).find(
      (id) => assets[id].data === normalized,
    );
    if (existing) return existing;
    let index = 1;
    while (Object.hasOwn(assets, "img-" + String(index).padStart(3, "0")))
      index++;
    const id = "img-" + String(index).padStart(3, "0");
    assets[id] = {
      name: String(name)
        .replace(/[<>\r\n\0]/g, "")
        .slice(0, 120),
      mime: parsed.mime,
      data: normalized,
    };
    return id;
  }

  // Match child-token text back to its original characters. Container prefixes
  // (blockquote markers/list indentation) are skipped only at line boundaries.
  function locateChild(raw, child, from) {
    if (!child) return null;
    const first = child.split("\n")[0];
    let start = raw.indexOf(first, from);
    while (start >= 0) {
      let i = start,
        j = 0;
      const map = [];
      while (j < child.length) {
        if (raw[i] === child[j]) {
          map.push(i++);
          j++;
          continue;
        }
        if (j > 0 && child[j - 1] === "\n") {
          const end = raw.indexOf("\n", i),
            line = raw.slice(i, end < 0 ? raw.length : end);
          const next = child.slice(j).split("\n")[0];
          const at = line.indexOf(next);
          if (next === "" && line.length && /^[ >\t]*$/.test(line)) {
            i += line.length;
            continue;
          }
          if (at > 0 && /^[ >\t]*$/.test(line.slice(0, at))) {
            i += at;
            continue;
          }
        }
        // GFM table lexing unescapes a cell's escaped pipe.
        if (raw[i] === "\\" && raw[i + 1] === "|" && child[j] === "|") {
          i++;
          continue;
        }
        break;
      }
      if (j === child.length) return { start, end: i, map };
      start = raw.indexOf(first, start + 1);
    }
    return null;
  }
  function imageTokens(source, parser) {
    const images = [];
    parser.walkTokens(parser.lexer(source), (t) => {
      if (t.type === "image") images.push(t);
    });
    return images;
  }
  function rewriteImageURLs(source, parser, transform) {
    const tokens = parser.lexer(source),
      references = new Set(),
      edits = [];
    parser.walkTokens(tokens, (t) => {
      if (t.type === "image") references.add(t.href);
    });
    if (!references.size) return source;
    function visit(token, map) {
      const raw = token.raw || "";
      if (["code", "codespan", "html"].includes(token.type)) return;
      if (
        (token.type === "image" ||
          (token.type === "def" && references.has(token.href))) &&
        token.href
      ) {
        const beginning =
          token.type === "image" ? Math.max(0, raw.indexOf("](") + 2) : 0;
        const at = raw.indexOf(token.href, beginning);
        if (at >= 0) {
          const value = transform(
            token.href,
            token.text || token.tag || "图片",
          );
          if (value !== token.href)
            edits.push({
              start: map[at],
              end: map[at + token.href.length - 1] + 1,
              value,
            });
        }
        return;
      }
      let children = token.items || token.tokens;
      if (token.type === "table")
        children = [...token.header, ...token.rows.flat()].flatMap(
          (cell) => cell.tokens || [],
        );
      if (!Array.isArray(children)) return;
      let cursor = 0;
      for (const child of children) {
        if (!child.raw) continue;
        const found = locateChild(raw, child.raw, cursor);
        if (!found) continue;
        visit(
          child,
          found.map.map((i) => map[i]),
        );
        cursor = found.end;
      }
    }
    let offset = 0;
    for (const token of tokens) {
      const raw = token.raw || "";
      visit(
        token,
        Array.from({ length: raw.length }, (_, i) => offset + i),
      );
      offset += raw.length;
    }
    let result = source;
    for (const e of edits.sort((a, b) => b.start - a.start))
      result = result.slice(0, e.start) + e.value + result.slice(e.end);
    return result;
  }
  function assertResources(source, assets, parser) {
    for (const token of imageTokens(source, parser)) {
      if (
        token.href?.startsWith("asset:") &&
        !Object.hasOwn(assets, token.href.slice(6))
      )
        throw new Error(
          "图片资源缺失：" + token.href.slice(6) + "。原文档未被替换。",
        );
    }
  }
  function normalizeAssets(source, assets, parser) {
    const nextAssets = cleanAssets(assets);
    const nextSource = rewriteImageURLs(source, parser, (url, alt) =>
      DATA.test(url) ? "asset:" + addAsset(nextAssets, url, alt) : url,
    );
    if (
      nextSource.length +
        Object.values(nextAssets).reduce((n, a) => n + a.data.length, 0) >
      MAX_DOCUMENT
    )
      throw new Error("文档与图片合计超过 8 MB，请拆分后导入");
    return {
      source: nextSource,
      assets: nextAssets,
      migrated: nextSource !== source,
    };
  }
  function bytesFromData(data) {
    const parsed = imageData(data),
      decoded = atob(parsed.base64);
    return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  }
  function dataFromBytes(bytes, mime) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 32768)
      binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    return "data:" + mime + ";base64," + btoa(binary);
  }
  function packageDocument(document, parser, zip) {
    const files = {},
      assets = document.assets || {};
    const source = rewriteImageURLs(document.source, parser, (url) => {
      const id = url.startsWith("asset:") ? url.slice(6) : "";
      if (!ID.test(id)) return url;
      if (!Object.hasOwn(assets, id))
        throw new Error("图片资源缺失：" + id + "。请补回图片后再导出。");
      const asset = assets[id],
        ext = asset.mime.split("/")[1].replace("jpeg", "jpg");
      const name = "images/" + id + "." + ext;
      files[name] = bytesFromData(asset.data);
      return name;
    });
    for (const token of imageTokens(source, parser)) {
      if (token.href?.startsWith("asset:"))
        throw new Error("图片引用无法安全打包，请下载完整文档备份。");
      if (
        /^images\/img-/.test(token.href || "") &&
        !Object.hasOwn(files, token.href)
      )
        throw new Error("图片包缺少资源文件");
    }
    files["article.md"] = zip.strToU8(source);
    const { source: ignored, assets: ignoredAssets, ...metadata } = document;
    files["layout.acks.json"] = zip.strToU8(JSON.stringify(metadata, null, 2));
    return zip.zipSync(files, { level: 6 });
  }
  function portableDocument(document, parser) {
    const used = new Set();
    parser.walkTokens(parser.lexer(document.source), (token) => {
      if (
        token.type === "image" &&
        /^asset:img-[a-z0-9-]+$/.test(token.href || "")
      )
        used.add(token.href.slice(6));
    });
    const assets = {};
    for (const id of used) {
      if (!Object.hasOwn(document.assets || {}, id))
        throw new Error("图片资源缺失：" + id);
      assets[id] = document.assets[id];
    }
    return { ...document, assets };
  }
  function unpackDocument(bytes, parser, zip) {
    let total = 0,
      count = 0;
    const files = zip.unzipSync(bytes, {
      filter(file) {
        count++;
        total += file.originalSize;
        if (count > 100 || total > MAX_DOCUMENT)
          throw new Error("图片包展开后超过安全大小限制");
        if (file.name.startsWith("/") || file.name.split("/").includes(".."))
          throw new Error("图片包包含无效路径");
        return /^(?:article\.md|layout\.acks\.json|images\/img-[a-z0-9-]+\.(?:png|jpe?g|gif|webp))$/i.test(
          file.name,
        );
      },
    });
    if (!files["article.md"])
      throw new Error("此图片包没有 article.md；请导入 ACKS 导出的 ZIP");
    const assets = {};
    const source = rewriteImageURLs(
      zip.strFromU8(files["article.md"]),
      parser,
      (url) => {
        if (!Object.hasOwn(files, url)) {
          if (url.startsWith("asset:") || url.startsWith("images/"))
            throw new Error("图片包缺少资源：" + url);
          return url;
        }
        const ext = url.split(".").pop().toLowerCase();
        const mime = "image/" + (ext === "jpg" ? "jpeg" : ext);
        return (
          "asset:" +
          addAsset(
            assets,
            dataFromBytes(files[url], mime),
            url.split("/").pop(),
          )
        );
      },
    );
    const metadata = files["layout.acks.json"]
      ? JSON.parse(zip.strFromU8(files["layout.acks.json"]))
      : {};
    return { ...metadata, source, assets, version: 3 };
  }

  function inlineHTML(text) {
    if (
      /^<\/(?:u|mark|span|strong|em|del|sup|sub)>$/i.test(text.trim()) ||
      /^<(?:u|mark|strong|em|del|sup|sub|br\s*\/?)>$/i.test(text.trim())
    )
      return text;
    if (
      !/^<span(?:\s+data-md-(?:color|font|size|decoration)="[^"<>]*")+\s*>$/i.test(
        text.trim(),
      )
    )
      return null;
    const attributes = [];
    for (const match of text.matchAll(
      /data-md-(color|font|size|decoration)="([^"]*)"/gi,
    )) {
      const key = match[1].toLowerCase(),
        value = match[2];
      if (
        (key === "color" && /^#[a-f\d]{6}$/i.test(value)) ||
        (key === "font" && Object.hasOwn(FONT, value)) ||
        (key === "size" &&
          /^\d{1,2}(?:\.\d)?$/.test(value) &&
          Number(value) >= 8 &&
          Number(value) <= 64) ||
        (key === "decoration" && ["wavy", "dots"].includes(value))
      )
        attributes.push("data-md-" + key + '="' + value + '"');
    }
    return attributes.length ? "<span " + attributes.join(" ") + ">" : "<span>";
  }
  function formatEdit(value, start, end, kind, options = {}) {
    const selected = value.slice(start, end);
    function replace(text, selectionStart = 0, selectionEnd = text.length) {
      return {
        value: value.slice(0, start) + text + value.slice(end),
        start: start + selectionStart,
        end: start + selectionEnd,
      };
    }
    function wrap(before, after, placeholder = "文字") {
      const text = selected || placeholder;
      if (
        selected.startsWith(before) &&
        selected.endsWith(after) &&
        selected.length >= before.length + after.length
      )
        return replace(selected.slice(before.length, -after.length));
      const leading = text.match(/^\s*/)[0],
        trailing = text.match(/\s*$/)[0];
      const inner =
        text.slice(leading.length, text.length - trailing.length) ||
        placeholder;
      return replace(
        leading + before + inner + after + trailing,
        leading.length + before.length,
        leading.length + before.length + inner.length,
      );
    }
    if (kind === "bold") return wrap("**", "**", "粗体文字");
    if (kind === "italic") return wrap("*", "*", "斜体文字");
    if (kind === "strike") return wrap("~~", "~~", "删除线文字");
    if (kind === "underline") return wrap("<u>", "</u>", "下划线文字");
    if (kind === "highlight") return wrap("<mark>", "</mark>", "重点文字");
    if (kind === "wavy" || kind === "dots")
      return wrap('<span data-md-decoration="' + kind + '">', "</span>");
    if (kind === "style") {
      const attrs = [];
      if (/^#[a-f\d]{6}$/i.test(options.color || ""))
        attrs.push('data-md-color="' + options.color + '"');
      if (Object.hasOwn(FONT, options.font) && options.font !== "system")
        attrs.push('data-md-font="' + options.font + '"');
      if (/^(?:12|14|16|18|20|24)$/.test(String(options.size || "")))
        attrs.push('data-md-size="' + options.size + '"');
      return attrs.length
        ? wrap("<span " + attrs.join(" ") + ">", "</span>")
        : replace(selected);
    }
    if (kind === "inline-code") {
      const text = selected || "code",
        longest = Math.max(
          0,
          ...(text.match(/`+/g) || []).map((s) => s.length),
        );
      const ticks = "`".repeat(longest + 1);
      return wrap(ticks + " ", " " + ticks, "code");
    }
    if (kind === "link") {
      const label = (options.label || selected || "链接文字").replace(
        /([\\\[\]])/g,
        "\\$1",
      );
      const href = String(options.href || "")
        .replace(/\(/g, "%28")
        .replace(/\)/g, "%29");
      return replace("[" + label + "](" + href + ")");
    }
    if (kind === "table") {
      const cells = options.cells.map((row) =>
        row.map((cell) =>
          String(cell).replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>"),
        ),
      );
      const rows = [cells[0], cells[0].map(() => "---"), ...cells.slice(1)];
      return replace(
        "\n\n" +
          rows.map((row) => "| " + row.join(" | ") + " |").join("\n") +
          "\n\n",
      );
    }
    if (kind === "code-block") {
      const text = selected || "在这里输入代码",
        longest = Math.max(
          2,
          ...(text.match(/`+/g) || []).map((s) => s.length),
        );
      const ticks = "`".repeat(longest + 1),
        lang = /^[\w+-]{0,32}$/.test(options.language || "")
          ? options.language || ""
          : "";
      const prefix = "\n\n" + ticks + lang + "\n";
      return replace(
        prefix + text + "\n" + ticks + "\n\n",
        prefix.length,
        prefix.length + text.length,
      );
    }
    if (kind === "divider") return replace("\n\n---\n\n");
    if (kind === "clear")
      return replace(
        selected
          .replace(/<\/?(?:u|mark|span|strong|em|del|sup|sub)\b[^>]*>/gi, "")
          .replace(/(\*\*|~~|__)([\s\S]*?)\1/g, "$2"),
      );
    const lineStart = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
    const anchor = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const following = value.indexOf("\n", anchor);
    const lineEnd = following < 0 ? value.length : following;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    let number = 0;
    const result = lines
      .map((line) => {
        if (kind === "heading")
          return (
            "#".repeat(Math.max(1, Math.min(6, options.level || 2))) +
            " " +
            line.replace(/^\s{0,3}#{1,6}\s+/, "")
          );
        if (kind === "paragraph") return line.replace(/^\s{0,3}#{1,6}\s+/, "");
        if (kind === "quote")
          return /^\s*>/.test(line)
            ? line.replace(/^\s*>\s?/, "")
            : "> " + line;
        if (!line.trim() && lines.length > 1) return line;
        const indent = line.match(/^\s*/)[0],
          plain = line
            .slice(indent.length)
            .replace(/^(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s*)?/, "");
        const marker =
          kind === "ordered"
            ? ++number + ". "
            : kind === "task"
              ? "- [ ] "
              : "- ";
        return indent + marker + (plain || "列表项");
      })
      .join("\n");
    return {
      value: value.slice(0, lineStart) + result + value.slice(lineEnd),
      start: lineStart,
      end: lineStart + result.length,
    };
  }
  return {
    MAX_DOCUMENT,
    FONT,
    imageData,
    cleanAssets,
    addAsset,
    normalizeAssets,
    assertResources,
    imageTokens,
    rewriteImageURLs,
    portableDocument,
    packageDocument,
    unpackDocument,
    inlineHTML,
    formatEdit,
  };
})();
