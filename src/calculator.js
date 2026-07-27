/**
 * calculator.js - Node.js CLI Calculator
 *
 * Supports the following arithmetic operations:
 *   Basic:    addition, subtraction, multiplication, division
 *   Extended: modulo, power (exponentiation), square root
 */

'use strict';

/**
 * Performs addition of two numbers.
 * @param {number} a - First operand
 * @param {number} b - Second operand
 * @returns {number} The sum of a and b
 */
function addition(a, b) {
  return a + b;
}

/**
 * Performs subtraction of two numbers.
 * @param {number} a - Minuend
 * @param {number} b - Subtrahend
 * @returns {number} The difference a minus b
 */
function subtraction(a, b) {
  return a - b;
}

/**
 * Performs multiplication of two numbers.
 * @param {number} a - First factor
 * @param {number} b - Second factor
 * @returns {number} The product of a and b
 */
function multiplication(a, b) {
  return a * b;
}

/**
 * Performs division of two numbers.
 * @param {number} a - Dividend
 * @param {number} b - Divisor (must not be zero)
 * @returns {number} The quotient a divided by b
 * @throws {Error} If divisor b is zero
 */
function division(a, b) {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

/**
 * Returns the modulo (remainder) of dividing a by b.
 * @param {number} a - Dividend
 * @param {number} b - Divisor (must not be zero)
 * @returns {number} Remainder of a divided by b
 * @throws {Error} If divisor b is zero
 */
function modulo(a, b) {
  if (b === 0) {
    throw new Error('Modulo by zero is not allowed');
  }
  return a % b;
}

/**
 * Raises a base number to the given exponent (power).
 * @param {number} base - The base number
 * @param {number} exponent - The exponent to raise the base to
 * @returns {number} base raised to the power of exponent
 */
function power(base, exponent) {
  return Math.pow(base, exponent);
}

/**
 * Calculates the square root of a non-negative number.
 * @param {number} n - The number to compute the square root of
 * @returns {number} The square root of n
 * @throws {Error} If n is negative
 */
function squareRoot(n) {
  if (n < 0) {
    throw new Error('Cannot calculate square root of a negative number');
  }
  return Math.sqrt(n);
}

module.exports = {
  addition,
  subtraction,
  multiplication,
  division,
  modulo,
  power,
  squareRoot,
};

// CLI entry point – run directly: node src/calculator.js <op> <a> [b]
if (require.main === module) {
  const [, , op, rawA, rawB] = process.argv;
  const a = parseFloat(rawA);
  const b = parseFloat(rawB);

  const ops = {
    addition,
    subtraction,
    multiplication,
    division,
    modulo,
    power,
    squareRoot,
  };

  if (!op || !(op in ops)) {
    console.error(
      'Usage: node src/calculator.js <operation> <a> [b]\n' +
      'Operations: addition, subtraction, multiplication, division, modulo, power, squareRoot'
    );
    process.exit(1);
  }

  try {
    const result = op === 'squareRoot' ? ops[op](a) : ops[op](a, b);
    console.log(`${op}(${rawA}${rawB !== undefined ? ', ' + rawB : ''}) = ${result}`);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
