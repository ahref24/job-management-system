import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSheetsRepository } from "./sheetsRepository";
import { createRepository, SHEETS_ENDPOINT } from "./repository";

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const ENDPOINT = "https://proxy.test/api/sheets";

let store;

beforeEach(() => {
  store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  };
});

describe("createSheetsRepository", () => {
  it("loads and normalizes the proxy response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        ok: true,
        jobs: [
          { id: "j1", title: "Fix login", status: "in_progress", dueDate: "2026-11-23" },
          { id: "j2", title: "" },
        ],
        employees: [{ id: "e1", name: "Ava" }],
        serverTime: "2026-11-23T10:00:00.000Z",
      })
    );

    const repo = createSheetsRepository({ url: ENDPOINT, fetchImpl });
    const snapshot = await repo.load();

    expect(snapshot.jobs).toHaveLength(1);
    expect(snapshot.jobs[0].status).toBe("in_progress");
    expect(snapshot.employees[0].name).toBe("Ava");
    expect(fetchImpl.mock.calls[0][0]).toBe(ENDPOINT);
  });

  it("defaults to the same-origin proxy", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true, jobs: [], employees: [] }));
    await createSheetsRepository({ fetchImpl }).load();
    expect(fetchImpl.mock.calls[0][0]).toBe(SHEETS_ENDPOINT);
  });

  it("throws when the proxy reports an error", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: false, error: "unauthorized" }));
    const repo = createSheetsRepository({ url: ENDPOINT, fetchImpl });
    await expect(repo.load()).rejects.toThrow("unauthorized");
  });

  it("posts actions without any credential in the browser payload", async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ ok: true })));
    const repo = createSheetsRepository({ url: ENDPOINT, fetchImpl });

    await repo.upsertJob({ id: "j1", title: "Fix login" });
    await repo.deleteJob({ id: "j1", updatedAt: "2026-11-23T10:00:00.000Z" });

    const [, firstInit] = fetchImpl.mock.calls[0];
    const first = JSON.parse(firstInit.body);
    expect(first).toEqual({
      action: "upsertJob",
      payload: { id: "j1", title: "Fix login" },
    });
    expect(firstInit.headers["Content-Type"]).toContain("application/json");
    expect(firstInit.body).not.toContain("token");

    const second = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(second.action).toBe("deleteJob");
    expect(second.payload.id).toBe("j1");
  });

  it("caches successful snapshots for offline boot", () => {
    const repo = createSheetsRepository({ url: ENDPOINT });
    repo.writeCache({
      jobs: [{ id: "j1", title: "Cached", status: "todo" }],
      employees: [],
    });

    const cached = repo.readCached();
    expect(cached.jobs).toHaveLength(1);
    expect(cached.jobs[0].title).toBe("Cached");
  });

  it("falls back to legacy local storage for migration", () => {
    store.set(
      "jms.jobs.v1",
      JSON.stringify([{ id: "legacy", title: "Old local job", status: "todo" }])
    );
    const repo = createSheetsRepository({ url: ENDPOINT });
    const cached = repo.readCached();
    expect(cached.jobs[0].id).toBe("legacy");
  });
});

describe("createRepository", () => {
  it("uses local storage when Sheets is not enabled", () => {
    expect(createRepository({ sheetsEnabled: false }).kind).toBe("local");
  });

  it("uses the proxy when Sheets is enabled", () => {
    expect(createRepository({ sheetsEnabled: true }).kind).toBe("sheets");
  });
});
