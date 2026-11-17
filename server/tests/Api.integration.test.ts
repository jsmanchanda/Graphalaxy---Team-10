import request from 'supertest';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createAppFixture, requireValue} from './helpers/appFixture';

describe('Real HTTP API, Question Manager, Data Writer, and SQLite', () => {
  let fixture: ReturnType<typeof createAppFixture>;

  beforeEach(() => {
    fixture = createAppFixture();
    fixture.writer.users.create('first');
    fixture.writer.users.create('second');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fixture.db.close();
  });

  it('creates a trimmed account, returns defaults, and reuses it on login', async () => {
    const first = await request(fixture.app)
      .post('/api/users')
      .send({username: '  alice  '})
      .expect(200);
    expect(first.body).toEqual({
      userId: 3,
      name: 'alice',
      hintQuota: 3,
      settings: {musicVolume: 0.5, sfxVolume: 0.5},
    });
    const again = await request(fixture.app)
      .post('/api/users')
      .send({username: 'alice'})
      .expect(200);
    expect(again.body).toEqual(first.body);
    expect(fixture.writer.users.findById(3)?.username).toBe('alice');
  });

  it.each(['', '   ', 'x'.repeat(33), null, 123])(
    'rejects invalid usernames without creating a user: %s',
    async username => {
      const response = await request(fixture.app)
        .post('/api/users')
        .send({username})
        .expect(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
      expect(
        fixture.db.prepare('SELECT COUNT(*) FROM users').pluck().get(),
      ).toBe(2);
    },
  );

  it('returns readings and safe question options without exposing answer keys', async () => {
    const response = await request(fixture.app)
      .get('/api/users/1/planets/1')
      .expect(200);
    const readings = fixture.writer.content.getReadings(1);
    const questions = fixture.writer.content.getQuestions(1);
    expect(response.body.tasks.slice(0, readings.length)).toEqual(
      readings.map(reading => ({type: 'Reading', text: reading.text})),
    );
    expect(response.body.tasks).toHaveLength(
      readings.length + questions.length,
    );
    expect(JSON.stringify(response.body)).not.toMatch(
      /isCorrect|is_correct|correctOption/,
    );
    expect(response.body.tasks[readings.length].question).toMatchObject({
      questionId: questions[0].questionId,
      graph: JSON.parse(questions[0].graph ?? '{}'),
      type: 'mcq',
    });
  });

  it('persists settings, returns them on login, and isolates other users', async () => {
    const settings = {musicVolume: 0, sfxVolume: 1};
    const saved = await request(fixture.app)
      .patch('/api/users/1/settings')
      .send(settings)
      .expect(200);
    expect(saved.body.settings).toEqual(settings);
    const login = await request(fixture.app)
      .post('/api/users')
      .send({username: 'first'})
      .expect(200);
    expect(login.body.settings).toEqual(settings);
    expect(fixture.writer.users.findById(2)?.musicVolume).toBe(0.5);
  });

  it.each([
    {musicVolume: -1, sfxVolume: 0.5},
    {musicVolume: 0.5, sfxVolume: 2},
    {musicVolume: '0.5', sfxVolume: 0.5},
    {musicVolume: 0.5},
    {},
  ])(
    'rejects invalid settings without a partial update: %j',
    async settings => {
      await request(fixture.app)
        .patch('/api/users/1/settings')
        .send(settings)
        .expect(400);
      expect(fixture.writer.users.findById(1)).toMatchObject({
        musicVolume: 0.5,
        sfxVolume: 0.5,
      });
    },
  );

  it('records wrong attempts, records the first correct attempt, and ignores repeated correct attempts', async () => {
    const correct = requireValue(fixture.writer.content.getCorrectOption(1));
    const wrong = requireValue(
      fixture.writer.content
        .getPublicOptions(1)
        .find(option => option.optionId !== correct.optionId),
    );
    for (const option of [wrong, wrong, correct, correct]) {
      const response = await request(fixture.app)
        .post('/api/users/1/questions/1/answer')
        .send({optionId: option.optionId})
        .expect(200);
      expect(response.body).toMatchObject({
        correct: option.optionId === correct.optionId,
        correctOption: {optionId: correct.optionId},
      });
    }
    expect(
      fixture.db
        .prepare(
          'SELECT correct, selected_option_id AS optionId FROM user_answer ORDER BY answer_id',
        )
        .all(),
    ).toEqual([
      {correct: 0, optionId: wrong.optionId},
      {correct: 0, optionId: wrong.optionId},
      {correct: 1, optionId: correct.optionId},
    ]);
    expect(fixture.writer.answers.hasSolved(2, 1)).toBe(false);
  });

  it('rejects foreign options and missing options without saving an attempt', async () => {
    const foreign = fixture.writer.content.getPublicOptions(2)[0];
    const response = await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: foreign.optionId})
      .expect(400);
    expect(response.body.error.code).toBe('INVALID_INPUT');
    await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({})
      .expect(400);
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(0);
  });

  it.each(['0', '-1', '1.5', 'abc', '9007199254740992'])(
    'validates URL IDs for every user-scoped route: %s',
    async id => {
      await request(fixture.app).get(`/api/users/${id}/planets/1`).expect(400);
      await request(fixture.app).get(`/api/users/1/planets/${id}`).expect(400);
      await request(fixture.app)
        .patch(`/api/users/${id}/settings`)
        .send({})
        .expect(400);
      await request(fixture.app)
        .post(`/api/users/${id}/questions/1/answer`)
        .send({optionId: 1})
        .expect(400);
      await request(fixture.app)
        .post(`/api/users/1/questions/${id}/answer`)
        .send({optionId: 1})
        .expect(400);
    },
  );

  it('returns NOT_FOUND for missing users, planets, and questions', async () => {
    const responses = [
      await request(fixture.app).get('/api/users/999/planets/1'),
      await request(fixture.app).get('/api/users/1/planets/999'),
      await request(fixture.app).patch('/api/users/999/settings').send({}),
      await request(fixture.app)
        .post('/api/users/1/questions/999/answer')
        .send({optionId: 1}),
    ];
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    }
  });

  it('handles malformed JSON using the standard error response', async () => {
    const response = await request(fixture.app)
      .post('/api/users')
      .set('Content-Type', 'application/json')
      .send('{broken')
      .expect(400);
    expect(response.body).toEqual({
      error: {code: 'INVALID_INPUT', message: 'Malformed request.'},
    });
  });

  it('rolls back a failed database write and keeps internal details out of HTTP errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.db.exec(`
      CREATE TEMP TRIGGER reject_attempt AFTER INSERT ON user_answer
      BEGIN SELECT RAISE(ABORT, 'Private storage details'); END;
    `);
    const response = await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({
        optionId: requireValue(fixture.writer.content.getCorrectOption(1))
          .optionId,
      })
      .expect(500);
    expect(response.body.error.code).toBe('STORAGE_ERROR');
    expect(JSON.stringify(response.body)).not.toContain(
      'Private storage details',
    );
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(0);
    fixture.db.exec('DROP TRIGGER reject_attempt');
    await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: 1})
      .expect(200);
  });
});
