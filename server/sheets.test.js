import { describe, expect, it, vi } from "vitest";
import { handleSheetsRequest } from "./sheets";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const ENV = {
  SHEETS_URL: "https://script.test/exec",
  SHEETS_TOKEN: "secret",
};

describe("handleSheetsRequest", () => {
  it("returns 501 when the server is not configured", async () => {
    const result = await handleSheetsRequest({ method: "GET" }, {});
    expect(result.status).toBe(501);
    expect(result.body.ok).toBe(false);
  });

  it("forwards GET requests with the token appended server-side", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, jobs: [], employees: [] }));
    const result = await handleSheetsRequest({ method: "GET", fetchImpl }, ENV);

    expect(result.status).toBe(200);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://script.test/exec?token=secret");
  });

  it("forwards POST actions with text/plain and the server token", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const result = await handleSheetsRequest(
      {
        method: "POST",
        body: { action: "upsertJob", payload: { id: "j1", title: "Fix" }, token: "attacker" },
        fetchImpl,
      },
      ENV
    );

    expect(result.status).toBe(200);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://script.test/exec");
    expect(init.headers["Content-Type"]).toContain("text/plain");
    const sent = JSON.parse(init.body);
    expect(sent.action).toBe("upsertJob");
    expect(sent.payload.title).toBe("Fix");
    // A client-supplied token must never override the server one.
    expect(sent.token).toBe("secret");
  });

  it("parses a string body", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await handleSheetsRequest(
      { method: "POST", body: JSON.stringify({ action: "deleteJob", payload: { id: "j1" } }), fetchImpl },
      ENV
    );
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).action).toBe("deleteJob");
  });

  it("maps upstream failures to 502", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const result = await handleSheetsRequest({ method: "GET", fetchImpl }, ENV);
    expect(result.status).toBe(502);
    expect(result.body.ok).toBe(false);
  });

  it("rejects unsupported methods", async () => {
    const result = await handleSheetsRequest({ method: "DELETE" }, ENV);
    expect(result.status).toBe(405);
  });
});
