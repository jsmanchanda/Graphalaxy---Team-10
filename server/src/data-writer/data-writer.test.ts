import {describe, it, expect, beforeEach} from 'vitest';
import type {Database} from 'better-sqlite3';
import {openDb} from '../db/connection';
import {migrate} from '../db/migrate';
import {seed} from '../db/seed';
import {createDataWriter, type DataWriter, type User} from '.';

/**
 * unwraps a value that the test expects to exist, with a readable failure.
 * @param value the value to unwrap
 * @param what a description of what the value should be
 * @returns the unwrapped value if it exists, otherwise throws an error
 */
function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`expected ${what} to exist`);
  return value;
}

let db: Database;
let dw: DataWriter;
let user: User;

beforeEach(() => {
  db = openDb(':memory:');
  migrate(db);
  seed(db); // one planet ("Linear Land"), 2 lessons, 5 mcq questions (ids 1-5)
  dw = createDataWriter(db);
  user = dw.users.create('test');
});
/**
 * Records a wrong answer for the user on the given question.
 * @param questionId the ID of the question to answer
 * @param userId the ID of the user answering the question (defaults to the current user)
 */
function answerWrong(questionId: number, userId = user.userId) {
  const correct = must(
    dw.content.getCorrectOption(questionId),
    'correct option',
  );
  const wrong = must(
    dw.content
      .getPublicOptions(questionId)
      .find(o => o.optionId !== correct.optionId),
    'a wrong option',
  );
  dw.answers.record(userId, questionId, wrong.optionId, false);
}

/**
 * Records the correct answer for the user on the given question.
 * @param questionId the ID of the question to answer
 * @param userId the ID of the user answering the question (defaults to the current user)
 */
function answerRight(questionId: number, userId = user.userId) {
  const correct = must(
    dw.content.getCorrectOption(questionId),
    'correct option',
  );
  dw.answers.record(userId, questionId, correct.optionId, true);
}

describe('users', () => {
  it('creates a user with schema defaults', () => {
    expect(user).toMatchObject({
      username: 'test',
      hintQuota: 3,
      musicVolume: 0.5,
      sfxVolume: 0.5,
    });
    expect(user.userId).toBeGreaterThan(0);
    expect(user.createdAt).toBeTruthy();
  });

  it('finds users by id and username, and returns undefined for unknown ones', () => {
    expect(dw.users.findById(user.userId)).toEqual(user);
    expect(dw.users.findByUsername('test')).toEqual(user);
    expect(dw.users.findById(9999)).toBeUndefined();
    expect(dw.users.findByUsername('nobody')).toBeUndefined();
  });

  it('rejects a duplicate username', () => {
    expect(() => dw.users.create('test')).toThrow(/UNIQUE/);
  });

  it('saves settings, and the schema rejects out-of-range volumes', () => {
    dw.users.saveSettings(user.userId, {musicVolume: 0.2, sfxVolume: 0.9});
    expect(dw.users.findById(user.userId)).toMatchObject({
      musicVolume: 0.2,
      sfxVolume: 0.9,
    });
    expect(() =>
      dw.users.saveSettings(user.userId, {musicVolume: 1.5, sfxVolume: 0.5}),
    ).toThrow(/CHECK/);
  });

  it('spends hints until quota hits 0, then refuses without going negative', () => {
    expect(dw.users.spendHint(user.userId)).toBe(true);
    expect(dw.users.spendHint(user.userId)).toBe(true);
    expect(dw.users.spendHint(user.userId)).toBe(true);
    expect(dw.users.spendHint(user.userId)).toBe(false);
    expect(dw.users.findById(user.userId)?.hintQuota).toBe(0);
  });

  it('adds hints', () => {
    dw.users.addHints(user.userId, 2);
    expect(dw.users.findById(user.userId)?.hintQuota).toBe(5);
  });

  it('only changes the targeted user', () => {
    const other = dw.users.create('other');
    dw.users.spendHint(user.userId);
    expect(dw.users.findById(other.userId)?.hintQuota).toBe(3);
  });
});

describe('content', () => {
  it('lists and fetches planets', () => {
    const planets = dw.content.listPlanets();
    expect(planets).toHaveLength(1);
    expect(planets[0]).toMatchObject({name: 'Linear Land', graphOrder: 0});
    expect(dw.content.getPlanet(planets[0].planetId)).toEqual(planets[0]);
    expect(dw.content.getPlanet(9999)).toBeUndefined();
  });

  it('returns full lesson rows in order', () => {
    const lessons = dw.content.getLessons(1);
    expect(lessons.map(l => l.lessonNumber)).toEqual([1, 2]);
    for (const l of lessons) {
      expect(l.lessonId).toBeGreaterThan(0);
      expect(l.planetId).toBe(1);
      expect(l.text).toBeTruthy();
    }
  });

  it('returns no lessons for an unknown planet', () => {
    expect(dw.content.getLessons(9999)).toEqual([]);
  });

  it('counts questions on a planet', () => {
    expect(dw.content.countQuestions(1)).toBe(5);
    expect(dw.content.countQuestions(9999)).toBe(0);
  });

  it('lists prerequisite edges', () => {
    db.prepare(
      "INSERT INTO planets (name, intro_text, graph_order) VALUES ('Quadratic Quay', 'x', 1)",
    ).run();
    db.prepare(
      'INSERT INTO planet_prereqs (planet_id, prereq_planet_id) VALUES (2, 1)',
    ).run();
    expect(dw.content.listPrereqs()).toEqual([
      {planetId: 2, prereqPlanetId: 1},
    ]);
  });

  it('fetches a question, parsing nothing (graph stays a JSON string)', () => {
    const q = must(dw.content.getQuestion(1), 'question 1');
    expect(q).toMatchObject({questionId: 1, planetId: 1, qtype: 'mcq'});
    expect(JSON.parse(q.graph ?? 'null')).toEqual({fn: '2*x+3'});
    expect(dw.content.getQuestion(9999)).toBeUndefined();
  });

  it('public options carry questionId but never is_correct', () => {
    const opts = dw.content.getPublicOptions(1);
    expect(opts.map(o => o.label)).toEqual(['a', 'b', 'c', 'd']);
    for (const o of opts) {
      expect(Object.keys(o).sort()).toEqual([
        'label',
        'optionId',
        'questionId',
        'text',
      ]);
      expect(o.questionId).toBe(1);
    }
  });

  it('findOption returns grading info, and only for options of that question', () => {
    const correct = must(dw.content.getCorrectOption(1), 'correct option');
    expect(correct).toMatchObject({questionId: 1, isCorrect: true});

    const wrong = must(
      dw.content.getPublicOptions(1).find(o => o.optionId !== correct.optionId),
      'wrong option',
    );
    expect(dw.content.findOption(1, wrong.optionId)).toMatchObject({
      questionId: 1,
      isCorrect: false,
    });
    const foreign = dw.content.getPublicOptions(2)[0];
    expect(dw.content.findOption(1, foreign.optionId)).toBeUndefined();
  });
});

describe('nextUnsolvedQuestion', () => {
  it('starts at the first question', () => {
    expect(dw.content.nextUnsolvedQuestion(user.userId, 1)?.questionId).toBe(1);
  });

  it('does not skip a question that was only answered wrong', () => {
    answerWrong(1);
    expect(dw.content.nextUnsolvedQuestion(user.userId, 1)?.questionId).toBe(1);
  });

  it('skips questions answered correctly', () => {
    answerRight(1);
    answerRight(2);
    expect(dw.content.nextUnsolvedQuestion(user.userId, 1)?.questionId).toBe(3);
  });

  it('returns undefined once everything is solved', () => {
    for (const id of [1, 2, 3, 4, 5]) answerRight(id);
    expect(dw.content.nextUnsolvedQuestion(user.userId, 1)).toBeUndefined();
  });

  it("is per-user: one user's progress doesn't affect another's", () => {
    const other = dw.users.create('other');
    answerRight(1);
    expect(dw.content.nextUnsolvedQuestion(other.userId, 1)?.questionId).toBe(
      1,
    );
  });

  it('returns undefined for a planet with no questions', () => {
    expect(dw.content.nextUnsolvedQuestion(user.userId, 9999)).toBeUndefined();
  });
});

describe('answers', () => {
  it('tracks whether a question has been solved', () => {
    expect(dw.answers.hasSolved(user.userId, 1)).toBe(false);
    answerWrong(1);
    expect(dw.answers.hasSolved(user.userId, 1)).toBe(false);
    answerRight(1);
    expect(dw.answers.hasSolved(user.userId, 1)).toBe(true);
    expect(dw.answers.hasSolved(user.userId, 2)).toBe(false);
  });

  it('allows repeated wrong answers', () => {
    answerWrong(1);
    answerWrong(1);
    const n = db
      .prepare('SELECT COUNT(*) FROM user_answer WHERE user_id = ?')
      .pluck()
      .get(user.userId);
    expect(n).toBe(2);
  });

  it('rejects a second correct answer for the same user and question', () => {
    answerRight(1);
    expect(() => answerRight(1)).toThrow(/UNIQUE/);
  });

  it('rejects an option that belongs to a different question', () => {
    const foreign = dw.content.getPublicOptions(2)[0];
    expect(() =>
      dw.answers.record(user.userId, 1, foreign.optionId, false),
    ).toThrow(/FOREIGN KEY/);
  });
});

describe('progress', () => {
  it('ensure creates a hostile row with 0 correct, and is idempotent', () => {
    const first = dw.progress.ensure(user.userId, 1);
    expect(first).toEqual({
      userId: user.userId,
      planetId: 1,
      status: 'hostile',
      correctCount: 0,
    });
    dw.progress.incrementCorrect(user.userId, 1);
    expect(dw.progress.ensure(user.userId, 1).correctCount).toBe(1);
  });

  it('incrementCorrect adds one each time, creating the row if needed', () => {
    expect(dw.progress.incrementCorrect(user.userId, 1).correctCount).toBe(1);
    expect(dw.progress.incrementCorrect(user.userId, 1).correctCount).toBe(2);
  });

  it('sets status', () => {
    dw.progress.ensure(user.userId, 1);
    dw.progress.setStatus(user.userId, 1, 'peaceful');
    expect(dw.progress.ensure(user.userId, 1).status).toBe('peaceful');
  });

  it('lists only the requested user’s rows', () => {
    const other = dw.users.create('other');
    dw.progress.ensure(user.userId, 1);
    dw.progress.ensure(other.userId, 1);
    const rows = dw.progress.listForUser(user.userId);
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(user.userId);
  });
});

describe('hints', () => {
  it('returns undefined when no hint exists', () => {
    expect(dw.hints.find(user.userId, 1)).toBeUndefined();
  });

  it('creates a hint (unused by default) and finds it again', () => {
    const created = dw.hints.create(
      user.userId,
      1,
      'Look at the number next to x.',
    );
    expect(created).toMatchObject({
      userId: user.userId,
      questionId: 1,
      text: 'Look at the number next to x.',
      used: false,
    });
    expect(dw.hints.find(user.userId, 1)).toEqual(created);
  });

  it('marks a hint used', () => {
    const h = dw.hints.create(user.userId, 1, 'hint');
    dw.hints.markUsed(h.hintId);
    expect(dw.hints.find(user.userId, 1)?.used).toBe(true);
  });

  it('allows only one hint row per user and question', () => {
    dw.hints.create(user.userId, 1, 'a');
    expect(() => dw.hints.create(user.userId, 1, 'b')).toThrow(/UNIQUE/);
  });
});

describe('transaction', () => {
  it('returns the value from fn', () => {
    expect(dw.transaction(() => 42)).toBe(42);
  });

  it('commits when fn returns', () => {
    dw.transaction(() => {
      dw.users.spendHint(user.userId);
      answerRight(1);
    });
    expect(dw.users.findById(user.userId)?.hintQuota).toBe(2);
    expect(dw.answers.hasSolved(user.userId, 1)).toBe(true);
  });

  it('rolls back every write when fn throws', () => {
    expect(() =>
      dw.transaction(() => {
        dw.users.spendHint(user.userId);
        answerRight(1);
        dw.progress.incrementCorrect(user.userId, 1);
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(dw.users.findById(user.userId)?.hintQuota).toBe(3);
    expect(dw.answers.hasSolved(user.userId, 1)).toBe(false);
    expect(dw.progress.listForUser(user.userId)).toEqual([]);
  });

  it('rolls back when a constraint fails midway', () => {
    answerRight(1);
    expect(() =>
      dw.transaction(() => {
        dw.users.spendHint(user.userId);
        answerRight(1);
      }),
    ).toThrow(/UNIQUE/);
    expect(dw.users.findById(user.userId)?.hintQuota).toBe(3);
  });

  it('nested transactions join the outer one', () => {
    expect(() =>
      dw.transaction(() => {
        dw.transaction(() => dw.users.spendHint(user.userId));
        throw new Error('outer fails');
      }),
    ).toThrow('outer fails');
    expect(dw.users.findById(user.userId)?.hintQuota).toBe(3);
  });
});
