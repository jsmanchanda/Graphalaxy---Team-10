import {describe, expect, it, vi} from 'vitest';
import type {
  AnswerResult,
  NextQuestion,
  Planet,
  PlanetSummary,
  Player,
  Question,
} from '@graphalaxy/shared';
import type {ServerGateway} from '../src/Frontend/ApiClient';
import {ApiError} from '../src/Frontend/ApiError';
import {SessionCache} from '../src/Frontend/SessionCache';

const PLAYER: Player = {
  userId: 7,
  name: 'alice',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.5},
};

/** Builds a fresh planet. */
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
        // solved: false,
      })),
    ],
  };
}
const PLANET = makePlanet();

// /** The solved flag of each question on a planet. */
// const solvedFlags = (planet: Planet | null) =>
//   planet?.tasks.flatMap(task =>
//     task.type === 'Question' ? [task.solved] : [],
//   );

/** The player's progress on planet 1. */
const progress = (correctCount: number): PlanetSummary => ({
  planetId: 1,
  name: 'Linear Land',
  graphOrder: 0,
  prereqIds: [],
  unlocked: true,
  status: correctCount === 2 ? 'peaceful' : 'hostile',
  correctCount,
  questionCount: 2,
  completionPct: correctCount / 2,
});

const QUESTION: Question = {
  questionId: 1,
  prompt: 'Question 1',
  type: 'mcq',
  options: [
    {optionId: 11, label: 'a', text: '2'},
    {optionId: 12, label: 'b', text: '3'},
  ],
};

/** The next question on planet 1, when the player has one answer correct. */
const NEXT: NextQuestion = {question: QUESTION, progress: progress(1)};

/**
 * Builds a fake gateway that returns PLAYER, PLANET and the player's progress.
 */
function fakeGateway() {
  return {
    login: vi.fn<ServerGateway['login']>().mockResolvedValue(PLAYER),
    getPlanets: vi
      .fn<ServerGateway['getPlanets']>()
      .mockResolvedValue([progress(0)]),
    getPlanet: vi.fn<ServerGateway['getPlanet']>().mockResolvedValue(PLANET),
    getNextQuestion: vi
      .fn<ServerGateway['getNextQuestion']>()
      .mockResolvedValue(NEXT),
    resetPlanet: vi
      .fn<ServerGateway['resetPlanet']>()
      .mockResolvedValue(progress(0)),
    saveSettings: vi.fn<ServerGateway['saveSettings']>(),
    awardHintCredits: vi.fn<ServerGateway['awardHintCredits']>(),
    submitAnswer: vi.fn<ServerGateway['submitAnswer']>(),
  };
}

/** The server's verdict on an answer to question 1. */
const result = (correct: boolean): AnswerResult => ({
  questionId: 1,
  correct,
  correctOption: {optionId: 11, label: 'a', text: '2'},
});

describe('SessionCache', () => {
  it('starts with no player, planet, question or progress', () => {
    const cache = new SessionCache(fakeGateway());
    expect(cache.player).toBeNull();
    expect(cache.currentPlanet).toBeNull();
    expect(cache.currentQuestion).toBeNull();
    expect(cache.planets).toEqual([]);
  });

  it('stores the player after login', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await expect(cache.login(PLAYER.name)).resolves.toBe(PLAYER);
    expect(cache.player).toBe(PLAYER);
    expect(gateway.login).toHaveBeenCalledWith(PLAYER.name);
  });

  it('stores the planet after loading it', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await expect(cache.loadPlanet(1)).resolves.toBe(PLANET);
    expect(cache.currentPlanet).toBe(PLANET);
    expect(gateway.getPlanet).toHaveBeenCalledWith(1);
  });

  it('keeps the player null when login fails', async () => {
    const gateway = fakeGateway();
    gateway.login.mockRejectedValue(new ApiError('network', 'offline'));
    const cache = new SessionCache(gateway);
    await expect(cache.login(PLAYER.name)).rejects.toMatchObject({
      kind: 'network',
    });
    expect(cache.player).toBeNull();
  });

  it('keeps the current planet when loading another one fails', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    const API_ERROR_KIND = 'http';
    const API_ERROR_MSG = 'missing';
    const API_ERROR_STATUS = 404;

    await cache.loadPlanet(1);
    gateway.getPlanet.mockRejectedValue(
      new ApiError(API_ERROR_KIND, API_ERROR_MSG, API_ERROR_STATUS),
    );
    await expect(cache.loadPlanet(2)).rejects.toMatchObject({
      kind: API_ERROR_KIND,
      status: API_ERROR_STATUS,
    });
    expect(cache.currentPlanet).toBe(PLANET);
  });

  it('keeps the latest requested planet when responses arrive out of order', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    const OTHER_PLANET: Planet = {
      ...makePlanet(2),
      name: 'Polynomial Perry the Platypus :D',
    };
    let resolveFirst!: (planet: Planet) => void;
    gateway.getPlanet
      .mockReturnValueOnce(new Promise(resolve => (resolveFirst = resolve)))
      .mockResolvedValueOnce(OTHER_PLANET);

    const first = cache.loadPlanet(1);
    await cache.loadPlanet(2);
    resolveFirst(PLANET);
    await expect(first).resolves.toBe(PLANET);
    expect(cache.currentPlanet).toBe(OTHER_PLANET);
  });

  it('clears the current planet when a new player logs in', async () => {
    const cache = new SessionCache(fakeGateway());
    await cache.loadPlanet(1);
    await cache.login(PLAYER.name);
    expect(cache.currentPlanet).toBeNull();
  });

  it('sends answers to the server and returns its verdict', async () => {
    const gateway = fakeGateway();
    gateway.submitAnswer.mockResolvedValue(result(true));
    const cache = new SessionCache(gateway);
    await expect(cache.submitAnswer(1, 11)).resolves.toEqual(result(true));
    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 11);
  });

  it('passes on a failed submission', async () => {
    const gateway = fakeGateway();
    gateway.submitAnswer.mockRejectedValue(new ApiError('timeout', 'slow'));
    const cache = new SessionCache(gateway);
    await expect(cache.submitAnswer(1, 11)).rejects.toMatchObject({
      kind: 'timeout',
    });
  });
});

describe('SessionCache progress and settings at login', () => {
  it("loads the player's settings and progress when they log in", async () => {
    const gateway = fakeGateway();
    gateway.getPlanets.mockResolvedValue([progress(1)]);
    const cache = new SessionCache(gateway);

    await cache.login(PLAYER.name);

    expect(cache.player?.settings).toEqual(PLAYER.settings);
    expect(cache.planets).toEqual([progress(1)]);
    expect(cache.progressFor(1)).toEqual(progress(1));
    expect(gateway.login.mock.invocationCallOrder[0]).toBeLessThan(
      gateway.getPlanets.mock.invocationCallOrder[0],
    );
  });

  it('has no progress for a planet that was not loaded', async () => {
    const cache = new SessionCache(fakeGateway());
    await cache.login(PLAYER.name);
    expect(cache.progressFor(2)).toBeNull();
  });

  it('fails the login when the progress cannot be loaded', async () => {
    const gateway = fakeGateway();
    gateway.getPlanets.mockRejectedValue(new ApiError('http', 'boom', 500));
    const cache = new SessionCache(gateway);

    await expect(cache.login(PLAYER.name)).rejects.toMatchObject({
      kind: 'http',
    });
    expect(cache.planets).toEqual([]);
  });

  it("clears the previous player's progress and question on a new login", async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await cache.login(PLAYER.name);
    await cache.loadPlanet(1);
    await cache.loadNextQuestion();
    gateway.getPlanets.mockResolvedValue([]);

    await cache.login('bob');

    expect(cache.planets).toEqual([]);
    expect(cache.currentQuestion).toBeNull();
  });

  it('saves settings and stores the updated player', async () => {
    const gateway = fakeGateway();
    const settings = {musicVolume: 0.8, sfxVolume: 0.1};
    const updated: Player = {...PLAYER, settings};
    gateway.saveSettings.mockResolvedValue(updated);
    const cache = new SessionCache(gateway);
    await cache.login(PLAYER.name);

    await expect(cache.saveSettings(settings)).resolves.toBe(updated);

    expect(gateway.saveSettings).toHaveBeenCalledWith(settings);
    expect(cache.player).toBe(updated);
  });

  it('keeps the old settings when saving fails', async () => {
    const gateway = fakeGateway();
    gateway.saveSettings.mockRejectedValue(new ApiError('network', 'offline'));
    const cache = new SessionCache(gateway);
    await cache.login(PLAYER.name);

    await expect(
      cache.saveSettings({musicVolume: 0.8, sfxVolume: 0.1}),
    ).rejects.toMatchObject({kind: 'network'});
    expect(cache.player).toBe(PLAYER);
  });
});

describe('SessionCache questions', () => {
  /** Creates a logged-in cache with planet 1 loaded. */
  async function setup() {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await cache.login(PLAYER.name);
    await cache.loadPlanet(1);
    return {gateway, cache};
  }

  it('loads the next question of the current planet with its progress', async () => {
    const {gateway, cache} = await setup();

    await expect(cache.loadNextQuestion()).resolves.toBe(QUESTION);

    expect(gateway.getNextQuestion).toHaveBeenCalledWith(1);
    expect(cache.currentQuestion).toBe(QUESTION);
    expect(cache.progressFor(1)).toEqual(progress(1));
  });

  it('stores no question once none are left', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.getNextQuestion.mockResolvedValue({
      question: null,
      progress: progress(2),
    });

    await expect(cache.loadNextQuestion()).resolves.toBeNull();

    expect(cache.currentQuestion).toBeNull();
    expect(cache.progressFor(1)?.status).toBe('peaceful');
  });

  it('refuses to load a question before a planet is loaded', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await expect(cache.loadNextQuestion()).rejects.toThrow('load a planet');
    await expect(cache.resetPlanet()).rejects.toThrow('load a planet');
    expect(gateway.getNextQuestion).not.toHaveBeenCalled();
    expect(gateway.resetPlanet).not.toHaveBeenCalled();
  });

  it('keeps the current question when loading the next one fails', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.getNextQuestion.mockRejectedValue(new ApiError('timeout', 'slow'));

    await expect(cache.loadNextQuestion()).rejects.toMatchObject({
      kind: 'timeout',
    });
    expect(cache.currentQuestion).toBe(QUESTION);
  });

  it('drops a question that arrives after the planet was reloaded', async () => {
    const {gateway, cache} = await setup();
    let resolveNext!: (next: NextQuestion) => void;
    gateway.getNextQuestion.mockReturnValueOnce(
      new Promise(resolve => (resolveNext = resolve)),
    );
    gateway.getPlanet.mockResolvedValue(makePlanet());

    const pending = cache.loadNextQuestion();
    await cache.loadPlanet(1);
    resolveNext(NEXT);
    await pending;

    expect(cache.currentQuestion).toBeNull();
    expect(cache.progressFor(1)).toEqual(progress(0));
  });

  it('forgets the current question when a planet is loaded', async () => {
    const {cache} = await setup();
    await cache.loadNextQuestion();

    await cache.loadPlanet(1);

    expect(cache.currentQuestion).toBeNull();
  });

  it.each([
    {verdict: 'correctly', correct: true},
    {verdict: 'wrong', correct: false},
  ])(
    'forgets the current question once it is answered $verdict',
    async ({correct}) => {
      const {gateway, cache} = await setup();
      await cache.loadNextQuestion();
      gateway.submitAnswer.mockResolvedValue(result(correct));

      await cache.submitAnswer(1, correct ? 11 : 12);

      expect(cache.currentQuestion).toBeNull();
    },
  );

  it('keeps the current question when its answer cannot be submitted', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.submitAnswer.mockRejectedValue(new ApiError('timeout', 'slow'));

    await expect(cache.submitAnswer(1, 11)).rejects.toMatchObject({
      kind: 'timeout',
    });

    expect(cache.currentQuestion).toBe(QUESTION);
  });

  it('forgets the current question when the server says it was already answered', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.submitAnswer.mockRejectedValue(
      new ApiError('http', 'answered', 409, 'ALREADY_ANSWERED'),
    );

    await expect(cache.submitAnswer(1, 11)).rejects.toMatchObject({
      code: 'ALREADY_ANSWERED',
    });

    expect(cache.currentQuestion).toBeNull();
  });

  it('keeps the current question when a different question is answered', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.submitAnswer.mockResolvedValue({...result(true), questionId: 2});

    await cache.submitAnswer(2, 21);

    expect(cache.currentQuestion).toBe(QUESTION);
  });

  it('resets the current planet, storing the reset progress and forgetting the question', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();

    await expect(cache.resetPlanet()).resolves.toEqual(progress(0));

    expect(gateway.resetPlanet).toHaveBeenCalledWith(1);
    expect(cache.currentQuestion).toBeNull();
    expect(cache.progressFor(1)).toEqual(progress(0));
  });

  it('keeps the progress and question when the reset fails', async () => {
    const {gateway, cache} = await setup();
    await cache.loadNextQuestion();
    gateway.resetPlanet.mockRejectedValue(new ApiError('network', 'offline'));

    await expect(cache.resetPlanet()).rejects.toMatchObject({kind: 'network'});

    expect(cache.currentQuestion).toBe(QUESTION);
    expect(cache.progressFor(1)).toEqual(progress(1));
  });
});

describe('SessionCache hint rewards', () => {
  it('calls the existing route and stores the server balance', async () => {
    const gateway = fakeGateway();
    gateway.awardHintCredits.mockResolvedValue({hintQuota: 8});
    const cache = new SessionCache(gateway);
    await cache.login('alice');

    await expect(cache.awardHintCredits(1)).resolves.toBe(8);

    expect(gateway.awardHintCredits).toHaveBeenCalledExactlyOnceWith(1);
    expect(cache.player?.hintQuota).toBe(8);
  });

  it('keeps the cached balance unchanged if the request fails', async () => {
    const gateway = fakeGateway();
    gateway.awardHintCredits.mockRejectedValue(
      new ApiError('network', 'offline'),
    );
    const cache = new SessionCache(gateway);
    await cache.login('alice');

    await expect(cache.awardHintCredits(1)).rejects.toMatchObject({
      kind: 'network',
    });
    expect(cache.player?.hintQuota).toBe(3);
    expect(gateway.awardHintCredits).toHaveBeenCalledTimes(1);
  });

  it('does not award credits before login', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await expect(cache.awardHintCredits(1)).rejects.toThrow('Must log in');
    expect(gateway.awardHintCredits).not.toHaveBeenCalled();
  });

  it('does not apply an old reward response to a different player', async () => {
    const gateway = fakeGateway();
    let finishReward!: (balance: {hintQuota: number}) => void;
    gateway.awardHintCredits.mockReturnValueOnce(
      new Promise(resolve => {
        finishReward = resolve;
      }),
    );
    const cache = new SessionCache(gateway);
    await cache.login('alice');
    const pending = cache.awardHintCredits(1);

    gateway.login.mockResolvedValue({...PLAYER, userId: 8, name: 'bob'});
    await cache.login('bob');
    finishReward({hintQuota: 4});
    await pending;

    expect(cache.player?.name).toBe('bob');
    expect(cache.player?.hintQuota).toBe(3);
  });
});
