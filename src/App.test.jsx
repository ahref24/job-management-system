import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import App from "./App";

describe("App", () => {
  it("renders the board shell with seed data", () => {
    const html = renderToString(<App />);
    expect(html).toContain("JobBoard");
    expect(html).toContain("To Do");
    expect(html).toContain("In Progress");
    expect(html).toContain("Complete");
    expect(html).toContain("Total Tasks");
  });
});
