import Konva from 'konva';
import {ButtonComponent, TextBoxComponent} from '../../UI/components';
import {
  FONT_PLANET_KOSMOS,
  START_BUTTON_HEIGHT,
  START_BUTTON_WIDTH,
  START_BUTTON_X,
  START_BUTTON_Y,
} from '../../UI/constants';
import type {View} from '../../UI/types';
import {
  INTRO_RULES_HEIGHT,
  INTRO_RULES_WIDTH,
  INTRO_RULES_X,
  INTRO_RULES_Y,
  INTRO_TITLE_HEIGHT,
  INTRO_TITLE_WIDTH,
  INTRO_TITLE_X,
  INTRO_TITLE_Y,
} from '../constants';

/** The intro's title. */
export const INTRO_TITLE_TEXT = 'Asteroid Defense';
/** The intro's rules; wrapped to fit the rules box. */
export const INTRO_RULES_TEXT =
  'Asteroids are headed straight for your ship! Fill in the equation so ' +
  'its curve passes through every asteroid. You get one shot per ' +
  'question. Clear all 3 questions to earn a hint.';
// Slightly smaller than the default 20 so the rules have room to breathe.
const RULES_FONT_SIZE = 18;

/**
 * The asteroid minigame's first screen: a title, the rules and a Launch
 * button.
 */
export class AsteroidIntroView implements View {
  private readonly group: Konva.Group;

  /**
   * Builds the intro screen.
   * @param onLaunch called when the player clicks Launch
   */
  constructor(onLaunch: () => void) {
    this.group = new Konva.Group();

    const title = new TextBoxComponent(
      INTRO_TITLE_X,
      INTRO_TITLE_Y,
      INTRO_TITLE_WIDTH,
      INTRO_TITLE_HEIGHT,
      INTRO_TITLE_TEXT,
    ).setFontFamily(FONT_PLANET_KOSMOS);

    const rules = new TextBoxComponent(
      INTRO_RULES_X,
      INTRO_RULES_Y,
      INTRO_RULES_WIDTH,
      INTRO_RULES_HEIGHT,
      INTRO_RULES_TEXT,
    ).setFontSize(RULES_FONT_SIZE);

    const launchButton = new ButtonComponent(
      START_BUTTON_X,
      START_BUTTON_Y,
      START_BUTTON_WIDTH,
      START_BUTTON_HEIGHT,
      'Launch',
      onLaunch,
    );

    this.group.add(title.getGroup(), rules.getGroup(), launchButton.getGroup());
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
