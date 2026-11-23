import { createLocalRepository } from "./localRepository";
import { createSheetsRepository } from "./sheetsRepository";

function envValue(env, key) {
  const value = env && env[key];
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Choose the persistence backend. Set VITE_SHEETS_URL (and optionally
 * VITE_SHEETS_TOKEN) to use Google Sheets; otherwise the app keeps everything
 * in this browser.
 */
export function createRepository(env = import.meta.env) {
  const url = envValue(env, "VITE_SHEETS_URL");
  if (url) {
    return createSheetsRepository({
      url,
      token: envValue(env, "VITE_SHEETS_TOKEN"),
    });
  }
  return createLocalRepository();
}
