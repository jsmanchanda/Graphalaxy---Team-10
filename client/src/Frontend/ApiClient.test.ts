import {describe, expect, it, vi} from 'vitest';
import {ApiClient} from './ApiClient';
import {ApiError} from './ApiError';

const OPTIONS = {baseUrl: '/api', timeoutMs: 20, retries: 2};
const PLAYER = {
  userId: 7,
  name: 'alice',
  hintQuota: 3,
  settings: {musicVolume: 0.5, sfxVolume: 0.5},
};
const PLANET = {
  planetId: 1,
  name: 'Linear Land',
  introText: 'A hostile world of straight lines.',
  graphOrder: 0,
  tasks: [
    {type: 'Reading', text: 'A linear function has the form y = mx + b.'},
    {
      type: 'Question',
      questionId: 1,
      prompt: 'What is the slope of y = 2x + 3?',
      graph: {fn: '2*x+3'},
      options: ['2', '3', '4', 'undefined'],
      correct: 0,
      solved: false,
    },
  ],
};

/**
 * Builds a fake fetch that return in the order of responses.
 */
function fakeHttp(...responses: Array<Response | Error>) {
  const http = vi.fn<typeof fetch>();
  for (const r of responses) {
    if (r instanceof Error) http.mockRejectedValueOnce(r);
    else http.mockResolvedValueOnce(r);
  }
  return http;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status});

/**
 * Logs in so user-scoped requests work, using up the first response.
 */
async function loggedIn(...responses: Array<Response | Error>) {
  const http = fakeHttp(json(PLAYER), ...responses);
  const client = new ApiClient(http, OPTIONS);
  await client.login('alice');
  return {client, http};
}

describe('ApiClient requests', () => {
  it('sends login as a JSON POST to /api/users', async () => {
    const http = fakeHttp(json(PLAYER));
    await new ApiClient(http, OPTIONS).login('alice');
    const [url, init] = http.mock.calls[0];
    expect(url).toBe('/api/users');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({username: 'alice'}));
    expect(init?.headers).toEqual({'Content-Type': 'application/json'});
  });

  it('rejects user requests before login without calling http', async () => {
    const http = fakeHttp();
    await expect(new ApiClient(http, OPTIONS).getPlanet(1)).rejects.toThrow();
    expect(http).not.toHaveBeenCalled();
  });
});

describe('ApiClient errors', () => {
  it('maps an error response to an http ApiError', async () => {
    const {client} = await loggedIn(
      json({error: {code: 'NOT_FOUND', message: 'Planet not found'}}, 404),
    );
    const error = await client.getPlanet(3).catch(e => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({kind: 'http', status: 404});
  });

  it('times out a request that never answers', async () => {
    const hang: typeof fetch = (url, init) =>
      new Promise((resolve, reject) =>
        init?.signal?.addEventListener('abort', () =>
          reject(new Error('aborted')),
        ),
      );
    const http = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(json(PLAYER))
      .mockImplementation(hang);
    const client = new ApiClient(http, OPTIONS);
    await client.login('alice');
    await expect(client.getPlanet(1)).rejects.toMatchObject({kind: 'timeout'});
  });
});

describe('ApiClient retries', () => {
  it('retries a GET after 5xx responses', async () => {
    const {client, http} = await loggedIn(
      json({}, 500),
      json({}, 500),
      json(PLANET),
    );
    await expect(client.getPlanet(1)).resolves.toMatchObject({planetId: 1});
    // login + 3 tries
    expect(http).toHaveBeenCalledTimes(4);
  });

  it('never retries a POST', async () => {
    const http = fakeHttp(json({}, 500));
    await expect(
      new ApiClient(http, OPTIONS).login('alice'),
    ).rejects.toMatchObject({
      kind: 'http',
      status: 500,
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
});
