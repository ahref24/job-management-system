import { describe, expect, it } from "vitest";
import { findEmployeeByName } from "./employees";

const employees = [
  { id: "emp-1", name: "Ava Martinez", active: true },
  { id: "emp-2", name: "Liam Johnson", active: true },
];

describe("findEmployeeByName", () => {
  it("matches names case-insensitively and ignores surrounding spaces", () => {
    expect(findEmployeeByName(employees, "  ava martinez ")).toMatchObject({ id: "emp-1" });
    expect(findEmployeeByName(employees, "LIAM JOHNSON")).toMatchObject({ id: "emp-2" });
  });

  it("returns null for new, blank and invalid input", () => {
    expect(findEmployeeByName(employees, "Sofia Chen")).toBeNull();
    expect(findEmployeeByName(employees, "   ")).toBeNull();
    expect(findEmployeeByName(employees, null)).toBeNull();
    expect(findEmployeeByName(null, "Ava")).toBeNull();
  });
});
