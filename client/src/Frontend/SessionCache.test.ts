import {describe, expect, it, vi} from 'vitest';
import type {ServerGateway} from './ApiClient';
import {ApiError} from './ApiError';
import {SessionCache} from './SessionCache';
import {Planet, Player} from './SessionCacheModels';

const PLAYER_JSON = {
  userId: 7,
  name: 'alice',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.5},
};
const PLAYER = Player.createFromJson(JSON.stringify(PLAYER_JSON));

const PLANET_JSON = {
  planetId: 1,
  name: 'Linear Land',
  introText: 'A hostile world of straight lines.',
  graphOrder: 0,
  tasks: [
    {type: 'Reading', text: 'A linear function has the form y = mx + b.'},
    {
      type: 'Question',
      prompt: 'What is the slope of y = 2x + 3?',
      options: ['2', '3', '4', 'undefined'],
      correct: 0,
    },
  ],
};
const PLANET = Planet.createFromJson(JSON.stringify(PLANET_JSON));

/**
 * Builds a fake gateway that returns PLAYER and PLANET.
 */
function fakeGateway() {
  return {
    login: vi.fn<ServerGateway['login']>().mockResolvedValue(PLAYER),
    getPlanet: vi.fn<ServerGateway['getPlanet']>().mockResolvedValue(PLANET),
    saveSettings: vi.fn<ServerGateway['saveSettings']>(),
  };
}

describe('SessionCache', () => {
  it('starts with no player or planet', () => {
    const cache = new SessionCache(fakeGateway());
    expect(cache.player).toBeNull();
    expect(cache.currentPlanet).toBeNull();
  });

  it('stores the player after login', async () => {
    const gateway = fakeGateway();
    const cache = new SessionCache(gateway);
    await expect(cache.login(PLAYER['name'])).resolves.toBe(PLAYER);
    expect(cache.player).toBe(PLAYER);
    expect(gateway.login).toHaveBeenCalledWith(PLAYER['name']);
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
    await expect(cache.login(PLAYER['name'])).rejects.toMatchObject({
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
});
