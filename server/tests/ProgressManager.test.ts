import type {Database} from 'better-sqlite3';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createDataWriter, type DataWriter} from '../src/data-writer';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {seed} from '../src/db/seed';
import {
  PEACEFUL_THRESHOLD,
  ProgressManager,
} from '../src/progress-manager/ProgressManager';
import {QuestionManager} from '../src/question-manager/QuestionManager';

const PLANET_ID = 1; // the seeded planet, "Linear Land", with questions 1 to 5
const QUESTION_IDS = [1, 2, 3, 4, 5];

describe('ProgressManager subscribed to QuestionManager', () => {
  let db: Database;
  let writer: DataWriter;
  let progress: ProgressManager;
  let questions: QuestionManager;
  let userId: number;
  let otherId: number;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    seed(db);
    writer = createDataWriter(db);
    progress = new ProgressManager(writer);
    // The same wiring as server/src/index.ts.
    questions = new QuestionManager(writer, progress);
    userId = writer.users.create('first').userId;
    otherId = writer.users.create('second').userId;
  });

  afterEach(() => db.close());

  /** Submits the right or a wrong option for a question. */
  function answer(questionId: number, correct = true, user = userId) {
    const options = writer.content.getPublicOptions(questionId);
    const right = writer.content.getCorrectOption(questionId)?.optionId;
    const option = options.find(o => (o.optionId === right) === correct);
    if (!option) throw new Error(`no such option on question ${questionId}`);
    return questions.submit(user, questionId, option.optionId);
  }

  /** Adds a second planet that requires the seeded one, and returns its id. */
  function addLockedPlanet(): number {
    const planetId = Number(
      db
        .prepare(
          "INSERT INTO planets (name, intro_text, graph_order) VALUES ('Quadratic Quay', 'x', 1)",
        )
        .run().lastInsertRowid,
    );
    db.prepare(
      'INSERT INTO planet_prereqs (planet_id, prereq_planet_id) VALUES (?, ?)',
    ).run(planetId, PLANET_ID);
    return planetId;
  }

  describe('progress loaded at login', () => {
    it('reports a planet the player has not started as hostile with nothing correct', () => {
      expect(progress.listPlanets(userId)).toEqual([
        {
          planetId: PLANET_ID,
          name: 'Linear Land',
          graphOrder: 0,
          prereqIds: [],
          unlocked: true,
          status: 'hostile',
          correctCount: 0,
          questionCount: 5,
          completionPct: 0,
        },
      ]);
    });

    it('does not write progress rows when it is only read', () => {
      progress.listPlanets(userId);
      progress.getPlanetSummary(userId, PLANET_ID);
      expect(writer.progress.listForUser(userId)).toEqual([]);
    });

    it('lists every planet in graph order, locked until its prerequisites are peaceful', () => {
      const lockedId = addLockedPlanet();

      expect(progress.listPlanets(userId)).toMatchObject([
        {planetId: PLANET_ID, prereqIds: [], unlocked: true},
        {
          planetId: lockedId,
          prereqIds: [PLANET_ID],
          unlocked: false,
          questionCount: 0,
          completionPct: 0,
        },
      ]);

      QUESTION_IDS.forEach(questionId => answer(questionId));
      expect(progress.getPlanetSummary(userId, lockedId).unlocked).toBe(true);
      expect(progress.getPlanetSummary(otherId, lockedId).unlocked).toBe(false);
    });

    it('rejects a planet that does not exist', () => {
      expect(() => progress.getPlanetSummary(userId, 999)).toThrow(
        expect.objectContaining({code: 'NOT_FOUND'}),
      );
    });
  });

  describe('answer events', () => {
    it('counts a first correct answer', () => {
      answer(1);
      expect(progress.getPlanetSummary(userId, PLANET_ID)).toMatchObject({
        status: 'hostile',
        correctCount: 1,
        questionCount: 5,
        completionPct: 0.2,
      });
    });

    it('does not count wrong answers or repeated correct answers', () => {
      answer(1, false);
      answer(1);
      answer(1);
      answer(2, false);
      expect(progress.getPlanetSummary(userId, PLANET_ID).correctCount).toBe(1);
    });

    it("keeps each player's progress separate", () => {
      answer(1);
      answer(2);
      answer(1, true, otherId);
      expect(progress.getPlanetSummary(userId, PLANET_ID).correctCount).toBe(2);
      expect(progress.getPlanetSummary(otherId, PLANET_ID).correctCount).toBe(
        1,
      );
    });

    it('turns the planet peaceful once the threshold share of its questions is correct', () => {
      const needed = Math.ceil(PEACEFUL_THRESHOLD * QUESTION_IDS.length);
      QUESTION_IDS.slice(0, needed - 1).forEach(questionId =>
        answer(questionId),
      );
      expect(progress.getPlanetSummary(userId, PLANET_ID).status).toBe(
        'hostile',
      );

      answer(QUESTION_IDS[needed - 1]);

      expect(progress.getPlanetSummary(userId, PLANET_ID)).toMatchObject({
        status: 'peaceful',
        correctCount: needed,
      });
      expect(progress.getPlanetSummary(otherId, PLANET_ID).status).toBe(
        'hostile',
      );
    });

    it('undoes the answer when progress cannot be updated', () => {
      vi.spyOn(writer.progress, 'incrementCorrect').mockImplementationOnce(
        () => {
          throw new Error('progress unavailable');
        },
      );
      expect(() => answer(1)).toThrow(
        expect.objectContaining({code: 'PROGRESS_UPDATE_FAILED'}),
      );
      expect(writer.answers.hasSolved(userId, 1)).toBe(false);

      answer(1);
      expect(progress.getPlanetSummary(userId, PLANET_ID).correctCount).toBe(1);
    });
  });

  describe('redoing a planet', () => {
    it('resets progress and makes every question unanswered again', () => {
      QUESTION_IDS.forEach(questionId => answer(questionId));
      expect(questions.nextQuestion(userId, PLANET_ID)).toBeNull();

      expect(progress.resetPlanet(userId, PLANET_ID)).toMatchObject({
        planetId: PLANET_ID,
        status: 'hostile',
        correctCount: 0,
        questionCount: 5,
        completionPct: 0,
      });

      expect(questions.nextQuestion(userId, PLANET_ID)?.questionId).toBe(1);
      expect(writer.progress.listForUser(userId)).toEqual([
        {userId, planetId: PLANET_ID, status: 'hostile', correctCount: 0},
      ]);
    });

    it('lets the player earn the progress back', () => {
      QUESTION_IDS.forEach(questionId => answer(questionId));
      progress.resetPlanet(userId, PLANET_ID);

      answer(1, false);
      QUESTION_IDS.forEach(questionId => answer(questionId));

      expect(progress.getPlanetSummary(userId, PLANET_ID)).toMatchObject({
        status: 'peaceful',
        correctCount: 5,
        completionPct: 1,
      });
    });

    it("leaves other players' answers and progress alone", () => {
      QUESTION_IDS.forEach(questionId => answer(questionId, true, otherId));
      answer(1);

      progress.resetPlanet(userId, PLANET_ID);

      expect(progress.getPlanetSummary(otherId, PLANET_ID)).toMatchObject({
        status: 'peaceful',
        correctCount: 5,
      });
      expect(questions.nextQuestion(otherId, PLANET_ID)).toBeNull();
    });

    it('works on a planet the player has not started', () => {
      expect(progress.resetPlanet(userId, PLANET_ID)).toMatchObject({
        status: 'hostile',
        correctCount: 0,
      });
    });

    it('locks planets that required the redone planet again', () => {
      const lockedId = addLockedPlanet();
      QUESTION_IDS.forEach(questionId => answer(questionId));
      expect(progress.getPlanetSummary(userId, lockedId).unlocked).toBe(true);

      progress.resetPlanet(userId, PLANET_ID);

      expect(progress.getPlanetSummary(userId, lockedId).unlocked).toBe(false);
    });

    it('rejects a planet that does not exist without changing anything', () => {
      answer(1);
      expect(() => progress.resetPlanet(userId, 999)).toThrow(
        expect.objectContaining({code: 'NOT_FOUND'}),
      );
      expect(progress.getPlanetSummary(userId, PLANET_ID).correctCount).toBe(1);
    });

    it('keeps the answers when the progress cannot be reset', () => {
      answer(1);
      vi.spyOn(writer.progress, 'reset').mockImplementationOnce(() => {
        throw new Error('progress unavailable');
      });

      expect(() => progress.resetPlanet(userId, PLANET_ID)).toThrow(
        'progress unavailable',
      );

      expect(writer.answers.hasSolved(userId, 1)).toBe(true);
      expect(progress.getPlanetSummary(userId, PLANET_ID).correctCount).toBe(1);
    });
  });
});
