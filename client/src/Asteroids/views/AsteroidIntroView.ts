import Konva from 'konva';
import {
  AlienDialogue,
  ButtonComponent,
  ImageComponent,
  TextBoxComponent,
} from '../../UI/components';
import {
  ALIEN_FRIEND_WIDTH,
  ALIEN_FRIEND_X,
  ALIEN_FRIEND_Y,
  DEFAULT_ALIEN_IMAGE,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
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
  LAUNCH_BUTTON_HEIGHT,
  LAUNCH_BUTTON_WIDTH,
  LAUNCH_BUTTON_X,
  LAUNCH_BUTTON_Y,
  PANEL_FRAME_IMAGE,
} from '../constants';

/** The intro's title, said by the alien in its speech bubble. */
export const INTRO_TITLE_TEXT = 'Welcome to Asteroid Defense!';
/** The intro's rules; wrapped to fit the rules box. */
export const INTRO_RULES_TEXT =
  'Asteroids are headed straight for your ship! Fill in the equation so ' +
  'its curve passes through every asteroid. You get one shot per ' +
  'question. Clear all 3 questions to earn a hint.';
// Slightly smaller than the default 20 so the rules have room to breathe.
const RULES_FONT_SIZE = 18;

/**
 * The asteroid minigame's first screen, laid out like the lesson intro: the
 * alien says the title, the rules sit below and Launch is centered at the bottom.
 */
export class AsteroidIntroView implements View {
  private readonly group: Konva.Group;

  /**
   * Builds the intro screen.
   * @param onLaunch called when the player clicks Launch
   */
  constructor(onLaunch: () => void) {
    this.group = new Konva.Group();

    const alien = new ImageComponent(
      ALIEN_FRIEND_X,
      ALIEN_FRIEND_Y,
      ALIEN_FRIEND_WIDTH,
      ALIEN_FRIEND_WIDTH,
      DEFAULT_ALIEN_IMAGE,
    );

    const border = new ImageComponent(
      0,
      0,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      PANEL_FRAME_IMAGE,
    );

    const title = new AlienDialogue(
      INTRO_TITLE_X,
      INTRO_TITLE_Y,
      INTRO_TITLE_WIDTH,
      INTRO_TITLE_HEIGHT,
      INTRO_TITLE_TEXT,
    );

    const rules = new TextBoxComponent(
      INTRO_RULES_X,
      INTRO_RULES_Y,
      INTRO_RULES_WIDTH,
      INTRO_RULES_HEIGHT,
      INTRO_RULES_TEXT,
    ).setFontSize(RULES_FONT_SIZE);

    const launchButton = new ButtonComponent(
      LAUNCH_BUTTON_X,
      LAUNCH_BUTTON_Y,
      LAUNCH_BUTTON_WIDTH,
      LAUNCH_BUTTON_HEIGHT,
      'Launch',
      onLaunch,
    );

    // Back to front, like the lesson screens; AsteroidMiniGameView adds the
    // settings icon above all of this.
    this.group.add(
      alien.getGroup(),
      border.getGroup(),
      title.getGroup(),
      rules.getGroup(),
      launchButton.getGroup(),
    );
  }

  /**
   * Getter
   * @returns Konva group for view
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
