import type {Database} from 'better-sqlite3';
import {openDb} from './connection';

interface Q {
  prompt: string;
  fn: string; //graph for the question, stored in questions.graph
  options: [string, string, string, string]; //labels 'a', 'b', 'c', 'd'
  correct: 0 | 1 | 2 | 3; //index into options
}

const QUESTIONS: Q[] = [
  {
    prompt: 'PROOF THAT DB IS BEING READ. What is the slope of y = 2x + 3?',
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
];

/**
 * Seeds the database with the initial planet, readings, hints, and questions if empty.
 */
export function seed(db: Database) {
  if (db.prepare('SELECT COUNT(*) FROM planets').pluck().get() !== 0) return;

  const insPlanet = db.prepare(
    'INSERT INTO planets (name, intro_text, graph_order) VALUES (?, ?, 0)',
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
    const planetId = Number(
      insPlanet.run('Linear Land', 'A hostile world of straight lines.')
        .lastInsertRowid,
    );
    insReading.run(planetId, 1, 'A linear function has the form y = mx + b.');
    insReading.run(planetId, 2, 'm is the slope and b is the y-intercept.');
    insHint.run(planetId, 1, 'The slope is the number multiplied by x.');
    insHint.run(planetId, 2, 'The y-intercept is the value of y when x = 0.');
    insHint.run(
      planetId,
      3,
      'The steeper line has the slope with the larger absolute value.',
    );

    for (const q of QUESTIONS) {
      const qid = Number(
        insQ.run(planetId, q.prompt, JSON.stringify({fn: q.fn}))
          .lastInsertRowid,
      );
      q.options.forEach((text, i) =>
        insOpt.run(qid, 'abcd'[i], text, i === q.correct ? 1 : 0),
      );
    }
  })();
}

if (require.main === module) seed(openDb());
