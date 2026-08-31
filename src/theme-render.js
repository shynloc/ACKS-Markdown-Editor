function paintTokens(root, t) {
  const st = root.style;
  for (const [key, value] of Object.entries({
    accent2: t.accent2 || t.accent,
    emphasis: t.emphasis || t.accent,
    "section-heading": t.sectionHeading || t.heading,
    "title-text": t.titleText || t.heading,
    "title-bg": t.titleBg || t.bg,
    muted: t.muted || t.text,
    "mark-text": t.markText || t.text,
  }))
    st.setProperty("--" + key, value);
  st.setProperty("--accent", t.accent);
  st.setProperty("--text", t.text);
  st.setProperty("--heading", t.heading);
  st.setProperty("--bg", t.bg);
  st.setProperty("--body-size", t.bodySize + "px");
  st.setProperty("--line-height", String(t.lineHeight));
  st.setProperty("--letter-spacing", t.letterSpacing + "px");
  st.setProperty("--h1", t.h1 + "px");
  st.setProperty("--h2", t.h2 + "px");
  st.setProperty("--h3", t.h3 + "px");
  st.setProperty("--h4", t.h4 + "px");
  st.setProperty("--radius", t.radius + "px");
  st.setProperty("--hr-color", t.hrColor);
  st.setProperty("--link", t.link);
  st.setProperty("--mark-bg", t.markBg);
  st.setProperty("--th-bg", t.thBg);
  st.setProperty("--zebra", t.zebra);
  st.setProperty("--border", t.border);
  st.setProperty("--code-bg", t.codeBg);
  st.setProperty("--code-text", t.codeText);
  st.setProperty("--codeblock-bg", t.codeBlockBg);
  st.setProperty("--codeblock-text", t.codeBlockText);
  st.setProperty("--tk-kw", t.tkKw);
  st.setProperty("--tk-str", t.tkStr);
  st.setProperty("--tk-cmt", t.tkCmt);
  st.setProperty("--tk-num", t.tkNum);
  st.setProperty("--tk-tag", t.tkTag);
  st.setProperty("--tk-punc", t.tkPunc);
  st.setProperty("--quote-border", t.quoteBorder);
  st.setProperty("--quote-bg", t.quoteBg);
  st.setProperty("--quote-text", t.quoteText);
  st.setProperty("--body-font", t.fontFamily || "");
  st.setProperty("--heading-font", t.headingFamily || "");
  st.setProperty(
    "--bg-texture",
    t.texture
      ? 'url("' + MD.svgDataUri(MD.bgTexture(t.texture)) + '")'
      : "none",
  );
  // 亮度感知表头文字：深/浅白取对比更高者（亮彩底用深字，深彩底用白字）
  // 表头文字色：从候选池中选与 accent 对比度最高者（覆盖「尴尬区间」边缘）
  const thCands = [
    "#1b1b1b",
    "#ffffff",
    MD.shade(t.accent, 0.7),
    MD.tint(t.accent, 0.7),
    MD.shade(t.accent, 0.95),
    MD.tint(t.accent, 0.95),
  ];
  let thText = "#1b1b1b",
    thBest = 0;
  for (let i = 0; i < thCands.length; i++) {
    const cv = MD.contrast(t.accent, thCands[i]);
    if (cv > thBest) {
      thBest = cv;
      thText = thCands[i];
    }
  }
  st.setProperty("--th-text", t.themeVersion === 2 ? t.thText : thText);
}

function applyDesignAttrs(doc, t) {
  doc.dataset.h1 = t.h1Style || "center";
  doc.dataset.hm = t.headingMark || "bar";
  doc.dataset.q = t.quoteStyle || "leftbar";
  doc.dataset.t = t.tableStyle || "zebra";
  doc.dataset.d = t.dividerStyle || "dashed";
  doc.dataset.l = t.listMark || "disc";
  doc.dataset.indent = t.paraIndent === false ? "0" : "1";
  doc.dataset.shadow = t.shadow || "none";
  doc.dataset.title = t.titleStyle || "none";
  doc.dataset.bgmode = t.bgMode || "solid";
  doc.dataset.layout = t.layout || "classic";
  doc.dataset.code = t.codeFrame || "plain";
  doc.dataset.table = t.tableShape || "plain";
  doc.dataset.list = t.listGlyph || "none";
  doc.dataset.ci = t.codeInline || "plain";
  doc.dataset.h3 = t.h3Mark || "none";
  doc.dataset.thead = t.thead || "flat";
}

function applyDecorations(doc, t) {
  if (t.showDecorations === false) return;
  if (t.themeVersion === 2) {
    const h1 = doc.querySelector("h1");
    const signature = MD.SIGNATURES?.[t.signature];
    if (h1 && signature) {
      const wrapper = document.createElement("section");
      wrapper.className = "md-signature";
      wrapper.dataset.signature = t.signature;
      wrapper.setAttribute("aria-hidden", "true");
      if (signature.type === "svg")
        wrapper.innerHTML = signature.svg
          .replaceAll("#111111", t.heading)
          .replaceAll("#777777", t.accent)
          .replaceAll("#aaaaaa", t.accent2 || t.accent)
          .replaceAll("#eeeeee", t.markBg);
      else {
        wrapper.classList.add("md-theme-art");
        const image = document.createElement("img");
        image.setAttribute("data-theme-asset", signature.asset);
        image.alt = "";
        image.width = 210;
        image.height = 70;
        wrapper.append(image);
      }
      h1.after(wrapper);
    }
    if (
      !signature &&
      h1 &&
      t.ornamentAsset &&
      Object.hasOwn(THEME_ASSETS, t.ornamentAsset)
    ) {
      const wrapper = document.createElement("section");
      wrapper.className = "md-theme-art";
      wrapper.setAttribute("aria-hidden", "true");
      const image = document.createElement("img");
      image.setAttribute("data-theme-asset", t.ornamentAsset);
      image.alt = "";
      image.width = 190;
      image.height = 46;
      wrapper.append(image);
      h1.after(wrapper);
    }
    if (t.dividerDeco) {
      for (const hr of doc.querySelectorAll("hr.md-hr")) {
        const wrapper = document.createElement("section");
        wrapper.className = "md-orn";
        wrapper.setAttribute("aria-hidden", "true");
        wrapper.innerHTML = MD.decoSVG(t.dividerDeco, {
          color: t.accent,
          color2: t.accent2,
        });
        hr.replaceWith(wrapper);
      }
    }
    return;
  }
  // 标题下花饰
  if (t.titleSwash) {
    const h1 = doc.querySelector("h1");
    if (h1) {
      const s = document.createElement("section");
      s.className = "md-orn";
      s.innerHTML = MD.decoSVG("swash", { color: t.accent });
      h1.after(s);
    }
  }
  // 贴纸徽章（标题旁）
  if (t.stickerText) {
    const h1 = doc.querySelector("h1");
    if (h1) {
      const s = document.createElement("section");
      s.className = "md-seal";
      s.innerHTML = MD.decoSVG("sticker", {
        color: t.accent,
        text: t.stickerText,
      });
      h1.after(s);
    }
  }
  // 杂志撕裂条（文档顶部）
  if (t.headerTear) {
    const s = document.createElement("section");
    s.className = "md-tear";
    s.innerHTML = MD.decoSVG("tear", { color: t.headerTear });
    doc.insertBefore(s, doc.firstChild);
  }
  // SVG 分隔线：替换 hr
  if (t.dividerDeco) {
    Array.prototype.forEach.call(
      doc.querySelectorAll("hr.md-hr"),
      function (hr) {
        const s = document.createElement("section");
        s.className = "md-orn";
        s.innerHTML = MD.decoSVG(t.dividerDeco, { color: t.accent });
        hr.replaceWith(s);
      },
    );
  }
  // 终端/霓虹代码块：注入三色点条 + 文件名（预览独有）
  if (t.codeFrame === "terminal" || t.codeFrame === "neon") {
    Array.prototype.forEach.call(
      doc.querySelectorAll(".md-pre"),
      function (pre) {
        const code = pre.querySelector("code");
        const lang = code ? (code.className.match(/lang-(\w+)/) || [])[1] : "";
        const fname =
          {
            js: "app.js",
            python: "app.py",
            css: "style.css",
            html: "index.html",
            bash: "script.sh",
            json: "data.json",
          }[lang] || "code";
        const bar = document.createElement("span");
        bar.className = "md-dotbar";
        bar.innerHTML =
          '<span style="color:#FF5F56">●</span><span style="color:#FFBD2E">●</span><span style="color:#27C93F">●</span><span class="md-file">' +
          fname +
          "</span>";
        pre.insertBefore(bar, pre.firstChild);
      },
    );
  }
  // 引用块装饰：印章 / 喷溅 / 胶带（只装饰第一处引用）
  const bq = doc.querySelector("blockquote");
  if (bq) {
    if (t.quoteSeal) {
      const s = document.createElement("section");
      s.className = "md-seal";
      const seal =
        t.quoteSeal.type === "wax"
          ? MD.decoSVG("waxseal", { color: t.quoteSeal.color || "#8B1E2D" })
          : MD.decoSVG("seal", {
              color: t.quoteSeal.color || "#C0392B",
              text: t.quoteSeal.text || "雅",
              shape: t.quoteSeal.shape || "square",
            });
      s.innerHTML = seal;
      bq.before(s);
    } else if (t.quoteSplatter) {
      const s = document.createElement("section");
      s.className = "md-seal";
      s.innerHTML = MD.decoSVG("splatter", { color: t.quoteSplatter });
      bq.before(s);
    } else if (t.quoteTape) {
      const s = document.createElement("section");
      s.className = "md-seal";
      s.innerHTML = MD.decoSVG("tape", { color: t.accent });
      bq.before(s);
    }
  }
}

function applyLayout(doc, t) {
  const includeTemplateCopy =
    t.themeVersion === 2
      ? t.showTemplateText === true
      : t.showTemplateText !== false;
  const h1 = doc.querySelector("h1");
  // 眉题 kicker（标题上方）
  if (includeTemplateCopy && t.kickerText && h1) {
    const k = document.createElement("p");
    k.className = "md-kicker";
    k.textContent = t.kickerText;
    h1.before(k);
  }
  // 导读 lead（首段加大）
  if (t.lead) {
    const p = doc.querySelector("p.md-p");
    if (p) p.classList.add("md-lead");
  }
  // h2 编号徽章
  if (t.h2num) {
    let n = 0;
    Array.prototype.forEach.call(doc.querySelectorAll("h2"), function (h2) {
      n++;
      const span = document.createElement("span");
      span.className = "md-num";
      span.textContent = String(n);
      h2.insertBefore(span, h2.firstChild);
    });
  }
  // 页脚带
  if (includeTemplateCopy && t.footerText) {
    const f = document.createElement("p");
    f.className = "md-footer";
    f.textContent = t.footerText;
    doc.appendChild(f);
  }
}

function collectStyle(el, parentCS) {
  const cs = getComputedStyle(el);
  const ps = parentCS || null;
  const same = function (p) {
    return ps && cs[p] === ps[p];
  };
  const parts = [];
  if (!same("color") && cs.color !== "rgba(0, 0, 0, 0)")
    parts.push("color:" + cs.color);
  if (cs.backgroundColor && !/rgba\(0, 0, 0, 0\)/.test(cs.backgroundColor))
    parts.push("background-color:" + cs.backgroundColor);
  if (!same("font-size")) parts.push("font-size:" + cs.fontSize);
  if (cs.fontWeight !== "400") parts.push("font-weight:" + cs.fontWeight);
  if (cs.fontStyle === "italic") parts.push("font-style:italic");
  if (!same("line-height")) parts.push("line-height:" + cs.lineHeight);
  if (!same("letter-spacing") && cs.letterSpacing !== "normal")
    parts.push("letter-spacing:" + cs.letterSpacing);
  if (!same("text-align") && cs.textAlign !== "start")
    parts.push("text-align:" + cs.textAlign);
  // text-indent 只对块级/单元格有意义，行内元素继承来的缩进是噪音
  if (cs.display !== "inline" && cs.textIndent && cs.textIndent !== "0px")
    parts.push("text-indent:" + cs.textIndent);
  const pad = MD.compact4(
    cs.paddingTop,
    cs.paddingRight,
    cs.paddingBottom,
    cs.paddingLeft,
  );
  if (pad && pad !== "0px") parts.push("padding:" + pad);
  const mar = MD.compact4(
    cs.marginTop,
    cs.marginRight,
    cs.marginBottom,
    cs.marginLeft,
  );
  if (mar && mar !== "0px") parts.push("margin:" + mar);
  if (cs.borderRadius && cs.borderRadius !== "0px")
    parts.push("border-radius:" + cs.borderRadius);
  const brd = MD.compactBorder(cs);
  if (brd) parts.push(brd);
  if (cs.textDecorationLine && cs.textDecorationLine !== "none")
    parts.push("text-decoration:" + cs.textDecorationLine);
  return parts.join(";");
}
