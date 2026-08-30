import { describe, expect, it } from "vitest";
import { rankCapitals, rankStates } from "./state-search";
import { CAPITAL_NAMES, STATE_NAMES } from "./states";

describe("rankStates", () => {
  it("returns every state when the query is empty", () => {
    expect(rankStates("")).toEqual([...STATE_NAMES]);
    expect(rankStates("   ")).toEqual([...STATE_NAMES]);
  });

  it("ranks exact USPS codes first", () => {
    expect(rankStates("ca")[0]).toBe("California");
    expect(rankStates("NY")[0]).toBe("New York");
    expect(rankStates("wv")[0]).toBe("West Virginia");
  });

  it("ranks name prefixes ahead of later-word hits", () => {
    expect(rankStates("cali")[0]).toBe("California");
    expect(rankStates("mass")[0]).toBe("Massachusetts");
    expect(rankStates("vir")[0]).toBe("Virginia");
  });

  it("matches a later word prefix", () => {
    const dakota = rankStates("dakota");
    expect(dakota).toContain("North Dakota");
    expect(dakota).toContain("South Dakota");
    expect(dakota[0]?.endsWith("Dakota")).toBe(true);
  });

  it("matches compact multi-word names", () => {
    expect(rankStates("newyork")[0]).toBe("New York");
  });

  it("still finds a state after one extra letter or swap", () => {
    expect(rankStates("califorrnia")).toContain("California");
    expect(rankStates("new yrok")).toContain("New York");
  });

  it("omits states that do not match", () => {
    expect(rankStates("zzzz")).toEqual([]);
  });
});

describe("rankCapitals", () => {
  it("returns every capital when the query is empty", () => {
    expect(rankCapitals("")).toEqual([...CAPITAL_NAMES]);
    expect(rankCapitals("   ")).toEqual([...CAPITAL_NAMES]);
  });

  it("ranks capital name prefixes first", () => {
    expect(rankCapitals("sacr")[0]).toBe("Sacramento");
    expect(rankCapitals("bost")[0]).toBe("Boston");
    expect(rankCapitals("salt")[0]).toBe("Salt Lake City");
  });

  it("matches a later word prefix", () => {
    expect(rankCapitals("rouge")[0]).toBe("Baton Rouge");
    expect(rankCapitals("paul")[0]).toBe("Saint Paul");
  });

  it("matches compact multi-word names", () => {
    expect(rankCapitals("oklahomacity")[0]).toBe("Oklahoma City");
  });

  it("still finds a capital after one extra letter or swap", () => {
    expect(rankCapitals("sacrametno")).toContain("Sacramento");
    expect(rankCapitals("baton ruoge")).toContain("Baton Rouge");
  });

  it("omits capitals that do not match", () => {
    expect(rankCapitals("zzzz")).toEqual([]);
  });
});
