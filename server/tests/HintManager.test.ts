import type {Database} from 'better-sqlite3';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createDataWriter, type DataWriter} from '../src/data-writer';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {HintManager, HintManagerError} from '../src/hint-manager/hintmanager';

describe('HintManager with the official schema and Data Writer', () => {
  let db: Database;
  let writer: DataWriter;
  let manager: HintManager;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    writer = createDataWriter(db);
    writer.users.create('first');
    writer.users.create('second');
    db.exec(`
      INSERT INTO planets (planet_id, name, intro_text) VALUES
        (1, 'Lines', 'Intro'), (2, 'Other', 'Intro'), (3, 'Empty', 'Intro');
      INSERT INTO planet_hints (hint_id, planet_id, hint_number, text) VALUES
        (10, 1, 2, 'Second hint'), (20, 1, 1, 'First hint'),
        (30, 1, 3, 'Third hint'), (40, 1, 4, 'Fourth hint'),
        (50, 2, 1, 'Other planet hint');
    `);
    manager = new HintManager(writer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    db.close();
  });

  it('starts with three credits and does not reveal locked hints', () => {
    expect(manager.getBalance(1)).toBe(3);
    expect(manager.getUnlockedHints(1, 1)).toEqual([]);
    expect(manager.getUnlockedHints(1, 3)).toEqual([]);
    expect(manager.getBalance(1)).toBe(3);
  });

  it('unlocks by hint number rather than ID and charges once per hint', () => {
    expect(manager.unlockNextHint(1, 1)).toEqual({
      hint: {hintId: 20, planetId: 1, hintNumber: 1, text: 'First hint'},
      hintQuota: 2,
    });
    expect(manager.unlockNextHint(1, 1)).toEqual({
      hint: {hintId: 10, planetId: 1, hintNumber: 2, text: 'Second hint'},
      hintQuota: 1,
    });
    expect(manager.getBalance(1)).toBe(1);
    expect(writer.hints.list(1, 1).map(hint => hint.used)).toEqual([
      true,
      true,
      false,
      false,
    ]);
  });

  it('returns only unlocked hints in order and allows free repeated review', () => {
    manager.unlockNextHint(1, 1);
    manager.unlockNextHint(1, 1);
    const expected = [
      {hintId: 20, planetId: 1, hintNumber: 1, text: 'First hint'},
      {hintId: 10, planetId: 1, hintNumber: 2, text: 'Second hint'},
    ];
    expect(manager.getUnlockedHints(1, 1)).toEqual(expected);
    expect(manager.getUnlockedHints(1, 1)).toEqual(expected);
    expect(manager.getBalance(1)).toBe(1);
  });

  it('keeps unlocks and balances when the manager and writer are recreated', () => {
    const result = manager.unlockNextHint(1, 1);
    const reloaded = new HintManager(createDataWriter(db));
    expect(reloaded.getUnlockedHints(1, 1)).toEqual([result.hint]);
    expect(reloaded.getBalance(1)).toBe(2);
    expect(reloaded.unlockNextHint(1, 1).hint?.hintId).toBe(10);
  });

  it('keeps player unlocks separate and uses a shared balance across planets', () => {
    manager.unlockNextHint(1, 1);
    expect(manager.getUnlockedHints(2, 1)).toEqual([]);
    expect(manager.getUnlockedHints(1, 2)).toEqual([]);
    expect(manager.getBalance(2)).toBe(3);
    expect(manager.unlockNextHint(1, 2)).toEqual({
      hint: {
        hintId: 50,
        planetId: 2,
        hintNumber: 1,
        text: 'Other planet hint',
      },
      hintQuota: 1,
    });
    expect(manager.getUnlockedHints(1, 1)).toHaveLength(1);
  });

  it('skips existing unlocks even when they contain a gap', () => {
    writer.hints.markUsed(1, 10);
    expect(manager.unlockNextHint(1, 1).hint?.hintId).toBe(20);
    expect(manager.unlockNextHint(1, 1).hint?.hintId).toBe(30);
    expect(manager.getBalance(1)).toBe(1);
  });

  it('rejects unlocking at zero credits without changing saved hints', () => {
    for (let i = 0; i < 3; i++) manager.unlockNextHint(1, 1);
    expect(() => manager.unlockNextHint(1, 1)).toThrow(
      expect.objectContaining({code: 'NO_HINTS_LEFT'}),
    );
    expect(manager.getBalance(1)).toBe(0);
    expect(manager.getUnlockedHints(1, 1)).toHaveLength(3);
    expect(writer.hints.list(1, 1).find(hint => hint.hintId === 40)?.used).toBe(
      false,
    );
  });

  it('returns null without charging on a planet without hints', () => {
    expect(manager.unlockNextHint(1, 3)).toEqual({hint: null, hintQuota: 3});
    expect(manager.getBalance(1)).toBe(3);
  });

  it('does not charge again after all hints on a planet are unlocked', () => {
    manager.unlockNextHint(1, 2);
    expect(manager.unlockNextHint(1, 2)).toEqual({hint: null, hintQuota: 2});
    expect(manager.getBalance(1)).toBe(2);
    expect(manager.getUnlockedHints(1, 2)).toHaveLength(1);
  });

  it('returns null at zero credits if no hints remain to unlock', () => {
    manager.unlockNextHint(1, 2);
    writer.users.spendHint(1);
    writer.users.spendHint(1);
    expect(manager.unlockNextHint(1, 2)).toEqual({hint: null, hintQuota: 0});
    expect(manager.unlockNextHint(1, 3)).toEqual({hint: null, hintQuota: 0});
  });

  it('awards credits only to the selected player and permits another unlock', () => {
    for (let i = 0; i < 3; i++) manager.unlockNextHint(1, 1);
    expect(manager.awardHintCredits(1, 2)).toBe(2);
    expect(manager.getBalance(1)).toBe(2);
    expect(manager.getBalance(2)).toBe(3);
    expect(manager.unlockNextHint(1, 1).hint?.hintId).toBe(40);
    expect(manager.getBalance(1)).toBe(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid credit counts: %s',
    count => {
      expect(() => manager.awardHintCredits(1, count)).toThrow(
        expect.objectContaining({code: 'INVALID_INPUT'}),
      );
      expect(manager.getBalance(1)).toBe(3);
    },
  );

  it('rejects awards that would overflow the safe integer balance', () => {
    expect(() => manager.awardHintCredits(1, Number.MAX_SAFE_INTEGER)).toThrow(
      expect.objectContaining({code: 'INVALID_INPUT'}),
    );
    expect(manager.getBalance(1)).toBe(3);
  });

  it('accepts an award whose resulting balance is exactly the safe integer limit', () => {
    expect(manager.awardHintCredits(1, Number.MAX_SAFE_INTEGER - 3)).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(manager.getBalance(1)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid player and planet IDs: %s',
    id => {
      const calls = [
        () => manager.getBalance(id),
        () => manager.awardHintCredits(id, 1),
        () => manager.getUnlockedHints(id, 1),
        () => manager.getUnlockedHints(1, id),
        () => manager.unlockNextHint(id, 1),
        () => manager.unlockNextHint(1, id),
      ];
      for (const call of calls) {
        expect(call).toThrow(expect.objectContaining({code: 'INVALID_INPUT'}));
      }
      expect(manager.getBalance(1)).toBe(3);
      expect(manager.getUnlockedHints(1, 1)).toEqual([]);
    },
  );

  it('reports missing players and planets without changing credits or unlocks', () => {
    const calls = [
      () => manager.getBalance(999),
      () => manager.awardHintCredits(999, 1),
      () => manager.getUnlockedHints(999, 1),
      () => manager.unlockNextHint(999, 1),
      () => manager.getUnlockedHints(1, 999),
      () => manager.unlockNextHint(1, 999),
    ];
    for (const call of calls) {
      expect(call).toThrow(expect.objectContaining({code: 'NOT_FOUND'}));
    }
    expect(manager.getBalance(1)).toBe(3);
    expect(manager.getUnlockedHints(1, 1)).toEqual([]);
  });

  it('rolls back the charge and unlock when the database rejects saving a hint', () => {
    db.exec(`
      CREATE TEMP TRIGGER reject_hint AFTER INSERT ON user_hints
      BEGIN
        SELECT RAISE(ABORT, 'Simulated hint save failure');
      END;
    `);
    expect(() => manager.unlockNextHint(1, 1)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR'}),
    );
    expect(manager.getBalance(1)).toBe(3);
    expect(manager.getUnlockedHints(1, 1)).toEqual([]);
    db.exec('DROP TRIGGER reject_hint');
    expect(manager.unlockNextHint(1, 1).hint?.hintId).toBe(20);
    expect(manager.getBalance(1)).toBe(2);
  });

  it('rolls back an award if a failure occurs after the balance is updated', () => {
    const original = writer.users.addHints.bind(writer.users);
    const cause = new Error('Simulated reward save failure');
    vi.spyOn(writer.users, 'addHints').mockImplementation((userId, count) => {
      original(userId, count);
      throw cause;
    });
    expect(() => manager.awardHintCredits(1, 2)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR', cause}),
    );
    expect(manager.getBalance(1)).toBe(3);
  });

  it('wraps read failures in a HintManagerError and preserves the cause', () => {
    const cause = new Error('Database unavailable');
    vi.spyOn(writer.hints, 'list').mockImplementation(() => {
      throw cause;
    });
    expect(() => manager.getUnlockedHints(1, 1)).toThrow(HintManagerError);
    expect(() => manager.getUnlockedHints(1, 1)).toThrow(
      expect.objectContaining({code: 'STORAGE_ERROR', cause}),
    );
    expect(manager.getBalance(1)).toBe(3);
  });
});
