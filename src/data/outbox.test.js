import { beforeEach, describe, expect, it } from "vitest";
import { OUTBOX_KEY, readOutbox, writeOutbox } from "./outbox";

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

describe("outbox", () => {
  it("round-trips queued operations", () => {
    const ops = [
      { type: "upsertJob", job: { id: "j1", title: "One" } },
      { type: "deleteJob", job: { id: "j2" } },
      { type: "upsertEmployee", employee: { id: "e1", name: "Ava" } },
    ];
    writeOutbox(ops);
    expect(readOutbox()).toEqual(ops);
  });

  it("drops malformed entries", () => {
    store.set(
      OUTBOX_KEY,
      JSON.stringify([
        { type: "upsertJob", job: { id: "j1", title: "One" } },
        { type: "nope", job: {} },
        { type: "upsertJob" },
        null,
        "string",
      ])
    );
    expect(readOutbox()).toEqual([{ type: "upsertJob", job: { id: "j1", title: "One" } }]);
  });

  it("recovers from corrupt storage", () => {
    store.set(OUTBOX_KEY, "{broken");
    expect(readOutbox()).toEqual([]);
    store.set(OUTBOX_KEY, JSON.stringify({ not: "an array" }));
    expect(readOutbox()).toEqual([]);
  });
});
