const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_ATTEMPTS = 3;
const DEFAULT_TIMEOUT_MS = 15000;

class RetryableError extends Error {
  constructor(message) {
    super(message);
    this.name = "RetryableError";
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shouldRetry(error) {
  if (error instanceof RetryableError) return true;
  if (!error) return false;
  // fetch rejects with TypeError/AbortError for network failures and timeouts.
  return error.name === "TypeError" || error.name === "AbortError";
}

/**
 * JSON request helper:
 * - defaults to application/json for same-origin calls to the local API proxy;
 * - can send text/plain for server-to-server Apps Script calls (Apps Script
 *   cannot answer CORS preflight requests);
 * - retries transient failures with backoff;
 * - aborts hung requests.
 */
export async function requestJson(
  url,
  {
    method = "GET",
    body,
    contentType = "application/json",
    fetchImpl = globalThis.fetch,
    attempts = DEFAULT_ATTEMPTS,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryDelayMs = 300,
  } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is not available in this environment.");
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      const response = await fetchImpl(url, {
        method,
        headers: body === undefined ? undefined : { "Content-Type": contentType },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
        redirect: "follow",
      });

      if (RETRYABLE_STATUS.has(response.status)) {
        throw new RetryableError(`HTTP ${response.status}`);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const raw = await response.text();
      try {
        return JSON.parse(raw);
      } catch {
        throw new Error("The server returned an unexpected response.");
      }
    } catch (error) {
      lastError = error;
      if (attempt === attempts || !shouldRetry(error)) throw error;
      await sleep(retryDelayMs * 3 ** (attempt - 1));
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  throw lastError;
}
