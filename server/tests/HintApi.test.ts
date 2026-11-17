import type {Express} from 'express';
import type {Database} from 'better-sqlite3';
import request from 'supertest';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createApp} from '../src/app';
import {createDataWriter, type DataWriter} from '../src/data-writer';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {seed} from '../src/db/seed';
import {HintManager} from '../src/hint-manager/hintmanager';
import {QuestionManager} from '../src/question-manager/QuestionManager';

describe('Hint API with the official schema and Data Writer', () => {
  let db: Database;
  let writer: DataWriter;
  let app: Express;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    seed(db);
    writer = createDataWriter(db);
    writer.users.create('first');
    writer.users.create('second');
    db.exec(`
      INSERT INTO planets (planet_id, name, intro_text) VALUES (2, 'Empty', 'Intro');
      INSERT INTO planet_hints (planet_id, hint_number, text)
        VALUES (1, 4, 'Fourth hint');
    `);
    app = createApp({
      questions: new QuestionManager(writer, {onAnswer: vi.fn()}),
      hints: new HintManager(writer),
      dataWriter: writer,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  it('returns the current balance using the shared response shape', async () => {
    const response = await request(app).get('/api/users/1/hints/balance');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({hintQuota: 3});
  });

  it('hides locked hints, unlocks the next hint, and allows free review', async () => {
    const before = await request(app).get('/api/users/1/planets/1/hints');
    expect(before.status).toBe(200);
    expect(before.body).toEqual([]);

    const unlocked = await request(app).post(
      '/api/users/1/planets/1/hints/unlock',
    );
    expect(unlocked.status).toBe(200);
    expect(unlocked.body).toEqual({
      hint: {
        hintId: 1,
        planetId: 1,
        hintNumber: 1,
        text: 'The slope is the number multiplied by x.',
      },
      hintQuota: 2,
    });
    for (let i = 0; i < 2; i++) {
      const review = await request(app).get('/api/users/1/planets/1/hints');
      expect(review.status).toBe(200);
      expect(review.body).toEqual([unlocked.body.hint]);
    }
    const balance = await request(app).get('/api/users/1/hints/balance');
    expect(balance.body).toEqual({hintQuota: 2});
  });

  it("keeps one player's unlocks and balance separate from another player", async () => {
    await request(app).post('/api/users/1/planets/1/hints/unlock').expect(200);
    const hints = await request(app).get('/api/users/2/planets/1/hints');
    const balance = await request(app).get('/api/users/2/hints/balance');
    expect(hints.body).toEqual([]);
    expect(balance.body).toEqual({hintQuota: 3});
  });

  it('returns 409 with NO_HINTS_LEFT without unlocking another hint', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/users/1/planets/1/hints/unlock')
        .expect(200);
    }
    const response = await request(app).post(
      '/api/users/1/planets/1/hints/unlock',
    );
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('NO_HINTS_LEFT');
    expect(writer.users.findById(1)?.hintQuota).toBe(0);
    expect(writer.hints.list(1, 1).filter(hint => hint.used)).toHaveLength(3);
  });

  it('returns null without charging on an empty or fully unlocked planet', async () => {
    const empty = await request(app).post(
      '/api/users/1/planets/2/hints/unlock',
    );
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual({hint: null, hintQuota: 3});
    writer.hints
      .list(1, 1)
      .forEach(hint => writer.hints.markUsed(1, hint.hintId));
    const exhausted = await request(app).post(
      '/api/users/1/planets/1/hints/unlock',
    );
    expect(exhausted.status).toBe(200);
    expect(exhausted.body).toEqual({hint: null, hintQuota: 3});
  });

  it.each(['0', '-1', '1.5', 'abc', '1e3', '9007199254740992'])(
    'rejects invalid URL IDs: %s',
    async id => {
      const responses = [
        await request(app).get(`/api/users/${id}/hints/balance`),
        await request(app).get(`/api/users/${id}/planets/1/hints`),
        await request(app).post(`/api/users/${id}/planets/1/hints/unlock`),
        await request(app).get(`/api/users/1/planets/${id}/hints`),
        await request(app).post(`/api/users/1/planets/${id}/hints/unlock`),
      ];
      for (const response of responses) {
        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('INVALID_INPUT');
      }
      expect(writer.users.findById(1)?.hintQuota).toBe(3);
    },
  );

  it('returns 404 for missing players and planets', async () => {
    const responses = [
      await request(app).get('/api/users/999/hints/balance'),
      await request(app).get('/api/users/999/planets/1/hints'),
      await request(app).post('/api/users/999/planets/1/hints/unlock'),
      await request(app).get('/api/users/1/planets/999/hints'),
      await request(app).post('/api/users/1/planets/999/hints/unlock'),
    ];
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
    expect(writer.users.findById(1)?.hintQuota).toBe(3);
  });

  it('returns 500 on a failed unlock without leaking the cause or spending a credit', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    db.exec(`
      CREATE TEMP TRIGGER reject_hint AFTER INSERT ON user_hints
      BEGIN
        SELECT RAISE(ABORT, 'Private database details');
      END;
    `);
    const response = await request(app).post(
      '/api/users/1/planets/1/hints/unlock',
    );
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'STORAGE_ERROR',
        message: 'Unable to unlock the next hint.',
      },
    });
    expect(log).toHaveBeenCalled();
    expect(writer.users.findById(1)?.hintQuota).toBe(3);
    expect(writer.hints.list(1, 1).some(hint => hint.used)).toBe(false);
  });

  it('treats body fields as unable to choose a hint or change the reward balance', async () => {
    const response = await request(app)
      .post('/api/users/1/planets/1/hints/unlock')
      .send({hintId: 4, count: 100, hintQuota: 100});
    expect(response.status).toBe(200);
    expect(response.body.hint.hintNumber).toBe(1);
    expect(response.body.hintQuota).toBe(2);
    expect(writer.users.findById(1)?.hintQuota).toBe(2);
  });

  it('keeps login, planet loading, settings, and answer submission working', async () => {
    const login = await request(app)
      .post('/api/users')
      .send({username: 'first'});
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({userId: 1, hintQuota: 3});
    const planet = await request(app).get('/api/users/1/planets/1');
    expect(planet.status).toBe(200);
    expect(planet.body.planetId).toBe(1);
    await request(app)
      .patch('/api/users/1/settings')
      .send({musicVolume: 0.2, sfxVolume: 0.8})
      .expect(200);
    const answer = await request(app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: 1});
    expect(answer.status).toBe(200);
    expect(answer.body.correct).toBe(true);
  });
});
