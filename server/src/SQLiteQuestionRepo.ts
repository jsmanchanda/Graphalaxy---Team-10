import type {Database} from 'better-sqlite3';
import type {
  AnswerOptionRecord,
  LessonRecord,
  QuestionRecord,
  QuestionRepo,
} from './QuestionRepo';

const QUESTION_COLUMNS = `q.question_id AS questionId, q.lesson_id AS lessonId,
  l.planet_id AS planetId, q.prompt, q.graph, q.type,
  q.question_order AS questionOrder`;

/** Data Writer adapter using an existing connection; does not own its lifecycle. */
export class SqliteQuestionRepo implements QuestionRepo {
  /** Uses the connection provided by the Data Writer. */
  constructor(private readonly db: Database) {}

  /** Checks whether the selected planet exists. */
  planetExists(planetId: number): boolean {
    return (
      this.db
        .prepare('SELECT 1 FROM planets WHERE planet_id = ?')
        .get(planetId) !== undefined
    );
  }

  /** Reads lessons including intro, in stable display order. */
  getLessons(planetId: number): LessonRecord[] {
    return this.db
      .prepare<number, LessonRecord>(
        `
      SELECT lesson_id AS lessonId, planet_id AS planetId,
        lesson_number AS lessonNumber, text
      FROM lessons WHERE planet_id = ? ORDER BY lesson_number, lesson_id
    `,
      )
      .all(planetId);
  }

  /** Resolves planet ownership through lessons, with no junction table. */
  getQuestions(planetId: number): QuestionRecord[] {
    return this.db
      .prepare<number, QuestionRecord>(
        `
      SELECT ${QUESTION_COLUMNS}
      FROM questions q JOIN lessons l ON l.lesson_id = q.lesson_id
      WHERE l.planet_id = ?
      ORDER BY l.lesson_number, l.lesson_id, q.question_order, q.question_id
    `,
      )
      .all(planetId);
  }

  /** Reads question metadata, including the planet needed for progress. */
  getQuestion(questionId: number): QuestionRecord | undefined {
    return this.db
      .prepare<number, QuestionRecord>(
        `
      SELECT ${QUESTION_COLUMNS}
      FROM questions q JOIN lessons l ON l.lesson_id = q.lesson_id
      WHERE q.question_id = ?
    `,
      )
      .get(questionId);
  }

  /** Converts SQLite integer flags to server-only booleans. */
  getAnswerOptions(questionId: number): AnswerOptionRecord[] {
    return this.db
      .prepare<
        number,
        Omit<AnswerOptionRecord, 'isCorrect'> & {isCorrect: number}
      >(
        `
      SELECT option_id AS optionId, question_id AS questionId, label, text,
        is_correct AS isCorrect
      FROM answer_options WHERE question_id = ? ORDER BY label, option_id
    `,
      )
      .all(questionId)
      .map(option => ({...option, isCorrect: option.isCorrect === 1}));
  }

  /** Wrong attempts never erase a previous completion. */
  getCompletedQuestionIds(userId: number, planetId: number): number[] {
    return this.db
      .prepare<[number, number], {questionId: number}>(
        `
      SELECT DISTINCT a.question_id AS questionId
      FROM user_answer a
      JOIN questions q ON q.question_id = a.question_id
      JOIN lessons l ON l.lesson_id = q.lesson_id
      WHERE a.user_id = ? AND l.planet_id = ? AND a.correct = 1
    `,
      )
      .all(userId, planetId)
      .map(row => row.questionId);
  }

  /** Appends every attempt; caller's transaction protects first-completion checks. */
  recordAnswer(userId: number, questionId: number, correct: boolean): boolean {
    const completed =
      this.db
        .prepare(
          `
      SELECT 1 FROM user_answer
      WHERE user_id = ? AND question_id = ? AND correct = 1 LIMIT 1
    `,
        )
        .get(userId, questionId) !== undefined;
    this.db
      .prepare(
        'INSERT INTO user_answer (user_id, question_id, correct) VALUES (?, ?, ?)',
      )
      .run(userId, questionId, correct ? 1 : 0);
    return correct && !completed;
  }

  /** Acquires SQLite's write lock before checking prior completions. */
  transaction<T>(work: () => T): T {
    return this.db.transaction(work).immediate();
  }
}
