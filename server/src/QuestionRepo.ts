import type {AnswerOption} from '@graphalaxy/shared';

/** A stored lesson, including the planet intro at lesson number zero. */
export interface LessonRecord {
  lessonId: number;
  planetId: number;
  lessonNumber: number;
  text: string;
}

/** Server-side question metadata, with planet identity resolved via its lesson. */
export interface QuestionRecord {
  questionId: number;
  lessonId: number;
  planetId: number;
  prompt: string;
  graph: string | null;
  type: string;
  questionOrder: number;
}

/** A stored answer option. Never serialize this record to a client. */
export interface AnswerOptionRecord extends AnswerOption {
  questionId: number;
  isCorrect: boolean;
}

/** Data Writer boundary; methods are synchronous to match better-sqlite3. */
export interface QuestionRepo {
  /** Checks planet existence independently of its authored content. */
  planetExists(planetId: number): boolean;
  /** Reads a planet's lessons. The manager applies display ordering. */
  getLessons(planetId: number): LessonRecord[];
  /** Reads questions through the planet's lessons. */
  getQuestions(planetId: number): QuestionRecord[];
  /** Looks up a question and its owning planet. */
  getQuestion(questionId: number): QuestionRecord | undefined;
  /** Reads server-only answer options in label order, then option ID order. */
  getAnswerOptions(questionId: number): AnswerOptionRecord[];
  /** Finds questions with at least one correct attempt for this user. */
  getCompletedQuestionIds(userId: number, planetId: number): number[];
  /**
   * Appends an attempt and reports whether it is the first correct attempt.
   * Call inside transaction() to serialize completion checks and inserts.
   */
  recordAnswer(userId: number, questionId: number, correct: boolean): boolean;
  /**
   * Runs a synchronous submission and its progress handler atomically.
   * Roll back on error; serialize competing writers before reading completion.
   */
  transaction<T>(work: () => T): T;
}

/** Published only for the first correct answer to a user's question. */
export interface AnswerEvent {
  userId: number;
  questionId: number;
  planetId: number;
}

/** Progress Manager integration; use the same transaction/connection for writes. */
export interface AnswerProgress {
  /** Update progress synchronously; throwing rolls back the submission. */
  onAnswer(event: AnswerEvent): void;
}
