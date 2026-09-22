// Selection is captured before opening the dialog, and restored after insertion.
let toolSelection = null;
function captureToolSelection() {
  const textarea = editingTextarea();
  if (!textarea) return null;
  return {
    textarea,
    start: textarea.selectionStart,
    end: textarea.selectionEnd,
  };
}
function setToolTab(tab) {
  if (tab === "headings") tab = "paragraphs";
  document
    .querySelectorAll("[data-tool-tab]")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.toolTab === tab),
      ),
    );
  for (const name of ["text", "paragraphs", "insert"])
    $("tools-" + name).classList.toggle("hidden", name !== tab);
}
function openTools(tab) {
  if (composing) return;
  toolSelection = captureToolSelection();
  if (!toolSelection) {
    toast("先点击一个段落，或切到源码中定位光标");
    return;
  }
  const text = toolSelection.textarea.value.slice(
    toolSelection.start,
    toolSelection.end,
  );
  $("selection-hint").textContent = text
    ? "将应用于所选文字：" + text.slice(0, 40) + (text.length > 40 ? "…" : "")
    : "未选择文字：在光标处插入；段落工具应用于当前行。";
  $("inline-style-apply").textContent = text
    ? "应用到所选文字"
    : "在光标处应用";
  $("inline-color").disabled = !$("inline-color-enable").checked;
  $("link-text").value = text;
  for (const name of ["link", "code", "table"])
    $("insert-" + name).classList.add("hidden");
  setToolTab(tab);
  $("tools-dialog").showModal();
}
function applyEdit(
  kind,
  options = {},
  selection = toolSelection || captureToolSelection(),
) {
  if (!selection || !selection.textarea.isConnected) {
    toast("编辑位置已改变，请重新选择文字", true);
    return;
  }
  if (kind === "image") {
    $("tools-dialog").close();
    selection.textarea.focus();
    selection.textarea.setSelectionRange(selection.start, selection.end);
    $("image-file").click();
    return;
  }
  const ta = selection.textarea;
  const result = MODEL.formatEdit(
    ta.value,
    selection.start,
    selection.end,
    kind,
    options,
  );
  if (
    state.source.length + result.value.length - ta.value.length >
    MAX_SOURCE
  ) {
    toast("插入后正文超过大小限制", true);
    return;
  }
  toolSelection = null;
  if ($("tools-dialog").open) $("tools-dialog").close();
  // insertText retains native textarea undo where supported. The fallback still
  // goes through the single document input handler rather than editing the preview.
  ta.focus();
  const old = ta.value;
  let prefix = 0,
    suffix = 0;
  while (
    prefix < old.length &&
    prefix < result.value.length &&
    old[prefix] === result.value[prefix]
  )
    prefix++;
  while (
    suffix < old.length - prefix &&
    suffix < result.value.length - prefix &&
    old[old.length - 1 - suffix] ===
      result.value[result.value.length - 1 - suffix]
  )
    suffix++;
  ta.setSelectionRange(prefix, old.length - suffix);
  let inserted = false;
  try {
    inserted = document.execCommand(
      "insertText",
      false,
      result.value.slice(prefix, result.value.length - suffix),
    );
  } catch {}
  if (!inserted || ta.value !== result.value) {
    ta.value = result.value;
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }
  ta.setSelectionRange(result.start, result.end);
  if (ta.classList.contains("block-editor")) resizeEditor(ta);
  toolSelection = null;
}
$("format-dock").addEventListener("pointerdown", (event) =>
  event.preventDefault(),
);
$("format-dock").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.tools) openTools(button.dataset.tools);
  else if (button.dataset.format)
    applyEdit(button.dataset.format, {}, captureToolSelection());
});
document
  .querySelectorAll("[data-tool-tab]")
  .forEach((button) =>
    button.addEventListener("click", () => setToolTab(button.dataset.toolTab)),
  );
$("tools-dialog").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.edit)
    applyEdit(button.dataset.edit, {
      level: Number(button.dataset.level) || 2,
    });
  if (button.dataset.insert) {
    for (const name of ["link", "code", "table"])
      $("insert-" + name).classList.toggle(
        "hidden",
        name !== button.dataset.insert,
      );
    if (button.dataset.insert === "table") renderTableBuilder();
  }
});
$("tools-dialog").addEventListener("close", () => {
  if (toolSelection?.textarea.isConnected) {
    toolSelection.textarea.focus();
    toolSelection.textarea.setSelectionRange(
      toolSelection.start,
      toolSelection.end,
    );
  }
});
$("inline-style-apply").addEventListener("click", () =>
  applyEdit("style", {
    font: $("inline-font").value,
    size: $("inline-size").value,
    color: $("inline-color-enable").checked ? $("inline-color").value : "",
  }),
);
$("inline-color-enable").addEventListener("change", () => {
  $("inline-color").disabled = !$("inline-color-enable").checked;
});
$("code-apply").addEventListener("click", () =>
  applyEdit("code-block", { language: $("code-language").value }),
);
$("link-apply").addEventListener("click", () => {
  const url = safeUrl($("link-url").value);
  if (!url) {
    toast("请输入有效的 https://、http://、mailto: 或 #锚点链接", true);
    $("link-url").focus();
    return;
  }
  applyEdit("link", { href: url, label: $("link-text").value });
});
function renderTableBuilder() {
  const cols = Number($("table-cols").value),
    rows = Number($("table-rows").value) + 1;
  const previous = Array.from($("table-builder").querySelectorAll("tr")).map(
    (row) =>
      Array.from(row.querySelectorAll("input")).map((input) => input.value),
  );
  const table = document.createElement("table");
  for (let row = 0; row < rows; row++) {
    const tr = document.createElement("tr");
    for (let col = 0; col < cols; col++) {
      const td = document.createElement(row === 0 ? "th" : "td"),
        input = document.createElement("input");
      input.value =
        previous[row]?.[col] ?? (row === 0 ? "列 " + (col + 1) : "");
      input.setAttribute(
        "aria-label",
        row === 0
          ? "第 " + (col + 1) + " 列标题"
          : "第 " + row + " 行第 " + (col + 1) + " 列",
      );
      td.append(input);
      tr.append(td);
    }
    table.append(tr);
  }
  $("table-builder").replaceChildren(table);
}
$("table-cols").addEventListener("change", renderTableBuilder);
$("table-rows").addEventListener("change", renderTableBuilder);
$("table-apply").addEventListener("click", () => {
  const cells = Array.from($("table-builder").querySelectorAll("tr")).map(
    (row) =>
      Array.from(row.querySelectorAll("input")).map((input) => input.value),
  );
  applyEdit("table", { cells });
});
$("src").addEventListener("focus", () =>
  $("format-dock").classList.remove("hidden"),
);
