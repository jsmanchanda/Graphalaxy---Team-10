import {describe, expect, it} from 'vitest';
import {expressionToFunction} from '../../src/Asteroids/math/evaluate';
import {
  FORMS,
  parseCoefficient,
  pickForm,
  toExpression,
} from '../../src/Asteroids/math/forms';
import type {FormId, FunctionType} from '../../src/Asteroids/types';

describe('toExpression', () => {
  // [form, coefficients, [x, expected y] pairs computed by hand].
  // Negative coefficients check the parentheses, and x² checks for `^`.
  const cases: Array<[FormId, number[], Array<[number, number]>]> = [
    // y = 2x - 3
    [
      'linearSlopeIntercept',
      [2, -3],
      [
        [0, -3],
        [4, 5],
      ],
    ],
    // y - 3 = 2(x + 1)
    [
      'linearPointSlope',
      [2, -1, 3],
      [
        [0, 5],
        [-1, 3],
      ],
    ],
    // 2x - 4y = 8, so y = (2x - 8) / 4
    [
      'linearStandard',
      [2, -4, 8],
      [
        [0, -2],
        [4, 0],
      ],
    ],
    // Quadratic and cubic forms are commented out in FORMS.
    // // y = -x² + 2x + 3
    // [
    //   'quadraticStandard',
    //   [-1, 2, 3],
    //   [
    //     [3, 0],
    //     [-2, -5],
    //   ],
    // ],
    // // y = 2(x + 3)² - 1
    // [
    //   'quadraticVertex',
    //   [2, -3, -1],
    //   [
    //     [-3, -1],
    //     [0, 17],
    //   ],
    // ],
    // // y = -2(x - 1)(x + 4)
    // [
    //   'quadraticIntercept',
    //   [-2, 1, -4],
    //   [
    //     [0, 8],
    //     [1, 0],
    //     [-4, 0],
    //   ],
    // ],
    // // y = x³ - 2x² - 3x + 4
    // [
    //   'cubicStandard',
    //   [1, -2, -3, 4],
    //   [
    //     [2, -2],
    //     [-1, 4],
    //   ],
    // ],
    // // y = 0.5(x + 2)x(x - 3)
    // [
    //   'cubicIntercept',
    //   [0.5, -2, 0, 3],
    //   [
    //     [1, -3],
    //     [-2, 0],
    //   ],
    // ],
  ];

  it.each(cases)('%s with %j evaluates correctly', (id, coeffs, points) => {
    const fn = expressionToFunction(toExpression(id, coeffs));
    for (const [x, y] of points) {
      expect(fn(x)).toBeCloseTo(y);
    }
  });

  it('rejects B = 0 in linear standard form', () => {
    expect(() => toExpression('linearStandard', [1, 0, 2])).toThrow(RangeError);
  });

  it('rejects the wrong number of coefficients', () => {
    expect(() => toExpression('linearSlopeIntercept', [1, 2, 3])).toThrow();
  });

  it('rejects values that are not finite numbers', () => {
    expect(() => toExpression('linearSlopeIntercept', [NaN, 1])).toThrow();
    expect(() => toExpression('linearSlopeIntercept', [1, Infinity])).toThrow();
  });
});

describe('parseCoefficient', () => {
  it.each([
    ['3', 3],
    ['-2.5', -2.5],
    ['+7', 7],
    ['.5', 0.5],
    ['4.', 4],
    ['  4  ', 4],
    ['1/2', 0.5],
    ['-3/4', -0.75],
    ['3 / -4', -0.75],
  ])('reads %j as %d', (text, expected) => {
    expect(parseCoefficient(text)).toBeCloseTo(expected);
  });

  it.each([
    '',
    '   ',
    '-',
    'abc',
    '2x',
    '1/0',
    '1/2/3',
    '1e3',
    '1..2',
    '9'.repeat(400), // overflows to Infinity
    'alert(1)',
  ])('rejects %j', text => {
    expect(parseCoefficient(text)).toBeNull();
  });
});

describe('pickForm', () => {
  /** Every form pickForm returns for rng values spread across [0, 1). */
  function formsReachable(type: FunctionType): Set<FormId> {
    const found = new Set<FormId>();
    for (let i = 0; i < 100; i++) {
      found.add(pickForm(type, () => i / 100));
    }
    return found;
  }

  it('can return each linear form', () => {
    expect(formsReachable('linear')).toEqual(
      new Set(['linearSlopeIntercept', 'linearPointSlope', 'linearStandard']),
    );
  });

  // Quadratic and cubic forms are commented out in FORMS.
  // it('can return each quadratic form', () => {
  //   expect(formsReachable('quadratic')).toEqual(
  //     new Set(['quadraticStandard', 'quadraticVertex', 'quadraticIntercept']),
  //   );
  // });
  //
  // it('can return each cubic form', () => {
  //   expect(formsReachable('cubic')).toEqual(
  //     new Set(['cubicStandard', 'cubicIntercept']),
  //   );
  // });

  it('does not run past the end when rng returns exactly 1', () => {
    expect(FORMS[pickForm('linear', () => 1)].type).toBe('linear');
  });
});
