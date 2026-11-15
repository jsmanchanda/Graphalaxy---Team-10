import type {PlanetSummary} from '@graphalaxy/shared';
import type {DataWriter} from '../data-writer';
import type {
  AnswerEvent,
  AnswerProgress,
} from '../question-manager/AnswerProgress';
import {QuestionManagerError} from '../question-manager/QuestionManager';

/**
 * The share of a planet's questions, from 0 to 1, that a player must answer
 * correctly before the planet turns peaceful.
 */
export const PEACEFUL_THRESHOLD = 1;

/**
 * Tracks each player's progress on each planet. It is the subscriber to
 * Question Manager's first-correct-answer event (AnswerProgress), and it
 * reports and resets progress for the HTTP layer.
 *
 * IDs are expected to be positive integers already: the HTTP layer parses them
 * once, so this class does not check them again.
 */
export class ProgressManager implements AnswerProgress {
  /** Injects the Data Writer that Question Manager also writes through. */
  constructor(
    private readonly dataWriter: Pick<
      DataWriter,
      'content' | 'answers' | 'progress' | 'transaction'
    >,
  ) {}

  /**
   * Counts a first correct answer, and makes the planet peaceful once enough
   * of its questions are answered. Runs inside Question Manager's transaction,
   * so throwing here also undoes the recorded answer.
   */
  onAnswer(event: AnswerEvent): void {
    const {userId, planetId} = event;
    const progress = this.dataWriter.progress.incrementCorrect(
      userId,
      planetId,
    );
    const needed = Math.ceil(
      PEACEFUL_THRESHOLD * this.dataWriter.content.countQuestions(planetId),
    );
    if (progress.status === 'hostile' && progress.correctCount >= needed) {
      this.dataWriter.progress.setStatus(userId, planetId, 'peaceful');
    }
  }

  /**
   * Returns every planet in graph order with this player's progress on it.
   * Planets the player has not started are hostile with nothing correct.
   */
  listPlanets(userId: number): PlanetSummary[] {
    const rows = new Map(
      this.dataWriter.progress
        .listForUser(userId)
        .map(row => [row.planetId, row]),
    );
    const prereqs = this.dataWriter.content.listPrereqs();
    return this.dataWriter.content.listPlanets().map(planet => {
      const row = rows.get(planet.planetId);
      const prereqIds = prereqs
        .filter(edge => edge.planetId === planet.planetId)
        .map(edge => edge.prereqPlanetId)
        .sort((a, b) => a - b);
      const correctCount = row?.correctCount ?? 0;
      const questionCount = this.dataWriter.content.countQuestions(
        planet.planetId,
      );
      return {
        planetId: planet.planetId,
        name: planet.name,
        graphOrder: planet.graphOrder,
        prereqIds,
        unlocked: prereqIds.every(id => rows.get(id)?.status === 'peaceful'),
        status: row?.status ?? 'hostile',
        correctCount,
        questionCount,
        completionPct:
          questionCount === 0 ? 0 : Math.min(1, correctCount / questionCount),
      };
    });
  }

  /** Returns this player's progress on one planet, or throws NOT_FOUND. */
  getPlanetSummary(userId: number, planetId: number): PlanetSummary {
    const summary = this.listPlanets(userId).find(
      planet => planet.planetId === planetId,
    );
    if (!summary) {
      throw new QuestionManagerError(
        'NOT_FOUND',
        `Planet ${planetId} does not exist.`,
      );
    }
    return summary;
  }

  /**
   * Lets a player redo a planet: deletes their answers to its questions and
   * puts their progress back to hostile with nothing correct, in one
   * transaction. Every question on the planet is unanswered again afterwards.
   * @returns the player's progress on the planet after the reset
   */
  resetPlanet(userId: number, planetId: number): PlanetSummary {
    return this.dataWriter.transaction(() => {
      // Checked first so an unknown planet is NOT_FOUND, not a database error.
      this.getPlanetSummary(userId, planetId);
      this.dataWriter.answers.clearForPlanet(userId, planetId);
      this.dataWriter.progress.reset(userId, planetId);
      return this.getPlanetSummary(userId, planetId);
    });
  }
}
