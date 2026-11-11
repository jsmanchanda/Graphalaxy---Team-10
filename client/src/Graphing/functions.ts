/**
 * 1 Dimensional Interval
 */
export class Interval {
  start: number;
  finish: number;

  /**
   * defines bounds of the interval
   */
  constructor(start: number, finish: number) {
    this.start = start;
    this.finish = finish;
  }

  /**
   * returns length of the interval
   */
  getLength(): number {
    return Math.abs(this.start - this.finish);
  }

  /**
   * returns center value of the interval
   */
  getCenter(): number {
    return this.start + this.getLength() / 2;
  }
}

/**
 * Generic Function
 */
export abstract class MathFunction {
  /**
   * arbitrary function of number to number
   */
  abstract toFunction(): (x: number) => number;
}

/**
 * Linear function: f(x) = (slope)*x + intercept
 */
export class LinearFunction extends MathFunction {
  slope: number;
  intercept: number;

  /**
   * Constructor, assigns slope and intercept
   */
  constructor(slope: number, intercept: number) {
    super();
    this.slope = slope;
    this.intercept = intercept;
  }

  /**
   * return the function object for its graph
   */
  toFunction(): (x: number) => number {
    return (x: number) => {
      return this.slope * x + this.intercept;
    };
  }
}

/**
 * Quadratic function: f(x) = ax^2 + bx +c
 */
export class QuadraticFunction extends MathFunction {
  coefficientA: number;
  coefficientB: number;
  coefficientC: number;

  /**
   * Constructor, assigns slope and intercept
   */
  constructor(a: number, b: number, c: number) {
    super();
    this.coefficientA = a;
    this.coefficientB = b;
    this.coefficientC = c;
  }

  /**
   * return the function object for its graph
   */
  toFunction(): (x: number) => number {
    return (x: number) => {
      return (
        this.coefficientA * x * x + this.coefficientB * x + this.coefficientC
      );
    };
  }
}
/**
 * Cubic function: f(x) = ax^3 + bx^2 + cx + d
 */
export class CubicFunction extends MathFunction {
  coefficientA: number;
  coefficientB: number;
  coefficientC: number;
  coefficientD: number;

  /**
   * Constructor, assigns slope and intercept
   */
  constructor(a: number, b: number, c: number, d: number) {
    super();
    this.coefficientA = a;
    this.coefficientB = b;
    this.coefficientC = c;
    this.coefficientD = d;
  }

  /**
   * return the function object for its graph
   */
  toFunction(): (x: number) => number {
    return (x: number) => {
      return (
        this.coefficientA * x * x * x +
        this.coefficientB * x * x +
        this.coefficientC * x +
        this.coefficientD
      );
    };
  }
}

/**
 * Trig function: f(x) = a*sin(bx+c) + d
 * a : amplitude
 * b : frequency
 * c : horizontal shift
 * d : vertical shift
 */
export class TrigFunction extends MathFunction {
  coefficientA: number;
  coefficientB: number;
  coefficientC: number;
  coefficientD: number;

  /**
   * Constructor, assigns slope and intercept
   */
  constructor(a: number, b: number, c: number, d: number) {
    super();
    this.coefficientA = a;
    this.coefficientB = b;
    this.coefficientC = c;
    this.coefficientD = d;
  }

  /**
   * return the function object for its graph
   */
  toFunction(): (x: number) => number {
    return (x: number) => {
      return (
        this.coefficientA *
          Math.sin(this.coefficientB * x + this.coefficientC) +
        this.coefficientD
      );
    };
  }
}
