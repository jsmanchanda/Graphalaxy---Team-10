import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {
  AnswerResult,
  HintUnlockResult,
  NextQuestion,
  Planet,
  PlanetSummary,
  Player,
  Question,
  Settings,
  UnlockedHint,
} from '@graphalaxy/shared';
import type {ServerGateway} from '../src/Frontend/ApiClient';
import {ApiError} from '../src/Frontend/ApiError';
import {SessionCache} from '../src/Frontend/SessionCache';
import {GameManager} from '../src/Frontend/GameManager';
import type {ScreenModel, UiAction} from '../src/UI/types';

// Replace the Konva-backed UiManager so no DOM is needed. The fake records
// the action callback GameManager hands it and every screen it is told to show.
const ui = vi.hoisted(() => ({
  displayScreen: vi.fn<(model: ScreenModel) => void>(),
  onAction: null as ((action: UiAction) => void) | null,
}));
vi.mock('../src/UI/UIManager', () => {
  class UiManager {
    displayScreen = ui.displayScreen;
    constructor(containerId: string, onAction: (action: UiAction) => void) {
      void containerId;
      ui.onAction = onAction;
    }
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention -- must match the real export name
  return {UiManager};
});

const PLAYER: Player = {
  userId: 7,
  name: 'demo',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.5},
};

/** The two questions on the planet. The first option of each is correct. */
const QUESTIONS: Question[] = [1, 2].map(questionId => ({
  questionId,
  prompt: `Question ${questionId}`,
  type: 'mcq' as const,
  options: [
    {optionId: questionId * 10 + 1, label: 'a', text: '2'},
    {optionId: questionId * 10 + 2, label: 'b', text: '3'},
  ],
}));

/** The hints on planet 1, in hint number order. */
const HINT_TEXTS = ['Hint one.', 'Hint two.'];

/** Builds a planet with one reading slide. Its questions are not part of it. */
function makePlanet(planetId = 1): Planet {
  return {
    planetId,
    name: 'Linear Land',
    introText: 'A hostile world of straight lines.',
    graphOrder: 0,
    tasks: [
      {type: 'Reading', text: 'A linear function has the form y = mx + b.'},
    ],
  };
}

/** The server's verdict on an answer. */
const verdict = (questionId: number, correct: boolean): AnswerResult => ({
  questionId,
  correct,
  correctOption: {optionId: questionId * 10 + 1, label: 'a', text: '2'},
});

/**
 * Builds a fake gateway that behaves like the server: it remembers which
 * questions were answered and which of those correctly (`answers`), serves the
 * first unanswered one, and reports the progress that follows from them.
 */
function fakeGateway() {
  // questionId -> whether the answer was correct
  const answers = new Map<number, boolean>();
  // Planet 1's hints, how many the player has unlocked, and their credits.
  const hints = {texts: HINT_TEXTS, unlocked: 0, quota: PLAYER.hintQuota};
  const unlockedHints = (): UnlockedHint[] =>
    hints.texts.slice(0, hints.unlocked).map((text, i) => ({
      hintId: i + 1,
      planetId: 1,
      hintNumber: i + 1,
      text,
    }));
  const progress = (): PlanetSummary => {
    const correctCount = [...answers.values()].filter(Boolean).length;
    return {
      planetId: 1,
      name: 'Linear Land',
      graphOrder: 0,
      prereqIds: [],
      unlocked: true,
      status: correctCount === QUESTIONS.length ? 'peaceful' : 'hostile',
      correctCount,
      questionCount: QUESTIONS.length,
      completionPct: correctCount / QUESTIONS.length,
    };
  };
  return {
    answers,
    progress,
    hints,
    login: vi.fn<ServerGateway['login']>().mockResolvedValue(PLAYER),
    getPlanets: vi
      .fn<ServerGateway['getPlanets']>()
      .mockImplementation(async () => [progress()]),
    getPlanet: vi
      .fn<ServerGateway['getPlanet']>()
      .mockImplementation(async id => makePlanet(id)),
    getNextQuestion: vi
      .fn<ServerGateway['getNextQuestion']>()
      .mockImplementation(async () => ({
        question: QUESTIONS.find(q => !answers.has(q.questionId)) ?? null,
        progress: progress(),
      })),
    resetPlanet: vi
      .fn<ServerGateway['resetPlanet']>()
      .mockImplementation(async () => {
        answers.clear();
        return progress();
      }),
    saveSettings: vi
      .fn<ServerGateway['saveSettings']>()
      .mockImplementation(async settings => ({...PLAYER, settings})),
    awardHintCredits: vi
      .fn<ServerGateway['awardHintCredits']>()
      .mockResolvedValue({hintQuota: 4}),
    getUnlockedHints: vi
      .fn<ServerGateway['getUnlockedHints']>()
      .mockImplementation(async () => unlockedHints()),
    unlockNextHint: vi
      .fn<ServerGateway['unlockNextHint']>()
      .mockImplementation(async () => {
        if (hints.unlocked === hints.texts.length) {
          return {hint: null, hintQuota: hints.quota};
        }
        if (hints.quota === 0) {
          throw new ApiError('http', 'No credits.', 409, 'NO_HINTS_LEFT');
        }
        hints.quota--;
        hints.unlocked++;
        return {
          hint: unlockedHints()[hints.unlocked - 1],
          hintQuota: hints.quota,
        };
      }),
    submitAnswer: vi
      .fn<ServerGateway['submitAnswer']>()
      .mockImplementation(async (questionId, optionId) => {
        const correct = optionId === questionId * 10 + 1;
        answers.set(questionId, correct);
        return verdict(questionId, correct);
      }),
  };
}

/** A promise whose settlement the test controls. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

/** Lets the promises GameManager fires with `void` settle. */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

const act = (action: UiAction) => ui.onAction?.(action);
const lastScreen = () => ui.displayScreen.mock.lastCall?.[0];

/** Presses a button that makes GameManager talk to the server, and waits. */
async function actAndWait(action: UiAction) {
  act(action);
  await flush();
}

const TITLE: ScreenModel = {type: 'title', title: 'Graphalaxy'};
/** The lesson intro, which shows the player's progress on the planet. */
const intro = (progress: string): ScreenModel => ({
  type: 'intro',
  title: 'Linear Land',
  description: `A hostile world of straight lines.\n\nCurrent progress: ${progress}`,
  planetId: 1,
});
const INTRO = intro('0 of 2 questions correct (0%)\n\nStatus: hostile');
const READING: ScreenModel = {
  type: 'reading',
  readingText: 'A linear function has the form y = mx + b.',
  planetId: 1,
};
const QUESTION_1: ScreenModel = {
  type: 'question',
  question: {prompt: 'Question 1', options: ['2', '3']},
  planetId: 1,
  hintsLeft: 3,
};
const QUESTION_2: ScreenModel = {
  type: 'question',
  question: {prompt: 'Question 2', options: ['2', '3']},
  planetId: 1,
  hintsLeft: 3,
};
const CORRECT: ScreenModel = {
  type: 'questionResult',
  result: true,
  planetId: 1,
};
const WRONG: ScreenModel = {
  type: 'questionResult',
  result: false,
  planetId: 1,
};
const LESSON_RESULT: ScreenModel = {
  type: 'lessonResult',
  result:
    'You answered 2 of 2 questions correctly.\n Linear Land is now peaceful!',
  planetId: 1,
};
const WARNING =
  'Redo Linear Land? Current progress: 2 of 2 questions correct (100%)\n\nStatus: peaceful.' +
  ' This resets all progress here. ' +
  'The planet turns hostile again and you answer every question from the start.';
const RETRY_WARNING: ScreenModel = {type: 'retryWarning', message: WARNING};
/** Matches any navigation map screen; its planet list is checked separately. */
const NAV = expect.objectContaining({type: 'navigation'});
const MINI_GAME_SELECT: ScreenModel = {
  type: 'miniGameSelect',
  minigame: 'Asteroid',
};
const RIGHT_OPTION = 0;
const WRONG_OPTION = 1;

/** The login screen, as it shows a username and a message. */
const loginScreen = (username: string, message?: string): ScreenModel =>
  message ? {type: 'login', username, message} : {type: 'login', username};

/** Creates a GameManager that is showing the login screen. */
function setupAtLogin(gateway = fakeGateway()) {
  const session = new SessionCache(gateway);
  const game = new GameManager(session);
  game.start();
  return {gateway, session, game};
}

/** Creates a GameManager, logs in, and clears the display history. */
async function setup(gateway = fakeGateway()) {
  const ctx = setupAtLogin(gateway);
  await actAndWait({type: 'login', username: PLAYER.name});
  ui.displayScreen.mockClear();
  return ctx;
}

/**
 * Opens the map, picks the demo planet, and skips the minigame, which leaves
 * the player on the planet's lesson intro.
 */
async function enterPlanet() {
  act({type: 'start'});
  act({type: 'selectPlanet', planetId: 1});
  await actAndWait({type: 'enterPlanet'});
}

/** Starts the lesson and moves forward to the first question. */
async function setupAtQuestion1() {
  const ctx = await setup();
  await enterPlanet();
  act({type: 'next'});
  await actAndWait({type: 'next'});
  ui.displayScreen.mockClear();
  return ctx;
}

/** Answers both questions correctly, ending on the lesson result. */
async function setupAtLessonResult() {
  const ctx = await setupAtQuestion1();
  for (let i = 0; i < QUESTIONS.length; i++) {
    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    await actAndWait({type: 'next'});
  }
  ui.displayScreen.mockClear();
  return ctx;
}

beforeEach(() => {
  ui.displayScreen.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GameManager login', () => {
  it('opens on an empty login screen without contacting the server', () => {
    const {gateway} = setupAtLogin();

    expect(lastScreen()).toEqual(loginScreen(''));
    expect(gateway.login).not.toHaveBeenCalled();
  });

  it('logs in under the typed username, which loads their settings and progress, and shows the title', async () => {
    const {gateway, session} = setupAtLogin();

    await actAndWait({type: 'login', username: '  amy  '});

    expect(gateway.login).toHaveBeenCalledExactlyOnceWith('amy');
    expect(gateway.getPlanets).toHaveBeenCalledTimes(1);
    expect(gateway.login.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.getPlanets.mock.invocationCallOrder[0],
    );
    expect(session.player?.settings).toEqual(PLAYER.settings);
    expect(session.progressFor(1)).toMatchObject({correctCount: 0});
    expect(lastScreen()).toEqual(TITLE);
  });

  it('loads no planet content until one is picked on the map', async () => {
    const {gateway} = setupAtLogin();

    await actAndWait({type: 'login', username: 'amy'});

    expect(gateway.getPlanet).not.toHaveBeenCalled();
  });

  it('shows that it is logging in while it waits for the server', async () => {
    const {gateway} = setupAtLogin();
    const pending = deferred<Player>();
    gateway.login.mockReturnValueOnce(pending.promise);

    act({type: 'login', username: 'amy'});
    expect(lastScreen()).toEqual(loginScreen('amy', 'Logging in...'));

    pending.resolve(PLAYER);
    await flush();
    expect(lastScreen()).toEqual(TITLE);
  });

  it.each(['', '   '])(
    'asks for a username when "%s" was typed, without contacting the server',
    async username => {
      const {gateway} = setupAtLogin();

      await actAndWait({type: 'login', username});

      expect(lastScreen()).toEqual(
        loginScreen('', 'Enter username to log in.'),
      );
      expect(gateway.login).not.toHaveBeenCalled();
    },
  );

  it.each(['network', 'timeout'] as const)(
    'stays on the login screen with the offline message on a %s error',
    async kind => {
      const gateway = fakeGateway();
      gateway.login.mockRejectedValue(new ApiError(kind, 'down'));
      setupAtLogin(gateway);

      await actAndWait({type: 'login', username: 'amy'});

      expect(lastScreen()).toEqual(
        loginScreen('amy', 'Server offline. Try again.'),
      );
    },
  );

  it('says the username cannot be used when the server refuses it', async () => {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValue(new ApiError('http', 'bad', 400));
    setupAtLogin(gateway);

    await actAndWait({type: 'login', username: 'amy'});

    expect(lastScreen()).toEqual(
      loginScreen('amy', "That username can't be used. Try another."),
    );
  });

  it('shows the generic failure message when the progress cannot be loaded', async () => {
    const gateway = fakeGateway();
    gateway.getPlanets.mockRejectedValue(new ApiError('http', 'boom', 500));
    setupAtLogin(gateway);

    await actAndWait({type: 'login', username: 'amy'});

    expect(gateway.getPlanet).not.toHaveBeenCalled();
    expect(lastScreen()).toEqual(
      loginScreen('amy', "Couldn't load the game. Try again."),
    );
  });

  it('logs in on another try after a failure', async () => {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValueOnce(new ApiError('network', 'down'));
    setupAtLogin(gateway);
    await actAndWait({type: 'login', username: 'amy'});

    await actAndWait({type: 'login', username: 'amy'});

    expect(gateway.login).toHaveBeenCalledTimes(2);
    expect(lastScreen()).toEqual(TITLE);
  });

  it('sends one login when it is submitted twice', async () => {
    const {gateway} = setupAtLogin();

    act({type: 'login', username: 'amy'});
    await actAndWait({type: 'login', username: 'amy'});

    expect(gateway.login).toHaveBeenCalledTimes(1);
    expect(lastScreen()).toEqual(TITLE);
  });

  it('ignores a login once the player is logged in', async () => {
    const {gateway} = await setup();
    gateway.login.mockClear();

    await actAndWait({type: 'login', username: 'bob'});

    expect(gateway.login).not.toHaveBeenCalled();
    expect(ui.displayScreen).not.toHaveBeenCalled();
  });

  /** Creates a GameManager back on the login screen after a failed login. */
  async function setupFailed() {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValueOnce(new ApiError('network', 'down'));
    setupAtLogin(gateway);
    await actAndWait({type: 'login', username: 'amy'});
    ui.displayScreen.mockClear();
    gateway.login.mockClear();
    return gateway;
  }

  it.each<UiAction>([
    {type: 'start'},
    {type: 'next'},
    {type: 'back'},
    {type: 'answer', option: 0},
    {type: 'retryLesson'},
    {type: 'confirmRetry'},
    {type: 'openSettings'},
    {type: 'saveSettings', settings: {musicVolume: 1, sfxVolume: 1}},
    {type: 'navigate'},
    {type: 'selectPlanet', planetId: 1},
    {type: 'enterPlanet'},
    {type: 'startMiniGame', name: 'Asteroid'},
    {type: 'endMiniGame', addHint: false},
  ])('ignores $type until the player is logged in', async action => {
    const gateway = await setupFailed();

    await actAndWait(action);

    expect(ui.displayScreen).not.toHaveBeenCalled();
    expect(gateway.login).not.toHaveBeenCalled();
    expect(gateway.submitAnswer).not.toHaveBeenCalled();
    expect(gateway.resetPlanet).not.toHaveBeenCalled();
    expect(gateway.saveSettings).not.toHaveBeenCalled();
  });
});

describe('GameManager navigation', () => {
  it('shows the navigation map on start, built from the loaded progress', async () => {
    const {gateway, session} = await setup();

    act({type: 'start'});

    expect(lastScreen()).toEqual({
      type: 'navigation',
      planets: session.planets,
      overallStatus: 0,
    });
    expect(gateway.getPlanets).toHaveBeenCalledTimes(1);
  });

  it('reopens the map on navigate', async () => {
    await setup();
    await enterPlanet();

    act({type: 'navigate'});

    expect(lastScreen()).toEqual(NAV);
  });

  it('shows how far the player has got across all planets', async () => {
    const gateway = fakeGateway();
    gateway.answers.set(1, true);
    await setup(gateway);

    act({type: 'start'});

    expect(lastScreen()).toEqual(
      expect.objectContaining({type: 'navigation', overallStatus: 0.5}),
    );
  });

  it('shows the minigame select screen on selecting a planet', async () => {
    await setup();
    act({type: 'start'});

    act({type: 'selectPlanet', planetId: 1});

    expect(lastScreen()).toEqual(MINI_GAME_SELECT);
  });

  it('shows the lesson intro on entering a planet', async () => {
    await setup();

    await enterPlanet();

    expect(lastScreen()).toEqual(INTRO);
  });

  it.each([true, false])(
    'connects Radio to the lesson and awards only earned hints (addHint: %s)',
    async addHint => {
      const {gateway, session} = await setup();
      act({type: 'start'});
      act({type: 'selectPlanet', planetId: 1});
      act({type: 'startMiniGame', name: 'Radio'});
      expect(lastScreen()).toEqual(
        expect.objectContaining({type: 'radioWaveMinigame'}),
      );

      await actAndWait({type: 'endMiniGame', addHint});

      expect(gateway.awardHintCredits).toHaveBeenCalledTimes(addHint ? 1 : 0);
      expect(session.player?.hintQuota).toBe(addHint ? 4 : 3);
      if (addHint) {
        expect(gateway.awardHintCredits).toHaveBeenCalledWith(1);
      }
      expect(lastScreen()).toEqual(INTRO);
      act({type: 'next'});
      expect(lastScreen()).toEqual(READING);
      expect(gateway.submitAnswer).not.toHaveBeenCalled();
    },
  );

  it('ignores duplicate completion events while saving and after entering the lesson', async () => {
    const {gateway} = await setup();
    const pending = deferred<{hintQuota: number}>();
    gateway.awardHintCredits.mockReturnValueOnce(pending.promise);
    act({type: 'start'});
    act({type: 'selectPlanet', planetId: 1});
    act({type: 'startMiniGame', name: 'Radio'});

    act({type: 'endMiniGame', addHint: true});
    act({type: 'endMiniGame', addHint: true});
    expect(gateway.awardHintCredits).toHaveBeenCalledExactlyOnceWith(1);
    pending.resolve({hintQuota: 4});
    await flush();
    expect(lastScreen()?.type).toBe('intro');
    await actAndWait({type: 'endMiniGame', addHint: true});
    expect(gateway.awardHintCredits).toHaveBeenCalledTimes(1);
  });

  it('continues to the lesson without retrying an unconfirmed reward', async () => {
    const {gateway, session} = await setup();
    gateway.awardHintCredits.mockRejectedValueOnce(
      new ApiError('timeout', 'slow'),
    );
    act({type: 'start'});
    act({type: 'selectPlanet', planetId: 1});
    act({type: 'startMiniGame', name: 'Radio'});

    await actAndWait({type: 'endMiniGame', addHint: true});

    expect(gateway.awardHintCredits).toHaveBeenCalledExactlyOnceWith(1);
    expect(session.player?.hintQuota).toBe(3);
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
  });

  it('ignores completion events when no minigame is running', async () => {
    const {gateway} = await setup();
    act({type: 'start'});
    await actAndWait({type: 'endMiniGame', addHint: true});
    expect(gateway.awardHintCredits).not.toHaveBeenCalled();
    expect(lastScreen()).toEqual(NAV);
  });

  it('waits for the selected planet before opening its lesson after the minigame', async () => {
    const {gateway} = await setup();
    const pending = deferred<Planet>();
    gateway.getPlanet.mockReturnValueOnce(pending.promise);
    act({type: 'start'});
    act({type: 'selectPlanet', planetId: 2});
    act({type: 'startMiniGame', name: 'Radio'});
    await actAndWait({type: 'endMiniGame', addHint: false});
    expect(lastScreen()?.type).toBe('radioWaveMinigame');

    pending.resolve({...makePlanet(2), name: 'Second Planet'});
    await flush();
    expect(lastScreen()).toEqual(
      expect.objectContaining({type: 'intro', title: 'Second Planet'}),
    );
  });

  it('shows the asteroid minigame when it starts', async () => {
    await setup();
    act({type: 'start'});
    act({type: 'selectPlanet', planetId: 1});

    act({type: 'startMiniGame', name: 'Asteroid'});

    expect(lastScreen()).toEqual({type: 'asteroidMinigame'});
  });

  it('loads the picked planet while the player chooses a minigame', async () => {
    const {gateway} = await setup();
    act({type: 'start'});

    act({type: 'selectPlanet', planetId: 1});
    expect(gateway.getPlanet).toHaveBeenCalledExactlyOnceWith(1);
    expect(lastScreen()).toEqual(MINI_GAME_SELECT);

    await actAndWait({type: 'enterPlanet'});
    expect(lastScreen()).toEqual(INTRO);
  });

  it.each([
    {name: 'an http ApiError', error: new ApiError('http', 'boom', 500)},
    {name: 'a plain Error', error: new Error('boom')},
  ])(
    'returns to the map when the planet fails to load with $name',
    async ({error}) => {
      const gateway = fakeGateway();
      gateway.getPlanet.mockRejectedValue(error);
      await setup(gateway);
      act({type: 'start'});
      act({type: 'selectPlanet', planetId: 1});

      await actAndWait({type: 'enterPlanet'});

      expect(lastScreen()).toEqual(NAV);
    },
  );

  it('does not open a locked planet', async () => {
    const gateway = fakeGateway();
    gateway.getPlanets.mockImplementation(async () => [
      {...gateway.progress(), unlocked: false},
    ]);
    await setup(gateway);
    act({type: 'start'});
    ui.displayScreen.mockClear();

    act({type: 'selectPlanet', planetId: 1});

    expect(ui.displayScreen).not.toHaveBeenCalled();
    expect(gateway.getPlanet).not.toHaveBeenCalled();
  });

  it('goes back from the minigame select to the map, and from the map to the title', async () => {
    await setup();
    act({type: 'start'});
    act({type: 'selectPlanet', planetId: 1});

    act({type: 'back'});
    expect(lastScreen()).toEqual(NAV);
    act({type: 'back'});
    expect(lastScreen()).toEqual(TITLE);
  });
});

describe('GameManager lesson', () => {
  it("shows the lesson intro with the player's progress on entering a planet", async () => {
    await setup();

    await enterPlanet();

    expect(lastScreen()).toEqual(INTRO);
  });

  it('shows the progress that was loaded at login for a returning player', async () => {
    const gateway = fakeGateway();
    gateway.answers.set(1, true);
    await setup(gateway);

    await enterPlanet();

    expect(lastScreen()).toEqual(
      intro('1 of 2 questions correct (50%)\n\nStatus: hostile'),
    );
  });

  it('steps through the readings, then loads the first question', async () => {
    const {gateway} = await setup();
    await enterPlanet();

    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
    expect(gateway.getNextQuestion).not.toHaveBeenCalled();

    await actAndWait({type: 'next'});
    expect(gateway.getNextQuestion).toHaveBeenCalledWith(1);
    expect(lastScreen()).toEqual(QUESTION_1);
  });

  it('goes back to the previous slide, then the intro, then the map', async () => {
    await setup();
    await enterPlanet();
    act({type: 'next'});

    act({type: 'back'});
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'back'});
    expect(lastScreen()).toEqual(NAV);
  });

  it('restarts the lesson when the planet is re-entered mid-lesson', async () => {
    await setup();
    await enterPlanet();
    act({type: 'next'});

    await enterPlanet();
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
  });

  it('goes back from a question to the last reading, then on to the same question without reloading it', async () => {
    const {gateway} = await setupAtQuestion1();

    act({type: 'back'});
    expect(lastScreen()).toEqual(READING);
    act({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_1);

    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(1);
  });

  it('goes from the intro straight to the questions on a planet without readings', async () => {
    const gateway = fakeGateway();
    gateway.getPlanet.mockResolvedValue({...makePlanet(), tasks: []});
    await setup(gateway);
    await enterPlanet();

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_1);
    act({type: 'back'});
    expect(lastScreen()).toEqual(INTRO);
  });

  it('ignores Next on a question, which has to be answered', async () => {
    const {gateway} = await setupAtQuestion1();

    await actAndWait({type: 'next'});

    expect(ui.displayScreen).not.toHaveBeenCalled();
    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(1);
  });
});

describe('GameManager questions, one at a time', () => {
  it('loads the next question only after the current one is answered', async () => {
    const {gateway} = await setupAtQuestion1();
    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(1);

    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    expect(lastScreen()).toEqual(CORRECT);
    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(1);

    await actAndWait({type: 'next'});
    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(2);
    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('moves on to the next question after a wrong answer', async () => {
    const {gateway} = await setupAtQuestion1();

    await actAndWait({type: 'answer', option: WRONG_OPTION});
    expect(lastScreen()).toEqual(WRONG);
    await actAndWait({type: 'next'});

    expect(lastScreen()).toEqual(QUESTION_2);
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      name: 'every answer was wrong',
      options: [WRONG_OPTION, WRONG_OPTION],
      result:
        'You answered 0 of 2 questions correctly.\n Linear Land is still hostile. Redo the planet to try again.',
    },
    {
      name: 'some answers were wrong',
      options: [WRONG_OPTION, RIGHT_OPTION],
      result:
        'You answered 1 of 2 questions correctly.\n Linear Land is still hostile. Redo the planet to try again.',
    },
  ])(
    'asks every question once and ends on the lesson result when $name',
    async ({options, result}) => {
      const {gateway} = await setupAtQuestion1();
      const shownAfterEachAnswer: unknown[] = [];

      for (const option of options) {
        await actAndWait({type: 'answer', option});
        await actAndWait({type: 'next'});
        shownAfterEachAnswer.push(lastScreen());
      }

      expect(shownAfterEachAnswer).toEqual([
        QUESTION_2,
        {type: 'lessonResult', result, planetId: 1},
      ]);
      expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
    },
  );

  it('offers the redo from the lesson result of a run with wrong answers', async () => {
    const {gateway, session} = await setupAtQuestion1();
    await actAndWait({type: 'answer', option: WRONG_OPTION});
    await actAndWait({type: 'next'});
    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    await actAndWait({type: 'next'});

    act({type: 'retryLesson'});
    expect(lastScreen()).toEqual({
      type: 'retryWarning',
      // One answer of two was correct, so the planet is still hostile.
      message:
        'Redo Linear Land? Current progress: 1 of 2 questions correct (50%)\n\nStatus: hostile.' +
        ' This resets all progress here. ' +
        'You answer every question from the start.',
    });
    await actAndWait({type: 'confirmRetry'});

    expect(gateway.resetPlanet).toHaveBeenCalledWith(1);
    expect(session.progressFor(1)).toMatchObject({correctCount: 0});
    expect(lastScreen()).toEqual(QUESTION_1);
  });

  it('resumes at the first question the player has not answered yet', async () => {
    const gateway = fakeGateway();
    gateway.answers.set(1, false);
    await setup(gateway);
    await enterPlanet();
    act({type: 'next'});

    await actAndWait({type: 'next'});

    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('shows the lesson result, with the progress, once no question is left', async () => {
    const {session} = await setupAtQuestion1();

    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    await actAndWait({type: 'next'});
    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    await actAndWait({type: 'next'});

    expect(lastScreen()).toEqual(LESSON_RESULT);
    expect(session.progressFor(1)).toMatchObject({
      status: 'peaceful',
      correctCount: 2,
    });
  });

  it('returns to the map from the lesson result', async () => {
    await setupAtLessonResult();

    act({type: 'next'});

    expect(lastScreen()).toEqual(NAV);
  });

  it.each([
    {
      name: 'the server is offline',
      error: new ApiError('network', 'down'),
      message: 'Server offline. Press Ok to retry.',
    },
    {
      name: 'the server fails',
      error: new ApiError('http', 'boom', 500),
      message: "Couldn't load next question. Press Ok to retry.",
    },
  ])(
    'says that $name when the next question cannot be loaded, and loads it on Ok',
    async ({error, message}) => {
      const {gateway} = await setup();
      gateway.getNextQuestion.mockRejectedValueOnce(error);
      await enterPlanet();
      act({type: 'next'});

      await actAndWait({type: 'next'});
      expect(lastScreen()).toEqual({type: 'reading', readingText: message});

      await actAndWait({type: 'next'});
      expect(lastScreen()).toEqual(QUESTION_1);
    },
  );

  it('drops a question that arrives after the player went back', async () => {
    const {gateway} = await setup();
    const pending = deferred<NextQuestion>();
    gateway.getNextQuestion.mockReturnValueOnce(pending.promise);
    await enterPlanet();
    act({type: 'next'});

    act({type: 'next'});
    act({type: 'back'});
    pending.resolve({question: QUESTIONS[0], progress: gateway.progress()});
    await flush();

    expect(lastScreen()).toEqual(INTRO);
  });

  it('keeps the current screen until the next question arrives', async () => {
    const {gateway} = await setup();
    const pending = deferred<NextQuestion>();
    gateway.getNextQuestion.mockReturnValueOnce(pending.promise);
    await enterPlanet();
    act({type: 'next'});
    ui.displayScreen.mockClear();

    act({type: 'next'});
    expect(ui.displayScreen).not.toHaveBeenCalled();

    pending.resolve({question: QUESTIONS[0], progress: gateway.progress()});
    await flush();
    expect(ui.displayScreen).toHaveBeenCalledExactlyOnceWith(QUESTION_1);
  });

  it('shows the question once for a double click on Next', async () => {
    const {gateway} = await setup();
    await enterPlanet();
    act({type: 'next'});
    ui.displayScreen.mockClear();

    act({type: 'next'});
    await actAndWait({type: 'next'});

    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(2);
    expect(ui.displayScreen).toHaveBeenCalledExactlyOnceWith(QUESTION_1);
  });
});

describe('GameManager answers', () => {
  it('maps the option index to its optionId and shows Correct', async () => {
    const {gateway} = await setupAtQuestion1();

    await actAndWait({type: 'answer', option: RIGHT_OPTION});

    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 11);
    expect(lastScreen()).toEqual(CORRECT);
  });

  it('shows Wrong for an incorrect answer', async () => {
    const {gateway} = await setupAtQuestion1();

    await actAndWait({type: 'answer', option: WRONG_OPTION});

    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 12);
    expect(lastScreen()).toEqual(WRONG);
  });

  it('ignores answers on every screen but a question', async () => {
    const {gateway} = await setup();

    act({type: 'answer', option: 0}); // title
    act({type: 'start'});
    act({type: 'answer', option: 0}); // navigation map
    await enterPlanet();
    act({type: 'answer', option: 0}); // lesson intro
    act({type: 'next'});
    act({type: 'answer', option: 0}); // reading
    expect(gateway.submitAnswer).not.toHaveBeenCalled();

    await actAndWait({type: 'next'});
    await actAndWait({type: 'answer', option: WRONG_OPTION});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);

    // The question result screen: the answer is already in.
    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);
  });

  it('ignores an out-of-range option without blocking later answers', async () => {
    const {gateway} = await setupAtQuestion1();

    await actAndWait({type: 'answer', option: 5});
    expect(gateway.submitAnswer).not.toHaveBeenCalled();
    expect(ui.displayScreen).not.toHaveBeenCalled();

    await actAndWait({type: 'answer', option: 0});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);
  });

  it('sends one request for a double click and accepts answers afterwards', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: WRONG_OPTION});
    act({type: 'answer', option: RIGHT_OPTION});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);

    pending.resolve(verdict(1, false));
    await flush();
    expect(lastScreen()).toEqual(WRONG);
    // The held reply bypassed the fake server, so record the answer by hand.
    gateway.answers.set(1, false);
    await actAndWait({type: 'next'});
    await actAndWait({type: 'answer', option: RIGHT_OPTION});

    expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
    expect(gateway.submitAnswer).toHaveBeenLastCalledWith(2, 21);
    expect(lastScreen()).toEqual(CORRECT);
  });

  it.each([
    {
      name: 'the server is offline',
      error: new ApiError('network', 'down'),
      message: 'Server offline. Press Ok to try again.',
    },
    {
      name: 'the server fails',
      error: new ApiError('http', 'boom', 500, 'STORAGE_ERROR'),
      message: "Couldn't confirm answer. Press Ok to try again.",
    },
  ])(
    'says that $name when the answer cannot be submitted, then asks again',
    async ({error, message}) => {
      const {gateway} = await setupAtQuestion1();
      gateway.submitAnswer.mockRejectedValueOnce(error);

      await actAndWait({type: 'answer', option: RIGHT_OPTION});

      expect(lastScreen()).toEqual({type: 'reading', readingText: message});

      await actAndWait({type: 'next'});
      expect(lastScreen()).toEqual(QUESTION_1);
      await actAndWait({type: 'answer', option: RIGHT_OPTION});
      expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
      expect(lastScreen()).toEqual(CORRECT);
    },
  );

  it('moves on when the server says the question was already answered', async () => {
    const {gateway} = await setupAtQuestion1();
    // The first answer was recorded, but its reply never arrived.
    gateway.answers.set(1, false);
    gateway.submitAnswer.mockRejectedValueOnce(
      new ApiError('http', 'answered', 409, 'ALREADY_ANSWERED'),
    );

    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    expect(lastScreen()).toEqual({
      type: 'reading',
      readingText: 'Question has already been answered. Press Ok to continue.',
    });

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('drops the result if the player moved to another screen', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: RIGHT_OPTION});
    act({type: 'back'});
    pending.resolve(verdict(1, true));
    await flush();

    expect(lastScreen()).toEqual(READING);
  });

  it('drops the error result if the player moved to another screen', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: RIGHT_OPTION});
    act({type: 'back'});
    pending.reject(new ApiError('timeout', 'slow'));
    await flush();

    expect(lastScreen()).toEqual(READING);
  });

  it('drops the result if the game went back to the login screen', async () => {
    const {gateway, game} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: RIGHT_OPTION});
    game.start();
    ui.displayScreen.mockClear();
    pending.resolve(verdict(1, true));
    await flush();

    expect(ui.displayScreen).not.toHaveBeenCalled();
  });
});

describe('GameManager redoing a planet', () => {
  it('shows a warning, and resets nothing, when Redo is pressed', async () => {
    const {gateway} = await setupAtLessonResult();

    await actAndWait({type: 'retryLesson'});

    expect(lastScreen()).toEqual(RETRY_WARNING);
    expect(gateway.resetPlanet).not.toHaveBeenCalled();
  });

  it('resets the progress and asks the questions again from the first on Confirm', async () => {
    const {gateway, session} = await setupAtLessonResult();
    act({type: 'retryLesson'});

    await actAndWait({type: 'confirmRetry'});

    expect(gateway.resetPlanet).toHaveBeenCalledWith(1);
    expect(session.progressFor(1)).toMatchObject({
      status: 'hostile',
      correctCount: 0,
    });
    expect(lastScreen()).toEqual(QUESTION_1);

    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('goes back to the lesson result, and resets nothing, on Cancel', async () => {
    const {gateway} = await setupAtLessonResult();
    act({type: 'retryLesson'});

    await actAndWait({type: 'cancelRetry'});

    expect(lastScreen()).toEqual(LESSON_RESULT);
    expect(gateway.resetPlanet).not.toHaveBeenCalled();
  });

  it('lets a returning player redo a planet they had already finished', async () => {
    const gateway = fakeGateway();
    QUESTIONS.forEach(q => gateway.answers.set(q.questionId, true));
    await setup(gateway);
    await enterPlanet();
    expect(lastScreen()).toEqual(
      intro('2 of 2 questions correct (100%)\n\nStatus: peaceful'),
    );
    act({type: 'next'});

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(LESSON_RESULT);
    act({type: 'retryLesson'});
    await actAndWait({type: 'confirmRetry'});

    expect(lastScreen()).toEqual(QUESTION_1);
    await enterPlanet();
    expect(lastScreen()).toEqual(INTRO);
  });

  it('ignores retryLesson away from the lesson result', async () => {
    await setup();
    await enterPlanet();
    ui.displayScreen.mockClear();

    act({type: 'retryLesson'});

    expect(ui.displayScreen).not.toHaveBeenCalled();
  });

  it.each<UiAction>([{type: 'confirmRetry'}, {type: 'cancelRetry'}])(
    'ignores $type when no warning is showing',
    async action => {
      const {gateway} = await setupAtLessonResult();

      await actAndWait(action);

      expect(ui.displayScreen).not.toHaveBeenCalled();
      expect(gateway.resetPlanet).not.toHaveBeenCalled();
    },
  );

  it('sends one reset for a double click on Confirm, and ignores Cancel meanwhile', async () => {
    const {gateway} = await setupAtLessonResult();
    const pending = deferred<PlanetSummary>();
    gateway.resetPlanet.mockImplementationOnce(() => pending.promise);
    act({type: 'retryLesson'});

    act({type: 'confirmRetry'});
    act({type: 'confirmRetry'});
    act({type: 'cancelRetry'});
    expect(gateway.resetPlanet).toHaveBeenCalledTimes(1);
    expect(lastScreen()).toEqual(RETRY_WARNING);

    gateway.answers.clear();
    pending.resolve(gateway.progress());
    await flush();
    expect(lastScreen()).toEqual(QUESTION_1);
  });

  it.each([
    {
      name: 'the server is offline',
      error: new ApiError('network', 'down'),
      message: 'Server offline. This planet was not reset.',
    },
    {
      name: 'the server fails',
      error: new ApiError('http', 'boom', 500),
      message: "Couldn't reset planet.",
    },
  ])(
    'keeps the warning, saying that $name, when the reset fails, and can retry',
    async ({error, message}) => {
      const {gateway, session} = await setupAtLessonResult();
      gateway.resetPlanet.mockRejectedValueOnce(error);
      act({type: 'retryLesson'});

      await actAndWait({type: 'confirmRetry'});

      expect(lastScreen()).toEqual({
        type: 'retryWarning',
        message: `${message}\n\n${WARNING}`,
      });
      expect(session.progressFor(1)).toMatchObject({correctCount: 2});

      await actAndWait({type: 'confirmRetry'});
      expect(lastScreen()).toEqual(QUESTION_1);
    },
  );
});

describe('GameManager settings', () => {
  const CHOSEN: Settings = {musicVolume: 0.8, sfxVolume: 0.1};

  it('opens the settings screen with the settings that were loaded at login', async () => {
    await setup();

    act({type: 'openSettings'});

    expect(lastScreen()).toEqual({type: 'settings', settings: PLAYER.settings});
  });

  it('saves the chosen settings and shows them as saved', async () => {
    const {gateway, session} = await setup();
    act({type: 'openSettings'});

    await actAndWait({type: 'saveSettings', settings: CHOSEN});

    expect(gateway.saveSettings).toHaveBeenCalledWith(CHOSEN);
    expect(session.player?.settings).toEqual(CHOSEN);
    expect(lastScreen()).toEqual({
      type: 'settings',
      settings: CHOSEN,
      message: 'Settings saved.',
    });

    act({type: 'back'});
    act({type: 'openSettings'});
    expect(lastScreen()).toEqual({type: 'settings', settings: CHOSEN});
  });

  it.each([
    {
      name: 'the server is offline',
      error: new ApiError('timeout', 'slow'),
      message: 'Server offline. Settings were not saved.',
    },
    {
      name: 'the server fails',
      error: new ApiError('http', 'boom', 500),
      message: "Couldn't save settings.",
    },
  ])(
    'keeps the chosen settings on screen, saying that $name, when saving fails',
    async ({error, message}) => {
      const {gateway, session} = await setup();
      gateway.saveSettings.mockRejectedValueOnce(error);
      act({type: 'openSettings'});

      await actAndWait({type: 'saveSettings', settings: CHOSEN});

      expect(lastScreen()).toEqual({
        type: 'settings',
        settings: CHOSEN,
        message,
      });
      expect(session.player?.settings).toEqual(PLAYER.settings);

      await actAndWait({type: 'saveSettings', settings: CHOSEN});
      expect(session.player?.settings).toEqual(CHOSEN);
    },
  );

  it('returns to the title on Back', async () => {
    await setup();
    act({type: 'openSettings'});

    act({type: 'back'});

    expect(lastScreen()).toEqual(TITLE);
  });

  it('drops the save result if the player left the settings screen', async () => {
    const {gateway} = await setup();
    const pending = deferred<Player>();
    gateway.saveSettings.mockReturnValueOnce(pending.promise);
    act({type: 'openSettings'});

    act({type: 'saveSettings', settings: CHOSEN});
    act({type: 'back'});
    pending.resolve({...PLAYER, settings: CHOSEN});
    await flush();

    expect(lastScreen()).toEqual(TITLE);
  });

  it('ignores openSettings away from the title screen', async () => {
    await setup();
    act({type: 'start'});
    ui.displayScreen.mockClear();

    act({type: 'openSettings'});

    expect(ui.displayScreen).not.toHaveBeenCalled();
  });

  it('ignores saveSettings when the settings screen is not showing', async () => {
    const {gateway} = await setup();

    await actAndWait({type: 'saveSettings', settings: CHOSEN});

    expect(gateway.saveSettings).not.toHaveBeenCalled();
    expect(ui.displayScreen).not.toHaveBeenCalled();
  });
});

describe('GameManager hints', () => {
  /** The first question with a hint panel, credits and selection. */
  const withHint = (
    hintsLeft: number,
    hintPanel?: {hints: string[]; message?: string},
    selectedOption?: number,
  ): ScreenModel => ({
    ...QUESTION_1,
    hintsLeft,
    ...(selectedOption === undefined ? {} : {selectedOption}),
    ...(hintPanel ? {hintPanel} : {}),
  });

  it('shows "Loading hint..." and then the unlocked hint, with one credit less', async () => {
    const {gateway} = await setupAtQuestion1();

    act({type: 'requestHint', selectedOption: null});
    expect(lastScreen()).toEqual(
      withHint(3, {hints: [], message: 'Loading hint...'}),
    );
    await flush();

    expect(gateway.unlockNextHint).toHaveBeenCalledExactlyOnceWith(1);
    expect(lastScreen()).toEqual(withHint(2, {hints: ['Hint one.']}));
  });

  it('keeps the selected option through the hint panel and after Close', async () => {
    await setupAtQuestion1();

    await actAndWait({type: 'requestHint', selectedOption: WRONG_OPTION});
    expect(lastScreen()).toEqual(
      withHint(2, {hints: ['Hint one.']}, WRONG_OPTION),
    );

    act({type: 'closeHints'});
    expect(lastScreen()).toEqual(withHint(2, undefined, WRONG_OPTION));
  });

  it('shows every unlocked hint and says there are no more, without spending a credit', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.hints.unlocked = HINT_TEXTS.length;

    await actAndWait({type: 'requestHint', selectedOption: null});

    expect(lastScreen()).toEqual(
      withHint(3, {
        hints: HINT_TEXTS,
        message: 'No more hints for this planet.',
      }),
    );
  });

  it('says the planet has no hints when it has none', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.hints.texts = [];

    await actAndWait({type: 'requestHint', selectedOption: null});

    expect(lastScreen()).toEqual(
      withHint(3, {hints: [], message: 'No hints for this planet.'}),
    );
  });

  it('says to play a minigame when the player has no credits', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.hints.quota = 0;

    await actAndWait({type: 'requestHint', selectedOption: null});

    expect(lastScreen()).toEqual(
      withHint(0, {
        hints: [],
        message: 'No hint credits left. Play a minigame to earn more.',
      }),
    );
  });

  it.each([
    {
      error: new ApiError('network', 'offline'),
      message: 'Server offline. Try again.',
    },
    {
      error: new ApiError('http', 'boom', 500),
      message: "Couldn't get a hint. Try again.",
    },
  ])(
    'shows "$message" and no hint when the unlock fails',
    async ({error, message}) => {
      const {gateway} = await setupAtQuestion1();
      gateway.unlockNextHint.mockRejectedValueOnce(error);

      await actAndWait({type: 'requestHint', selectedOption: null});

      expect(lastScreen()).toEqual(withHint(3, {hints: [], message}));
    },
  );

  it('sends one unlock for a double click on the hint button', async () => {
    const {gateway} = await setupAtQuestion1();
    const unlock = deferred<HintUnlockResult>();
    gateway.unlockNextHint.mockReturnValueOnce(unlock.promise);

    act({type: 'requestHint', selectedOption: null});
    act({type: 'requestHint', selectedOption: null});
    act({type: 'closeHints'}); // ignored while the unlock is pending
    gateway.hints.unlocked = 1; // what the server recorded for the unlock
    unlock.resolve({
      hint: {hintId: 1, planetId: 1, hintNumber: 1, text: 'Hint one.'},
      hintQuota: 2,
    });
    await flush();

    expect(gateway.unlockNextHint).toHaveBeenCalledTimes(1);
    expect(lastScreen()).toEqual(withHint(2, {hints: ['Hint one.']}));
  });

  it('ignores a hint request while an answer is with the server, so its result still shows', async () => {
    const {gateway} = await setupAtQuestion1();
    const answer = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(answer.promise);

    act({type: 'answer', option: RIGHT_OPTION});
    act({type: 'requestHint', selectedOption: RIGHT_OPTION});
    answer.resolve(verdict(1, true));
    await flush();

    expect(gateway.unlockNextHint).not.toHaveBeenCalled();
    expect(lastScreen()).toEqual(CORRECT);
  });

  it('ignores hint requests on every screen but a question', async () => {
    const {gateway} = await setup();

    act({type: 'requestHint', selectedOption: null}); // title
    await enterPlanet();
    act({type: 'requestHint', selectedOption: null}); // lesson intro

    expect(gateway.unlockNextHint).not.toHaveBeenCalled();
  });
});
