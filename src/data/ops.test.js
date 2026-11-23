import { describe, expect, it } from "vitest";
import { applyOp, applyOps } from "./ops";

const base = {
  jobs: [
    { id: "j1", title: "One", status: "todo" },
    { id: "j2", title: "Two", status: "todo" },
  ],
  employees: [{ id: "e1", name: "Ava" }],
};

describe("applyOp", () => {
  it("updates an existing job", () => {
    const next = applyOp(base, { type: "upsertJob", job: { id: "j1", title: "One edited" } });
    expect(next.jobs.find((job) => job.id === "j1").title).toBe("One edited");
    expect(next.jobs).toHaveLength(2);
  });

  it("adds a new job", () => {
    const next = applyOp(base, { type: "upsertJob", job: { id: "j3", title: "Three" } });
    expect(next.jobs[0].id).toBe("j3");
    expect(next.jobs).toHaveLength(3);
  });

  it("removes a deleted job", () => {
    const next = applyOp(base, { type: "deleteJob", job: { id: "j1" } });
    expect(next.jobs.map((job) => job.id)).toEqual(["j2"]);
  });

  it("ignores unknown operations", () => {
    expect(applyOp(base, { type: "nope" })).toBe(base);
  });
});

describe("applyOps", () => {
  it("replays a queue in order", () => {
    const next = applyOps(base, [
      { type: "upsertJob", job: { id: "j3", title: "Three" } },
      { type: "deleteJob", job: { id: "j1" } },
    ]);
    expect(next.jobs.map((job) => job.id)).toEqual(["j3", "j2"]);
  });
});
