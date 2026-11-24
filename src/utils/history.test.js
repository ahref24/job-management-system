import { describe, expect, it } from "vitest";
import {
  HISTORY_LIMIT,
  appendHistory,
  describeHistoryEntry,
  parseHistory,
  serializeHistory,
} from "./history";

describe("parseHistory", () => {
  it("returns an empty list for blank and malformed values", () => {
    expect(parseHistory("")).toEqual([]);
    expect(parseHistory("   ")).toEqual([]);
    expect(parseHistory("{not json")).toEqual([]);
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory({})).toEqual([]);
  });

  it("parses a JSON string and drops entries without a timestamp", () => {
    const entries = parseHistory(
      JSON.stringify([
        { at: "2026-11-24T10:00:00.000Z", type: "created" },
        { type: "status", to: "complete" },
      ])
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("created");
  });

  it("accepts an already-parsed array", () => {
    expect(parseHistory([{ at: "2026-11-24T10:00:00.000Z", type: "created" }])).toHaveLength(1);
  });
});

describe("appendHistory / serializeHistory", () => {
  it("appends events and round-trips through a string", () => {
    const first = appendHistory("", { at: "2026-11-24T10:00:00.000Z", type: "created" });
    const second = appendHistory(first, {
      at: "2026-11-24T11:00:00.000Z",
      type: "status",
      from: "todo",
      to: "in_progress",
    });

    const entries = parseHistory(second);
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ type: "status", from: "todo", to: "in_progress" });
  });

  it("caps the log so a spreadsheet cell stays bounded", () => {
    let history = "";
    for (let index = 0; index < HISTORY_LIMIT + 5; index += 1) {
      history = appendHistory(history, {
        at: `2026-11-24T10:00:${String(index).padStart(2, "0")}.000Z`,
        type: "edit",
        fields: ["title"],
      });
    }
    expect(parseHistory(history)).toHaveLength(HISTORY_LIMIT);
  });

  it("returns an empty string when there is nothing to store", () => {
    expect(serializeHistory([])).toBe("");
    expect(serializeHistory(null)).toBe("");
  });
});

describe("describeHistoryEntry", () => {
  it("labels creation, status changes and edits", () => {
    expect(describeHistoryEntry({ at: "2026-11-24T10:00:00.000Z", type: "created" })).toBe(
      "Task created"
    );
    expect(
      describeHistoryEntry({
        at: "2026-11-24T10:00:00.000Z",
        type: "status",
        from: "todo",
        to: "complete",
      })
    ).toBe("Status changed from To Do to Complete");
    expect(
      describeHistoryEntry({
        at: "2026-11-24T10:00:00.000Z",
        type: "edit",
        fields: ["title", "dueDate"],
      })
    ).toBe("Updated title, due date");
  });
});
