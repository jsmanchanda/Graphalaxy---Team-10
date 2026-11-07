import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {AnswerResult, Planet, Player} from '@graphalaxy/shared';
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

/** Builds a planet with a reading slide followed by two questions. */
function makePlanet(planetId = 1): Planet {
  return {
    planetId,
    name: 'Linear Land',
    introText: 'A hostile world of straight lines.',
    graphOrder: 0,
    tasks: [
      {type: 'Reading', text: 'A linear function has the form y = mx + b.'},
      ...[1, 2].map(questionId => ({
        type: 'Question' as const,
        question: {
          questionId,
          prompt: `Question ${questionId}`,
          type: 'mcq' as const,
          options: [
            {optionId: questionId * 10 + 1, label: 'a', text: '2'},
            {optionId: questionId * 10 + 2, label: 'b', text: '3'},
          ],
        },
      })),
    ],
  };
}

/** Builds a fake gateway that logs in and returns a fresh planet. */
function fakeGateway() {
  return {
    login: vi.fn<ServerGateway['login']>().mockResolvedValue(PLAYER),
    getPlanet: vi
      .fn<ServerGateway['getPlanet']>()
      .mockImplementation(async id => makePlanet(id)),
    saveSettings: vi.fn<ServerGateway['saveSettings']>(),
    submitAnswer: vi.fn<ServerGateway['submitAnswer']>(),
  };
}

/** The server's verdict on an answer. */
const verdict = (questionId: number, correct: boolean): AnswerResult => ({
  questionId,
  correct,
  correctOption: {optionId: questionId * 10 + 1, label: 'a', text: '2'},
});

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

const INTRO: ScreenModel = {
  type: 'intro',
  title: 'Linear Land',
  description: 'A hostile world of straight lines.',
};
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
const END: ScreenModel = {
  type: 'title',
  title:
    'OOPS! Youve reached the end of the planet and we havent coded anything else :(!!',
};

/** Creates a started GameManager with the display history cleared. */
async function setup() {
  const gateway = fakeGateway();
  const session = new SessionCache(gateway);
  const game = new GameManager(session);
  await game.start();
  ui.displayScreen.mockClear();
  return {gateway, session, game};
}

/** Starts the lesson and moves forward to the first question. */
async function setupAtQuestion1() {
  const ctx = await setup();
  act({type: 'start'});
  act({type: 'next'});
  act({type: 'next'});
  ui.displayScreen.mockClear();
  return ctx;
}

beforeEach(() => {
  ui.displayScreen.mockReset();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('GameManager.start', () => {
  it('logs in the demo user, loads the demo planet and shows the title', async () => {
    const gateway = fakeGateway();
    const game = new GameManager(new SessionCache(gateway));

    await game.start();

    expect(gateway.login).toHaveBeenCalledWith('demo');
    expect(gateway.getPlanet).toHaveBeenCalledWith(1);
    expect(gateway.login.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.getPlanet.mock.invocationCallOrder[0],
    );
    expect(lastScreen()).toEqual({type: 'title', title: 'Graphalaxy'});
  });

  it.each(['network', 'timeout'] as const)(
    'shows the offline message on a %s error',
    async kind => {
      const gateway = fakeGateway();
      gateway.login.mockRejectedValue(new ApiError(kind, 'down'));

      await new GameManager(new SessionCache(gateway)).start();

      expect(lastScreen()).toEqual({
        type: 'title',
        title: 'Server offline. Press Start to retry.',
      });
    },
  );

  it.each([
    {name: 'an http ApiError', error: new ApiError('http', 'boom', 500)},
    {name: 'a plain Error', error: new Error('boom')},
  ])('shows the generic failure message on $name', async ({error}) => {
    const gateway = fakeGateway();
    gateway.getPlanet.mockRejectedValue(error);

    await new GameManager(new SessionCache(gateway)).start();

    expect(lastScreen()).toEqual({
      type: 'title',
      title: "Couldn't load the game. Press Start to retry.",
    });
  });

  it('does not load the planet when login fails', async () => {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValue(new ApiError('network', 'down'));

    await new GameManager(new SessionCache(gateway)).start();

    expect(gateway.getPlanet).not.toHaveBeenCalled();
  });
});

describe('GameManager with no planet loaded', () => {
  /** Creates a GameManager whose first start failed. */
  async function setupFailed() {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValueOnce(new ApiError('network', 'down'));
    await new GameManager(new SessionCache(gateway)).start();
    ui.displayScreen.mockClear();
    gateway.login.mockClear();
    return gateway;
  }

  it('retries start when Start is pressed', async () => {
    const gateway = await setupFailed();

    act({type: 'start'});
    await flush();

    expect(gateway.login).toHaveBeenCalledTimes(1);
    expect(lastScreen()).toEqual({type: 'title', title: 'Graphalaxy'});
  });

  it.each<UiAction>([
    {type: 'next'},
    {type: 'back'},
    {type: 'answer', option: 0},
  ])('ignores $type', async action => {
    const gateway = await setupFailed();

    act(action);
    await flush();

    expect(ui.displayScreen).not.toHaveBeenCalled();
    expect(gateway.login).not.toHaveBeenCalled();
    expect(gateway.submitAnswer).not.toHaveBeenCalled();
  });
});

describe('GameManager navigation', () => {
  it('shows the lesson intro on start', async () => {
    await setup();

    act({type: 'start'});

    expect(lastScreen()).toEqual(INTRO);
  });

  it('steps through the tasks in order', async () => {
    await setup();
    act({type: 'start'});

    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
    act({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_1);
    act({type: 'next'});
    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('shows the end screen after the last task', async () => {
    await setup();
    act({type: 'start'});
    for (let i = 0; i < 4; i++) act({type: 'next'});

    expect(lastScreen()).toEqual(END);
  });

  it('goes back to the previous task, then the intro, and stays there', async () => {
    await setup();
    act({type: 'start'});
    act({type: 'next'});
    act({type: 'next'});

    act({type: 'back'});
    expect(lastScreen()).toEqual(READING);
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
    act({type: 'next'});

    act({type: 'start'});
    expect(lastScreen()).toEqual(INTRO);
    act({type: 'next'});
    expect(lastScreen()).toEqual(READING);
  });

  it('goes back to the last task after pressing Next past the end more than once', async () => {
    await setup();
    act({type: 'start'});
    for (let i = 0; i < 5; i++) act({type: 'next'});

    expect(() => act({type: 'back'})).not.toThrow();
    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('ignores retryLesson', async () => {
    await setup();
    act({type: 'start'});
    ui.displayScreen.mockClear();

    act({type: 'retryLesson'});

    expect(ui.displayScreen).not.toHaveBeenCalled();
  });
});

describe('GameManager answers', () => {
  it('maps the option index to its optionId and shows Correct', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.submitAnswer.mockResolvedValue(verdict(1, true));

    act({type: 'answer', option: 1});
    await flush();

    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 12);
    expect(lastScreen()).toEqual({type: 'questionResult', result: 'Correct'});
  });

  it('shows Wrong for an incorrect answer', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.submitAnswer.mockResolvedValue(verdict(1, false));

    act({type: 'answer', option: 0});
    await flush();

    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 11);
    expect(lastScreen()).toEqual({type: 'questionResult', result: 'Wrong'});
  });

  it('ignores answers on the intro and reading slides', async () => {
    const {gateway} = await setup();

    act({type: 'start'});
    act({type: 'answer', option: 0});
    act({type: 'next'});
    act({type: 'answer', option: 0});
    await flush();

    expect(gateway.submitAnswer).not.toHaveBeenCalled();
  });

  it('ignores an out-of-range option without blocking later answers', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.submitAnswer.mockResolvedValue(verdict(1, true));

    act({type: 'answer', option: 5});
    await flush();
    expect(gateway.submitAnswer).not.toHaveBeenCalled();
    expect(ui.displayScreen).not.toHaveBeenCalled();

    act({type: 'answer', option: 0});
    await flush();
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);
  });

  it('sends one request for a double click and accepts answers afterwards', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: 0});
    act({type: 'answer', option: 1});
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(1);

    pending.resolve(verdict(1, false));
    await flush();
    gateway.submitAnswer.mockResolvedValue(verdict(1, true));
    act({type: 'answer', option: 1});
    await flush();

    expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
    expect(lastScreen()).toEqual({type: 'questionResult', result: 'Correct'});
  });

  it('shows an error result when the answer cannot be submitted', async () => {
    const {gateway} = await setupAtQuestion1();
    gateway.submitAnswer.mockRejectedValueOnce(new ApiError('network', 'down'));

    act({type: 'answer', option: 0});
    await flush();

    expect(lastScreen()).toEqual({
      type: 'questionResult',
      result: "We couldn't confirm your answer.",
    });

    gateway.submitAnswer.mockResolvedValue(verdict(1, true));
    act({type: 'answer', option: 0});
    await flush();
    expect(gateway.submitAnswer).toHaveBeenCalledTimes(2);
  });

  it('drops the result if the player moved to another slide', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: 0});
    act({type: 'next'});
    pending.resolve(verdict(1, true));
    await flush();

    expect(lastScreen()).toEqual(QUESTION_2);
  });

  it('drops the error result if the player moved to another slide', async () => {
    const {gateway} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: 0});
    act({type: 'back'});
    pending.reject(new ApiError('timeout', 'slow'));
    await flush();

    expect(lastScreen()).toEqual(READING);
  });

  it('drops the result if the planet was reloaded', async () => {
    const {gateway, game} = await setupAtQuestion1();
    const pending = deferred<AnswerResult>();
    gateway.submitAnswer.mockReturnValueOnce(pending.promise);

    act({type: 'answer', option: 0});
    await game.start();
    ui.displayScreen.mockClear();
    pending.resolve(verdict(1, true));
    await flush();

    expect(ui.displayScreen).not.toHaveBeenCalled();
  });
});
