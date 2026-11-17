import type {Server} from 'node:http';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {ApiClient} from '../../client/src/Frontend/ApiClient';
import {SessionCache} from '../../client/src/Frontend/SessionCache';
import {taskToScreen} from '../../client/src/Frontend/screenModelMaker';
import {createAppFixture, requireValue} from './helpers/appFixture';

describe('Frontend session and API client against the real HTTP server', () => {
  let fixture: ReturnType<typeof createAppFixture>;
  let server: Server;
  let client: ApiClient;
  let session: SessionCache;

  beforeEach(async () => {
    fixture = createAppFixture();
    server = fixture.app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Missing server port');
    }
    client = new ApiClient(globalThis.fetch, {
      baseUrl: `http://127.0.0.1:${address.port}/api`,
      timeoutMs: 5000,
      retries: 0,
    });
    session = new SessionCache(client);
  });

  afterEach(async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        server.close(error => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
    } finally {
      fixture.db.close();
    }
  });

  it('logs in, parses and caches a planet, and converts every task to a screen', async () => {
    const player = await session.login('integration');
    const planet = await session.loadPlanet(1);
    expect(session.player).toEqual(player);
    expect(session.currentPlanet).toEqual(planet);
    expect(fixture.writer.users.findById(player.userId)?.username).toBe(
      'integration',
    );
    expect(planet.tasks.length).toBeGreaterThan(0);
    for (const task of planet.tasks) {
      const screen = taskToScreen(task);
      expect(screen.type).toBe(
        task.type === 'Reading' ? 'reading' : 'question',
      );
    }
  });

  it('saves settings through the real client and retrieves them in a new session', async () => {
    const player = await session.login('settings');
    const settings = {musicVolume: 0.25, sfxVolume: 0.75};
    expect((await client.saveSettings(settings)).settings).toEqual(settings);
    const again = await session.login('settings');
    expect(again.userId).toBe(player.userId);
    expect(again.settings).toEqual(settings);
  });

  it('grades every seeded question and persists the submitted option IDs', async () => {
    const player = await session.login('answers');
    const planet = await session.loadPlanet(1);
    for (const task of planet.tasks) {
      if (task.type !== 'Question') continue;
      const question = task.question;
      const correct = requireValue(
        fixture.writer.content.getCorrectOption(question.questionId),
      );
      const wrong = requireValue(
        question.options.find(option => option.optionId !== correct.optionId),
      );
      expect(
        (await session.submitAnswer(question.questionId, wrong.optionId))
          .correct,
      ).toBe(false);
      expect(
        (await session.submitAnswer(question.questionId, correct.optionId))
          .correct,
      ).toBe(true);
      await session.submitAnswer(question.questionId, correct.optionId);
      expect(
        fixture.writer.answers.hasSolved(player.userId, question.questionId),
      ).toBe(true);
    }
    const count = fixture.writer.content.countQuestions(1);
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(count * 2);
  });

  it('turns server rejections into API errors without discarding the current planet', async () => {
    await session.login('errors');
    const planet = await session.loadPlanet(1);
    await expect(session.loadPlanet(999)).rejects.toMatchObject({
      kind: 'http',
      status: 404,
    });
    expect(session.currentPlanet).toBe(planet);
    await expect(session.submitAnswer(1, 999)).rejects.toMatchObject({
      kind: 'http',
      status: 400,
    });
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(0);
  });

  it("clears planet state on account changes and isolates each player's answers", async () => {
    const first = await session.login('first');
    await session.loadPlanet(1);
    const correct = requireValue(fixture.writer.content.getCorrectOption(1));
    await session.submitAnswer(1, correct.optionId);
    const second = await session.login('second');
    expect(session.currentPlanet).toBeNull();
    expect(session.player).toEqual(second);
    expect(fixture.writer.answers.hasSolved(first.userId, 1)).toBe(true);
    expect(fixture.writer.answers.hasSolved(second.userId, 1)).toBe(false);
  });
});
