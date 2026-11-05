import {describe, it, expect, beforeEach} from 'vitest';
import type {Database} from 'better-sqlite3';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {seed} from '../src/db/seed';
import {createDataWriter, type DataWriter, type User} from '../src/data-writer';
import {
  SqliteAnswerRep,
  SqliteContentRep,
  SqliteHintRep,
  SqliteProgressRep,
  SqliteUserRep,
} from '../src/data-writer/repository-impl';

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
  seed(db); // one planet ("Linear Land"), 2 readings, 3 hints, 5 mcq questions (ids 1-5)
  dw = createDataWriter(db);
  user = dw.users.create('test');
});

/**
 * Adds a second planet with no questions, and returns its id.
 */
function addPlanet(): number {
  return Number(
    db
      .prepare(
        "INSERT INTO planets (name, intro_text, graph_order) VALUES ('Quadratic Quay', 'x', 1)",
      )
      .run().lastInsertRowid,
  );
}

/**
 * Adds a free response question to the given planet, and returns its id.
 * @param planetId the ID of the planet to add the question to
 */
function addFreeResponse(planetId: number): number {
  return Number(
    db
      .prepare(
        "INSERT INTO questions (planet_id, prompt, qtype) VALUES (?, 'Why?', 'free_response')",
      )
      .run(planetId).lastInsertRowid,
  );
}

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

describe('createDataWriter', () => {
  it('builds the sqlite class implementations of each repository', () => {
    expect(dw.users).toBeInstanceOf(SqliteUserRep);
    expect(dw.content).toBeInstanceOf(SqliteContentRep);
    expect(dw.answers).toBeInstanceOf(SqliteAnswerRep);
    expect(dw.progress).toBeInstanceOf(SqliteProgressRep);
    expect(dw.hints).toBeInstanceOf(SqliteHintRep);
  });
});

describe('users', () => {
  it('creates a user with schema defaults', () => {
    expect(user).toMatchObject({
      username: 'test',
      hintQuota: 3,
      musicVolume: 0.5,
      sfxVolume: 0.5,
    });
    expect(user.userId).toBeGreaterThan(0);
    expect(user.createdAt).toBeTruthy(); //nonempty string
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

  it('returns full reading rows in order', () => {
    const readings = dw.content.getReadings(1);
    expect(readings.map(r => r.readingNumber)).toEqual([1, 2]);
    for (const r of readings) {
      expect(r.readingId).toBeGreaterThan(0);
      expect(r.planetId).toBe(1);
      expect(r.text).toBeTruthy();
    }
  });

  it('returns no readings for an unknown planet', () => {
    expect(dw.content.getReadings(9999)).toEqual([]);
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

  it('gets all questions on a planet, in question_id order', () => {
    const questions = dw.content.getQuestions(1);
    expect(questions.map(q => q.questionId)).toEqual([1, 2, 3, 4, 5]);
    for (const q of questions) {
      expect(q).toEqual(dw.content.getQuestion(q.questionId));
    }
  });

  it('gets only the questions of the requested planet', () => {
    const planetId = addPlanet();
    const questionId = addFreeResponse(planetId);
    expect(dw.content.getQuestions(1)).toHaveLength(5);
    expect(dw.content.getQuestions(planetId)).toEqual([
      {
        questionId,
        planetId,
        prompt: 'Why?',
        qtype: 'free_response',
        graph: null,
      },
    ]);
    expect(dw.content.getPublicOptions(questionId)).toEqual([]);
  });

  it('gets no questions for a planet without any, or an unknown planet', () => {
    expect(dw.content.getQuestions(addPlanet())).toEqual([]);
    expect(dw.content.getQuestions(9999)).toEqual([]);
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

  it('keeps the status when no progress row exists yet', () => {
    dw.progress.setStatus(user.userId, 1, 'peaceful');

    expect(dw.progress.ensure(user.userId, 1).status).toBe('peaceful');
  });

  it('sets status on an existing row without touching correctCount', () => {
    dw.progress.incrementCorrect(user.userId, 1);
    dw.progress.setStatus(user.userId, 1, 'peaceful');
    expect(dw.progress.listForUser(user.userId)).toEqual([
      {
        userId: user.userId,
        planetId: 1,
        status: 'peaceful',
        correctCount: 1,
      },
    ]);
  });

  it('sets status only for the targeted user', () => {
    const other = dw.users.create('other');
    dw.progress.ensure(other.userId, 1);
    dw.progress.setStatus(user.userId, 1, 'peaceful');
    expect(dw.progress.ensure(other.userId, 1).status).toBe('hostile');
  });

  it('rejects a status for an unknown planet', () => {
    expect(() => dw.progress.setStatus(user.userId, 9999, 'peaceful')).toThrow(
      /FOREIGN KEY/,
    );
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
  it('returns no hints for an unknown planet', () => {
    expect(dw.hints.list(user.userId, 9999)).toEqual([]);
  });

  it('lists a planet’s hints in order, unused by default', () => {
    const hints = dw.hints.list(user.userId, 1);
    expect(hints.map(h => h.hintNumber)).toEqual([1, 2, 3]);
    for (const h of hints) {
      expect(h.hintId).toBeGreaterThan(0);
      expect(h.planetId).toBe(1);
      expect(h.text).toBeTruthy();
      expect(h.used).toBe(false);
    }
  });

  it('marks only the given hint used', () => {
    const [first] = dw.hints.list(user.userId, 1);
    dw.hints.markUsed(user.userId, first.hintId);
    expect(dw.hints.list(user.userId, 1).map(h => h.used)).toEqual([
      true,
      false,
      false,
    ]);
  });

  it("is per-user: one user's hints don't affect another's", () => {
    const other = dw.users.create('other');
    const [first] = dw.hints.list(user.userId, 1);
    dw.hints.markUsed(user.userId, first.hintId);
    expect(dw.hints.list(user.userId, 1)[0].used).toBe(true);
    expect(dw.hints.list(other.userId, 1)[0].used).toBe(false);
  });

  it('lists each hint once when several users have used it', () => {
    const other = dw.users.create('other');
    const [first] = dw.hints.list(user.userId, 1);
    dw.hints.markUsed(user.userId, first.hintId);
    dw.hints.markUsed(other.userId, first.hintId);
    expect(dw.hints.list(user.userId, 1)).toHaveLength(3);
  });

  it('does nothing if the hint is already used', () => {
    const [first] = dw.hints.list(user.userId, 1);
    dw.hints.markUsed(user.userId, first.hintId);
    dw.hints.markUsed(user.userId, first.hintId);
    expect(dw.hints.list(user.userId, 1)[0].used).toBe(true);
    const n = db
      .prepare('SELECT COUNT(*) FROM user_hints WHERE user_id = ?')
      .pluck()
      .get(user.userId);
    expect(n).toBe(1);
  });

  it('rejects an unknown hint or user', () => {
    const [first] = dw.hints.list(user.userId, 1);
    expect(() => dw.hints.markUsed(user.userId, 9999)).toThrow(/FOREIGN KEY/);
    expect(() => dw.hints.markUsed(9999, first.hintId)).toThrow(/FOREIGN KEY/);
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

  it('rolls back a spent hint and its used mark together', () => {
    const [first] = dw.hints.list(user.userId, 1);
    expect(() =>
      dw.transaction(() => {
        dw.users.spendHint(user.userId);
        dw.hints.markUsed(user.userId, first.hintId);
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(dw.users.findById(user.userId)?.hintQuota).toBe(3);
    expect(dw.hints.list(user.userId, 1)[0].used).toBe(false);
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
