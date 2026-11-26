import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {
  AsteroidIntroView,
  INTRO_RULES_TEXT,
  INTRO_TITLE_TEXT,
} from '../../src/Asteroids/views/AsteroidIntroView';
import {
  INTRO_RULES_X,
  INTRO_RULES_Y,
  INTRO_TITLE_X,
  INTRO_TITLE_Y,
  LAUNCH_BUTTON_X,
  LAUNCH_BUTTON_Y,
} from '../../src/Asteroids/constants';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();

/** The top-level component on a screen whose text box shows the given text. */
function findComponent(screen: Konva.Group, text: string): Konva.Group {
  const component = screen
    .getChildren()
    .find(
      (child): child is Konva.Group =>
        child instanceof Konva.Group &&
        child.findOne((node: Konva.Node) => node.getAttr('text') === text) !==
          undefined,
    );
  if (!component) {
    throw new Error(`No component showing "${text}"`);
  }
  return component;
}

describe('AsteroidIntroView', () => {
  it('shows the title, the rules and a Launch button in place', () => {
    const screen = new AsteroidIntroView(() => {}).getGroup();

    const title = findComponent(screen, INTRO_TITLE_TEXT);
    const rules = findComponent(screen, INTRO_RULES_TEXT);
    const launch = findComponent(screen, 'Launch');

    expect([title.x(), title.y()]).toEqual([INTRO_TITLE_X, INTRO_TITLE_Y]);
    expect([rules.x(), rules.y()]).toEqual([INTRO_RULES_X, INTRO_RULES_Y]);
    expect([launch.x(), launch.y()]).toEqual([
      LAUNCH_BUTTON_X,
      LAUNCH_BUTTON_Y,
    ]);
  });

  it('calls onLaunch once when Launch is clicked, and not before', () => {
    const onLaunch = vi.fn();
    const screen = new AsteroidIntroView(onLaunch).getGroup();
    expect(onLaunch).not.toHaveBeenCalled();

    findComponent(screen, 'Launch').fire('click');
    expect(onLaunch).toHaveBeenCalledOnce();
  });
});
