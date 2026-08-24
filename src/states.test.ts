import { describe, expect, it } from "vitest";
import { isUsState, STATE_ABBR, STATE_NAMES } from "./states";

describe("states", () => {
  it("lists 50 unique official names", () => {
    expect(STATE_NAMES).toHaveLength(50);
    expect(new Set(STATE_NAMES).size).toBe(50);
  });

  it("maps every name to a unique two-letter USPS code", () => {
    const codes = STATE_NAMES.map((name) => STATE_ABBR[name]);
    expect(codes).toHaveLength(50);
    expect(new Set(codes).size).toBe(50);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it("accepts only official names", () => {
    expect(isUsState("California")).toBe(true);
    expect(isUsState("District of Columbia")).toBe(false);
    expect(isUsState("california")).toBe(false);
  });
});
