function relativeTime(date) {
  if (!date) return "";
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function labelFor({ state, message, lastSyncedAt }) {
  switch (state) {
    case "loading":
      return "Connecting to Google Sheets…";
    case "saving":
      return "Saving to Google Sheets…";
    case "saved":
      return lastSyncedAt ? `Synced ${relativeTime(lastSyncedAt)}` : "Synced with Google Sheets";
    case "error":
      return message || "Could not reach Google Sheets.";
    default:
      return "Google Sheets";
  }
}

export default function SyncStatus({
  mode,
  state,
  message,
  lastSyncedAt,
  pendingCount,
  needsImport,
  importCount,
  onRetry,
  onImport,
}) {
  if (mode !== "sheets" && state !== "error") return null;

  const tone = state === "error" ? "error" : state === "saving" ? "saving" : "ok";

  return (
    <div className={`sync-bar sync-${tone}`} role="status" aria-live="polite">
      <span className="sync-dot" aria-hidden="true" />
      <span className="sync-text">{labelFor({ state, message, lastSyncedAt })}</span>

      {pendingCount > 0 && (
        <span className="sync-pending">
          {pendingCount} change{pendingCount === 1 ? "" : "s"} queued
        </span>
      )}

      {needsImport && importCount > 0 && (
        <button type="button" className="btn btn-ghost sync-action" onClick={onImport}>
          Import {importCount} local job{importCount === 1 ? "" : "s"}
        </button>
      )}

      {state === "error" && (
        <button type="button" className="btn btn-ghost sync-action" onClick={onRetry}>
          Retry now
        </button>
      )}
    </div>
  );
}
