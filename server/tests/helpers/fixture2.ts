import type {Database} from 'better-sqlite3';

/**
 * Small, fixed content for tests, so they do not break when the game's real
 * seed changes: one planet (id 1, "Linear Land") with 2 readings and 5
 * multiple-choice questions (ids 1 to 5), each with 4 options.
 */
const QUESTIONS: Array<{
  prompt: string;
  fn: string;
  options: string[];
  correct: number;
}> = [
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
 * Fills an empty, migrated database with the test content described above.
 * @param db the database to fill
 */
export function addTestContent(db: Database): void {
  const planetId = Number(
    db
      .prepare(
        "INSERT INTO planets (name, intro_text, graph_order) VALUES ('Linear Land', 'A hostile world of straight lines.', 0)",
      )
      .run().lastInsertRowid,
  );
  const insReading = db.prepare(
    'INSERT INTO readings (planet_id, reading_number, text) VALUES (?, ?, ?)',
  );
  insReading.run(planetId, 1, 'A linear function has the form y = mx + b.');
  insReading.run(planetId, 2, 'm is the slope and b is the y-intercept.');

  const insQuestion = db.prepare(
    "INSERT INTO questions (planet_id, prompt, graph, qtype) VALUES (?, ?, ?, 'mcq')",
  );
  const insOption = db.prepare(
    'INSERT INTO answer_options (question_id, label, text, is_correct) VALUES (?, ?, ?, ?)',
  );
  for (const question of QUESTIONS) {
    const questionId = Number(
      insQuestion.run(
        planetId,
        question.prompt,
        JSON.stringify({fn: question.fn}),
      ).lastInsertRowid,
    );
    question.options.forEach((text, i) =>
      insOption.run(
        questionId,
        'abcd'[i],
        text,
        i === question.correct ? 1 : 0,
      ),
    );
  }
}
