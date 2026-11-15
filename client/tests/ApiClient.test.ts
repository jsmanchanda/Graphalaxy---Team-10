import {describe, expect, it, vi} from 'vitest';
import {ApiClient} from '../src/Frontend/ApiClient';
import {ApiError} from '../src/Frontend/ApiError';

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
      question: {
        questionId: 1,
        prompt: 'What is the slope of y = 2x + 3?',
        graph: {fn: '2*x+3'},
        type: 'mcq',
        options: [
          {optionId: 11, label: 'a', text: '2'},
          {optionId: 12, label: 'b', text: '3'},
        ],
      },
      // solved: false,
    },
  ],
};
const RESULT = {
  questionId: 1,
  correct: true,
  correctOption: {optionId: 11, label: 'a', text: '2'},
};
const SUMMARY = {
  planetId: 1,
  name: 'Linear Land',
  graphOrder: 0,
  prereqIds: [],
  unlocked: true,
  status: 'hostile',
  correctCount: 1,
  questionCount: 5,
  completionPct: 0.2,
};
const NEXT = {
  question: {
    questionId: 2,
    prompt: 'What is the y-intercept of y = 2x + 3?',
    graph: {fn: '2*x+3'},
    type: 'mcq',
    options: [
      {optionId: 21, label: 'a', text: '2'},
      {optionId: 22, label: 'b', text: '3'},
    ],
  },
  progress: SUMMARY,
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

  it('gets a planet for the logged-in user and parses it', async () => {
    const {client, http} = await loggedIn(json(PLANET));
    await expect(client.getPlanet(1)).resolves.toEqual(PLANET);
    expect(http.mock.calls[1][0]).toBe('/api/users/7/planets/1');
  });

  it('submits an answer as a JSON POST and parses the result', async () => {
    const {client, http} = await loggedIn(json(RESULT));
    await expect(client.submitAnswer(1, 11)).resolves.toEqual(RESULT);
    const [url, init] = http.mock.calls[1];
    expect(url).toBe('/api/users/7/questions/1/answer');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({optionId: 11}));
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

  it.each(['{bad', JSON.stringify({planetId: 1})])(
    'reports an invalid body %s as a parse error',
    async body => {
      const {client} = await loggedIn(new Response(body));
      await expect(client.getPlanet(1)).rejects.toMatchObject({kind: 'parse'});
    },
  );

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

  it('never retries an answer submission', async () => {
    const {client, http} = await loggedIn(json({}, 500));
    await expect(client.submitAnswer(1, 11)).rejects.toMatchObject({
      kind: 'http',
      status: 500,
    });
    // login + 1 try
    expect(http).toHaveBeenCalledTimes(2);
  });
});

describe('ApiClient progress, questions and settings', () => {
  it("gets the logged-in user's progress on every planet", async () => {
    const {client, http} = await loggedIn(json([SUMMARY]));
    await expect(client.getPlanets()).resolves.toEqual([SUMMARY]);
    const [url, init] = http.mock.calls[1];
    expect(url).toBe('/api/users/7/planets');
    expect(init?.method).toBe('GET');
  });

  it('gets the next question of a planet with the progress on it', async () => {
    const {client, http} = await loggedIn(json(NEXT));
    await expect(client.getNextQuestion(1)).resolves.toEqual(NEXT);
    expect(http.mock.calls[1][0]).toBe('/api/users/7/planets/1/questions/next');
  });

  it('accepts no next question once none are left', async () => {
    const done = {question: null, progress: SUMMARY};
    const {client} = await loggedIn(json(done));
    await expect(client.getNextQuestion(1)).resolves.toEqual(done);
  });

  it('resets a planet with a DELETE and parses the reset progress', async () => {
    const {client, http} = await loggedIn(json(SUMMARY));
    await expect(client.resetPlanet(1)).resolves.toEqual(SUMMARY);
    const [url, init] = http.mock.calls[1];
    expect(url).toBe('/api/users/7/planets/1/progress');
    expect(init?.method).toBe('DELETE');
    expect(init?.body).toBeUndefined();
  });

  it('retries a planet reset after a 5xx response', async () => {
    const {client, http} = await loggedIn(json({}, 500), json(SUMMARY));
    await expect(client.resetPlanet(1)).resolves.toMatchObject({planetId: 1});
    // login + 2 tries
    expect(http).toHaveBeenCalledTimes(3);
  });

  it('saves settings as a JSON PATCH and parses the updated player', async () => {
    const settings = {musicVolume: 0.8, sfxVolume: 0.1};
    const {client, http} = await loggedIn(json({...PLAYER, settings}));
    await expect(client.saveSettings(settings)).resolves.toEqual({
      ...PLAYER,
      settings,
    });
    const [url, init] = http.mock.calls[1];
    expect(url).toBe('/api/users/7/settings');
    expect(init?.method).toBe('PATCH');
    expect(init?.body).toBe(JSON.stringify(settings));
  });

  it('reports malformed progress as a parse error', async () => {
    const {client} = await loggedIn(json({planets: [SUMMARY]}));
    await expect(client.getPlanets()).rejects.toMatchObject({kind: 'parse'});
  });

  it('rejects progress and question requests before login without calling http', async () => {
    const http = fakeHttp();
    const client = new ApiClient(http, OPTIONS);
    await expect(client.getPlanets()).rejects.toThrow();
    await expect(client.getNextQuestion(1)).rejects.toThrow();
    await expect(client.resetPlanet(1)).rejects.toThrow();
    expect(http).not.toHaveBeenCalled();
  });
});
