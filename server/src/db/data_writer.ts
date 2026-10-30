import type {Database} from 'better-sqlite3';

import type {
  AnswerRep,
  ContentRep,
  HintRep,
  ProgressRep,
  UserRep,
} from './repository';

import {
  sqliteAnswers,
  sqliteContent,
  sqliteHints,
  sqliteProgress,
  sqliteUsers,
} from './sqlite';

export * from './repository';

/**
 * Data writer is used by managers, w createDataWriter(db);
 */
export interface DataWriter {
  users: UserRep;
  content: ContentRep;
  answers: AnswerRep;
  progress: ProgressRep;
  hints: HintRep;
  /**
   * Runs fn atomically across all repos, commits if it returns, undo if throws.
   * @param fn the function to run in a transaction
   */
  transaction<T>(fn: () => T): T;
}

/**
 * createDataWriter returns a DataWriter that uses the given db to implement the interface.
 * @param db database
 * @returns data writer
 */
export function createDataWriter(db: Database): DataWriter {
  return {
    users: sqliteUsers(db),
    content: sqliteContent(db),
    answers: sqliteAnswers(db),
    progress: sqliteProgress(db),
    hints: sqliteHints(db),
    transaction: fn => db.transaction(fn)(),
  };
}
