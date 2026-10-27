import type {Database} from 'better-sqlite3';
import {openDb} from './connection';

interface Q {
  prompt: string;
  fn: string;
  options: string[];
  correct: number;
}

const QUESTIONS: Q[] = [
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
];

/**
 * Seeds the database with the initial planet, lessons, and questions if empty.
 */
export function seed(db: Database) {
  if (db.prepare('SELECT COUNT(*) FROM planets').pluck().get() !== 0) return;

  const insPlanet = db.prepare(
    'INSERT INTO planets (name, intro_text, graph_order) VALUES (?, ?, 0)',
  );
  const insLesson = db.prepare(
    'INSERT INTO lessons (planet_id, lesson_number, text) VALUES (?, ?, ?)',
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
    insLesson.run(planetId, 1, 'A linear function has the form y = mx + b.');
    insLesson.run(planetId, 2, 'm is the slope and b is the y-intercept.');

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
