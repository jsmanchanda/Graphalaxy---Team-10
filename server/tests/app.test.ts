import type {Database} from 'better-sqlite3';
import type {Express} from 'express';
import request from 'supertest';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {createApp} from '../src/app';
import {createDataWriter, type DataWriter} from '../src/data-writer';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {ProgressManager} from '../src/progress-manager/ProgressManager';
import {QuestionManager} from '../src/question-manager/QuestionManager';
import {addTestContent} from './helpers/fixture2';

const ANSWER_KEY = /is_correct|isCorrect|correctOption|"correct"/;

describe('progress and question routes', () => {
  let db: Database;
  let writer: DataWriter;
  let app: Express;
  let user: string; // '/api/users/:userId' for the logged-in player

  beforeEach(async () => {
    db = openDb(':memory:');
    migrate(db);
    addTestContent(db); // one planet (id 1), 2 readings, questions 1 to 5
    writer = createDataWriter(db);
    const progress = new ProgressManager(writer);
    const questions = new QuestionManager(writer, progress);
    // Hints have their own tests; these routes are not exercised here.
    const hints = {
      getBalance: () => 0,
      getUnlockedHints: () => [],
      unlockNextHint: () => ({hint: null, hintQuota: 0}),
    };
    app = createApp({questions, progress, hints, dataWriter: writer});

    const login = await request(app).post('/api/users').send({username: 'amy'});
    user = `/api/users/${login.body.userId}`;
  });

  afterEach(() => db.close());

  /** Answers the question the server serves next, correctly or not. */
  async function answerNext(correct = true) {
    const next = await request(app).get(`${user}/planets/1/questions/next`);
    const questionId: number = next.body.question.questionId;
    const right = writer.content.getCorrectOption(questionId)?.optionId;
    const option = writer.content
      .getPublicOptions(questionId)
      .find(o => (o.optionId === right) === correct);
    return request(app)
      .post(`${user}/questions/${questionId}/answer`)
      .send({optionId: option?.optionId});
  }

  it("lists the player's progress on every planet", async () => {
    const res = await request(app).get(`${user}/planets`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        planetId: 1,
        name: 'Linear Land',
        graphOrder: 0,
        prereqIds: [],
        unlocked: true,
        status: 'hostile',
        correctCount: 0,
        questionCount: 5,
        completionPct: 0,
      },
    ]);
  });

  it('sends a planet as its readings, without its questions', async () => {
    const res = await request(app).get(`${user}/planets/1`);

    expect(res.status).toBe(200);
    expect(res.body.tasks).toEqual([
      {type: 'Reading', text: 'A linear function has the form y = mx + b.'},
      {type: 'Reading', text: 'm is the slope and b is the y-intercept.'},
    ]);
  });

  it('serves one question at a time, in question ID order, without its answer key', async () => {
    const first = await request(app).get(`${user}/planets/1/questions/next`);

    expect(first.status).toBe(200);
    expect(first.body.question).toMatchObject({
      questionId: 1,
      prompt: 'What is the slope of y = 2x + 3?',
      graph: {fn: '2*x+3'},
      type: 'mcq',
    });
    expect(first.body.question.options).toHaveLength(4);
    expect(first.body.progress).toMatchObject({planetId: 1, correctCount: 0});
    expect(JSON.stringify(first.body)).not.toMatch(ANSWER_KEY);

    await answerNext();
    const second = await request(app).get(`${user}/planets/1/questions/next`);
    expect(second.body.question.questionId).toBe(2);
    expect(second.body.progress).toMatchObject({
      correctCount: 1,
      completionPct: 0.2,
    });
  });

  it('moves on to the next question after a wrong answer', async () => {
    expect((await answerNext(false)).body.correct).toBe(false);

    const next = await request(app).get(`${user}/planets/1/questions/next`);
    expect(next.body.question.questionId).toBe(2);
    expect(next.body.progress.correctCount).toBe(0);
  });

  it('asks every question once, then reports the score of a run with wrong answers', async () => {
    const asked: number[] = [];
    for (const correct of [true, false, true, false, true]) {
      const res = await answerNext(correct);
      asked.push(res.body.questionId);
    }

    const next = await request(app).get(`${user}/planets/1/questions/next`);
    expect(asked).toEqual([1, 2, 3, 4, 5]);
    expect(next.body).toEqual({
      question: null,
      progress: expect.objectContaining({
        status: 'hostile',
        correctCount: 3,
        questionCount: 5,
        completionPct: 0.6,
      }),
    });
  });

  it('lets a run with wrong answers be redone from the first question', async () => {
    for (const correct of [false, false, true, true, true]) {
      await answerNext(correct);
    }

    await request(app).delete(`${user}/planets/1/progress`);
    for (let i = 0; i < 5; i++) await answerNext();

    const next = await request(app).get(`${user}/planets/1/questions/next`);
    expect(next.body.question).toBeNull();
    expect(next.body.progress).toMatchObject({
      status: 'peaceful',
      correctCount: 5,
    });
  });

  it('serves no question once all are answered, and reports the planet peaceful', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await answerNext()).body.correct).toBe(true);
    }

    const next = await request(app).get(`${user}/planets/1/questions/next`);
    expect(next.status).toBe(200);
    expect(next.body).toEqual({
      question: null,
      progress: expect.objectContaining({
        status: 'peaceful',
        correctCount: 5,
        completionPct: 1,
      }),
    });
  });

  it('resets a planet so it can be redone from the first question', async () => {
    for (let i = 0; i < 5; i++) await answerNext();

    const reset = await request(app).delete(`${user}/planets/1/progress`);

    expect(reset.status).toBe(200);
    expect(reset.body).toMatchObject({
      planetId: 1,
      status: 'hostile',
      correctCount: 0,
      completionPct: 0,
    });
    const next = await request(app).get(`${user}/planets/1/questions/next`);
    expect(next.body.question.questionId).toBe(1);
    const planets = await request(app).get(`${user}/planets`);
    expect(planets.body[0]).toMatchObject({status: 'hostile', correctCount: 0});
  });

  it('answers 409 to a second answer and keeps the first', async () => {
    const first = await answerNext(false);
    const questionId: number = first.body.questionId;
    const right = writer.content.getCorrectOption(questionId)?.optionId;

    const second = await request(app)
      .post(`${user}/questions/${questionId}/answer`)
      .send({optionId: right});

    expect(second.status).toBe(409);
    expect(second.body.error).toEqual({
      code: 'ALREADY_ANSWERED',
      message: `Question ${questionId} has already been answered.`,
    });
    const planets = await request(app).get(`${user}/planets`);
    expect(planets.body[0].correctCount).toBe(0);
  });

  it('logs the same player in whatever the capitalisation of the name', async () => {
    await request(app)
      .patch(`${user}/settings`)
      .send({musicVolume: 0.8, sfxVolume: 0.1});

    const login = await request(app).post('/api/users').send({username: 'AMY'});

    expect(`/api/users/${login.body.userId}`).toBe(user);
    expect(login.body.name).toBe('amy');
    expect(login.body.settings).toEqual({musicVolume: 0.8, sfxVolume: 0.1});
  });

  it("returns the player's saved settings when they log in again", async () => {
    const saved = await request(app)
      .patch(`${user}/settings`)
      .send({musicVolume: 0.8, sfxVolume: 0.1});
    expect(saved.status).toBe(200);

    const login = await request(app).post('/api/users').send({username: 'amy'});
    expect(login.body.settings).toEqual({musicVolume: 0.8, sfxVolume: 0.1});
  });

  it.each<{method: 'get' | 'delete'; url: string}>([
    {method: 'get', url: '/api/users/999/planets'},
    {method: 'get', url: '/api/users/999/planets/1/questions/next'},
    {method: 'delete', url: '/api/users/999/planets/1/progress'},
  ])(
    'answers 404 to $method $url for an unknown user',
    async ({method, url}) => {
      const res = await request(app)[method](url);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );

  it.each(['get', 'delete'] as const)(
    'answers 404 to %s for an unknown planet',
    async method => {
      const url =
        method === 'get'
          ? `${user}/planets/999/questions/next`
          : `${user}/planets/999/progress`;
      const res = await request(app)[method](url);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );

  it('answers 400 to an ID that is not a positive integer', async () => {
    const res = await request(app).get(`${user}/planets/abc/questions/next`);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_INPUT');
  });
});
