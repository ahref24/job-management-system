import { describe, expect, it, vi } from "vitest";
import { requestJson } from "./http";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("requestJson", () => {
  it("parses JSON responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await expect(requestJson("https://example.test", { fetchImpl })).resolves.toEqual({ ok: true });
  });

  it("retries 429 responses with backoff", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response("busy", { status: 429 }))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(
      requestJson("https://example.test", { fetchImpl, retryDelayMs: 1 })
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("retries network failures", async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    await expect(
      requestJson("https://example.test", { fetchImpl, retryDelayMs: 1 })
    ).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not retry client errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 400 }));
    await expect(requestJson("https://example.test", { fetchImpl })).rejects.toThrow("HTTP 400");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("sends POST bodies as JSON by default", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await requestJson("https://example.test", {
      method: "POST",
      body: { hello: "world" },
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toContain("application/json");
    expect(JSON.parse(init.body)).toEqual({ hello: "world" });
  });

  it("can send text/plain for server-to-server Apps Script calls", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await requestJson("https://example.test", {
      method: "POST",
      body: { hello: "world" },
      contentType: "text/plain;charset=utf-8",
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers["Content-Type"]).toContain("text/plain");
  });

  it("rejects responses that are not JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("<html>oops</html>", { status: 200 }));
    await expect(requestJson("https://example.test", { fetchImpl })).rejects.toThrow(
      "unexpected response"
    );
  });
});
