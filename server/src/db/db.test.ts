import {describe, it, expect, beforeEach} from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {Database} from 'better-sqlite3';
import {openDb} from './connection';
import {migrate} from './migrate';
import {seed} from './seed';

describe('openDb', () => {
  it('enables foreign keys', () => {
    const db = openDb(':memory:');
    expect(db.pragma('foreign_keys', {simple: true})).toBe(1);
  });

  it('creates the parent directory for a file database', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'game-'));
    const file = path.join(dir, 'nested', 'test.db');
    const db = openDb(file);
    db.close();
    expect(fs.existsSync(file)).toBe(true);
    fs.rmSync(dir, {recursive: true, force: true});
  });

  it('gives each :memory: connection its own empty database', () => {
    const a = openDb(':memory:');
    const b = openDb(':memory:');
    a.exec('CREATE TABLE t (x INTEGER)');
    expect(() => b.prepare('SELECT * FROM t').all()).toThrow();
  });
});

describe('schema + seed', () => {
  let db: Database;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    seed(db);
    db.prepare("INSERT INTO users (username) VALUES ('test')").run();
  });

  it('creates all tables', () => {
    const names = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .pluck()
      .all() as string[];
    for (const t of [
      'users',
      'planets',
      'planet_prereqs',
      'lessons',
      'questions',
      'answer_options',
      'user_answer',
      'planet_progress',
      'hints',
    ]) {
      expect(names).toContain(t);
    }
  });

  it('seeds one planet with 5 questions, 4 options each, exactly 1 correct', () => {
    expect(db.prepare('SELECT COUNT(*) FROM planets').pluck().get()).toBe(1);
    expect(db.prepare('SELECT COUNT(*) FROM questions').pluck().get()).toBe(5);
    const rows = db
      .prepare(
        `SELECT COUNT(*) AS n, SUM(is_correct) AS c
                FROM answer_options GROUP BY question_id`,
      )
      .all() as Array<{n: number; c: number}>;
    expect(rows).toHaveLength(5);
    for (const r of rows) expect(r).toEqual({n: 4, c: 1});
  });

  it('seed is idempotent', () => {
    seed(db);
    expect(db.prepare('SELECT COUNT(*) FROM planets').pluck().get()).toBe(1);
  });

  it('rejects an answer whose option belongs to a different question', () => {
    const wrongOpt = db
      .prepare(
        'SELECT option_id FROM answer_options WHERE question_id = 2 LIMIT 1',
      )
      .pluck()
      .get();
    expect(() =>
      db
        .prepare(
          `INSERT INTO user_answer (user_id, question_id, selected_option_id, correct)
         VALUES (1, 1, ?, 0)`,
        )
        .run(wrongOpt),
    ).toThrow(/FOREIGN KEY/);
  });

  it('allows many wrong answers but only one correct answer per user+question', () => {
    const q1 = db
      .prepare(
        'SELECT option_id AS optionId, is_correct AS isCorrect FROM answer_options WHERE question_id = 1',
      )
      .all() as Array<{optionId: number; isCorrect: number}>;
    const right = q1.find(o => o.isCorrect === 1)?.optionId;
    const wrong = q1.find(o => o.isCorrect === 0)?.optionId;
    if (right === undefined || wrong === undefined) {
      throw new Error(
        'seed data for question 1 is missing a correct or wrong option',
      );
    }

    const ins = db.prepare(
      `INSERT INTO user_answer (user_id, question_id, selected_option_id, correct)
       VALUES (1, 1, ?, ?)`,
    );
    ins.run(wrong, 0);
    ins.run(wrong, 0); // repeated wrong answers are fine
    ins.run(right, 1); // first correct is fine
    expect(() => ins.run(right, 1)).toThrow(/UNIQUE/); // duplicate correct is rejected
  });

  it('blocks a second correct option on the same question', () => {
    expect(() =>
      db
        .prepare(
          'UPDATE answer_options SET is_correct = 1 WHERE question_id = 1 AND is_correct = 0',
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });
});
