import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import type {PlanetSummary} from '@graphalaxy/shared';
import {installKonvaStubs} from './helpers/konvaStubs';
import {PlanetComponent} from '../src/UI/screens/NavigationScreenView';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();
// Locked planets are drawn greyscale, which caches the image on a canvas that
// Node does not have; skip the caching.
vi.spyOn(Konva.Image.prototype, 'cache').mockReturnThis();

function planet(unlocked: boolean): PlanetSummary {
  return {
    planetId: 2,
    name: 'Quadratic Quay',
    graphOrder: 2,
    prereqIds: [1],
    unlocked,
    status: 'hostile',
    correctCount: 3,
    questionCount: 6,
    completionPct: 0.5,
  };
}

/** The hover text of a planet, read from its text node. */
function hoverText(component: PlanetComponent): unknown {
  return component
    .getGroup()
    .find((node: Konva.Node) => typeof node.getAttr('text') === 'string')[0]
    ?.getAttr('text');
}

describe('PlanetComponent locking', () => {
  it('calls onClick when an unlocked planet is clicked', () => {
    const onClick = vi.fn();
    const component = new PlanetComponent(planet(true), onClick);

    component.getGroup().fire('click');

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores clicks on a locked planet', () => {
    const onClick = vi.fn();
    const component = new PlanetComponent(planet(false), onClick);

    component.getGroup().fire('click');

    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows progress on hover for an unlocked planet', () => {
    expect(hoverText(new PlanetComponent(planet(true), vi.fn()))).toBe(
      'Quadratic Quay\nProgress: 50%',
    );
  });

  it('shows "Locked" on hover for a locked planet', () => {
    expect(hoverText(new PlanetComponent(planet(false), vi.fn()))).toBe(
      'Quadratic Quay\nLocked',
    );
  });
});
