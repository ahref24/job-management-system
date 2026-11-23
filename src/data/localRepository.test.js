import { beforeEach, describe, expect, it } from "vitest";
import { createLocalRepository, EMPLOYEES_KEY, JOBS_KEY } from "./localRepository";
import { todayISO } from "../utils/helpers";

let store;

function installStorage() {
  store = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
    },
  };
}

beforeEach(() => {
  installStorage();
});

describe("createLocalRepository", () => {
  it("seeds a fresh browser", () => {
    const repo = createLocalRepository();
    const snapshot = repo.readCached();
    expect(snapshot.jobs).toHaveLength(5);
    expect(snapshot.employees.length).toBeGreaterThan(0);
    expect(snapshot.jobs.every((job) => /^\d{4}-\d{2}-\d{2}$/.test(job.dueDate))).toBe(true);
  });

  it("recovers from corrupt JSON", () => {
    store.set(JOBS_KEY, "{not json");
    store.set(EMPLOYEES_KEY, "null");
    const repo = createLocalRepository();
    expect(repo.readCached().jobs).toHaveLength(5);
  });

  it("recovers from a non-array payload", () => {
    store.set(JOBS_KEY, JSON.stringify({ jobs: [] }));
    const repo = createLocalRepository();
    expect(repo.readCached().jobs).toHaveLength(5);
  });

  it("respects an intentionally empty job list", () => {
    store.set(JOBS_KEY, JSON.stringify([]));
    const repo = createLocalRepository();
    expect(repo.readCached().jobs).toEqual([]);
  });

  it("migrates legacy TODAY due dates", () => {
    store.set(
      JOBS_KEY,
      JSON.stringify([
        {
          id: "job-1",
          title: "Legacy job",
          dueDate: "TODAY",
          status: "todo",
          priority: "high",
          employeeId: "emp-1",
        },
      ])
    );
    const repo = createLocalRepository();
    expect(repo.readCached().jobs[0].dueDate).toBe(todayISO());
  });

  it("persists upserts and deletes across repository instances", async () => {
    const repo = createLocalRepository();
    const job = {
      id: "job-new",
      title: "New job",
      description: "",
      employeeId: "emp-1",
      dueDate: "2026-12-01",
      priority: "medium",
      status: "todo",
      notes: "",
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    };

    await repo.upsertJob(job);
    expect(createLocalRepository().readCached().jobs.some((item) => item.id === "job-new")).toBe(true);

    await repo.deleteJob(job);
    expect(createLocalRepository().readCached().jobs.some((item) => item.id === "job-new")).toBe(false);
  });
});
