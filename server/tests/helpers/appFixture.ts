import {createApp} from '../../src/app';
import type {Express} from 'express';
import type {Database} from 'better-sqlite3';
import {createDataWriter, type DataWriter} from '../../src/data-writer';
import {openDb} from '../../src/db/connection';
import {migrate} from '../../src/db/migrate';
import {seed} from '../../src/db/seed';
import {QuestionManager} from '../../src/question-manager/QuestionManager';
import {HintManager} from '../../src/hint-manager/hintmanager';
import {ProgressManager} from '../../src/progress-manager/ProgressManager';

/** Fails clearly when seeded test content is missing a required value. */
export function requireValue<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error('Required fixture content is missing');
  }
  return value;
}

/** Creates the real API and repositories on an isolated, migrated database. */
export function createAppFixture(): {
  db: Database;
  writer: DataWriter;
  app: Express;
} {
  const db = openDb(':memory:');
  try {
    migrate(db);
    seed(db);
    const writer = createDataWriter(db);
    const hints = new HintManager(writer);
    const progress = new ProgressManager(writer);
    const questions = new QuestionManager(writer, progress);
    return {
      db,
      writer,
      app: createApp({questions, progress, hints, dataWriter: writer}),
    };
  } catch (error) {
    db.close();
    throw error;
  }
}
