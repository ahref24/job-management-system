import { requestJson } from "../src/data/http.js";

function withToken(url, token) {
  if (!token) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

/**
 * Shared Google Sheets proxy logic used by the Vercel function and the Vite
 * dev/preview middleware. Keeping it server-side means:
 * - the browser never calls script.google.com, so there is no CORS problem;
 * - SHEETS_TOKEN never reaches the client bundle.
 *
 * @param {{ method?: string, body?: unknown, fetchImpl?: typeof fetch }} request
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<{ status: number, body: unknown }>}
 */
export async function handleSheetsRequest(
  { method = "GET", body, fetchImpl } = {},
  env = process.env
) {
  const url = String(env.SHEETS_URL || "").trim();
  const token = String(env.SHEETS_TOKEN || "").trim();

  if (!url) {
    return {
      status: 501,
      body: { ok: false, error: "Google Sheets is not configured on the server." },
    };
  }

  try {
    if (method === "GET") {
      return { status: 200, body: await requestJson(withToken(url, token), { fetchImpl }) };
    }

    if (method === "POST") {
      const payload = typeof body === "string" ? JSON.parse(body || "{}") : body || {};
      const data = await requestJson(url, {
        method: "POST",
        contentType: "text/plain;charset=utf-8",
        body: { ...payload, token },
        fetchImpl,
      });
      return { status: 200, body: data };
    }

    return { status: 405, body: { ok: false, error: "Method not allowed." } };
  } catch (error) {
    return {
      status: 502,
      body: {
        ok: false,
        error: error && error.message ? error.message : "Upstream request failed.",
      },
    };
  }
}
