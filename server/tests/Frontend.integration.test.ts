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
    expect(session.planets).toHaveLength(
      fixture.writer.content.listPlanets().length,
    );
    expect(session.progressFor(1)).toMatchObject({
      correctCount: 0,
      status: 'hostile',
      unlocked: true,
    });
    expect(planet.tasks.length).toBeGreaterThan(0);
    for (const task of planet.tasks) {
      const screen = taskToScreen(task);
      expect(task.type).toBe('Reading');
      expect(screen.type).toBe('reading');
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

  it('loads and grades every seeded question once, then resets and completes it correctly', async () => {
    const player = await session.login('answers');
    const planet = await session.loadPlanet(1);
    const expected = fixture.writer.content.getQuestions(planet.planetId);
    expect(expected.length).toBeGreaterThan(0);
    const recorded: Array<{questionId: number; optionId: number}> = [];
    for (const row of expected) {
      const question = await session.loadNextQuestion();
      expect(question?.questionId).toBe(row.questionId);
      if (!question) throw new Error('Question unexpectedly missing');
      expect(session.currentQuestion).toBe(question);
      expect(taskToScreen({type: 'Question', question}).type).toBe('question');
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
      expect(session.currentQuestion).toBeNull();
      await expect(
        session.submitAnswer(question.questionId, correct.optionId),
      ).rejects.toMatchObject({
        kind: 'http',
        status: 409,
        code: 'ALREADY_ANSWERED',
      });
      recorded.push({
        questionId: question.questionId,
        optionId: wrong.optionId,
      });
    }
    expect(await session.loadNextQuestion()).toBeNull();
    expect(session.progressFor(1)).toMatchObject({
      correctCount: 0,
      status: 'hostile',
    });
    expect(
      fixture.db
        .prepare(
          'SELECT question_id AS questionId, selected_option_id AS optionId FROM user_answer ORDER BY answer_id',
        )
        .all(),
    ).toEqual(recorded);
    expect(recorded).toHaveLength(expected.length);
    expect(await session.resetPlanet()).toMatchObject({
      correctCount: 0,
      status: 'hostile',
    });
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(0);
    for (const row of expected) {
      const question = await session.loadNextQuestion();
      expect(question?.questionId).toBe(row.questionId);
      const correct = requireValue(
        fixture.writer.content.getCorrectOption(row.questionId),
      );
      expect(
        (await session.submitAnswer(row.questionId, correct.optionId)).correct,
      ).toBe(true);
      expect(
        fixture.writer.answers.hasSolved(player.userId, row.questionId),
      ).toBe(true);
    }
    expect(await session.loadNextQuestion()).toBeNull();
    expect(session.progressFor(1)).toMatchObject({
      correctCount: expected.length,
      questionCount: expected.length,
      completionPct: 1,
      status: 'peaceful',
    });
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(expected.length);
    await session.login('answers');
    expect(session.progressFor(1)?.status).toBe('peaceful');
    await session.loadPlanet(1);
    expect(await session.loadNextQuestion()).toBeNull();
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
    await session.loadNextQuestion();
    const second = await session.login('second');
    expect(session.currentPlanet).toBeNull();
    expect(session.currentQuestion).toBeNull();
    expect(session.progressFor(1)?.correctCount).toBe(0);
    expect(session.player).toEqual(second);
    expect(fixture.writer.answers.hasSolved(first.userId, 1)).toBe(true);
    expect(fixture.writer.answers.hasSolved(second.userId, 1)).toBe(false);
  });
});
