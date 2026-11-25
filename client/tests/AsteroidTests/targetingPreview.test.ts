import {describe, expect, it} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidFieldComponent} from '../../src/Asteroids/components/AsteroidFieldComponent';
import {TargetingPreviewComponent} from '../../src/Asteroids/components/TargetingPreviewComponent';
import {expressionToFunction} from '../../src/Asteroids/math/evaluate';

// The cross-check test builds a real AsteroidFieldComponent (a GraphComponent)
// in Node; see helpers/konvaStubs.ts
installKonvaStubs();

// 200 pixels for the 20-unit window: 10 pixels per unit.
const SIZE = 200;

function curves(preview: TargetingPreviewComponent): Konva.Line[] {
  return preview.getGroup().find('.previewCurve') as Konva.Line[];
}

/** The curve's points as [x, y] pairs. */
function pairs(line: Konva.Line): Array<[number, number]> {
  const flat = line.points();
  const result: Array<[number, number]> = [];
  for (let i = 0; i < flat.length; i += 2) {
    result.push([flat[i], flat[i + 1]]);
  }
  return result;
}

describe('TargetingPreviewComponent', () => {
  it('starts with no curve', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    expect(curves(preview)).toHaveLength(0);
  });

  it('draws one curve, and a second draw replaces it', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    preview.draw('(1)*x+(0)');
    preview.draw('(2)*x+(1)');
    expect(curves(preview)).toHaveLength(1);
  });

  it('clears the curve when given null', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    preview.draw('(1)*x+(0)');
    preview.draw(null);
    expect(curves(preview)).toHaveLength(0);
  });

  it('maps y = x from the bottom-left corner, through the middle, to the top-right', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    preview.draw('x');
    const points = pairs(curves(preview)[0]);

    expect(points[0]).toEqual([0, SIZE]);
    expect(points.at(-1)).toEqual([SIZE, 0]);
    expect(points).toContainEqual([SIZE / 2, SIZE / 2]);
  });

  it('maps a curve to the same pixels as the main window', () => {
    // Same size for both, so their pixels should match exactly.
    const expression = '(x**2)/5-3';
    const fn = expressionToFunction(expression);
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    const field = new AsteroidFieldComponent(0, 0, SIZE, []);
    preview.draw(expression);
    const points = pairs(curves(preview)[0]);

    // x values the preview samples exactly, across the whole window.
    for (const x of [-10, -5, 0, 5, 10]) {
      expect(points).toContainEqual([
        field.convertToPixelsX(x),
        field.convertToPixelsY(fn(x)),
      ]);
    }
  });

  it('draws y = 0 as a flat line through the middle', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    preview.draw('0');
    for (const [, y] of pairs(curves(preview)[0])) {
      expect(y).toBe(SIZE / 2);
    }
  });

  it('skips points where the curve is not a finite number', () => {
    const preview = new TargetingPreviewComponent(0, 0, SIZE);
    preview.draw('1/x');
    for (const value of curves(preview)[0].points()) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('is placed at (x, y) and clipped to its square', () => {
    const group = new TargetingPreviewComponent(330, 350, SIZE).getGroup();
    expect([group.x(), group.y()]).toEqual([330, 350]);
    expect([group.clipWidth(), group.clipHeight()]).toEqual([SIZE, SIZE]);
  });
});
