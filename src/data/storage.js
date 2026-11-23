function storage() {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  } catch {
    // Access can throw in privacy modes.
  }
  return null;
}

export function readJson(key) {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readJsonArray(key) {
  const parsed = readJson(key);
  return Array.isArray(parsed) ? parsed : null;
}

export function writeJson(key, value) {
  const store = storage();
  if (!store) throw new Error("Local storage is unavailable in this browser.");
  store.setItem(key, JSON.stringify(value));
}
