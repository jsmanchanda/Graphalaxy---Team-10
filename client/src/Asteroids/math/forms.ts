import type {FormDefinition, FormId, FunctionType} from '../types';

/**
 * Every equation form, keyed by FormId. Record<FormId, ...> makes the
 * compiler complain if a FormId is added to types.ts without an entry here.
 *
 * Each toExpression returns the right-hand side of `y =` as a JS expression
 * for GraphComponent.addFunction.
 */
export const FORMS: Record<FormId, FormDefinition> = {
  linearSlopeIntercept: {
    type: 'linear',
    name: 'Slope-intercept form',
    template: 'y = mx + b',
    coefficients: ['m', 'b'],
    /** Builds `m*x + b` as a JS expression. */
    toExpression: ([m, b]) => `(${m})*x+(${b})`,
  },
  linearPointSlope: {
    type: 'linear',
    name: 'Point-slope form',
    template: 'y - k = m(x - h)',
    coefficients: ['m', 'h', 'k'],
    /** Builds `m*(x - h) + k` as a JS expression. */
    toExpression: ([m, h, k]) => `(${m})*(x-(${h}))+(${k})`,
  },
  linearStandard: {
    type: 'linear',
    name: 'Standard form',
    template: 'Ax + By = C',
    coefficients: ['A', 'B', 'C'],
    /** Builds `(C - A*x) / B` as a JS expression. */
    toExpression: ([a, b, c]) => {
      if (b === 0) {
        throw new RangeError('B cannot be 0 in Ax + By = C');
      }
      return `((${c})-(${a})*x)/(${b})`;
    },
    /** B = 0 would make a vertical line, which isn't a function. */
    accepts: ([, b]) => b !== 0,
  },
  // Quadratic and cubic forms are off for now: the minigame is linear only.
  // Put their types back in types.ts (FunctionType, FormId) along with them.
  // quadraticStandard: {
  //   type: 'quadratic',
  //   name: 'Standard form',
  //   template: 'y = ax² + bx + c',
  //   coefficients: ['a', 'b', 'c'],
  //   /** Builds `a*x**2 + b*x + c` as a JS expression. */
  //   toExpression: ([a, b, c]) => `(${a})*x**2+(${b})*x+(${c})`,
  // },
  // quadraticVertex: {
  //   type: 'quadratic',
  //   name: 'Vertex form',
  //   template: 'y = a(x - h)² + k',
  //   coefficients: ['a', 'h', 'k'],
  //   /** Builds `a*(x - h)**2 + k` as a JS expression. */
  //   toExpression: ([a, h, k]) => `(${a})*(x-(${h}))**2+(${k})`,
  // },
  // quadraticIntercept: {
  //   type: 'quadratic',
  //   name: 'Intercept form',
  //   template: 'y = a(x - p)(x - q)',
  //   coefficients: ['a', 'p', 'q'],
  //   /** Builds `a*(x - p)*(x - q)` as a JS expression. */
  //   toExpression: ([a, p, q]) => `(${a})*(x-(${p}))*(x-(${q}))`,
  // },
  // cubicStandard: {
  //   type: 'cubic',
  //   name: 'Standard form',
  //   template: 'y = ax³ + bx² + cx + d',
  //   coefficients: ['a', 'b', 'c', 'd'],
  //   /** Builds `a*x**3 + b*x**2 + c*x + d` as a JS expression. */
  //   toExpression: ([a, b, c, d]) => `(${a})*x**3+(${b})*x**2+(${c})*x+(${d})`,
  // },
  // cubicIntercept: {
  //   type: 'cubic',
  //   name: 'Intercept form',
  //   template: 'y = a(x - p)(x - q)(x - r)',
  //   coefficients: ['a', 'p', 'q', 'r'],
  //   /** Builds `a*(x - p)*(x - q)*(x - r)` as a JS expression. */
  //   toExpression: ([a, p, q, r]) => `(${a})*(x-(${p}))*(x-(${q}))*(x-(${r}))`,
  // },
};

/**
 * Picks a random form of the given type. Which type each of the 3
 * questions uses is the model's decision, not this function's. Only linear
 * forms are on for now.
 * @param type the function type the question needs
 * @param rng random function to select form, returns a number in [0, 1)
 * @returns one of the FormIds of that type
 * @throws {Error} if the type has no form
 */
export function pickForm(type: FunctionType, rng: () => number): FormId {
  // FormId is only a type, so FORMS is the list of forms at runtime.
  const available = (Object.keys(FORMS) as FormId[]).filter(
    formId => FORMS[formId].type === type,
  );
  if (available.length === 0) {
    throw new Error(`No ${type} forms`);
  }

  // min() guards against an rng that returns exactly 1.
  const randomForm = Math.min(
    Math.floor(rng() * available.length),
    available.length - 1,
  );

  return available[randomForm];
}

/**
 * returns the right handed side of a function of any form from a y= into a JS
 * expression, for GraphComponent.addFunction and the hit test.
 *
 * The result is run with `new Function`, so only pass numbers that came from
 * parseCoefficient, never text the player typed.
 * @param formId the form the coefficients belong to
 * @param coeffs one number per entry in FORMS[formId].coefficients, in order
 * @throws {Error} if the count is wrong or a value is not a finite number
 * @throws {RangeError} for linear standard form with B = 0
 */
export function toExpression(formId: FormId, coeffs: number[]): string {
  const form = FORMS[formId];
  if (coeffs.length !== form.coefficients.length) {
    throw new Error(
      `${formId} needs ${form.coefficients.length} coefficients, got ${coeffs.length}`,
    );
  }
  if (!coeffs.every(Number.isFinite)) {
    throw new Error(`${formId} coefficients must be finite numbers`);
  }
  if (form.accepts?.(coeffs) === false) {
    throw new RangeError(`${formId} can't use ${coeffs.join(', ')}`);
  }
  return form.toExpression(coeffs);
}

// A decimal such as 3, -2.5, +7, .5 or 4. (no exponents).
const DECIMAL = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)`;
const NUMBER_PATTERN = new RegExp(`^${DECIMAL}$`);
const FRACTION_PATTERN = new RegExp(
  String.raw`^(${DECIMAL})\s*/\s*(${DECIMAL})$`,
);

/**
 * accepts integers, decimals, and fractions. returns null when the text is
 * invalid which keeps 'Fire' button disabled.
 * @param text what the player typed
 * @returns the number, or null if the text is not a valid coefficient
 */
export function parseCoefficient(text: string): number | null {
  const cleaned = text.trim();

  let value: number | null = null;
  if (NUMBER_PATTERN.test(cleaned)) {
    value = Number(cleaned);
  } else {
    const fraction = FRACTION_PATTERN.exec(cleaned);
    if (fraction) {
      const denominator = Number(fraction[2]);
      value = denominator === 0 ? null : Number(fraction[1]) / denominator;
    }
  }

  // Very long digit strings can overflow to Infinity.
  return value !== null && Number.isFinite(value) ? value : null;
}
