import { describe, expect, it } from "vitest";
import { groupJobsByStatus, sortJobsForColumn } from "./sort";
import { STATUS } from "../constants";

const job = (id, status, dueDate = "", updatedAt = "2026-01-01T00:00:00.000Z") => ({
  id,
  status,
  dueDate,
  updatedAt,
  createdAt: updatedAt,
});

describe("sortJobsForColumn", () => {
  it("orders open jobs by due date with undated last", () => {
    const jobs = [
      job("later", STATUS.TODO, "2026-12-10"),
      job("undated", STATUS.TODO, ""),
      job("sooner", STATUS.TODO, "2026-11-25"),
    ];
    expect(sortJobsForColumn(jobs, STATUS.TODO).map((item) => item.id)).toEqual([
      "sooner",
      "later",
      "undated",
    ]);
  });

  it("orders completed jobs by most recent activity", () => {
    const jobs = [
      job("old", STATUS.COMPLETE, "", "2026-01-01T00:00:00.000Z"),
      job("new", STATUS.COMPLETE, "", "2026-06-01T00:00:00.000Z"),
    ];
    expect(sortJobsForColumn(jobs, STATUS.COMPLETE).map((item) => item.id)).toEqual(["new", "old"]);
  });
});

describe("groupJobsByStatus", () => {
  it("sorts each column independently", () => {
    const jobs = [
      job("a", STATUS.TODO, "2026-12-01"),
      job("b", STATUS.COMPLETE, "", "2026-01-01T00:00:00.000Z"),
      job("c", STATUS.TODO, "2026-11-25"),
    ];
    const grouped = groupJobsByStatus(jobs);
    expect(grouped[STATUS.TODO].map((item) => item.id)).toEqual(["c", "a"]);
    expect(grouped[STATUS.COMPLETE].map((item) => item.id)).toEqual(["b"]);
  });

  it("ignores jobs with unknown statuses", () => {
    const grouped = groupJobsByStatus([job("x", "archived", "2026-11-25")]);
    expect(grouped[STATUS.TODO]).toEqual([]);
    expect(grouped[STATUS.IN_PROGRESS]).toEqual([]);
    expect(grouped[STATUS.COMPLETE]).toEqual([]);
  });
});
