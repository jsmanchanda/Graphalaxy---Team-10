import Konva from 'konva';
import {Component} from '../../UI/components';
import {
  ASTEROID_WINDOW,
  PREVIEW_BORDER_COLOR,
  PREVIEW_CURVE_COLOR,
  PREVIEW_SCREEN_COLOR,
} from '../constants';
import {expressionToFunction} from '../math/evaluate';

// Samples per pixel of width: enough for a smooth curve, and cheap enough
// to redraw on every keystroke.
const SAMPLES_PER_PIXEL = 2;
const CURVE_WIDTH = 2;

/**
 * The small targeting screen on the control panel: the player's curve as
 * they type, before firing. No grid, axes or asteroids, only the curve, on
 * the same -10..10 window as the main window so the two line up.
 */
export class TargetingPreviewComponent extends Component {
  private readonly size: number;
  private curve: Konva.Line | null = null;

  /**
   * Builds an empty, square targeting screen.
   * @param x left edge, in design-canvas units
   * @param y top edge, in design-canvas units
   * @param size width and height; square, so x and y use the same scale
   */
  constructor(x: number, y: number, size: number) {
    super(x, y);
    this.size = size;

    // Keeps steep curves from drawing outside the screen.
    this.group.setAttrs({
      clipX: 0,
      clipY: 0,
      clipWidth: size,
      clipHeight: size,
    });
    this.group.add(
      new Konva.Rect({
        width: size,
        height: size,
        fill: PREVIEW_SCREEN_COLOR,
        stroke: PREVIEW_BORDER_COLOR,
      }),
    );
  }

  /**
   * Shows a curve, replacing the previous one.
   * @param expression the curve from controller.preview, or null to clear
   *   the screen while a box is blank or invalid
   */
  draw(expression: string | null): void {
    this.curve?.destroy();
    this.curve = null;

    if (expression !== null) {
      this.curve = new Konva.Line({
        name: 'previewCurve',
        points: this.samplePoints(expressionToFunction(expression)),
        stroke: PREVIEW_CURVE_COLOR,
        strokeWidth: CURVE_WIDTH,
        lineCap: 'round',
        lineJoin: 'round',
      });
      this.group.add(this.curve);
    }
    this.group.getLayer()?.batchDraw();
  }

  /**
   * Samples the curve across ASTEROID_WINDOW, the same range the main window
   * is drawn with, and converts it to pixels with the same maths as
   * GraphComponent.convertToPixelsX/Y. A test checks the two agree.
   * (The window is square, so one interval and one scale cover both axes.)
   * @param fn the curve's function
   * @returns flat [x1, y1, x2, y2, ...] pixel points, skipping x values
   *   where fn isn't a finite number
   */
  private samplePoints(fn: (x: number) => number): number[] {
    const start = ASTEROID_WINDOW.start;
    const span = ASTEROID_WINDOW.getLength();
    const pixelsPerUnit = this.size / span;
    const samples = this.size * SAMPLES_PER_PIXEL;
    const points: number[] = [];

    for (let i = 0; i <= samples; i++) {
      const x = start + (span * i) / samples;
      const y = fn(x);
      if (Number.isFinite(y)) {
        points.push(
          (x - start) * pixelsPerUnit,
          this.size - (y - start) * pixelsPerUnit,
        );
      }
    }
    return points;
  }
}
