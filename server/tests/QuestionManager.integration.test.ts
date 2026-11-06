import type {Database} from 'better-sqlite3';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {QuestionManager} from '../src/question-manager/QuestionManager';
import type {AnswerProgress} from '../src/question-manager/AnswerProgress';
import {createDataWriter, type DataWriter} from '../src/data-writer';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {seed} from '../src/db/seed';

/** The number of reading slides on a planet. */
const readingCount = (manager: QuestionManager, planetId: number) =>
  manager.getPlanet(1, planetId).tasks.filter(task => task.type === 'Reading')
    .length;

describe('QuestionManager with the official migration and Data Writer', () => {
  let db: Database;
  let writer: DataWriter;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    writer = createDataWriter(db);
    writer.users.create('first');
    writer.users.create('second');
    db.exec(`
      INSERT INTO planets (planet_id, name, intro_text) VALUES
        (1, 'Lines', 'Planet intro'), (2, 'Other', 'Other intro'), (3, 'Empty', 'Empty intro');
      INSERT INTO readings (reading_id, planet_id, reading_number, text) VALUES
        (20, 1, 2, 'Intercepts'), (10, 1, 1, 'Slopes');
      INSERT INTO questions (question_id, planet_id, prompt, graph, qtype) VALUES
        (7, 1, 'Vertex?', NULL, 'mcq'), (3, 1, 'Intercept?', NULL, 'mcq'),
        (2, 1, 'Slope?', '{"fn":"2*x+1"}', 'mcq'), (4, 2, 'Other?', NULL, 'mcq');
      INSERT INTO answer_options (option_id, question_id, label, text, is_correct) VALUES
        (72, 7, 'b', '3', 0), (71, 7, 'a', '2', 1),
        (22, 2, 'b', '3', 0), (21, 2, 'a', '2', 1),
        (32, 3, 'b', '3', 0), (31, 3, 'a', '2', 1),
        (42, 4, 'b', '3', 0), (41, 4, 'a', '2', 1);
    `);
  });

  afterEach(() => db.close());

  it('has no lesson table or question-to-reading relationship', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all();
    expect(tables).toContain('readings');
    expect(tables).not.toContain('lessons');
    expect(db.prepare('PRAGMA table_info(questions)').all()).not.toContainEqual(
      expect.objectContaining({name: 'lesson_id'}),
    );
  });

  it("loads planet questions by question ID and skips only this user's completed questions", () => {
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    writer.answers.record(2, 2, 21, true);
    writer.answers.record(1, 2, 22, false);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(2);
    manager.submit(1, 2, 21);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(3);
    manager.submit(1, 3, 31);
    expect(manager.nextQuestion(1, 1)?.questionId).toBe(7);
    manager.submit(1, 7, 71);
    expect(manager.nextQuestion(1, 1)).toBeNull();
  });

  it('keeps questions available on a planet without readings and handles empty planets', () => {
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    expect(readingCount(manager, 2)).toBe(0);
    expect(manager.nextQuestion(1, 2)?.questionId).toBe(4);
    expect(manager.getPlanet(1, 3).tasks).toEqual([]);
    expect(manager.nextQuestion(1, 3)).toBeNull();
  });

  it('returns label-ordered safe options, qtype mapped to type, and parsed graph JSON', () => {
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    expect(manager.nextQuestion(1, 1)).toEqual({
      questionId: 2,
      prompt: 'Slope?',
      graph: {fn: '2*x+1'},
      type: 'mcq',
      options: [
        {optionId: 21, label: 'a', text: '2'},
        {optionId: 22, label: 'b', text: '3'},
      ],
    });
    expect(JSON.stringify(manager.nextQuestion(1, 1))).not.toMatch(
      /is_correct|isCorrect|correctOption|"correct"/,
    );
  });

  it('loads a planet as ordered readings then questions, no answer keys', () => {
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    const planet = manager.getPlanet(1, 1);
    expect(planet).toMatchObject({planetId: 1, name: 'Lines'});
    expect(planet.tasks.map(task => task.type)).toEqual([
      'Reading',
      'Reading',
      'Question',
      'Question',
      'Question',
    ]);
    expect(planet.tasks.slice(0, 2)).toEqual([
      {type: 'Reading', text: 'Slopes'},
      {type: 'Reading', text: 'Intercepts'},
    ]);
    expect(JSON.stringify(planet)).not.toMatch(
      /is_correct|isCorrect|correctOption|"correct"/,
    );
    // manager.submit(1, 3, 31);
    // expect(
    //   manager
    //     .getPlanet(1, 1)
    //     .tasks.flatMap(task =>
    //       task.type === 'Question'
    //         ? [[task.question.questionId, task.solved]]
    //         : [],
    //     ),
    // ).toEqual([
    //   [2, false],
    //   [3, true],
    //   [7, false],
    // ]);
  });

  it('records selected option IDs and official attempt metadata for wrong and correct answers', () => {
    const onAnswer = vi.fn();
    const manager = new QuestionManager(writer, {onAnswer});
    expect(manager.submit(1, 2, 22)).toMatchObject({
      correct: false,
      correctOption: {optionId: 21},
    });
    expect(manager.submit(1, 2, 21)).toMatchObject({
      correct: true,
      correctOption: {optionId: 21},
    });
    expect(
      db
        .prepare(
          `SELECT selected_option_id AS optionId, correct, answered_at AS answeredAt
      FROM user_answer ORDER BY answer_id`,
        )
        .all(),
    ).toEqual([
      {optionId: 22, correct: 0, answeredAt: expect.any(String)},
      {optionId: 21, correct: 1, answeredAt: expect.any(String)},
    ]);
    expect(onAnswer).toHaveBeenCalledExactlyOnceWith({
      userId: 1,
      questionId: 2,
      planetId: 1,
    });
  });

  it('prevents duplicate correct rows and progress across manager instances', () => {
    const onAnswer = vi.fn<AnswerProgress['onAnswer']>(event => {
      writer.progress.incrementCorrect(event.userId, event.planetId);
    });
    const first = new QuestionManager(writer, {onAnswer});
    const second = new QuestionManager(createDataWriter(db), {onAnswer});
    first.submit(1, 2, 21);
    expect(second.submit(1, 2, 21).correct).toBe(true);
    first.submit(1, 2, 22);
    second.submit(1, 2, 21);
    expect(
      db
        .prepare('SELECT correct FROM user_answer ORDER BY answer_id')
        .pluck()
        .all(),
    ).toEqual([1, 0]);
    expect(writer.progress.ensure(1, 1).correctCount).toBe(1);
    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(first.nextQuestion(1, 1)?.questionId).toBe(3);
    first.submit(2, 2, 21);
    expect(writer.progress.ensure(2, 1).correctCount).toBe(1);
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });

  it('does not award progress for a completion recorded before constructing the manager', () => {
    writer.answers.record(1, 2, 21, true);
    const onAnswer = vi.fn();
    new QuestionManager(writer, {onAnswer}).submit(1, 2, 21);
    expect(onAnswer).not.toHaveBeenCalled();
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      1,
    );
  });

  it('rejects missing questions, missing planets, and foreign or nonexistent options', () => {
    const onAnswer = vi.fn();
    const manager = new QuestionManager(writer, {onAnswer});
    for (const optionId of [31, 999]) {
      expect(() => manager.submit(1, 2, optionId)).toThrow(
        expect.objectContaining({code: 'INVALID_INPUT'}),
      );
    }
    expect(() => manager.submit(1, 999, 21)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(() => manager.getPlanet(1, 999)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(() => manager.nextQuestion(1, 999)).toThrow(
      expect.objectContaining({code: 'NOT_FOUND'}),
    );
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      0,
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('rejects a question with no correct option without persisting an attempt', () => {
    db.prepare(
      'UPDATE answer_options SET is_correct = 0 WHERE question_id = 2',
    ).run();
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    expect(() => manager.nextQuestion(1, 1)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    expect(() => manager.submit(1, 2, 21)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      0,
    );
  });

  it('rejects unsupported question types while leaving reading retrieval available', () => {
    db.prepare(
      "UPDATE questions SET qtype = 'free_response' WHERE question_id = 2",
    ).run();
    const manager = new QuestionManager(writer, {onAnswer: vi.fn()});
    expect(readingCount(manager, 1)).toBe(2);
    expect(() => manager.nextQuestion(1, 1)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
    expect(() => manager.submit(1, 2, 21)).toThrow(
      expect.objectContaining({code: 'INVALID_CONTENT'}),
    );
  });

  it('rolls back the answer and official progress writes when the handler throws, then allows retry', () => {
    const onAnswer = vi.fn<AnswerProgress['onAnswer']>(event => {
      writer.progress.incrementCorrect(event.userId, event.planetId);
      throw new Error('progress unavailable');
    });
    const manager = new QuestionManager(writer, {onAnswer});
    expect(() => manager.submit(1, 2, 21)).toThrow(
      expect.objectContaining({code: 'PROGRESS_UPDATE_FAILED'}),
    );
    expect(writer.answers.hasSolved(1, 2)).toBe(false);
    expect(writer.progress.listForUser(1)).toEqual([]);
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      0,
    );
    onAnswer.mockImplementation(event => {
      writer.progress.incrementCorrect(event.userId, event.planetId);
    });
    manager.submit(1, 2, 21);
    expect(writer.answers.hasSolved(1, 2)).toBe(true);
    expect(writer.progress.ensure(1, 1).correctCount).toBe(1);
  });

  it('rolls back a repository failure after writing an attempt without notifying progress', () => {
    const record = writer.answers.record.bind(writer.answers);
    vi.spyOn(writer.answers, 'record').mockImplementation((...args) => {
      record(...args);
      throw new Error('write failure');
    });
    const onAnswer = vi.fn();
    expect(() =>
      new QuestionManager(writer, {onAnswer}).submit(1, 2, 21),
    ).toThrow(expect.objectContaining({code: 'STORAGE_ERROR'}));
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      0,
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('rejects unknown users through official foreign keys without progress changes', () => {
    const onAnswer = vi.fn();
    expect(() =>
      new QuestionManager(writer, {onAnswer}).submit(999, 2, 21),
    ).toThrow(expect.objectContaining({code: 'STORAGE_ERROR'}));
    expect(db.prepare('SELECT COUNT(*) FROM user_answer').pluck().get()).toBe(
      0,
    );
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('works with the production seed and every question can be completed', () => {
    const seededDb = openDb(':memory:');
    try {
      migrate(seededDb);
      seed(seededDb);
      const seededWriter = createDataWriter(seededDb);
      const user = seededWriter.users.create('seeded');
      const manager = new QuestionManager(seededWriter, {
        onAnswer: event => {
          seededWriter.progress.incrementCorrect(event.userId, event.planetId);
        },
      });
      expect(readingCount(manager, 1)).toBe(2);
      for (const question of seededWriter.content.getQuestions(1)) {
        expect(manager.nextQuestion(user.userId, 1)?.questionId).toBe(
          question.questionId,
        );
        const correct = seededWriter.content.getCorrectOption(
          question.questionId,
        );
        if (!correct) throw new Error('Seed is missing a correct answer');
        expect(
          manager.submit(user.userId, question.questionId, correct.optionId)
            .correct,
        ).toBe(true);
      }
      expect(manager.nextQuestion(user.userId, 1)).toBeNull();
      expect(seededWriter.progress.ensure(user.userId, 1).correctCount).toBe(5);
    } finally {
      seededDb.close();
    }
  });
});
