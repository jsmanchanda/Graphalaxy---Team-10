import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {
  ASTEROID_FILL_COLOR,
  ASTEROID_STROKE_COLOR,
  DESTROYED_FILL_COLOR,
  DESTROYED_STROKE_COLOR,
  SHOT_COLOR,
} from '../constants';
import {WINDOW_MAX, WINDOW_MIN} from '../math/asteroids';
import type {Asteroid, FireResult} from '../types';

// Konva id of the player's curve, so there is only ever one.
const SHOT_ID = 'shot';
const ASTEROID_STROKE_WIDTH = 2;

/**
 * The window out of the ship: the graph grid with the question's asteroids
 * on it. The player's curve only appears here after Fire.
 */
export class AsteroidFieldComponent extends GraphComponent {
  private readonly circles: Konva.Circle[];

  /**
   * Builds the window with the grid and one circle per asteroid.
   * @param x left edge, in design-canvas units
   * @param y top edge, in design-canvas units
   * @param size width and height; square, so x and y use the same scale
   * @param asteroids the current question's asteroids
   */
  constructor(x: number, y: number, size: number, asteroids: Asteroid[]) {
    // GraphComponent's default window is -10..10, the same as WINDOW_MIN/MAX.
    super(x, y, size, size);

    const pixelsPerUnit = size / (WINDOW_MAX - WINDOW_MIN);
    this.circles = asteroids.map(
      asteroid =>
        new Konva.Circle({
          name: 'asteroid',
          x: this.convertToPixelsX(asteroid.position.x),
          y: this.convertToPixelsY(asteroid.position.y),
          radius: asteroid.radius * pixelsPerUnit,
          fill: ASTEROID_FILL_COLOR,
          stroke: ASTEROID_STROKE_COLOR,
          strokeWidth: ASTEROID_STROKE_WIDTH,
        }),
    );
    this.group.add(...this.circles);
  }

  /**
   * Draws the fired curve and marks the asteroids it hit.
   * @param shot what controller.fire returned
   */
  showShot(shot: FireResult): void {
    this.addFunction(shot.expression, SHOT_ID);
    this.group.findOne<Konva.Line>(`#${SHOT_ID}`)?.stroke(SHOT_COLOR);

    shot.hits.forEach((hit, i) => {
      if (hit) {
        this.circles[i].setAttrs({
          fill: DESTROYED_FILL_COLOR,
          stroke: DESTROYED_STROKE_COLOR,
        });
      }
    });
    this.group.getLayer()?.batchDraw();
  }
}
