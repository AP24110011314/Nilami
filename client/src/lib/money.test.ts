import { describe, it, expect } from 'vitest';
import { formatINR, rupeesToPaise, paiseToRupees } from './money.js';

describe('Money Utilities (Integer Paise)', () => {
  it('converts rupee string to integer paise correctly', () => {
    expect(rupeesToPaise('100')).toBe(10000);
    expect(rupeesToPaise('100.50')).toBe(10050);
    expect(rupeesToPaise('100.05')).toBe(10005);
    expect(rupeesToPaise('80,000')).toBe(8000000);
    expect(rupeesToPaise('80,000.75')).toBe(8000075);
  });

  it('converts numbers to integer paise without float errors', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(80000)).toBe(8000000);
    expect(rupeesToPaise(19.99)).toBe(1999);
  });

  it('converts paise to rupees', () => {
    expect(paiseToRupees(10000)).toBe(100);
    expect(paiseToRupees(8000000)).toBe(80000);
    expect(paiseToRupees(10050)).toBe(100.5);
  });

  it('formats INR properly with rupee symbol', () => {
    const formatted = formatINR(8000000);
    // Should contain ₹ and 80,000
    expect(formatted).toContain('80,000');
    expect(formatted).toMatch(/₹/);
  });

  it('throws TypeError when passed non-integer paise', () => {
    expect(() => formatINR(100.5)).toThrow(TypeError);
    expect(() => paiseToRupees(100.5)).toThrow(TypeError);
  });
});

