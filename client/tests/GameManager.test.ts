import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {
  AnswerResult,
  NextQuestion,
  Planet,
  PlanetSummary,
  Player,
  Question,
  Settings,
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
  description: `A hostile world of straight lines.\n\nYour progress: ${progress}`,
});
const INTRO = intro('0 of 2 questions correct (0%), hostile');
const READING: ScreenModel = {
  type: 'reading',
  readingText: 'A linear function has the form y = mx + b.',
};
const QUESTION_1: ScreenModel = {
  type: 'question',
  question: {prompt: 'Question 1', options: ['2', '3']},
};
const QUESTION_2: ScreenModel = {
  type: 'question',
  question: {prompt: 'Question 2', options: ['2', '3']},
};
const CORRECT: ScreenModel = {type: 'questionResult', result: 'Correct'};
const WRONG: ScreenModel = {type: 'questionResult', result: 'Wrong'};
const LESSON_RESULT: ScreenModel = {
  type: 'lessonResult',
  result:
    'You answered 2 of 2 questions correctly. Linear Land is now peaceful!',
};
const WARNING =
  'Redo Linear Land? This resets your progress here. ' +
  'Right now: 2 of 2 questions correct (100%), peaceful. ' +
  'The planet turns hostile again and you answer every question from the start.';
const RETRY_WARNING: ScreenModel = {type: 'retryWarning', message: WARNING};
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

/** Starts the lesson and moves forward to the first question. */
async function setupAtQuestion1() {
  const ctx = await setup();
  act({type: 'start'});
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

  it('logs in under the typed username, which loads their settings and progress, loads the planet and shows the title', async () => {
    const {gateway, session} = setupAtLogin();

    await actAndWait({type: 'login', username: '  amy  '});

    expect(gateway.login).toHaveBeenCalledExactlyOnceWith('amy');
    expect(gateway.getPlanets).toHaveBeenCalledTimes(1);
    expect(gateway.getPlanet).toHaveBeenCalledWith(1);
    expect(gateway.login.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.getPlanet.mock.invocationCallOrder[0],
    );
    expect(session.player?.settings).toEqual(PLAYER.settings);
    expect(session.progressFor(1)).toMatchObject({correctCount: 0});
    expect(lastScreen()).toEqual(TITLE);
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
        loginScreen('', 'Type a username to log in.'),
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

  it.each([
    {name: 'an http ApiError', error: new ApiError('http', 'boom', 500)},
    {name: 'a plain Error', error: new Error('boom')},
  ])(
    'shows the generic failure message when the planet fails with $name',
    async ({error}) => {
      const gateway = fakeGateway();
      gateway.getPlanet.mockRejectedValue(error);
      setupAtLogin(gateway);

      await actAndWait({type: 'login', username: 'amy'});

      expect(lastScreen()).toEqual(
        loginScreen('amy', "Couldn't load the game. Try again."),
      );
    },
  );

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

  it('does not load the planet when login fails', async () => {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValue(new ApiError('network', 'down'));
    setupAtLogin(gateway);

    await actAndWait({type: 'login', username: 'amy'});

    expect(gateway.getPlanet).not.toHaveBeenCalled();
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

describe('GameManager lesson', () => {
  it("shows the lesson intro with the player's progress on start", async () => {
    await setup();

    act({type: 'start'});

    expect(lastScreen()).toEqual(INTRO);
  });

  it('shows the progress that was loaded at login for a returning player', async () => {
    const gateway = fakeGateway();
    gateway.answers.set(1, true);
    await setup(gateway);

    act({type: 'start'});

    expect(lastScreen()).toEqual(
      intro('1 of 2 questions correct (50%), hostile'),
    );
  });

  it('steps through the readings, then loads the first question', async () => {
    const {gateway} = await setup();
    act({type: 'start'});

    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
    expect(gateway.getNextQuestion).not.toHaveBeenCalled();

    await actAndWait({type: 'next'});
    expect(gateway.getNextQuestion).toHaveBeenCalledWith(1);
    expect(lastScreen()).toEqual(QUESTION_1);
  });

  it('goes back to the previous slide, then the intro, and stays there', async () => {
    await setup();
    act({type: 'start'});
    act({type: 'next'});

    act({type: 'back'});
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'back'});
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
  });

  it('resets to the intro when Start is pressed mid-lesson', async () => {
    await setup();
    act({type: 'start'});
    act({type: 'next'});

    act({type: 'start'});
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
    act({type: 'start'});

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
        'You answered 0 of 2 questions correctly. Linear Land is still hostile. Redo the planet to try again.',
    },
    {
      name: 'some answers were wrong',
      options: [WRONG_OPTION, RIGHT_OPTION],
      result:
        'You answered 1 of 2 questions correctly. Linear Land is still hostile. Redo the planet to try again.',
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
        {type: 'lessonResult', result},
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
      message:
        'Redo Linear Land? This resets your progress here. ' +
        'Right now: 1 of 2 questions correct (50%), hostile. ' +
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
    act({type: 'start'});
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

  it('returns to the title from the lesson result', async () => {
    await setupAtLessonResult();

    act({type: 'next'});

    expect(lastScreen()).toEqual(TITLE);
  });

  it('shows an error when the next question cannot be loaded, and loads it on Ok', async () => {
    const {gateway} = await setup();
    gateway.getNextQuestion.mockRejectedValueOnce(
      new ApiError('network', 'down'),
    );
    act({type: 'start'});
    act({type: 'next'});

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual({
      type: 'questionResult',
      result: "We couldn't load the next question. Press Ok to retry.",
    });

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_1);
  });

  it('drops a question that arrives after the player went back', async () => {
    const {gateway} = await setup();
    const pending = deferred<NextQuestion>();
    gateway.getNextQuestion.mockReturnValueOnce(pending.promise);
    act({type: 'start'});
    act({type: 'next'});

    act({type: 'next'});
    act({type: 'back'});
    pending.resolve({question: QUESTIONS[0], progress: gateway.progress()});
    await flush();

    expect(lastScreen()).toEqual(INTRO);
  });

  it('shows the question once for a double click on Next', async () => {
    const {gateway} = await setup();
    act({type: 'start'});
    act({type: 'next'});
    ui.displayScreen.mockClear();

    act({type: 'next'});
    await actAndWait({type: 'next'});

    expect(gateway.getNextQuestion).toHaveBeenCalledTimes(2);
    expect(ui.displayScreen).toHaveBeenCalledTimes(1);
    expect(lastScreen()).toEqual(QUESTION_1);
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

  it('ignores answers on the title, intro, reading and result screens', async () => {
    const {gateway} = await setup();

    act({type: 'answer', option: 0});
    act({type: 'start'});
    act({type: 'answer', option: 0});
    act({type: 'next'});
    act({type: 'answer', option: 0});
    await actAndWait({type: 'next'});
    await actAndWait({type: 'answer', option: WRONG_OPTION});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);

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

  it('shows an error result when the answer cannot be submitted, then asks again', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.submitAnswer.mockRejectedValueOnce(new ApiError('network', 'down'));

    await actAndWait({type: 'answer', option: RIGHT_OPTION});

    expect(lastScreen()).toEqual({
      type: 'questionResult',
      result: "We couldn't confirm your answer.",
    });

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_1);
    await actAndWait({type: 'answer', option: RIGHT_OPTION});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
    expect(lastScreen()).toEqual(CORRECT);
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
    act({type: 'start'});
    expect(lastScreen()).toEqual(
      intro('2 of 2 questions correct (100%), peaceful'),
    );
    act({type: 'next'});

    await actAndWait({type: 'next'});
    expect(lastScreen()).toEqual(LESSON_RESULT);
    act({type: 'retryLesson'});
    await actAndWait({type: 'confirmRetry'});

    expect(lastScreen()).toEqual(QUESTION_1);
    act({type: 'start'});
    expect(lastScreen()).toEqual(INTRO);
  });

  it('ignores retryLesson away from the lesson result', async () => {
    await setup();
    act({type: 'start'});
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

  it('keeps the warning, with an error, when the reset fails, and can retry', async () => {
    const {gateway, session} = await setupAtLessonResult();
    gateway.resetPlanet.mockRejectedValueOnce(new ApiError('network', 'down'));
    act({type: 'retryLesson'});

    await actAndWait({type: 'confirmRetry'});

    expect(lastScreen()).toEqual({
      type: 'retryWarning',
      message: `We couldn't reset this planet.\n\n${WARNING}`,
    });
    expect(session.progressFor(1)).toMatchObject({correctCount: 2});

    await actAndWait({type: 'confirmRetry'});
    expect(lastScreen()).toEqual(QUESTION_1);
  });
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

  it('keeps the chosen settings on screen, with an error, when saving fails', async () => {
    const {gateway, session} = await setup();
    gateway.saveSettings.mockRejectedValueOnce(new ApiError('network', 'down'));
    act({type: 'openSettings'});

    await actAndWait({type: 'saveSettings', settings: CHOSEN});

    expect(lastScreen()).toEqual({
      type: 'settings',
      settings: CHOSEN,
      message: "We couldn't save your settings.",
    });
    expect(session.player?.settings).toEqual(PLAYER.settings);
  });

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
