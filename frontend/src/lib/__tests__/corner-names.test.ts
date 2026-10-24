import { describe, it, expect } from "vitest";
import { getCornerFriendlyName } from "../corner-names";

describe("getCornerFriendlyName", () => {
  it("returns authentic Monza corner names", () => {
    expect(getCornerFriendlyName("Italian Grand Prix", 1)).toBe("Variante del Rettifilo");
    expect(getCornerFriendlyName("Italian Grand Prix", 4)).toBe("Variante della Roggia");
    expect(getCornerFriendlyName("Italian Grand Prix", 7)).toBe("Lesmo 1");
    expect(getCornerFriendlyName("Italian Grand Prix", 8)).toBe("Lesmo 2");
    expect(getCornerFriendlyName("Italian Grand Prix", 11)).toBe("Curva Parabolica");
  });

  it("returns authentic Spa corner names", () => {
    expect(getCornerFriendlyName("Belgian Grand Prix", 1)).toBe("La Source");
    expect(getCornerFriendlyName("Belgian Grand Prix", 3)).toBe("Eau Rouge");
    expect(getCornerFriendlyName("Belgian Grand Prix", 10)).toBe("Pouhon");
    expect(getCornerFriendlyName("Belgian Grand Prix", 18)).toBe("Bus Stop Chicane");
  });

  it("returns authentic Silverstone corner names", () => {
    expect(getCornerFriendlyName("British Grand Prix", 1)).toBe("Abbey");
    expect(getCornerFriendlyName("British Grand Prix", 9)).toBe("Copse");
    expect(getCornerFriendlyName("British Grand Prix", 15)).toBe("Stowe");
  });

  it("returns fallback for unknown circuit or turn number", () => {
    expect(getCornerFriendlyName("Unknown GP", 3)).toBe("Turn 3");
    expect(getCornerFriendlyName("Unknown GP", 3, "A")).toBe("Turn 3A");
  });
});
