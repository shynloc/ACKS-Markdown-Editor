let pendingImport = null,
  importToken = 0;
function openImport() {
  finishBlock();
  if (draft) closeStyles();
  pendingImport = null;
  $("import-destination").value = "new";
  $("import-preserve-row").classList.add("hidden");
  $("import-encoding-row").classList.add("hidden");
  $("import-preserve").checked = false;
  $("import-apply").disabled = true;
  $("import-name").textContent = "尚未选择文件";
  $("import-status").textContent = "先选择文件，再检查转换结果。";
  $("import-render").replaceChildren();
  $("import-source").value = "";
  $("import-dialog").showModal();
  $("import-pick").focus();
}
$("import-open").addEventListener("click", openImport);
$("import-pick").addEventListener("click", () => $("file-import").click());
function importView() {
  if (!pendingImport) return;
  try {
    let source,
      assets,
      stats,
      warnings = [...pendingImport.warnings];
    if (pendingImport.kind === "docx") {
      const selected = $("import-preserve").checked
        ? pendingImport.converted.styled
        : pendingImport.converted.semantic;
      ({ source, stats } = selected);
      assets = pendingImport.converted.assets;
      if ($("import-preserve").checked)
        warnings.push(
          "保留Word文字颜色后，在深色文章主题中可能需要手动调整对比度。",
        );
    } else if (pendingImport.kind === "text") {
      const decoded = DOCUMENT_IMPORT.decode(
        pendingImport.bytes,
        $("import-encoding").value,
      );
      warnings.push(...decoded.warnings);
      source =
        pendingImport.extension === "txt"
          ? DOCUMENT_IMPORT.escape(decoded.text)
          : decoded.text;
      assets = {};
    } else ({ source, assets } = pendingImport.document);
    const next = normalizeDocument(
      {
        ...state,
        ...(pendingImport.document || {}),
        source,
        assets,
      },
      { registerTheme: false },
    );
    MODEL.assertResources(next.source, next.assets, parser);
    pendingImport.next = next;
    let previewHTML;
    suppressRemoteImages = true;
    try {
      previewHTML = markdownHTML(next.source);
    } finally {
      suppressRemoteImages = false;
    }
    const fragment = cleanHTML(previewHTML, next.assets);
    let remoteImages = fragment.querySelectorAll("[data-remote-image]").length;
    fragment.querySelectorAll("img").forEach((img) => {
      if (/^https?:/i.test(img.getAttribute("src") || "")) {
        remoteImages++;
        img.removeAttribute("src");
        img.alt += "（外链图片将在导入后加载）";
      }
    });
    if (remoteImages)
      warnings.push(
        remoteImages + "张外链图片尚未加载；导入后显示时可能访问外部图片地址。",
      );
    $("import-render").replaceChildren(fragment);
    $("import-source").value = next.source;
    $("import-stats").textContent =
      next.source.length.toLocaleString() +
      " 字符 · " +
      Object.keys(next.assets).length +
      " 张本地图片" +
      (stats
        ? " · " + stats.headings + " 个标题 · " + stats.tables + " 个表格"
        : "");
    const list = $("import-warnings");
    list.replaceChildren();
    for (const w of [...new Set(warnings)]) {
      const li = document.createElement("li");
      li.textContent = w;
      list.append(li);
    }
    $("import-warning-details").classList.toggle(
      "hidden",
      !list.children.length,
    );
    $("import-warning-count").textContent =
      list.children.length + " 项格式调整与提示（展开查看）";
    $("import-warning-details").open = warnings.some((w) =>
      /不支持的图片|无法读取|嵌入对象|数学公式|资源缺失/.test(w),
    );
    $("import-status").textContent = "已转换，确认预览后再导入。";
    $("import-apply").disabled = false;
  } catch (e) {
    pendingImport.next = null;
    $("import-status").textContent = e.message;
    $("import-apply").disabled = true;
    $("import-render").replaceChildren();
    $("import-source").value = "";
  }
}
$("file-import").addEventListener("change", async () => {
  const f = $("file-import").files[0];
  $("file-import").value = "";
  if (!f) return;
  if (!$("import-dialog").open) $("import-dialog").showModal();
  const token = ++importToken;
  pendingImport = null;
  $("import-apply").disabled = true;
  $("import-status").textContent = "正在本机读取与转换…";
  $("import-name").textContent = f.name;
  $("import-render").replaceChildren();
  $("import-source").value = "";
  $("import-warnings").replaceChildren();
  $("import-warning-details").classList.add("hidden");
  $("import-preserve-row").classList.add("hidden");
  $("import-encoding-row").classList.add("hidden");
  $("import-stats").textContent = "";
  try {
    const extension = f.name.split(".").pop().toLowerCase();
    if (!["md", "markdown", "txt", "docx", "json", "zip"].includes(extension))
      throw new Error(
        "支持 .md、.markdown、.txt、.docx、ACKS JSON/ZIP；旧版.doc请先另存为.docx。",
      );
    if (f.size > (extension === "docx" ? 16 : 8) * 1024 * 1024)
      throw new Error(
        extension === "docx" ? "DOCX文件请小于16MB" : "文件请小于8MB",
      );
    const bytes = new Uint8Array(await f.arrayBuffer());
    let result;
    if (extension === "docx") {
      const converted = await DOCUMENT_IMPORT.convertDocx(bytes, {
        zip: fflate,
        mammoth,
      });
      result = { kind: "docx", converted, warnings: converted.warnings };
    } else if (extension === "json" || extension === "zip") {
      const document =
        extension === "zip"
          ? MODEL.unpackDocument(bytes, parser, fflate)
          : JSON.parse(DOCUMENT_IMPORT.decode(bytes, "utf-8").text);
      result = {
        kind: "document",
        document: normalizeDocument(document, { registerTheme: false }),
        warnings: [],
      };
    } else
      result = {
        kind: "text",
        bytes,
        extension,
        warnings:
          extension === "txt"
            ? ["TXT按纯文字导入，#、*等符号不会被当作Markdown格式。"]
            : [],
      };
    if (token !== importToken) return;
    pendingImport = result;
    $("import-preserve-row").classList.toggle("hidden", extension !== "docx");
    $("import-encoding-row").classList.toggle("hidden", result.kind !== "text");
    $("import-preserve").checked = false;
    $("import-encoding").value = "auto";
    importView();
  } catch (e) {
    if (token !== importToken) return;
    $("import-status").textContent =
      "无法导入：" +
      (/invalid zip data|unexpected EOF/i.test(e.message)
        ? "压缩结构无效，文件可能已损坏或受密码保护；请另存为未加密文件。"
        : e.message);
  }
});
$("import-preserve").addEventListener("change", importView);
$("import-encoding").addEventListener("change", importView);
$("import-dialog").addEventListener("close", () => {
  importToken++;
  pendingImport = null;
});
$("import-apply").addEventListener("click", async () => {
  if (!pendingImport?.next) return;
  $("import-apply").disabled = true;
  try {
    const destination = $("import-destination").value;
    if (!(await saveNow()))
      throw new Error("当前文章尚未安全保存。请先处理冲突或导出完整备份。");
    if (destination !== "new" && !saveSnapshot({ quiet: true }))
      throw new Error("无法保存导入前版本，请先下载备份并释放本地空间。");
    let next = DOCUMENT_IMPORT.destination(
      state,
      pendingImport.next,
      destination,
      parser,
    );
    if (destination === "append") next = normalizeDocument(next);
    MODEL.assertResources(next.source, next.assets, parser);
    if (!Object.hasOwn(MD.THEMES, next.themeId))
      MD.THEMES[next.themeId] = clone(next.themeSnapshot);
    if (destination === "new") {
      if (!articleLibrary)
        throw new Error("本机文章柜尚未就绪，当前文章未被替换。");
      const id = articleLibrary.createId();
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
      $("import-dialog").close();
      toast("已作为新文章导入；原文章仍保存在本机文章柜。");
      return;
    }
    checkpoint();
    activeBlock = null;
    state = next;
    scheduleSave();
    $("import-dialog").close();
    setMode("write");
    if (await saveNow())
      toast("文章已导入；导入前的内容已保存在当前文章版本中。");
  } catch (e) {
    $("import-status").textContent = e.message;
    $("import-apply").disabled = false;
  }
});
