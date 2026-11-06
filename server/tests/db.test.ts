import {describe, it, expect, beforeEach} from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type {Database} from 'better-sqlite3';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {seed} from '../src/db/seed';

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
      'readings',
      'questions',
      'answer_options',
      'user_answer',
      'planet_progress',
      'planet_hints',
      'user_hints',
    ]) {
      expect(names).toContain(t);
    }
    expect(names).not.toContain('lessons');
    expect(names).not.toContain('hints');
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

  it('seeds the labels a, b, c, d on every question', () => {
    const labels = db
      .prepare(
        `SELECT (SELECT GROUP_CONCAT(label) FROM
                  (SELECT label FROM answer_options o
                   WHERE o.question_id = q.question_id ORDER BY label))
         FROM questions q`,
      )
      .pluck()
      .all();
    expect(labels).toEqual(Array(5).fill('a,b,c,d'));
  });

  it('seeds every question with a graph', () => {
    const graphs = db
      .prepare('SELECT graph FROM questions')
      .pluck()
      .all() as string[];
    expect(graphs).toHaveLength(5);
    for (const g of graphs) expect(JSON.parse(g).fn).toBeTruthy();
  });

  it('seeds 2 readings and 3 hints on the planet', () => {
    expect(db.prepare('SELECT COUNT(*) FROM readings').pluck().get()).toBe(2);
    expect(db.prepare('SELECT COUNT(*) FROM planet_hints').pluck().get()).toBe(
      3,
    );
  });

  it('seed is idempotent', () => {
    seed(db);
    expect(db.prepare('SELECT COUNT(*) FROM planets').pluck().get()).toBe(1);
    expect(db.prepare('SELECT COUNT(*) FROM planet_hints').pluck().get()).toBe(
      3,
    );
  });

  it('allows the four labels on a question, but no fifth option', () => {
    const qid = db
      .prepare("INSERT INTO questions (planet_id, prompt) VALUES (1, 'q')")
      .run().lastInsertRowid;
    const ins = db.prepare(
      "INSERT INTO answer_options (question_id, label, text) VALUES (?, ?, 'x')",
    );
    for (const label of ['a', 'b', 'c', 'd']) ins.run(qid, label);
    expect(() => ins.run(qid, 'e')).toThrow(/CHECK/);
    expect(() => ins.run(qid, 'a')).toThrow(/UNIQUE/);
  });

  it('rejects any label outside a-d', () => {
    const ins = db.prepare(
      "INSERT INTO answer_options (question_id, label, text) VALUES (1, ?, 'x')",
    );
    for (const label of ['A', '0', '', 'ab']) {
      expect(() => ins.run(label)).toThrow(/CHECK/);
    }
  });

  it('rejects relabelling an option outside a-d', () => {
    expect(() =>
      db
        .prepare(
          "UPDATE answer_options SET label = 'e' WHERE question_id = 1 AND label = 'd'",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it('allows only one reading_number per planet', () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO readings (planet_id, reading_number, text) VALUES (1, 1, 'x')",
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it('allows only one hint_number per planet', () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO planet_hints (planet_id, hint_number, text) VALUES (1, 1, 'x')",
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it('allows a user to use each hint only once', () => {
    const ins = db.prepare(
      'INSERT INTO user_hints (user_id, hint_id) VALUES (1, 1)',
    );
    ins.run();
    expect(() => ins.run()).toThrow(/UNIQUE/);
  });

  it('removes a user’s used hints, but not the hints, with the user', () => {
    db.prepare('INSERT INTO user_hints (user_id, hint_id) VALUES (1, 1)').run();
    db.prepare('DELETE FROM users WHERE user_id = 1').run();
    expect(db.prepare('SELECT COUNT(*) FROM user_hints').pluck().get()).toBe(0);
    expect(db.prepare('SELECT COUNT(*) FROM planet_hints').pluck().get()).toBe(
      3,
    );
  });

  it('removes hints and used hints with the planet', () => {
    db.prepare('INSERT INTO user_hints (user_id, hint_id) VALUES (1, 1)').run();
    db.prepare('DELETE FROM planets WHERE planet_id = 1').run();
    expect(db.prepare('SELECT COUNT(*) FROM planet_hints').pluck().get()).toBe(
      0,
    );
    expect(db.prepare('SELECT COUNT(*) FROM user_hints').pluck().get()).toBe(0);
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
