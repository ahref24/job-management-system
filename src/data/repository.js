import { createLocalRepository } from "./localRepository";
import { createSheetsRepository } from "./sheetsRepository";

const SHEETS_ENABLED =
  typeof __SHEETS_ENABLED__ !== "undefined" && Boolean(__SHEETS_ENABLED__);

export const SHEETS_ENDPOINT = "/api/sheets";

/**
 * Choose the persistence backend. Google Sheets is enabled at build time when
 * SHEETS_URL is present (Vercel env var or .env.local). The browser only ever
 * talks to the same-origin proxy, so no credentials ship in the bundle.
 */
export function createRepository({
  sheetsEnabled = SHEETS_ENABLED,
  endpoint = SHEETS_ENDPOINT,
} = {}) {
  return sheetsEnabled ? createSheetsRepository({ url: endpoint }) : createLocalRepository();
}
