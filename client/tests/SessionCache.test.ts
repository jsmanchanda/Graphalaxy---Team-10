import {describe, expect, it, vi} from 'vitest';
import type {AnswerResult, Planet, Player} from '@graphalaxy/shared';
import type {ServerGateway} from '../src/Frontend/ApiClient';
import {ApiError} from '../src/Frontend/ApiError';
import {SessionCache} from '../src/Frontend/SessionCache';

const PLAYER: Player = {
  userId: 7,
  name: 'alice',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.5},
};

/** Builds a fresh planet, so tests that mark questions solved don't leak. */
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
        solved: false,
      })),
    ],
  };
}
const PLANET = makePlanet();

/** The solved flag of each question on a planet. */
const solvedFlags = (planet: Planet | null) =>
  planet?.tasks.flatMap(task =>
    task.type === 'Question' ? [task.solved] : [],
  );

/**
 * Builds a fake gateway that returns PLAYER and PLANET.
 */
function fakeGateway() {
  return {
    login: vi.fn<ServerGateway['login']>().mockResolvedValue(PLAYER),
    getPlanet: vi.fn<ServerGateway['getPlanet']>().mockResolvedValue(PLANET),
    saveSettings: vi.fn<ServerGateway['saveSettings']>(),
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
  it('starts with no player or planet', () => {
    const cache = new SessionCache(fakeGateway());
    expect(cache.player).toBeNull();
    expect(cache.currentPlanet).toBeNull();
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

  it('sends answers to the server and marks a correct one solved', async () => {
    const gateway = fakeGateway();
    gateway.getPlanet.mockResolvedValue(makePlanet());
    gateway.submitAnswer.mockResolvedValue(result(true));
    const cache = new SessionCache(gateway);
    await cache.loadPlanet(1);
    await expect(cache.submitAnswer(1, 11)).resolves.toEqual(result(true));
    expect(gateway.submitAnswer).toHaveBeenCalledWith(1, 11);
    expect(solvedFlags(cache.currentPlanet)).toEqual([true, false]);
  });

  it('leaves a question unsolved after a wrong answer', async () => {
    const gateway = fakeGateway();
    gateway.getPlanet.mockResolvedValue(makePlanet());
    gateway.submitAnswer.mockResolvedValue(result(false));
    const cache = new SessionCache(gateway);
    await cache.loadPlanet(1);
    await cache.submitAnswer(1, 12);
    expect(solvedFlags(cache.currentPlanet)).toEqual([false, false]);
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
