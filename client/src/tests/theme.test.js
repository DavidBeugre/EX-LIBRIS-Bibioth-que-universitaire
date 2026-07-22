import { describe, test, expect } from "vitest";
import { categoryStyle, formatDate, CATEGORY_STYLE } from "../lib/theme.js";

describe("categoryStyle", () => {
  test("retourne le style défini pour une catégorie connue", () => {
    const style = categoryStyle("Informatique");
    expect(style).toEqual(CATEGORY_STYLE.Informatique);
    expect(style.fg).toMatch(/^#/);
  });

  test("retourne un style par défaut pour une catégorie inconnue", () => {
    const style = categoryStyle("Astrologie");
    expect(style.fg).toBe("#1B2A4A");
  });
});

describe("formatDate", () => {
  test("formate une date ISO en format français", () => {
    const result = formatDate("2026-08-09T00:00:00.000Z");
    expect(result).toMatch(/09\/08\/2026|08\/08\/2026/); // tolérance fuseau horaire
  });

  test("retourne un tiret pour une date nulle ou vide", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });
});
