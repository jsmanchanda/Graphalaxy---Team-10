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
    expect(readings.length).toBeGreaterThan(0);
    expect(response.body.tasks).toHaveLength(readings.length);
    expect(JSON.stringify(response.body)).not.toMatch(
      /isCorrect|is_correct|correctOption/,
    );
    const next = await request(fixture.app)
      .get('/api/users/1/planets/1/questions/next')
      .expect(200);
    expect(JSON.stringify(next.body.question)).not.toMatch(
      /isCorrect|is_correct|correctOption|"correct"/,
    );
    expect(next.body.question).toEqual({
      questionId: questions[0].questionId,
      prompt: questions[0].prompt,
      graph: JSON.parse(questions[0].graph ?? '{}'),
      type: 'mcq',
      options: fixture.writer.content
        .getPublicOptions(questions[0].questionId)
        .map(({optionId, label, text}) => ({optionId, label, text})),
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

  it('records one attempt, rejects duplicates, and allows a correct attempt after reset', async () => {
    const correct = requireValue(fixture.writer.content.getCorrectOption(1));
    const wrong = requireValue(
      fixture.writer.content
        .getPublicOptions(1)
        .find(option => option.optionId !== correct.optionId),
    );
    const first = await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: wrong.optionId})
      .expect(200);
    expect(first.body).toMatchObject({
      correct: false,
      correctOption: {optionId: correct.optionId},
    });
    for (const option of [wrong, correct]) {
      const duplicate = await request(fixture.app)
        .post('/api/users/1/questions/1/answer')
        .send({optionId: option.optionId})
        .expect(409);
      expect(duplicate.body.error.code).toBe('ALREADY_ANSWERED');
    }
    expect(fixture.writer.progress.listForUser(1)).toEqual([]);
    expect(fixture.db.prepare('SELECT correct FROM user_answer').all()).toEqual(
      [{correct: 0}],
    );
    await request(fixture.app)
      .delete('/api/users/1/planets/1/progress')
      .expect(200);
    const success = await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: correct.optionId})
      .expect(200);
    expect(success.body.correct).toBe(true);
    await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId: correct.optionId})
      .expect(409);
    expect(
      fixture.db
        .prepare(
          'SELECT correct, selected_option_id AS optionId FROM user_answer ORDER BY answer_id',
        )
        .all(),
    ).toEqual([{correct: 1, optionId: correct.optionId}]);
    expect(fixture.writer.progress.listForUser(1)[0].correctCount).toBe(1);
    expect(fixture.writer.answers.hasSolved(2, 1)).toBe(false);
  });

  it('serves every question once in order, including after a wrong answer, then returns the persisted score', async () => {
    const questions = fixture.writer.content.getQuestions(1);
    expect(questions.length).toBeGreaterThan(1);
    for (const [index, question] of questions.entries()) {
      const next = await request(fixture.app)
        .get('/api/users/1/planets/1/questions/next')
        .expect(200);
      expect(next.body.question.questionId).toBe(question.questionId);
      expect(next.body.progress.correctCount).toBe(Math.max(0, index - 1));
      // Reading the next question does not consume it.
      const again = await request(fixture.app)
        .get('/api/users/1/planets/1/questions/next')
        .expect(200);
      expect(again.body).toEqual(next.body);
      const correct = requireValue(
        fixture.writer.content.getCorrectOption(question.questionId),
      );
      const selected =
        index === 0
          ? requireValue(
              fixture.writer.content
                .getPublicOptions(question.questionId)
                .find(option => option.optionId !== correct.optionId),
            )
          : correct;
      const answer = await request(fixture.app)
        .post(`/api/users/1/questions/${question.questionId}/answer`)
        .send({optionId: selected.optionId})
        .expect(200);
      expect(answer.body.correct).toBe(index !== 0);
    }
    const end = await request(fixture.app)
      .get('/api/users/1/planets/1/questions/next')
      .expect(200);
    expect(end.body).toMatchObject({
      question: null,
      progress: {
        correctCount: questions.length - 1,
        questionCount: questions.length,
        completionPct: (questions.length - 1) / questions.length,
        status: 'hostile',
      },
    });
    expect(
      fixture.db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get(),
    ).toBe(questions.length);
    const other = await request(fixture.app)
      .get('/api/users/2/planets/1/questions/next')
      .expect(200);
    expect(other.body.question.questionId).toBe(questions[0].questionId);
    expect(other.body.progress.correctCount).toBe(0);
  });

  it('persists peaceful completion, unlocks a prerequisite planet, and resets only the selected user and planet', async () => {
    // Production seed currently has no prerequisite edges: add test data using
    // the official relationship, without changing the schema or production seed.
    fixture.db.prepare('INSERT INTO planet_prereqs VALUES (?, ?)').run(2, 1);
    const initial = await request(fixture.app)
      .get('/api/users/1/planets')
      .expect(200);
    expect(
      initial.body.find((planet: {planetId: number}) => planet.planetId === 2)
        .unlocked,
    ).toBe(false);
    const questions = fixture.writer.content.getQuestions(1);
    expect(questions.length).toBeGreaterThan(0);
    for (const question of questions) {
      await request(fixture.app)
        .post(`/api/users/1/questions/${question.questionId}/answer`)
        .send({
          optionId: requireValue(
            fixture.writer.content.getCorrectOption(question.questionId),
          ).optionId,
        })
        .expect(200);
    }
    // Preserve another user's answers and this user's answers on another planet.
    const foreign = fixture.writer.content.getQuestions(2)[0];
    for (const [userId, questionId] of [
      [2, questions[0].questionId],
      [1, foreign.questionId],
    ]) {
      await request(fixture.app)
        .post(`/api/users/${userId}/questions/${questionId}/answer`)
        .send({
          optionId: requireValue(
            fixture.writer.content.getCorrectOption(questionId),
          ).optionId,
        })
        .expect(200);
    }
    const login = await request(fixture.app)
      .post('/api/users')
      .send({username: 'first'})
      .expect(200);
    expect(login.body.userId).toBe(1);
    const completed = await request(fixture.app)
      .get('/api/users/1/planets')
      .expect(200);
    expect(
      completed.body.find(
        (planet: {planetId: number}) => planet.planetId === 1,
      ),
    ).toMatchObject({
      status: 'peaceful',
      correctCount: questions.length,
      completionPct: 1,
    });
    expect(
      completed.body.find((planet: {planetId: number}) => planet.planetId === 2)
        .unlocked,
    ).toBe(true);
    expect(
      fixture.writer.progress.listForUser(1).find(row => row.planetId === 1),
    ).toMatchObject({status: 'peaceful', correctCount: questions.length});
    const reset = await request(fixture.app)
      .delete('/api/users/1/planets/1/progress')
      .expect(200);
    expect(reset.body).toMatchObject({
      status: 'hostile',
      correctCount: 0,
      completionPct: 0,
    });
    const next = await request(fixture.app)
      .get('/api/users/1/planets/1/questions/next')
      .expect(200);
    expect(next.body.question.questionId).toBe(questions[0].questionId);
    const after = await request(fixture.app)
      .get('/api/users/1/planets')
      .expect(200);
    expect(
      after.body.find((planet: {planetId: number}) => planet.planetId === 2)
        .unlocked,
    ).toBe(false);
    expect(fixture.writer.answers.hasAnswered(1, questions[0].questionId)).toBe(
      false,
    );
    expect(fixture.writer.answers.hasSolved(2, questions[0].questionId)).toBe(
      true,
    );
    expect(fixture.writer.answers.hasSolved(1, foreign.questionId)).toBe(true);
    expect(fixture.writer.progress.listForUser(2)[0].correctCount).toBe(1);
    expect(
      fixture.writer.progress.listForUser(1).find(row => row.planetId === 2)
        ?.correctCount,
    ).toBe(1);
  });

  it('rolls back both answer and progress when the progress write fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fixture.db.exec(`
      CREATE TEMP TRIGGER reject_progress AFTER INSERT ON planet_progress
      BEGIN SELECT RAISE(ABORT, 'Private progress details'); END;
    `);
    const optionId = requireValue(
      fixture.writer.content.getCorrectOption(1),
    ).optionId;
    const response = await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId})
      .expect(500);
    expect(response.body.error.code).toBe('PROGRESS_UPDATE_FAILED');
    expect(JSON.stringify(response.body)).not.toContain(
      'Private progress details',
    );
    expect(fixture.writer.answers.hasAnswered(1, 1)).toBe(false);
    expect(fixture.writer.progress.listForUser(1)).toEqual([]);
    fixture.db.exec('DROP TRIGGER reject_progress');
    await request(fixture.app)
      .post('/api/users/1/questions/1/answer')
      .send({optionId})
      .expect(200);
    expect(fixture.writer.answers.hasSolved(1, 1)).toBe(true);
    expect(fixture.writer.progress.listForUser(1)[0].correctCount).toBe(1);
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
      await request(fixture.app).get(`/api/users/${id}/planets`).expect(400);
      await request(fixture.app)
        .get(`/api/users/${id}/planets/1/questions/next`)
        .expect(400);
      await request(fixture.app)
        .get(`/api/users/1/planets/${id}/questions/next`)
        .expect(400);
      await request(fixture.app)
        .delete(`/api/users/${id}/planets/1/progress`)
        .expect(400);
      await request(fixture.app)
        .delete(`/api/users/1/planets/${id}/progress`)
        .expect(400);
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
      await request(fixture.app).get('/api/users/999/planets'),
      await request(fixture.app).get('/api/users/999/planets/1/questions/next'),
      await request(fixture.app).get('/api/users/1/planets/999/questions/next'),
      await request(fixture.app).delete('/api/users/999/planets/1/progress'),
      await request(fixture.app).delete('/api/users/1/planets/999/progress'),
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
