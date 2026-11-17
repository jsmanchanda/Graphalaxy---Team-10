import {describe, expect, it} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidFieldComponent} from '../../src/Asteroids/components/AsteroidFieldComponent';
import {
  ASTEROID_FILL_COLOR,
  DESTROYED_FILL_COLOR,
  DESTROYED_STROKE_COLOR,
  SHOT_COLOR,
} from '../../src/Asteroids/constants';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import type {Asteroid} from '../../src/Asteroids/types';

// Build the real GraphComponent in Node; see helpers/konvaStubs.ts
installKonvaStubs();

// 200 pixels for the 20-unit window: 10 pixels per unit.
const SIZE = 200;

/** An asteroid at (x, y) with the default radius. */
function asteroidAt(x: number, y: number): Asteroid {
  return {position: {x, y}, radius: ASTEROID_RADIUS, destroyed: false};
}

function circles(field: AsteroidFieldComponent): Konva.Circle[] {
  return field.getGroup().find('.asteroid') as Konva.Circle[];
}

function shotCurves(field: AsteroidFieldComponent): Konva.Line[] {
  return field.getGroup().find('#shot') as Konva.Line[];
}

describe('AsteroidFieldComponent', () => {
  it('draws one circle per asteroid at its grid position', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [
      asteroidAt(0, 0),
      asteroidAt(5, -2.5),
    ]);
    const [a, b] = circles(field);

    expect(circles(field)).toHaveLength(2);
    // (0, 0) is the middle; +x is right and +y is up.
    expect([a.x(), a.y()]).toEqual([100, 100]);
    expect([b.x(), b.y()]).toEqual([150, 125]);
  });

  it('sizes circles by the asteroid radius in grid units', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [asteroidAt(1, 1)]);
    expect(circles(field)[0].radius()).toBe(ASTEROID_RADIUS * 10);
  });

  it('is placed at the given position', () => {
    const field = new AsteroidFieldComponent(240, 10, SIZE, []);
    expect([field.getGroup().x(), field.getGroup().y()]).toEqual([240, 10]);
  });

  it('shows no curve before the shot', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [asteroidAt(1, 3)]);
    expect(shotCurves(field)).toHaveLength(0);
  });

  it('draws the shot and marks only the asteroids it hit', () => {
    const field = new AsteroidFieldComponent(0, 0, SIZE, [
      asteroidAt(0, 1),
      asteroidAt(1, 5),
    ]);
    field.showShot({hit: false, hits: [true, false], expression: '1'});

    const [shot] = shotCurves(field);
    expect(shotCurves(field)).toHaveLength(1);
    expect(shot.stroke()).toBe(SHOT_COLOR);

    const [hitOne, missed] = circles(field);
    expect(hitOne.fill()).toBe(DESTROYED_FILL_COLOR);
    expect(hitOne.stroke()).toBe(DESTROYED_STROKE_COLOR);
    expect(missed.fill()).toBe(ASTEROID_FILL_COLOR);
  });
});
