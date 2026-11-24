import { STATUS_OPTIONS } from "../constants";

/** Keep the log bounded so a Google Sheets cell never grows without limit. */
export const HISTORY_LIMIT = 30;

const FIELD_LABELS = {
  title: "title",
  description: "description",
  employeeId: "assignee",
  dueDate: "due date",
  priority: "priority",
  notes: "notes",
};

function isValidEntry(entry) {
  return Boolean(entry && typeof entry === "object" && typeof entry.at === "string" && entry.at);
}

/**
 * History is stored as a JSON string so it can survive a round-trip through a
 * single Google Sheets cell. Accepts arrays too (older/local payloads).
 */
export function parseHistory(value) {
  let parsed = value;
  if (typeof parsed === "string") {
    const trimmed = parsed.trim();
    if (!trimmed) return [];
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isValidEntry).map((entry) => ({ ...entry }));
}

export function serializeHistory(entries) {
  const list = Array.isArray(entries) ? entries.filter(isValidEntry) : [];
  if (!list.length) return "";
  return JSON.stringify(list.slice(-HISTORY_LIMIT));
}

export function appendHistory(value, event) {
  const entries = parseHistory(value);
  if (!isValidEntry(event)) return serializeHistory(entries);
  return serializeHistory([...entries, event]);
}

const statusLabel = (value) =>
  STATUS_OPTIONS.find((option) => option.value === value)?.label || value || "Unknown";

/** Human-readable one-liner used by the job form activity list. */
export function describeHistoryEntry(entry) {
  if (!isValidEntry(entry)) return "";
  if (entry.type === "created") return "Job created";
  if (entry.type === "status") {
    return entry.from
      ? `Status changed from ${statusLabel(entry.from)} to ${statusLabel(entry.to)}`
      : `Status set to ${statusLabel(entry.to)}`;
  }
  if (entry.type === "edit" && Array.isArray(entry.fields) && entry.fields.length > 0) {
    const fields = entry.fields.map((field) => FIELD_LABELS[field] || field).join(", ");
    return `Updated ${fields}`;
  }
  return "Updated";
}
