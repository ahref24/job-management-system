import { describe, expect, it } from "vitest";
import {
  daysRemaining,
  formatDateDisplay,
  isOverdue,
  normalizeDueDate,
  todayISO,
} from "./helpers";

const reference = new Date(2026, 10, 23, 15, 30, 0); // 23 Nov 2026, local time

describe("todayISO", () => {
  it("formats the local calendar date", () => {
    expect(todayISO(reference)).toBe("2026-11-23");
  });
});

describe("normalizeDueDate", () => {
  it("keeps ISO dates unchanged", () => {
    expect(normalizeDueDate("2026-11-23")).toBe("2026-11-23");
  });

  it("expands the legacy TODAY sentinel", () => {
    expect(normalizeDueDate("TODAY", reference)).toBe("2026-11-23");
  });

  it("takes the date part of an ISO datetime without timezone drift", () => {
    expect(normalizeDueDate("2026-11-23T00:00:00.000Z")).toBe("2026-11-23");
  });

  it("handles Date objects", () => {
    expect(normalizeDueDate(new Date(2026, 10, 25))).toBe("2026-11-25");
  });

  it("returns an empty string for garbage", () => {
    expect(normalizeDueDate("not-a-date")).toBe("");
    expect(normalizeDueDate(null)).toBe("");
    expect(normalizeDueDate("")).toBe("");
  });
});

describe("formatDateDisplay", () => {
  it("labels missing dates", () => {
    expect(formatDateDisplay("")).toBe("No due date");
    expect(formatDateDisplay("not-a-date")).toBe("No due date");
  });

  it("renders a valid date", () => {
    expect(formatDateDisplay("2026-11-23")).not.toBe("No due date");
  });
});

describe("isOverdue", () => {
  it("is true only for open jobs with a past due date", () => {
    expect(isOverdue({ status: "todo", dueDate: "2026-11-22" }, reference)).toBe(true);
    expect(isOverdue({ status: "in_progress", dueDate: "2026-11-22" }, reference)).toBe(true);
  });

  it("is false for today, future dates, completed jobs and legacy TODAY", () => {
    expect(isOverdue({ status: "todo", dueDate: "2026-11-23" }, reference)).toBe(false);
    expect(isOverdue({ status: "todo", dueDate: "2026-11-24" }, reference)).toBe(false);
    expect(isOverdue({ status: "complete", dueDate: "2026-11-22" }, reference)).toBe(false);
    expect(isOverdue({ status: "todo", dueDate: "TODAY" }, reference)).toBe(false);
    expect(isOverdue({ status: "todo", dueDate: "" }, reference)).toBe(false);
  });
});

describe("daysRemaining", () => {
  it("counts whole days from the reference date", () => {
    expect(daysRemaining({ dueDate: "2026-11-23" }, reference)).toBe(0);
    expect(daysRemaining({ dueDate: "2026-11-25" }, reference)).toBe(2);
    expect(daysRemaining({ dueDate: "2026-11-21" }, reference)).toBe(-2);
  });

  it("returns null when there is no usable due date", () => {
    expect(daysRemaining({ dueDate: "" }, reference)).toBeNull();
    expect(daysRemaining({ dueDate: "garbage" }, reference)).toBeNull();
  });
});
