import {beforeEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidFieldComponent} from '../../src/Asteroids/components/AsteroidFieldComponent';
import {
  ASTEROID_SPRITE_URL,
  DESTROYED_ASTEROID_SPRITE_URL,
  SHOT_COLOR,
} from '../../src/Asteroids/constants';
import {
  ASTEROID_RADIUS,
  WINDOW_MAX,
  WINDOW_MIN,
} from '../../src/Asteroids/math/asteroids';
import type {Asteroid} from '../../src/Asteroids/types';

// Build the real GraphComponent in Node; see helpers/konvaStubs.ts
installKonvaStubs();

// The stub is installed once per file; clear its calls so each test only
// sees the images it loaded itself.
const loadImage = vi.mocked(Konva.Image.fromURL);
// Braces matter: a function returned from beforeEach runs as its cleanup.
beforeEach(() => {
  loadImage.mockClear();
});

// 200 pixels for the 20-unit window: 10 pixels per unit.
const SIZE = 200;
// The asteroid radius in pixels at that scale.
const RADIUS_PX = ASTEROID_RADIUS * 10;

/** An asteroid at (x, y) with the default radius. */
function asteroidAt(x: number, y: number): Asteroid {
  return {position: {x, y}, radius: ASTEROID_RADIUS, destroyed: false};
}

function intactSprites(field: AsteroidFieldComponent): Konva.Group[] {
  return field.getGroup().find('.asteroid') as Konva.Group[];
}

function destroyedSprites(field: AsteroidFieldComponent): Konva.Group[] {
  return field.getGroup().find('.asteroid-destroyed') as Konva.Group[];
}

function shotCurves(field: AsteroidFieldComponent): Konva.Line[] {
  return field.getGroup().find('#shot') as Konva.Line[];
}

describe('AsteroidFieldComponent', () => {
  it("spans the game's window, the range the hit test uses", () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, []);

    // WINDOW_MIN is the left and bottom edge, WINDOW_MAX the right and top.
    expect(field.convertToPixelsX(WINDOW_MIN)).toBe(0);
    expect(field.convertToPixelsX(WINDOW_MAX)).toBe(SIZE);
    expect(field.convertToPixelsY(WINDOW_MIN)).toBe(SIZE);
    expect(field.convertToPixelsY(WINDOW_MAX)).toBe(0);
  });

  it('centers one sprite per asteroid on its grid position', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [
      asteroidAt(0, 0),
      asteroidAt(5, -2.5),
    ]);
    const [a, b] = intactSprites(field);

    expect(intactSprites(field)).toHaveLength(2);
    // (0, 0) is the middle; +x is right and +y is up. Each sprite's top-left
    // is its center minus the radius.
    expect([a.x(), a.y()]).toEqual([100 - RADIUS_PX, 100 - RADIUS_PX]);
    expect([b.x(), b.y()]).toEqual([150 - RADIUS_PX, 125 - RADIUS_PX]);
  });

  it('sizes sprites to cover the hit circle', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [asteroidAt(1, 1)]);
    const image = intactSprites(field)[0].findOne<Konva.Image>('Image');

    expect(image?.width()).toBe(2 * RADIUS_PX);
    expect(image?.height()).toBe(2 * RADIUS_PX);
  });

  it('loads both sprites for every asteroid', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [asteroidAt(1, 1)]);

    // One intact and one destroyed sprite for the single asteroid.
    expect(loadImage).toHaveBeenCalledTimes(2);
    expect(loadImage).toHaveBeenCalledWith(
      ASTEROID_SPRITE_URL,
      expect.any(Function),
    );
    expect(loadImage).toHaveBeenCalledWith(
      DESTROYED_ASTEROID_SPRITE_URL,
      expect.any(Function),
    );
    expect(destroyedSprites(field)).toHaveLength(1);
  });

  it('starts with every asteroid intact', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [
      asteroidAt(0, 1),
      asteroidAt(1, 5),
    ]);

    expect(intactSprites(field).every(s => s.visible())).toBe(true);
    expect(destroyedSprites(field).some(s => s.visible())).toBe(false);
  });

  it('is placed at the given position', () => {
    const field = new AsteroidFieldComponent(240, 10, SIZE, []);
    expect([field.getGroup().x(), field.getGroup().y()]).toEqual([240, 10]);
  });

  it('shows no curve before the shot', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [asteroidAt(1, 3)]);
    expect(shotCurves(field)).toHaveLength(0);
  });

  it('draws the shot and destroys only the asteroids it hit', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [
      asteroidAt(0, 1),
      asteroidAt(1, 5),
    ]);
    field.showShot({hit: false, hits: [true, false], expression: '1'});

    const [shot] = shotCurves(field);
    expect(shotCurves(field)).toHaveLength(1);
    expect(shot.stroke()).toBe(SHOT_COLOR);

    const [hitIntact, missedIntact] = intactSprites(field);
    const [hitDestroyed, missedDestroyed] = destroyedSprites(field);
    expect(hitIntact.visible()).toBe(false);
    expect(hitDestroyed.visible()).toBe(true);
    expect(missedIntact.visible()).toBe(true);
    expect(missedDestroyed.visible()).toBe(false);
  });
});
