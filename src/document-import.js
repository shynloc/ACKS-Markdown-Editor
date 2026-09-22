/* Local-only import. Mammoth supplies semantic DOCX HTML; it is never mounted
 * without sanitization and is converted to the editor's restricted Markdown. */
globalThis.DOCUMENT_IMPORT = (() => {
  const MODEL = globalThis.EDITOR_MODEL,
    W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const escape = (text) =>
    String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/([\\`*_{}\[\]()#+\-.!>|~])/g, "\\$1");
  const safeURL = (value) => {
    try {
      if (/^#[^\s]+$/.test(value)) return value;
      const u = new URL(value);
      return /^(https?:|mailto:)$/.test(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };
  function decode(bytes, encoding = "auto") {
    let choice = encoding,
      warnings = [];
    if (choice === "auto") {
      if (bytes[0] === 255 && bytes[1] === 254) choice = "utf-16le";
      else if (bytes[0] === 254 && bytes[1] === 255) choice = "utf-16be";
      else {
        try {
          new TextDecoder("utf-8", { fatal: true }).decode(bytes);
          choice = "utf-8";
        } catch {
          choice = "gb18030";
          warnings.push(
            "文件不是有效UTF-8，已按GB18030解码；请核对中文，必要时切换编码。",
          );
        }
      }
    }
    const text = new TextDecoder(choice, { fatal: true })
      .decode(bytes)
      .replace(/^\uFEFF/, "")
      .replace(/\r\n?/g, "\n");
    if (text.includes("\0"))
      throw new Error("文件含有大量二进制或空字符，请核对格式和编码。");
    return { text, encoding: choice.toUpperCase(), warnings };
  }
  function xml(bytes) {
    const text = new TextDecoder().decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text))
      throw new Error("文档XML包含不允许的实体定义");
    const d = new DOMParser().parseFromString(text, "application/xml");
    if (d.querySelector("parsererror")) throw new Error("DOCX内部XML损坏");
    return d;
  }
  function prepareDocx(bytes, zip) {
    let size = 0,
      count = 0;
    const warnings = [],
      styles = {};
    const files = zip.unzipSync(bytes, {
      filter(f) {
        if (++count > 2000 || (size += f.originalSize) > 32 * 1024 * 1024)
          throw new Error("DOCX展开后超过32MB或2000个文件，请缩小后导入");
        if (f.name.startsWith("/") || f.name.split("/").includes(".."))
          throw new Error("DOCX包含无效路径");
        if (/vbaProject\.bin$/i.test(f.name))
          throw new Error("不支持带宏的Word文档，请另存为无宏DOCX");
        return true;
      },
    });
    if (!files["word/document.xml"])
      throw new Error("不是有效的DOCX，旧版.doc请先另存为.docx");
    for (const [name, bytes] of Object.entries(files))
      if (/\.(xml|rels)$/.test(name)) xml(bytes);
    const doc = xml(files["word/document.xml"]);
    if (doc.getElementsByTagName("*").length > 100000)
      throw new Error("Word文档过于复杂，请拆分后导入");
    const tags = {
      drawing: "图片位置将改为正文中的行内位置。",
      txbxContent: "文本框内容提取为普通段落，不保留浮动位置。",
      sectPr: "页边距、分栏、分页及纸张尺寸不保留。",
      ins: "修订按最终可见内容处理，请核对修订文本。",
      del: "删除修订内容不导入，请在Word中确认最终稿。",
      oMath: "数学公式无法保证转换，需人工核对。",
      object: "嵌入对象不导入，需人工补充。",
      altChunk: "嵌入HTML或外部文档片段不导入，需人工补充。",
    };
    for (const [tag, note] of Object.entries(tags))
      if (doc.getElementsByTagNameNS("*", tag).length) warnings.push(note);
    if (
      Object.keys(files).some((n) => /^word\/(header|footer)\d*\.xml$/.test(n))
    )
      warnings.push("页眉、页脚及页码不导入正文。");
    if (
      doc.getElementsByTagNameNS(W, "vMerge").length ||
      doc.getElementsByTagNameNS(W, "gridSpan").length
    )
      warnings.push("合并单元格已展开为普通网格，内容保留在首格，其余格留空。");
    // Add private character styles only for explicit Word typography. The style map
    // routes those runs to safe marker classes; no Word CSS is trusted or executed.
    const stylesDoc = files["word/styles.xml"]
      ? xml(files["word/styles.xml"])
      : new DOMParser().parseFromString(
          '<w:styles xmlns:w="' + W + '"/>',
          "application/xml",
        );
    const styleMap = [];
    let seq = 0;
    for (const run of doc.getElementsByTagNameNS(W, "r")) {
      const pr = [...run.children].find((e) => e.localName === "rPr");
      if (!pr) continue;
      const get = (n) => [...pr.children].find((e) => e.localName === n),
        val = (n) => get(n)?.getAttributeNS(W, "val");
      const fontNode = get("rFonts"),
        font =
          fontNode?.getAttributeNS(W, "eastAsia") ||
          fontNode?.getAttributeNS(W, "ascii");
      const meta = {};
      const color = val("color");
      if (/^[\da-f]{6}$/i.test(color || "")) meta.color = "#" + color;
      const point = Number(val("sz"));
      if (point > 0)
        meta.size = Math.min(
          64,
          Math.max(8, Math.round(((point * 2) / 3) * 10) / 10),
        );
      if (point > 0 && ((point * 2) / 3 < 8 || (point * 2) / 3 > 64))
        warnings.push("部分显式字号超出8–64px范围，已按支持范围调整。 ");
      if (font)
        meta.font =
          /serif|times|song|simsun|cambria|georgia|garamond|palatino|baskerville|bodoni|kaiti|mincho|宋|明朝|楷|仿宋/i.test(
            font,
          )
            ? "serif"
            : /mono|consolas|courier|menlo|cascadia|fira.?code|source.?code|lucida.?console/i.test(
                  font,
                )
              ? "mono"
              : "system";
      if (!Object.keys(meta).length) continue;
      const name = "ACKSImport" + ++seq;
      styles[name] = meta;
      const existing = get("rStyle"),
        oldID = existing?.getAttributeNS(W, "val");
      const st = stylesDoc.createElementNS(W, "w:style");
      st.setAttributeNS(W, "w:type", "character");
      st.setAttributeNS(W, "w:styleId", name);
      const nm = stylesDoc.createElementNS(W, "w:name");
      nm.setAttributeNS(W, "w:val", name);
      st.append(nm);
      if (oldID) {
        const based = stylesDoc.createElementNS(W, "w:basedOn");
        based.setAttributeNS(W, "w:val", oldID);
        st.append(based);
      }
      stylesDoc.documentElement.append(st);
      const rn = existing || doc.createElementNS(W, "w:rStyle");
      rn.setAttributeNS(W, "w:val", name);
      if (!existing) pr.prepend(rn);
      styleMap.push("r[style-name='" + name + "'] => span." + name);
    }
    files["word/document.xml"] = zip.strToU8(
      new XMLSerializer().serializeToString(doc),
    );
    files["word/styles.xml"] = zip.strToU8(
      new XMLSerializer().serializeToString(stylesDoc),
    );
    if (seq)
      warnings.push(
        "“保留文字样式”仅保留可识别的显式颜色、字号与字体类别；精确字体、继承样式和主题色仍可能简化。",
      );
    return { bytes: zip.zipSync(files), styles, styleMap, warnings };
  }
  function htmlToMarkdown(
    html,
    { styles = {}, preserve = false, assets = {}, warnings = [] } = {},
  ) {
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "strong",
        "b",
        "em",
        "i",
        "u",
        "s",
        "del",
        "sup",
        "sub",
        "mark",
        "span",
        "a",
        "img",
        "ul",
        "ol",
        "li",
        "blockquote",
        "pre",
        "code",
        "table",
        "thead",
        "tbody",
        "tr",
        "td",
        "th",
      ],
      ALLOWED_ATTR: [
        "href",
        "src",
        "alt",
        "class",
        "id",
        "start",
        "colspan",
        "rowspan",
      ],
      ALLOW_DATA_ATTR: false,
      ADD_URI_SAFE_ATTR: ["rowspan", "colspan", "start"],
      ALLOWED_URI_REGEXP: /^(?:asset:img-[a-z0-9-]+$|https?:|mailto:|#)/i,
    });
    const doc = new DOMParser().parseFromString(clean, "text/html");
    function inline(node) {
      if (node.nodeType === 3) return escape(node.textContent);
      if (node.nodeType !== 1) return "";
      const tag = node.tagName.toLowerCase(),
        text = [...node.childNodes].map(inline).join("");
      if (["strong", "b"].includes(tag)) return "<strong>" + text + "</strong>";
      if (["em", "i"].includes(tag)) return "<em>" + text + "</em>";
      if (["u", "sup", "sub", "mark"].includes(tag))
        return "<" + tag + ">" + text + "</" + tag + ">";
      if (["s", "del"].includes(tag)) return "<del>" + text + "</del>";
      if (tag === "br") return "<br>";
      if (tag === "p") return text + "<br>";
      if (tag === "a") {
        const href = safeURL(node.getAttribute("href") || "");
        if (href.startsWith("#footnote-ref") || href.startsWith("#endnote-ref"))
          return "";
        if (!href || href.startsWith("#")) return text;
        return (
          "[" +
          text +
          "](" +
          href.replace(/\(/g, "%28").replace(/\)/g, "%29") +
          ")"
        );
      }
      if (tag === "img") {
        const src = node.getAttribute("src") || "",
          alt = node.getAttribute("alt") || "Word图片";
        if (
          /^asset:img-[a-z0-9-]+$/.test(src) &&
          Object.hasOwn(assets, src.slice(6))
        )
          return "![" + escape(alt) + "](" + src + ")";
        return escape("〔" + alt + "：图片未导入〕");
      }
      if (tag === "code") {
        const raw = node.textContent;
        const ticks = "`".repeat(
          Math.max(0, ...(raw.match(/`+/g) || []).map((t) => t.length)) + 1,
        );
        return ticks + " " + raw + " " + ticks;
      }
      if (tag === "span" && preserve) {
        const meta = [...node.classList].map((c) => styles[c]).find(Boolean);
        if (meta) {
          const attrs = [];
          for (const k of ["color", "font", "size"])
            if (meta[k] !== undefined)
              attrs.push("data-md-" + k + '="' + meta[k] + '"');
          return "<span " + attrs.join(" ") + ">" + text + "</span>";
        }
      }
      return text;
    }
    function blocks(parent, depth = 0) {
      let out = "";
      for (const n of parent.children) {
        const tag = n.tagName.toLowerCase();
        if (/^h[1-6]$/.test(tag))
          out += "#".repeat(Number(tag[1])) + " " + inlineChildren(n) + "\n\n";
        else if (tag === "p") out += inlineChildren(n) + "\n\n";
        else if (tag === "ul" || tag === "ol") out += list(n, depth) + "\n";
        else if (tag === "blockquote")
          out +=
            blocks(n, depth)
              .trim()
              .split("\n")
              .map((l) => "> " + l)
              .join("\n") + "\n\n";
        else if (tag === "table") out += table(n) + "\n\n";
        else if (tag === "pre") {
          const raw = n.textContent,
            ticks = "`".repeat(
              Math.max(2, ...(raw.match(/`+/g) || []).map((s) => s.length)) + 1,
            );
          out += ticks + "\n" + raw + "\n" + ticks + "\n\n";
        } else out += inline(n) + "\n\n";
      }
      return out;
    }
    const inlineChildren = (n) => [...n.childNodes].map(inline).join("");
    function list(node, depth) {
      let out = "",
        index = Number(node.getAttribute("start")) || 1;
      for (const li of [...node.children].filter((n) => n.tagName === "LI")) {
        let text = "";
        for (const n of li.childNodes)
          if (!["OL", "UL"].includes(n.tagName)) text += inline(n);
        text = text.replace(/(?:<br>)+$/, "");
        out +=
          "    ".repeat(depth) +
          (node.tagName === "OL" ? index++ + ". " : "- ") +
          text +
          "\n";
        for (const child of li.children)
          if (["OL", "UL"].includes(child.tagName))
            out += list(child, depth + 1);
      }
      return out;
    }
    function table(node) {
      const grid = [],
        rows = [...node.querySelectorAll("tr")].filter(
          (tr) => tr.closest("table") === node,
        );
      if (rows.length > 1000)
        throw new Error("Word表格超过1000行，请拆分后导入");
      if (node.querySelector("table"))
        warnings.push("嵌套表格已提取为单元格文字，请检查内容顺序。");
      rows.forEach((tr, y) => {
        const row = grid[y] || (grid[y] = []);
        let x = 0;
        for (const cell of tr.children) {
          if (!["TH", "TD"].includes(cell.tagName)) continue;
          while (row[x] !== undefined) x++;
          const width = Math.max(1, Number(cell.getAttribute("colspan")) || 1),
            height = Math.max(1, Number(cell.getAttribute("rowspan")) || 1);
          if (x + width > 30 || y + height > 1000)
            throw new Error("Word表格超过30列或1000行，请拆分后导入");
          if (width > 1 || height > 1)
            warnings.push(
              "合并单元格已展开为普通网格，内容保留在首格，其余格留空。",
            );
          const text = inlineChildren(cell)
            .replace(/(?:<br>)+$/, "")
            .replace(/(?<!\\)\|/g, "\\|");
          for (let dy = 0; dy < height; dy++)
            for (let dx = 0; dx < width; dx++) {
              const target = grid[y + dy] || (grid[y + dy] = []);
              target[x + dx] = dx === 0 && dy === 0 ? text : "";
            }
          x += width;
        }
      });
      if (!grid.length) return "";
      const width = Math.max(...grid.map((row) => row.length));
      const normalized = grid.map((row) =>
        Array.from({ length: width }, (_, i) => row[i] || ""),
      );
      return [normalized[0], Array(width).fill("---"), ...normalized.slice(1)]
        .map((row) => "| " + row.join(" | ") + " |")
        .join("\n");
    }
    const source = blocks(doc.body).trim() + "\n";
    return {
      source,
      stats: {
        headings: doc.querySelectorAll("h1,h2,h3,h4,h5,h6").length,
        paragraphs: doc.querySelectorAll("p").length,
        tables: doc.querySelectorAll("table").length,
        images: Object.keys(assets).length,
        lists: doc.querySelectorAll("ul,ol").length,
      },
      warnings: [...new Set(warnings)],
    };
  }
  async function convertDocx(bytes, { zip, mammoth }) {
    const prepared = prepareDocx(bytes, zip),
      assets = {},
      warnings = [...prepared.warnings];
    const result = await mammoth.convertToHtml(
      {
        arrayBuffer: prepared.bytes.buffer.slice(
          prepared.bytes.byteOffset,
          prepared.bytes.byteOffset + prepared.bytes.byteLength,
        ),
      },
      {
        includeEmbeddedStyleMap: false,
        externalFileAccess: false,
        styleMap: [
          "u => u",
          "strike => del",
          "p[style-name='Title'] => h1:fresh",
          "p[style-name='Quote'] => blockquote > p:fresh",
          "p[style-name='Intense Quote'] => blockquote > p:fresh",
          ...prepared.styleMap,
        ],
        convertImage: mammoth.images.imgElement(async (image) => {
          if (!/^image\/(png|jpeg|gif|webp)$/.test(image.contentType)) {
            warnings.push(
              "存在不支持的图片格式（例如SVG/EMF/WMF），已保留缺图提示。",
            );
            return { src: "", alt: "不支持的Word图片" };
          }
          try {
            const data =
              "data:" +
              image.contentType +
              ";base64," +
              (await image.read("base64"));
            const id = MODEL.addAsset(
              assets,
              data,
              image.altText || "Word图片",
            );
            return { src: "asset:" + id, alt: image.altText || "Word图片" };
          } catch {
            warnings.push("有图片无法读取，可能是外链图片；未访问外部地址。");
            return { src: "", alt: "无法读取的Word图片" };
          }
        }),
      },
    );
    for (const message of result.messages || [])
      warnings.push("转换器提示：" + message.message);
    const semantic = htmlToMarkdown(result.value, {
        styles: prepared.styles,
        assets,
        warnings,
      }),
      styled = htmlToMarkdown(result.value, {
        styles: prepared.styles,
        assets,
        warnings,
        preserve: true,
      });
    return {
      semantic,
      styled,
      assets,
      warnings: [...new Set([...semantic.warnings, ...styled.warnings])],
      hasStyles: Object.keys(prepared.styles).length > 0,
    };
  }
  function destination(current, incoming, choice, parser) {
    if (choice === "new" || choice === "replace") return incoming;
    if (choice !== "append") throw new Error("无效的导入位置");
    const assets = JSON.parse(JSON.stringify(current.assets || {}));
    const source = MODEL.rewriteImageURLs(
      incoming.source,
      parser,
      (url, alt) => {
        if (!url.startsWith("asset:")) return url;
        const item = incoming.assets?.[url.slice(6)];
        if (!item) throw new Error("导入图片资源不完整");
        return "asset:" + MODEL.addAsset(assets, item.data, item.name || alt);
      },
    );
    return {
      ...current,
      assets,
      source: current.source.trimEnd() + "\n\n" + source,
    };
  }
  return {
    decode,
    convertDocx,
    htmlToMarkdown,
    prepareDocx,
    destination,
    escape,
  };
})();
