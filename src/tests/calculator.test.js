'use strict';

const {
  addition,
  subtraction,
  multiplication,
  division,
  modulo,
  power,
  squareRoot,
} = require('../calculator');

// ─── Basic operations ──────────────────────────────────────────────────────────

describe('addition', () => {
  test('adds two positive numbers', () => {
    expect(addition(3, 4)).toBe(7);
  });
  test('adds a positive and a negative number', () => {
    expect(addition(10, -3)).toBe(7);
  });
  test('adds two negative numbers', () => {
    expect(addition(-5, -5)).toBe(-10);
  });
  test('adds zero to a number', () => {
    expect(addition(7, 0)).toBe(7);
  });
  test('adds floating point numbers', () => {
    expect(addition(0.1, 0.2)).toBeCloseTo(0.3);
  });
});

describe('subtraction', () => {
  test('subtracts two positive numbers', () => {
    expect(subtraction(10, 4)).toBe(6);
  });
  test('subtracts a larger from a smaller number', () => {
    expect(subtraction(3, 7)).toBe(-4);
  });
  test('subtracts zero', () => {
    expect(subtraction(5, 0)).toBe(5);
  });
  test('subtracts negative number (double negative)', () => {
    expect(subtraction(5, -3)).toBe(8);
  });
});

describe('multiplication', () => {
  test('multiplies two positive numbers', () => {
    expect(multiplication(3, 4)).toBe(12);
  });
  test('multiplies by zero', () => {
    expect(multiplication(99, 0)).toBe(0);
  });
  test('multiplies a positive and a negative number', () => {
    expect(multiplication(5, -3)).toBe(-15);
  });
  test('multiplies two negative numbers', () => {
    expect(multiplication(-4, -5)).toBe(20);
  });
  test('multiplies floating point numbers', () => {
    expect(multiplication(2.5, 4)).toBeCloseTo(10);
  });
});

describe('division', () => {
  test('divides two positive numbers', () => {
    expect(division(10, 2)).toBe(5);
  });
  test('divides to produce a decimal result', () => {
    expect(division(7, 2)).toBe(3.5);
  });
  test('divides a negative by a positive', () => {
    expect(division(-12, 4)).toBe(-3);
  });
  test('divides two negative numbers', () => {
    expect(division(-10, -2)).toBe(5);
  });
  test('throws an error on division by zero', () => {
    expect(() => division(5, 0)).toThrow('Division by zero is not allowed');
  });
});

// ─── Extended operations ───────────────────────────────────────────────────────

describe('modulo', () => {
  test('returns remainder of positive division', () => {
    expect(modulo(10, 3)).toBe(1);
  });
  test('returns 0 when evenly divisible', () => {
    expect(modulo(12, 4)).toBe(0);
  });
  test('modulo with negative dividend', () => {
    expect(modulo(-7, 3)).toBe(-1);
  });
  test('throws on modulo by zero', () => {
    expect(() => modulo(5, 0)).toThrow('Modulo by zero is not allowed');
  });
  test('modulo of larger divisor returns dividend', () => {
    expect(modulo(3, 10)).toBe(3);
  });
});

describe('power', () => {
  test('raises a number to an integer power', () => {
    expect(power(2, 10)).toBe(1024);
  });
  test('any number to the power of 0 is 1', () => {
    expect(power(99, 0)).toBe(1);
  });
  test('any number to the power of 1 is itself', () => {
    expect(power(7, 1)).toBe(7);
  });
  test('handles negative exponent', () => {
    expect(power(2, -1)).toBeCloseTo(0.5);
  });
  test('handles fractional exponent (square root via power)', () => {
    expect(power(9, 0.5)).toBeCloseTo(3);
  });
});

describe('squareRoot', () => {
  test('returns square root of a perfect square', () => {
    expect(squareRoot(9)).toBe(3);
  });
  test('returns square root of 0', () => {
    expect(squareRoot(0)).toBe(0);
  });
  test('returns square root of a non-perfect square', () => {
    expect(squareRoot(2)).toBeCloseTo(1.4142);
  });
  test('returns square root of a large number', () => {
    expect(squareRoot(10000)).toBe(100);
  });
  test('throws an error for square root of a negative number', () => {
    expect(() => squareRoot(-1)).toThrow(
      'Cannot calculate square root of a negative number'
    );
  });
});
