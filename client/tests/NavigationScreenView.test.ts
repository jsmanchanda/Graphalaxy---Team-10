import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import type {PlanetSummary} from '@graphalaxy/shared';
import {installKonvaStubs} from './helpers/konvaStubs';
import {
  NavigationScreenView,
  PlanetComponent,
} from '../src/UI/screens/NavigationScreenView';
import type {UiAction} from '../src/UI/types';
import {GAME_INSTRUCTIONS} from '../src/UI/instructions';
import {
  NAV_ALIEN_WIDTH,
  NAV_ALIEN_X,
  NAV_ALIEN_Y,
  NAV_HELP_BUBBLE_HEIGHT,
  NAV_HELP_BUBBLE_WIDTH,
  NAV_HELP_BUBBLE_X,
  NAV_HELP_BUBBLE_Y,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
} from '../src/UI/constants';

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

describe('NavigationScreenView alien help', () => {
  /** Builds an empty map and returns it with its action callback. */
  function build() {
    const onAction = vi.fn<(action: UiAction) => void>();
    const view = new NavigationScreenView(onAction, {
      type: 'navigation',
      planets: [],
      overallStatus: 0,
    });
    const screen = view.getGroup();
    const alien = screen.findOne('.navAlien');
    const help = screen.findOne('.navHelpDialogue');
    if (!alien || !help) throw new Error('alien or help bubble missing');
    return {view, onAction, screen, alien, help};
  }

  /** The text the help bubble shows. */
  function helpText(help: Konva.Node): string {
    const text = (help as Konva.Group).find(
      (node: Konva.Node) => typeof node.getAttr('text') === 'string',
    )[0];
    return String(text?.getAttr('text'));
  }

  it('starts with the help bubble closed', () => {
    const {view, help} = build();

    expect(view.isHelpOpen()).toBe(false);
    expect(help.visible()).toBe(false);
  });

  it('opens the instructions when the alien is clicked, and closes them on a second click', () => {
    const {view, alien, help, onAction} = build();

    alien.fire('click');
    expect(view.isHelpOpen()).toBe(true);
    for (const step of GAME_INSTRUCTIONS) {
      expect(helpText(help)).toContain(step);
    }

    alien.fire('click');
    expect(view.isHelpOpen()).toBe(false);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('closes the instructions when the bubble itself is clicked', () => {
    const {view, alien, help} = build();
    alien.fire('click');

    help.fire('click');

    expect(view.isHelpOpen()).toBe(false);
  });

  it('draws the bubble inside the screen, above the alien and on top of the map', () => {
    const {screen, help} = build();

    expect(help.x()).toBe(NAV_HELP_BUBBLE_X);
    expect(help.y()).toBe(NAV_HELP_BUBBLE_Y);
    expect(NAV_HELP_BUBBLE_X).toBeGreaterThanOrEqual(0);
    expect(NAV_HELP_BUBBLE_Y).toBeGreaterThanOrEqual(0);
    expect(NAV_HELP_BUBBLE_X + NAV_HELP_BUBBLE_WIDTH).toBeLessThanOrEqual(
      DESIGN_WIDTH,
    );
    expect(NAV_HELP_BUBBLE_Y + NAV_HELP_BUBBLE_HEIGHT).toBeLessThanOrEqual(
      NAV_ALIEN_Y,
    );
    // The tail's tip, at the bottom-right corner, is over the alien
    const tipX = NAV_HELP_BUBBLE_X + NAV_HELP_BUBBLE_WIDTH;
    expect(tipX).toBeGreaterThanOrEqual(NAV_ALIEN_X);
    expect(tipX).toBeLessThanOrEqual(NAV_ALIEN_X + NAV_ALIEN_WIDTH);
    expect(NAV_ALIEN_Y + NAV_ALIEN_WIDTH).toBeLessThanOrEqual(DESIGN_HEIGHT);
    const children = screen.getChildren();
    expect(children[children.length - 1]).toBe(help);
  });

  it('opens the settings when the settings icon is clicked', () => {
    const {screen, onAction} = build();

    screen.findOne('.settingsIcon')?.fire('click');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'openSettings'});
  });
});
