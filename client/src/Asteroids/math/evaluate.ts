/**
 * Turns a JS expression in x into a callable function. This is the same code
 * as GraphComponent.stringToMathFunction (feature/GraphRenderer), so the hit
 * test judges exactly the curve the graph draws.
 *
 * The expression is run with `new Function`, so only pass strings built by
 * toExpression from parsed numbers, never text the player typed.
 * @param expression the right-hand side of `y =`, e.g. `(2)*x+(-3)`
 * @returns a function that evaluates the expression at x
 */
export function expressionToFunction(
  expression: string,
): (x: number) => number {
  return new Function('x', `return ${expression};`) as (x: number) => number;
}
