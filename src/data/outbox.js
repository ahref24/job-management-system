import { readJson, writeJson } from "./storage";

export const OUTBOX_KEY = "jms.outbox.v1";

const TYPES = new Set(["upsertJob", "deleteJob", "upsertEmployee"]);

/** Load queued writes so a failed sync survives a page reload. */
export function readOutbox() {
  const parsed = readJson(OUTBOX_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (op) =>
      op &&
      typeof op === "object" &&
      TYPES.has(op.type) &&
      (op.job || op.employee)
  );
}

export function writeOutbox(ops) {
  try {
    writeJson(OUTBOX_KEY, ops);
  } catch {
    // A full quota must not break the UI; the queue stays in memory.
  }
}
