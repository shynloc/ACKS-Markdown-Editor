/** IndexedDB-backed multi-document cabinet. Document contents never leave the browser. */
globalThis.DOCUMENT_LIBRARY = (() => {
  const DB_NAME = "acks-markdown-library-v1";
  const DB_VERSION = 1;
  const DOCUMENTS = "documents";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(cryptoObject = globalThis.crypto) {
    if (cryptoObject?.randomUUID) return "doc-" + cryptoObject.randomUUID();
    return (
      "doc-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function titleFromSource(source) {
    const heading = String(source || "").match(/^#\s+(.+)$/m);
    if (!heading) return "未命名文章";
    return (
      heading[1]
        .replace(/[*_`~<>]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "未命名文章"
    );
  }

  function previewFromSource(source) {
    return (
      String(source || "")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, "[图片]")
        .replace(/[`*_~<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 96) || "空白文章"
    );
  }

  function byteSize(value) {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  }

  function makeRecord(id, document, previous, now = new Date().toISOString()) {
    if (!/^doc-[a-z0-9-]{6,}$/i.test(id || ""))
      throw new Error("无效的文章编号");
    if (!document || typeof document.source !== "string")
      throw new Error("无效的文章内容");
    const safe = clone(document);
    return {
      id,
      title: titleFromSource(safe.source),
      preview: previewFromSource(safe.source),
      createdAt: previous?.createdAt || now,
      updatedAt: safe.updatedAt || now,
      bytes: byteSize(safe),
      document: safe,
    };
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("本地数据库读取失败"));
    });
  }

  function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error || new Error("本地数据库操作失败"));
      transaction.onabort = () =>
        reject(transaction.error || new Error("本地数据库操作已取消"));
    });
  }

  async function open(factory = globalThis.indexedDB) {
    if (!factory?.open) throw new Error("此浏览器不支持本地文章柜");
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DOCUMENTS)) {
        const store = db.createObjectStore(DOCUMENTS, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    const db = await requestResult(request);

    async function get(id) {
      const tx = db.transaction(DOCUMENTS, "readonly");
      const value = await requestResult(tx.objectStore(DOCUMENTS).get(id));
      await transactionDone(tx);
      return value ? clone(value) : null;
    }

    function put(id, document) {
      return new Promise((resolve, reject) => {
        const tx = db.transaction(DOCUMENTS, "readwrite");
        const store = tx.objectStore(DOCUMENTS);
        const lookup = store.get(id);
        let record;
        lookup.onsuccess = () => {
          try {
            record = makeRecord(id, document, lookup.result);
            store.put(record);
          } catch (error) {
            tx.abort();
            reject(error);
          }
        };
        lookup.onerror = () => reject(lookup.error);
        tx.oncomplete = () => resolve(clone(record));
        tx.onerror = () => reject(tx.error || new Error("文章保存失败"));
        tx.onabort = () => reject(tx.error || new Error("文章保存已取消"));
      });
    }

    async function list() {
      const tx = db.transaction(DOCUMENTS, "readonly");
      const store = tx.objectStore(DOCUMENTS);
      const rows = [];
      await new Promise((resolve, reject) => {
        const cursor = store.index("updatedAt").openCursor(null, "prev");
        cursor.onsuccess = () => {
          const item = cursor.result;
          if (!item) return resolve();
          const { document: ignored, ...metadata } = item.value;
          rows.push(metadata);
          item.continue();
        };
        cursor.onerror = () => reject(cursor.error);
      });
      await transactionDone(tx);
      return clone(rows);
    }

    async function remove(id) {
      const tx = db.transaction(DOCUMENTS, "readwrite");
      tx.objectStore(DOCUMENTS).delete(id);
      await transactionDone(tx);
    }

    return {
      createId,
      get,
      put,
      list,
      remove,
      close: () => db.close(),
    };
  }

  return {
    DB_NAME,
    createId,
    titleFromSource,
    previewFromSource,
    byteSize,
    makeRecord,
    open,
  };
})();
