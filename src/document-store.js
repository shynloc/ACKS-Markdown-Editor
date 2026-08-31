/* Optimistic revision checking inside a cross-tab Web Lock. Never silently fall
 * back to an unsafe last-writer-wins save when exclusive locking is unavailable. */
globalThis.DOCUMENT_STORE = (() => {
  function create({
    storage,
    key,
    locks,
    notify = () => {},
    initialValue,
    id = String(Date.now()) + Math.random().toString(36).slice(2),
  }) {
    let base = initialValue === undefined ? storage.getItem(key) : initialValue,
      blocked = false,
      queue = Promise.resolve();
    const recoveryKey = key + "-recovery-" + id;
    function protect(doc) {
      try {
        storage.setItem(
          recoveryKey,
          JSON.stringify({ at: new Date().toISOString(), document: doc }),
        );
        return true;
      } catch {
        return false;
      }
    }
    function conflict(doc, reason) {
      blocked = true;
      notify({ reason, recovered: protect(doc) });
      return { ok: false, conflict: true };
    }
    async function write(doc) {
      if (blocked) return conflict(doc, "changed");
      if (!locks?.request) return conflict(doc, "unsupported");
      return locks.request(key + "-write", { mode: "exclusive" }, () => {
        if (blocked || storage.getItem(key) !== base)
          return conflict(doc, "changed");
        const value = JSON.stringify({
          ...doc,
          saveRevision:
            id + "-" + Date.now() + "-" + Math.random().toString(36).slice(2),
        });
        storage.setItem(key, value);
        base = value;
        return { ok: true };
      });
    }
    return {
      save(doc) {
        const snapshot = JSON.parse(JSON.stringify(doc));
        const next = queue.then(() => write(snapshot));
        queue = next.catch(() => {});
        return next;
      },
      check(doc) {
        if (storage.getItem(key) !== base) {
          conflict(doc, "changed");
          return false;
        }
        return !blocked;
      },
      acceptLatest(doc, validate = (x) => x) {
        if (!protect(doc))
          throw new Error("无法保存本窗口备份，请先下载完整文档。");
        const value = storage.getItem(key);
        if (!value) throw new Error("未找到较新文稿");
        const parsed = validate(JSON.parse(value));
        base = value;
        blocked = false;
        return parsed;
      },
      protect,
      recoveryKey,
    };
  }
  return { create };
})();
