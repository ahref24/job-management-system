import { describe, expect, it } from "vitest";
import { normalizeEmployee, normalizeEmployees, normalizeJob, normalizeJobs } from "./normalize";
import { STATUS } from "../constants";

describe("normalizeJob", () => {
  it("rejects records without a title", () => {
    expect(normalizeJob(null)).toBeNull();
    expect(normalizeJob({ id: "x" })).toBeNull();
    expect(normalizeJob({ title: "   " })).toBeNull();
  });

  it("fills safe defaults", () => {
    const job = normalizeJob({ title: "Fix login" });
    expect(job).toMatchObject({
      title: "Fix login",
      status: STATUS.TODO,
      priority: "medium",
      dueDate: "",
      employeeId: "",
    });
    expect(job.id).toBeTruthy();
    expect(job.createdAt).toBeTruthy();
    expect(job.updatedAt).toBe(job.createdAt);
  });

  it("normalizes legacy due dates and invalid enums", () => {
    const job = normalizeJob({
      title: "Legacy",
      dueDate: "TODAY",
      status: "doing",
      priority: "extreme",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(job.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(job.status).toBe(STATUS.TODO);
    expect(job.priority).toBe("medium");
  });

  it("keeps update history and completion timestamps", () => {
    const job = normalizeJob({
      title: "Tracked",
      status: STATUS.COMPLETE,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
      history: JSON.stringify([
        { at: "2026-01-02T00:00:00.000Z", type: "status", from: "todo", to: "complete" },
      ]),
    });

    expect(job.completedAt).toBe("2026-01-02T00:00:00.000Z");
    expect(JSON.parse(job.history)).toHaveLength(1);
  });

  it("discards malformed history instead of breaking the job", () => {
    const job = normalizeJob({ title: "Broken history", history: "{not json" });
    expect(job.history).toBe("");
  });
});

describe("normalizeJobs", () => {
  it("drops invalid records and duplicate ids", () => {
    const jobs = normalizeJobs([
      { id: "1", title: "One" },
      { id: "1", title: "Duplicate" },
      { id: "2" },
      { id: "3", title: "Three" },
    ]);
    expect(jobs.map((job) => job.title)).toEqual(["One", "Three"]);
  });

  it("returns an empty array for non-arrays", () => {
    expect(normalizeJobs(null)).toEqual([]);
    expect(normalizeJobs({})).toEqual([]);
  });
});

describe("normalizeEmployees", () => {
  it("treats missing/blank active flags as active", () => {
    expect(normalizeEmployee({ id: "e1", name: "Ava" }).active).toBe(true);
    expect(normalizeEmployee({ id: "e2", name: "Liam", active: "" }).active).toBe(true);
  });

  it("understands string and numeric inactive flags", () => {
    expect(normalizeEmployee({ id: "e3", name: "Sofia", active: "false" }).active).toBe(false);
    expect(normalizeEmployee({ id: "e4", name: "Noah", active: 0 }).active).toBe(false);
  });

  it("drops nameless and duplicate employees", () => {
    const employees = normalizeEmployees([
      { id: "e1", name: "Ava" },
      { id: "e1", name: "Ava again" },
      { id: "e2" },
    ]);
    expect(employees).toHaveLength(1);
  });
});
