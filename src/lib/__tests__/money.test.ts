import { describe, expect, it } from "vitest";
import {
  distributeByPercentages,
  formatCents,
  formatCentsDecimal,
  parseCentsInput,
} from "@/lib/money";

function normalizeNbsp(str: string): string {
  return str.replace(/\u00a0/g, " ");
}

describe("money utilities (centavos inteiros)", () => {
  describe("parseCentsInput", () => {
    it("parses PT-BR formatted strings into exact integer cents", () => {
      expect(parseCentsInput("1.234,56")).toBe(123456);
      expect(parseCentsInput("0,99")).toBe(99);
      expect(parseCentsInput("100")).toBe(10000);
      expect(parseCentsInput("R$ 2.500,00")).toBe(250000);
      expect(parseCentsInput("100,5")).toBe(10050);
      expect(parseCentsInput("1.000")).toBe(100000);
      expect(parseCentsInput("12.34")).toBe(1234);
    });

    it("handles negative, empty and numeric inputs safely", () => {
      expect(parseCentsInput("-50,25")).toBe(-5025);
      expect(parseCentsInput("")).toBe(0);
      expect(parseCentsInput("   ")).toBe(0);
      expect(parseCentsInput("R$")).toBe(0);
      expect(parseCentsInput("-0")).toBe(0);
      expect(parseCentsInput(19.9)).toBe(1990);
    });
  });

  describe("formatCents & formatCentsDecimal", () => {
    it("formats integer cents into PT-BR BRL currency", () => {
      expect(normalizeNbsp(formatCents(0))).toBe("R$ 0,00");
      expect(normalizeNbsp(formatCents(99))).toBe("R$ 0,99");
      expect(normalizeNbsp(formatCents(123456))).toBe("R$ 1.234,56");
      expect(normalizeNbsp(formatCents(-5025))).toBe("-R$ 50,25");
    });

    it("formats integer cents into decimal string without symbol", () => {
      expect(formatCentsDecimal(123456)).toBe("1.234,56");
      expect(formatCentsDecimal(99)).toBe("0,99");
    });
  });

  describe("distributeByPercentages", () => {
    it("distributes 1000 cents across 33% / 33% / 34% without losing cents", () => {
      const parts = distributeByPercentages(1000, [33, 33, 34]);
      expect(parts).toEqual([330, 330, 340]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(1000);
    });

    it("uses largest-remainder allocation for repeating fractional percentages", () => {
      const parts100 = distributeByPercentages(100, [33.33, 33.33, 33.34]);
      expect(parts100).toEqual([33, 33, 34]);
      expect(parts100.reduce((a, b) => a + b, 0)).toBe(100);

      const parts1000 = distributeByPercentages(1000, [33.33, 33.33, 33.34]);
      expect(parts1000).toEqual([333, 333, 334]);
      expect(parts1000.reduce((a, b) => a + b, 0)).toBe(1000);

      const equalThree = distributeByPercentages(100, [33.3333, 33.3333, 33.3334]);
      expect(equalThree.reduce((a, b) => a + b, 0)).toBe(100);
      expect(equalThree.every((v) => Number.isInteger(v))).toBe(true);
    });

    it("supports partial percentage distributions below 100%", () => {
      const parts = distributeByPercentages(1000, [25, 25]);
      expect(parts).toEqual([250, 250]);
    });

    it("throws when percentages exceed 100% or totalCents is invalid", () => {
      expect(() => distributeByPercentages(-10, [50, 50])).toThrow();
      expect(() => distributeByPercentages(10.5, [50, 50])).toThrow();
      expect(() => distributeByPercentages(1000, [60, 50])).toThrow();
    });
  });
});
