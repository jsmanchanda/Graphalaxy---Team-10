import {beforeEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import type {UiAction} from '../src/UI/types';
import {
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  DEFAULT_PLANET_ID,
  MINI_GAME_BUTTON_HEIGHT,
  MINI_GAME_BUTTON_WIDTH,
  MINI_GAME_BUTTON_Y,
  MINIGAME_SKIP_X,
  MINIGAME_START_X,
  DESIGN_HEIGHT,
  DESIGN_WIDTH,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
  OK_BUTTON_X,
  REDO_BUTTON_HEIGHT,
  REDO_BUTTON_WIDTH,
  REDO_BUTTON_X,
  REDO_BUTTON_Y,
  RETRY_WARNING_BUTTON_HEIGHT,
  RETRY_WARNING_BUTTON_WIDTH,
  RETRY_WARNING_BUTTON_Y,
  RETRY_WARNING_CANCEL_X,
  RETRY_WARNING_CONFIRM_X,
  RETRY_WARNING_TEXT_HEIGHT,
  RETRY_WARNING_TEXT_WIDTH,
  RETRY_WARNING_TEXT_X,
  RETRY_WARNING_TEXT_Y,
  SETTINGS_BUTTON_HEIGHT,
  SETTINGS_BUTTON_WIDTH,
  SETTINGS_BUTTON_X,
  SETTINGS_BUTTON_Y,
  SETTINGS_LABEL_WIDTH,
  SETTINGS_LABEL_X,
  SETTINGS_LOGOUT_BUTTON_HEIGHT,
  SETTINGS_LOGOUT_BUTTON_WIDTH,
  SETTINGS_LOGOUT_BUTTON_X,
  SETTINGS_LOGOUT_BUTTON_Y,
  SETTINGS_MESSAGE_HEIGHT,
  SETTINGS_MESSAGE_WIDTH,
  SETTINGS_MESSAGE_X,
  SETTINGS_MESSAGE_Y,
  SETTINGS_MINUS_X,
  SETTINGS_MUSIC_ROW_Y,
  SETTINGS_PLUS_X,
  SETTINGS_ROW_HEIGHT,
  SETTINGS_SFX_ROW_Y,
  SETTINGS_STEP_BUTTON_WIDTH,
  SETTINGS_TITLE_HEIGHT,
  SETTINGS_TITLE_WIDTH,
  SETTINGS_TITLE_X,
  SETTINGS_TITLE_Y,
  SETTINGS_VALUE_WIDTH,
  SETTINGS_VALUE_X,
  START_BUTTON_HEIGHT,
  START_BUTTON_Y,
  SETTINGS_ICON_IMAGE,
  SETTINGS_ICON_SIZE,
  SETTINGS_ICON_X,
  SETTINGS_ICON_Y,
} from '../src/UI/constants';

// Every component the screen under test builds, in build order.
const made = vi.hoisted(() => ({
  boxes: [] as Array<{text: string}>,
  buttons: [] as Array<{text: string; click: () => void}>,
  images: [] as string[],
  dialogues: [] as string[],
  // Click handlers of the settings icons on screen
  settingsIcons: [] as Array<() => void>,
}));

// Replace the components so no canvas is needed: Konva.Text measures itself
// with one. The fakes record their text and click handler instead.
vi.mock('../src/UI/components', () => {
  class TextBoxComponent {
    private group: Konva.Group;
    private box: {text: string};

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      this.box = {text};
      made.boxes.push(this.box);
    }

    getGroup(): Konva.Group {
      return this.group;
    }

    setText(text: string): this {
      this.box.text = text;
      return this;
    }

    setFontFamily(): this {
      return this;
    }

    setFontSize(): this {
      return this;
    }
  }

  class ButtonComponent {
    private group: Konva.Group;

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      onClick: () => void,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      made.buttons.push({text, click: onClick});
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  class ImageComponent {
    private group: Konva.Group;

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      url: string,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      made.images.push(url);
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  class AlienDialogue {
    private group: Konva.Group;

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
    ) {
      this.group = new Konva.Group({x, y, width, height});
      made.dialogues.push(text);
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  // Records its image like ImageComponent, and its click handler.
  class SettingsIconComponent extends ImageComponent {
    constructor(onClick: () => void) {
      // Same as SETTINGS_ICON_IMAGE; the factory runs before imports
      super(750, 0, 50, 50, '/assets/setting-symbol.png');
      made.settingsIcons.push(onClick);
    }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    AlienDialogue,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ButtonComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ImageComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    SettingsIconComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextBoxComponent,
  };
});

import {MiniGameSelectView} from '../src/UI/screens/MiniGameSelectView';
import {LessonIntroScreenView} from '../src/UI/screens/LessonIntroScreenView';
import {QuestionResultScreenView} from '../src/UI/screens/QuestionResultView';
import {LessonResultScreenView} from '../src/UI/screens/LessonResultScreenView';
import {RetryWarningScreenView} from '../src/UI/screens/RetryWarningScreenView';
import {
  formatVolume,
  SettingsScreenView,
  stepVolume,
} from '../src/UI/screens/SettingsScreenView';
import {TitleScreenView} from '../src/UI/screens/TitleScreenView';

/** The texts of the text boxes on screen, in build order. */
const texts = () => made.boxes.map(box => box.text);

/** Clicks the nth button (0 by default) with the given text. */
function press(text: string, nth = 0): void {
  const button = made.buttons.filter(b => b.text === text)[nth];
  if (!button) throw new Error(`no "${text}" button #${nth} on screen`);
  button.click();
}

// Ensures that the component fits within the design dimensions
function checkBounds(x: number, y: number, width: number, height: number) {
  expect(x).toBeGreaterThanOrEqual(0);
  expect(y).toBeGreaterThanOrEqual(0);
  expect(x + width).toBeLessThanOrEqual(DESIGN_WIDTH);
  expect(y + height).toBeLessThanOrEqual(DESIGN_HEIGHT);
}

beforeEach(() => {
  made.boxes.length = 0;
  made.buttons.length = 0;
  made.images.length = 0;
  made.dialogues.length = 0;
  made.settingsIcons.length = 0;
});

describe('LessonIntroScreenView', () => {
  const model = {
    type: 'intro' as const,
    title: 'Linear Land',
    description: 'A world of lines',
  };

  it('welcomes the player in the alien dialogue and shows the description', () => {
    const view = new LessonIntroScreenView(vi.fn(), model);

    expect(made.dialogues).toEqual(['Welcome to Linear Land!']);
    expect(texts()).toEqual(['A world of lines']);
    expect(made.buttons.map(b => b.text)).toEqual(['Next', 'back']);
    // background, alien, border, settings, dialogue, description, Next, back
    expect(view.getGroup().getChildren()).toHaveLength(8);
  });

  it.each([1, 2, 3, 4])(
    'draws the intro background and alien for planet %i',
    id => {
      new LessonIntroScreenView(vi.fn(), {...model, planetId: id});

      expect(made.images).toEqual([
        `/assets/planet-intro-background-${id}.jpg`,
        '/assets/general-nav.png',
        `/assets/alien-planet-${id}.png`,
        SETTINGS_ICON_IMAGE,
      ]);
    },
  );

  it('falls back to the default planet when none is given', () => {
    new LessonIntroScreenView(vi.fn(), model);

    expect(made.images).toEqual(
      expect.arrayContaining([
        `/assets/planet-intro-background-${DEFAULT_PLANET_ID}.jpg`,
        `/assets/alien-planet-${DEFAULT_PLANET_ID}.png`,
      ]),
    );
  });

  it('moves on when Next is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new LessonIntroScreenView(onAction, model);

    press('Next');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'next'});
  });

  it('goes back when back is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new LessonIntroScreenView(onAction, model);

    press('back');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'back'});
  });
});

describe('MiniGameSelectView', () => {
  it.each([
    {
      minigame: 'Asteroid' as const,
      intro: 'You are now approaching an asteroid belt!',
      play: 'Go through',
      skip: 'Go around',
    },
    {
      minigame: 'Radio' as const,
      intro: 'Your ship has lost signal!',
      play: 'Configure Radio',
      skip: 'Skip',
    },
  ])('offers the $minigame minigame', ({minigame, intro, play, skip}) => {
    const view = new MiniGameSelectView(vi.fn(), {
      type: 'miniGameSelect',
      minigame,
    });

    expect(made.dialogues).toHaveLength(1);
    expect(made.dialogues[0].startsWith(intro)).toBe(true);
    expect(made.buttons.map(b => b.text)).toEqual([play, skip]);
    // alien, border, settings, dialogue, play, skip
    expect(view.getGroup().getChildren()).toHaveLength(6);
  });

  it.each([
    {minigame: 'Asteroid' as const, play: 'Go through'},
    {minigame: 'Radio' as const, play: 'Configure Radio'},
  ])(
    'starts the $minigame minigame when $play is pressed',
    ({minigame, play}) => {
      const onAction = vi.fn<(action: UiAction) => void>();
      new MiniGameSelectView(onAction, {type: 'miniGameSelect', minigame});

      press(play);

      expect(onAction).toHaveBeenCalledExactlyOnceWith({
        type: 'startMiniGame',
        name: minigame,
      });
    },
  );

  it.each([
    {minigame: 'Asteroid' as const, skip: 'Go around'},
    {minigame: 'Radio' as const, skip: 'Skip'},
  ])('goes to the lesson when $skip is pressed', ({minigame, skip}) => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new MiniGameSelectView(onAction, {type: 'miniGameSelect', minigame});

    press(skip);

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'enterPlanet'});
  });

  it('draws the alien inside the frame', () => {
    new MiniGameSelectView(vi.fn(), {
      type: 'miniGameSelect',
      minigame: 'Asteroid',
    });

    expect(made.images).toEqual([
      '/assets/general-nav.png',
      '/assets/alien-planet-2.png',
      SETTINGS_ICON_IMAGE,
    ]);
  });
});

describe('QuestionResultScreenView', () => {
  it.each([
    {result: true, says: 'Correct!'},
    {result: false, says: 'Incorrect, nice try'},
  ])('says "$says" when the answer was $result', ({result, says}) => {
    const view = new QuestionResultScreenView(vi.fn(), {
      type: 'questionResult',
      result,
    });

    expect(made.dialogues).toEqual([says]);
    expect(texts()).toEqual([]);
    expect(made.buttons.map(b => b.text)).toEqual(['Ok']);
    // background, alien, border, settings, dialogue, Ok
    expect(view.getGroup().getChildren()).toHaveLength(6);
  });

  it.each([1, 2, 3, 4])('draws the background and alien for planet %i', id => {
    new QuestionResultScreenView(vi.fn(), {
      type: 'questionResult',
      result: true,
      planetId: id,
    });

    expect(made.images).toEqual([
      '/assets/general-nav.png',
      `/assets/planet-background-${id}.jpg`,
      `/assets/alien-planet-${id}.png`,
      SETTINGS_ICON_IMAGE,
    ]);
  });

  it('falls back to the default planet when none is given', () => {
    new QuestionResultScreenView(vi.fn(), {
      type: 'questionResult',
      result: true,
    });

    expect(made.images).toEqual(
      expect.arrayContaining([
        `/assets/planet-background-${DEFAULT_PLANET_ID}.jpg`,
        `/assets/alien-planet-${DEFAULT_PLANET_ID}.png`,
      ]),
    );
  });

  it('moves on when Ok is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new QuestionResultScreenView(onAction, {
      type: 'questionResult',
      result: false,
    });

    press('Ok');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'next'});
  });
});

describe('LessonResultScreenView', () => {
  const model = {type: 'lessonResult' as const, result: '5 of 5 correct'};

  it('shows the result with Ok and Redo Planet buttons', () => {
    const view = new LessonResultScreenView(vi.fn(), model);

    expect(texts()).toEqual(['5 of 5 correct']);
    expect(made.dialogues).toEqual(['You reached the end of the Lesson!']);
    expect(made.buttons.map(b => b.text)).toEqual(['Ok', 'Redo Planet']);
    // background, alien, border, settings, dialogue, Ok, Redo Planet, result
    expect(view.getGroup().getChildren()).toHaveLength(8);
  });

  it.each([1, 2, 3, 4])('draws the background and alien for planet %i', id => {
    new LessonResultScreenView(vi.fn(), {...model, planetId: id});

    expect(made.images).toEqual([
      `/assets/alien-planet-${id}.png`,
      `/assets/planet-background-${id}.jpg`,
      '/assets/general-nav.png',
      SETTINGS_ICON_IMAGE,
    ]);
  });

  it('falls back to the default planet when none is given', () => {
    new LessonResultScreenView(vi.fn(), model);

    expect(made.images).toEqual(
      expect.arrayContaining([
        `/assets/alien-planet-${DEFAULT_PLANET_ID}.png`,
        `/assets/planet-background-${DEFAULT_PLANET_ID}.jpg`,
      ]),
    );
  });

  it('asks to redo the planet when Redo Planet is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new LessonResultScreenView(onAction, model);

    press('Redo Planet');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'retryLesson'});
  });

  it('moves on when Ok is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new LessonResultScreenView(onAction, model);

    press('Ok');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'next'});
  });
});

describe('RetryWarningScreenView', () => {
  const model = {
    type: 'retryWarning' as const,
    message: 'Your progress will be reset.',
  };

  it('shows the warning with Cancel and Confirm buttons', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    const view = new RetryWarningScreenView(onAction, model);

    expect(texts()).toEqual(['Your progress will be reset.']);
    expect(made.buttons.map(b => b.text)).toEqual(['Cancel', 'Confirm']);
    expect(view.getGroup().getChildren()).toHaveLength(3);
    expect(onAction).not.toHaveBeenCalled();
  });

  it('confirms the redo when Confirm is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new RetryWarningScreenView(onAction, model);

    press('Confirm');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'confirmRetry'});
  });

  it('cancels the redo when Cancel is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new RetryWarningScreenView(onAction, model);

    press('Cancel');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'cancelRetry'});
  });
});

describe('TitleScreenView', () => {
  it('opens the settings when Settings is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new TitleScreenView(onAction, {type: 'title', title: 'Graphalaxy'});

    press('Settings');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'openSettings'});
  });

  it('still starts the game when Start is pressed', () => {
    const onAction = vi.fn<(action: UiAction) => void>();
    new TitleScreenView(onAction, {type: 'title', title: 'Graphalaxy'});

    press('Start');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'start'});
  });
});

describe('SettingsScreenView', () => {
  const settings = {musicVolume: 0.5, sfxVolume: 0.3};
  const MUSIC = 0; // the first minus and plus buttons belong to the music row
  const SFX = 1;

  /** Builds the screen and returns the action callback it reports to. */
  function build(message?: string) {
    const onAction = vi.fn<(action: UiAction) => void>();
    new SettingsScreenView(onAction, {type: 'settings', settings, message});
    return onAction;
  }

  it("shows the player's volumes as percentages", () => {
    build();
    expect(texts()).toEqual([
      'Settings',
      'Music Volume',
      '50%',
      'SFX Volume',
      '30%',
    ]);
  });

  it('turns each volume up and down in steps of 10%', () => {
    build();

    press('+', MUSIC);
    press('+', MUSIC);
    press('-', SFX);

    expect(texts()).toEqual([
      'Settings',
      'Music Volume',
      '70%',
      'SFX Volume',
      '20%',
    ]);
  });

  it('reports the edited volumes when Save is pressed', () => {
    const onAction = build();

    press('+', MUSIC);
    press('-', SFX);
    press('-', SFX);
    expect(onAction).not.toHaveBeenCalled();
    press('Save');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'saveSettings',
      settings: {musicVolume: 0.6, sfxVolume: 0.1},
    });
  });

  it('reports the volumes unchanged when nothing was edited', () => {
    const onAction = build();

    press('Save');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({
      type: 'saveSettings',
      settings,
    });
  });

  it('stops at 0% and 100%', () => {
    const onAction = build();

    for (let i = 0; i < 8; i++) press('+', MUSIC);
    for (let i = 0; i < 8; i++) press('-', SFX);
    press('Save');

    expect(texts()).toContain('100%');
    expect(texts()).toContain('0%');
    expect(onAction).toHaveBeenCalledWith({
      type: 'saveSettings',
      settings: {musicVolume: 1, sfxVolume: 0},
    });
  });

  it('does not change the settings it was given', () => {
    build();

    press('+', MUSIC);
    press('-', SFX);

    expect(settings).toEqual({musicVolume: 0.5, sfxVolume: 0.3});
  });

  it('goes back without saving when Back is pressed', () => {
    const onAction = build();

    press('+', MUSIC);
    press('Back');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'back'});
  });

  it('logs out without saving when Log Out is pressed', () => {
    const onAction = build();

    press('+', MUSIC);
    press('Log Out');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'logout'});
  });

  it('shows the outcome of the last save when there is one', () => {
    build('Settings saved.');
    expect(texts()).toContain('Settings saved.');
  });
});

describe('volume helpers', () => {
  it('steps a volume by 10% without drifting', () => {
    let volume = 0;
    const seen: number[] = [];
    for (let i = 0; i < 10; i++) {
      volume = stepVolume(volume, 1);
      seen.push(volume);
    }
    expect(seen).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]);
    expect(stepVolume(0.55, -1)).toBe(0.45);
  });

  it('keeps a volume between 0 and 1', () => {
    expect(stepVolume(1, 1)).toBe(1);
    expect(stepVolume(0.95, 1)).toBe(1);
    expect(stepVolume(0, -1)).toBe(0);
    expect(stepVolume(0.05, -1)).toBe(0);
  });

  it('formats a volume as a whole percentage', () => {
    expect(formatVolume(0)).toBe('0%');
    expect(formatVolume(0.3)).toBe('30%');
    expect(formatVolume(0.555)).toBe('56%');
    expect(formatVolume(1)).toBe('100%');
  });
});

describe('minigame select screen bounds', () => {
  it('keeps both buttons inside the screen, skip left of play', () => {
    for (const x of [MINIGAME_SKIP_X, MINIGAME_START_X]) {
      checkBounds(
        x,
        MINI_GAME_BUTTON_Y,
        MINI_GAME_BUTTON_WIDTH,
        MINI_GAME_BUTTON_HEIGHT,
      );
    }
    expect(MINIGAME_START_X).toBeGreaterThanOrEqual(
      MINIGAME_SKIP_X + MINI_GAME_BUTTON_WIDTH,
    );
  });
});

describe('settings icon', () => {
  it('sits in the top-right corner, inside the screen', () => {
    checkBounds(
      SETTINGS_ICON_X,
      SETTINGS_ICON_Y,
      SETTINGS_ICON_SIZE,
      SETTINGS_ICON_SIZE,
    );
    expect(SETTINGS_ICON_X + SETTINGS_ICON_SIZE).toBe(DESIGN_WIDTH);
    expect(SETTINGS_ICON_Y).toBe(0);
  });

  it.each([
    [
      'lesson intro',
      () =>
        new LessonIntroScreenView(vi.fn(), {
          type: 'intro',
          title: 't',
          description: 'd',
        }),
    ],
    [
      'minigame select',
      () =>
        new MiniGameSelectView(vi.fn(), {
          type: 'miniGameSelect',
          minigame: 'Asteroid',
        }),
    ],
    [
      'question result',
      () =>
        new QuestionResultScreenView(vi.fn(), {
          type: 'questionResult',
          result: true,
        }),
    ],
    [
      'lesson result',
      () =>
        new LessonResultScreenView(vi.fn(), {
          type: 'lessonResult',
          result: 'r',
        }),
    ],
  ])('is drawn once on the %s screen', (name, build) => {
    build();
    expect(
      made.images.filter(url => url === SETTINGS_ICON_IMAGE),
      name,
    ).toHaveLength(1);
  });

  it.each<[string, (onAction: (action: UiAction) => void) => unknown]>([
    [
      'lesson intro',
      onAction =>
        new LessonIntroScreenView(onAction, {
          type: 'intro',
          title: 't',
          description: 'd',
        }),
    ],
    [
      'minigame select',
      onAction =>
        new MiniGameSelectView(onAction, {
          type: 'miniGameSelect',
          minigame: 'Asteroid',
        }),
    ],
    [
      'question result',
      onAction =>
        new QuestionResultScreenView(onAction, {
          type: 'questionResult',
          result: true,
        }),
    ],
    [
      'lesson result',
      onAction =>
        new LessonResultScreenView(onAction, {
          type: 'lessonResult',
          result: 'r',
        }),
    ],
  ])('opens the settings when clicked on the %s screen', (name, build) => {
    const onAction = vi.fn<(action: UiAction) => void>();
    build(onAction);

    expect(made.settingsIcons, name).toHaveLength(1);
    made.settingsIcons[0]();

    expect(onAction, name).toHaveBeenCalledExactlyOnceWith({
      type: 'openSettings',
    });
  });
});

describe('redo and settings screen bounds', () => {
  it('keeps the Redo button inside the screen, left of the Ok button', () => {
    checkBounds(
      REDO_BUTTON_X,
      REDO_BUTTON_Y,
      REDO_BUTTON_WIDTH,
      REDO_BUTTON_HEIGHT,
    );
    expect(OK_BUTTON_X).toBeGreaterThanOrEqual(
      REDO_BUTTON_X + REDO_BUTTON_WIDTH,
    );
  });

  it('keeps the retry warning components inside the screen, without overlap', () => {
    checkBounds(
      RETRY_WARNING_TEXT_X,
      RETRY_WARNING_TEXT_Y,
      RETRY_WARNING_TEXT_WIDTH,
      RETRY_WARNING_TEXT_HEIGHT,
    );
    for (const x of [RETRY_WARNING_CANCEL_X, RETRY_WARNING_CONFIRM_X]) {
      checkBounds(
        x,
        RETRY_WARNING_BUTTON_Y,
        RETRY_WARNING_BUTTON_WIDTH,
        RETRY_WARNING_BUTTON_HEIGHT,
      );
    }
    expect(RETRY_WARNING_BUTTON_Y).toBeGreaterThanOrEqual(
      RETRY_WARNING_TEXT_Y + RETRY_WARNING_TEXT_HEIGHT,
    );
    expect(RETRY_WARNING_CONFIRM_X).toBeGreaterThanOrEqual(
      RETRY_WARNING_CANCEL_X + RETRY_WARNING_BUTTON_WIDTH,
    );
  });

  it('keeps the Settings button inside the title screen, below Start', () => {
    checkBounds(
      SETTINGS_BUTTON_X,
      SETTINGS_BUTTON_Y,
      SETTINGS_BUTTON_WIDTH,
      SETTINGS_BUTTON_HEIGHT,
    );
    expect(SETTINGS_BUTTON_Y).toBeGreaterThanOrEqual(
      START_BUTTON_Y + START_BUTTON_HEIGHT,
    );
  });

  it('keeps the Log Out button inside the settings screen, between Back and Save', () => {
    checkBounds(
      SETTINGS_LOGOUT_BUTTON_X,
      SETTINGS_LOGOUT_BUTTON_Y,
      SETTINGS_LOGOUT_BUTTON_WIDTH,
      SETTINGS_LOGOUT_BUTTON_HEIGHT,
    );
    expect(SETTINGS_LOGOUT_BUTTON_X).toBeGreaterThanOrEqual(
      BACK_BUTTON_X + BACK_BUTTON_WIDTH,
    );
    expect(
      SETTINGS_LOGOUT_BUTTON_X + SETTINGS_LOGOUT_BUTTON_WIDTH,
    ).toBeLessThanOrEqual(NEXT_BUTTON_X);
    expect(SETTINGS_LOGOUT_BUTTON_Y).toBeGreaterThanOrEqual(
      SETTINGS_MESSAGE_Y + SETTINGS_MESSAGE_HEIGHT,
    );
  });

  it('keeps the settings screen components inside the screen, in order', () => {
    checkBounds(
      SETTINGS_TITLE_X,
      SETTINGS_TITLE_Y,
      SETTINGS_TITLE_WIDTH,
      SETTINGS_TITLE_HEIGHT,
    );
    for (const y of [SETTINGS_MUSIC_ROW_Y, SETTINGS_SFX_ROW_Y]) {
      checkBounds(
        SETTINGS_LABEL_X,
        y,
        SETTINGS_LABEL_WIDTH,
        SETTINGS_ROW_HEIGHT,
      );
      checkBounds(
        SETTINGS_MINUS_X,
        y,
        SETTINGS_STEP_BUTTON_WIDTH,
        SETTINGS_ROW_HEIGHT,
      );
      checkBounds(
        SETTINGS_VALUE_X,
        y,
        SETTINGS_VALUE_WIDTH,
        SETTINGS_ROW_HEIGHT,
      );
      checkBounds(
        SETTINGS_PLUS_X,
        y,
        SETTINGS_STEP_BUTTON_WIDTH,
        SETTINGS_ROW_HEIGHT,
      );
    }
    checkBounds(
      SETTINGS_MESSAGE_X,
      SETTINGS_MESSAGE_Y,
      SETTINGS_MESSAGE_WIDTH,
      SETTINGS_MESSAGE_HEIGHT,
    );
    checkBounds(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
    );
    checkBounds(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
    );

    // Left to right within a row, and top to bottom down the screen.
    expect(SETTINGS_MINUS_X).toBeGreaterThanOrEqual(
      SETTINGS_LABEL_X + SETTINGS_LABEL_WIDTH,
    );
    expect(SETTINGS_VALUE_X).toBeGreaterThanOrEqual(
      SETTINGS_MINUS_X + SETTINGS_STEP_BUTTON_WIDTH,
    );
    expect(SETTINGS_PLUS_X).toBeGreaterThanOrEqual(
      SETTINGS_VALUE_X + SETTINGS_VALUE_WIDTH,
    );
    expect(SETTINGS_MUSIC_ROW_Y).toBeGreaterThanOrEqual(
      SETTINGS_TITLE_Y + SETTINGS_TITLE_HEIGHT,
    );
    expect(SETTINGS_SFX_ROW_Y).toBeGreaterThanOrEqual(
      SETTINGS_MUSIC_ROW_Y + SETTINGS_ROW_HEIGHT,
    );
    expect(SETTINGS_MESSAGE_Y).toBeGreaterThanOrEqual(
      SETTINGS_SFX_ROW_Y + SETTINGS_ROW_HEIGHT,
    );
    expect(BACK_BUTTON_Y).toBeGreaterThanOrEqual(
      SETTINGS_MESSAGE_Y + SETTINGS_MESSAGE_HEIGHT,
    );
  });
});
