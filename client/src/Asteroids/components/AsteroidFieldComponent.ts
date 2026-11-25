import Konva from 'konva';
import {GraphComponent} from '../../Graphing/GraphComponent';
import {ImageComponent} from '../../UI/components';
import {
  ASTEROID_SPRITE_URL,
  DESTROYED_ASTEROID_SPRITE_URL,
  SHOT_COLOR,
} from '../constants';
import {WINDOW_MAX, WINDOW_MIN} from '../math/asteroids';
import type {Asteroid, FireResult} from '../types';

// Konva id of the player's curve, so there is only ever one.
const SHOT_ID = 'shot';

/** One asteroid's two looks; the destroyed one stays hidden until a hit. */
interface AsteroidSprites {
  intact: ImageComponent;
  destroyed: ImageComponent;
}

/**
 * The window out of the ship: the graph grid with the question's asteroids
 * on it. The player's curve only appears here after Fire.
 */
export class AsteroidFieldComponent extends GraphComponent {
  private readonly sprites: AsteroidSprites[];

  /**
   * Builds the window with the grid and one sprite per asteroid.
   * @param x left edge, in design-canvas units
   * @param y top edge, in design-canvas units
   * @param size width and height; square, so x and y use the same scale
   * @param asteroids the current question's asteroids
   */
  constructor(x: number, y: number, size: number, asteroids: Asteroid[]) {
    // GraphComponent's default window is -10..10, the same as WINDOW_MIN/MAX.
    super(x, y, size, size);

    const pixelsPerUnit = size / (WINDOW_MAX - WINDOW_MIN);
    this.sprites = asteroids.map(asteroid => {
      // A square around the center, the same size as the hit circle, so the
      // art covers exactly the area the hit test checks.
      const radius = asteroid.radius * pixelsPerUnit;
      const left = this.convertToPixelsX(asteroid.position.x) - radius;
      const top = this.convertToPixelsY(asteroid.position.y) - radius;
      const sprite = (url: string) =>
        new ImageComponent(left, top, 2 * radius, 2 * radius, url);

      const intact = sprite(ASTEROID_SPRITE_URL);
      const destroyed = sprite(DESTROYED_ASTEROID_SPRITE_URL);
      intact.getGroup().name('asteroid');
      destroyed.getGroup().name('asteroid-destroyed').visible(false);
      return {intact, destroyed};
    });

    for (const {intact, destroyed} of this.sprites) {
      this.group.add(intact.getGroup(), destroyed.getGroup());
    }
  }

  /**
   * Draws the fired curve and swaps each hit asteroid to its destroyed
   * sprite.
   * @param shot what controller.fire returned
   */
  showShot(shot: FireResult): void {
    this.addFunction(shot.expression, SHOT_ID);
    this.group.findOne<Konva.Line>(`#${SHOT_ID}`)?.stroke(SHOT_COLOR);

    shot.hits.forEach((hit, i) => {
      if (hit) {
        this.sprites[i].intact.getGroup().visible(false);
        this.sprites[i].destroyed.getGroup().visible(true);
      }
    });
    this.group.getLayer()?.batchDraw();
  }
}
