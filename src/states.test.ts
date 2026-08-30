import { describe, expect, it } from "vitest";
import { CAPITAL_NAMES, isUsState, STATE_ABBR, STATE_CAPITALS, STATE_NAMES } from "./states";

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

  it("maps every state to a unique capital city", () => {
    expect(CAPITAL_NAMES).toHaveLength(50);
    expect(new Set(CAPITAL_NAMES).size).toBe(50);
    for (const name of STATE_NAMES) {
      expect(STATE_CAPITALS[name].length).toBeGreaterThan(0);
      expect(CAPITAL_NAMES).toContain(STATE_CAPITALS[name]);
    }
  });

  it("accepts only official names", () => {
    expect(isUsState("California")).toBe(true);
    expect(isUsState("District of Columbia")).toBe(false);
    expect(isUsState("california")).toBe(false);
  });
});
