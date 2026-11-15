import type {Database} from 'better-sqlite3';
import {openDb} from './connection';

/**
 * One multiple-choice question.
 */
export interface SeedQuestion {
  prompt: string;
  fn: string;
  /** Option texts for labels 'a', 'b', 'c', 'd'. */
  options: [string, string, string, string];
  /** Index into `options` of the correct answer. */
  correct: 0 | 1 | 2 | 3;
}

/** One planet with its lesson (readings), hints, and questions. */
export interface SeedPlanet {
  name: string;
  introText: string;
  /** Position of the planet in the game, 0 first. */
  graphOrder: number;
  /** Lesson readings, shown in this order. */
  readings: string[];
  hints: string[];
  questions: SeedQuestion[];
}

export const PLANETS: SeedPlanet[] = [
  {
    name: 'Linear Land',
    introText: 'A hostile world of straight lines.',
    graphOrder: 0,
    readings: [
      'A linear function has the form y = mx + b.',
      'm is the slope and b is the y-intercept.',
    ],
    hints: [
      'The slope is the number multiplied by x.',
      'The y-intercept is the value of y when x = 0.',
      'The steeper line has the slope with the larger absolute value.',
    ],
    questions: [
      {
        prompt: 'What is the slope of y = 2x + 3?',
        fn: '2*x+3',
        options: ['2', '3', '5', '0'],
        correct: 0,
      },
      {
        prompt: 'What is the y-intercept of y = 2x + 3?',
        fn: '2*x+3',
        options: ['2', '3', '-3', '0'],
        correct: 1,
      },
      {
        prompt: 'Which line is steeper?',
        fn: '-4*x+1',
        options: ['y = 2x', 'y = -4x + 1', 'y = x', 'y = 0.5x'],
        correct: 1,
      },
      {
        prompt: 'What is f(2) if f(x) = 3x - 1?',
        fn: '3*x-1',
        options: ['5', '6', '7', '4'],
        correct: 0,
      },
      {
        prompt: 'A horizontal line has a slope of...',
        fn: '4',
        options: ['1', 'undefined', '0', '-1'],
        correct: 2,
      },
    ],
  },
];

/**
 * Seeds the database with planets, their readings, hints, and questions, if no
 * planet exists yet. To load changed content into an existing database, run
 * `npm run db:reset -w server`.
 * @param db - The database to seed.
 * @param planets - The content to insert; defaults to the game's planets.
 */
export function seed(db: Database, planets: readonly SeedPlanet[] = PLANETS) {
  if (db.prepare('SELECT COUNT(*) FROM planets').pluck().get() !== 0) return;

  const insPlanet = db.prepare(
    'INSERT INTO planets (name, intro_text, graph_order) VALUES (?, ?, ?)',
  );
  const insReading = db.prepare(
    'INSERT INTO readings (planet_id, reading_number, text) VALUES (?, ?, ?)',
  );
  const insHint = db.prepare(
    'INSERT INTO planet_hints (planet_id, hint_number, text) VALUES (?, ?, ?)',
  );
  const insQ = db.prepare(
    "INSERT INTO questions (planet_id, prompt, graph, qtype) VALUES (?, ?, ?, 'mcq')",
  );
  const insOpt = db.prepare(
    'INSERT INTO answer_options (question_id, label, text, is_correct) VALUES (?, ?, ?, ?)',
  );

  db.transaction(() => {
    for (const planet of planets) {
      const planetId = Number(
        insPlanet.run(planet.name, planet.introText, planet.graphOrder)
          .lastInsertRowid,
      );
      planet.readings.forEach((text, i) =>
        insReading.run(planetId, i + 1, text),
      );
      planet.hints.forEach((text, i) => insHint.run(planetId, i + 1, text));
      for (const q of planet.questions) {
        const qid = Number(
          insQ.run(planetId, q.prompt, JSON.stringify({fn: q.fn}))
            .lastInsertRowid,
        );
        q.options.forEach((text, i) =>
          insOpt.run(qid, 'abcd'[i], text, i === q.correct ? 1 : 0),
        );
      }
    }
  })();
}

if (require.main === module) seed(openDb());
