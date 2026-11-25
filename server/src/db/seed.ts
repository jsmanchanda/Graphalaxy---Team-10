import type {Database} from 'better-sqlite3';
import {openDb} from './connection';

/**
 * One multiple-choice question.
 *
 * `fn` is the graph drawn next to the question, stored in `questions.graph` as
 * `{"fn": "<fn>"}`. The client's GraphComponent turns `sin` and `cos` into
 * `Math.sin` and `Math.cos`, then runs it as the body of
 * `new Function('x', 'return <fn>;')` on a [-10, 10] x [-10, 10] grid. So it
 * must be a JavaScript expression in `x`: write `2*x`, `x**2`, `3*sin(2*x)`,
 * and wrap a negated power in parentheses (`-(x**2)`, since `-x**2` is a
 * syntax error).
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
  /**
   * Names of the planets that must be peaceful before this one unlocks
   * (stored in `planet_prereqs`). Omitted or empty means unlocked from the
   * start.
   */
  prereqs?: string[];
  /** Lesson readings, shown in this order. */
  readings: string[];
  hints: string[];
  questions: SeedQuestion[];
}

export const PLANETS: SeedPlanet[] = [
  {
    name: 'Linear Land',
    introText:
      'The labradors of Linear Land chase every ball they see and keep crashing into each other. Help them work out their paths.',
    graphOrder: 0,
    readings: [
      'The labradors of Linear Land run straight at every ball they see, always at a steady speed. A path like this is a linear function, y = mx + b, and its graph is a straight line.',
      "m is the slope: how much y changes when x goes up by 1. If x is seconds and y is meters run, the slope is the labrador's speed. b is the y-intercept, the value of y when x = 0, like a labrador's head start.",
      'A larger absolute value of m means a steeper line, so a faster labrador. A positive slope rises to the right, a negative slope falls to the right, and a slope of 0 gives a horizontal line: a labrador sitting still.',
      'To evaluate f(x) = mx + b at a number, replace x with that number. For f(x) = 2x + 1, f(3) = 2(3) + 1 = 7.',
    ],
    hints: [
      'The slope is the number multiplied by x.',
      'The y-intercept is the value of y when x = 0.',
      'The steeper line has the slope with the larger absolute value.',
    ],
    questions: [
      {
        prompt:
          'A labrador runs along y = 2x + 3. What is the slope of its path?',
        fn: '2*x+3',
        options: ['2', '3', '5', '0'],
        correct: 0,
      },
      {
        prompt:
          'A labrador runs along y = 2x + 3. What is its head start, the y-intercept?',
        fn: '2*x+3',
        options: ['2', '3', '-3', '0'],
        correct: 1,
      },
      {
        prompt:
          'The graph shows the steepest of these labrador paths. Which equation is it?',
        fn: '-4*x+1',
        options: ['y = 2x', 'y = -4x + 1', 'y = x', 'y = 0.5x'],
        correct: 1,
      },
      {
        prompt:
          "A labrador's distance after x seconds is f(x) = 3x - 1. What is f(2)?",
        fn: '3*x-1',
        options: ['5', '6', '7', '4'],
        correct: 0,
      },
      {
        prompt: 'A labrador sitting still has a path with a slope of...',
        fn: '4',
        options: ['1', 'undefined', '0', '-1'],
        correct: 2,
      },
      {
        prompt:
          "The graph shows a labrador's path that falls to the right and crosses the y-axis at 1. Which equation is it?",
        fn: '-x+1',
        options: ['y = x + 1', 'y = -x - 1', 'y = x - 1', 'y = -x + 1'],
        correct: 3,
      },
      {
        prompt:
          'A labrador runs along y = -3x + 2. What is the slope of its path?',
        fn: '-3*x+2',
        options: ['3', '2', '-3', '-2'],
        correct: 2,
      },
      {
        prompt:
          'A labrador runs along y = 5x - 4. What is its head start, the y-intercept?',
        fn: '5*x-4',
        options: ['-4', '5', '4', '1'],
        correct: 0,
      },
      {
        prompt:
          'The graph shows the fastest labrador, with the steepest path. Which equation is it?',
        fn: '5*x',
        options: ['y = x + 5', 'y = 5x', 'y = 2x + 1', 'y = -2x'],
        correct: 1,
      },
      {
        prompt:
          "A labrador's distance after x seconds is f(x) = 4x + 2. What is f(3)?",
        fn: '4*x+2',
        options: ['12', '9', '10', '14'],
        correct: 3,
      },
      {
        prompt:
          'A labrador runs along y = -2x + 6. Which way does its path go?',
        fn: '-2*x+6',
        options: [
          'Rises to the right',
          'Falls to the right',
          'Flat, like sitting still',
          'Straight up',
        ],
        correct: 1,
      },
      {
        prompt:
          'A labrador runs 4 meters every second and starts 1 meter ahead. Which equation is its path?',
        fn: '4*x+1',
        options: ['y = x + 4', 'y = 4x', 'y = 5x', 'y = 4x + 1'],
        correct: 3,
      },
    ],
  },
  {
    name: 'Quadratic Quay',
    introText:
      'The cats of Quadratic Quay pounce on everything that moves, and keep missing. Help them plan their leaps.',
    graphOrder: 1,
    prereqs: ['Linear Land'],
    readings: [
      'Every pounce of a Quadratic Quay cat traces a curve called a parabola. It is the graph of a quadratic function, y = ax^2 + bx + c, where a is not 0.',
      'If a < 0, the parabola opens downward, like a cat leaping up and coming back down. If a > 0, it opens upward. The constant c is the y-intercept, the value of y when x = 0.',
      'In vertex form y = a(x - h)^2 + k, the vertex is the point (h, k). When the parabola opens downward, the vertex is the top of the leap (the maximum). When it opens upward, the vertex is the lowest point (the minimum).',
      'The roots are the x-values where y = 0, where the parabola crosses the x-axis: where a cat takes off and lands. For y = -x^2 + 16, the roots are x = 4 and x = -4.',
    ],
    hints: [],
    questions: [
      {
        prompt:
          'A cat leaps along y = -x^2 + 4. Which way does its parabola open?',
        fn: '-(x**2)+4',
        options: ['Upward', 'Downward', 'Left', 'Right'],
        correct: 1,
      },
      {
        prompt:
          'A cat leaps along y = -(x - 2)^2 + 3. Where is the top of its leap, the vertex?',
        fn: '-((x-2)**2)+3',
        options: ['(2, 3)', '(-2, 3)', '(2, -3)', '(-2, -3)'],
        correct: 0,
      },
      {
        prompt:
          'A cat leaps along y = -x^2 + 2x + 3. How high is it at x = 0, the y-intercept?',
        fn: '-(x**2)+2*x+3',
        options: ['1', '2', '-3', '3'],
        correct: 3,
      },
      {
        prompt:
          'A cat leaps along y = -x^2 + 9. Where does it take off and land, the roots?',
        fn: '-(x**2)+9',
        options: [
          'x = 9 only',
          'x = 3 and x = -3',
          'x = 9 and x = -9',
          'x = 0 only',
        ],
        correct: 1,
      },
      {
        prompt:
          'A kitten climbs out of a dip along y = 2x^2 - 1. How high is it when x = 3?',
        fn: '2*x**2-1',
        options: ['11', '17', '35', '5'],
        correct: 1,
      },
      {
        prompt: 'How high does a cat leaping along y = -(x + 1)^2 + 5 get?',
        fn: '-((x+1)**2)+5',
        options: ['-1', '1', '-5', '5'],
        correct: 3,
      },
      {
        prompt:
          'A cat leaps along y = -2x^2 + 8. How high is it at x = 0, the y-intercept?',
        fn: '-2*(x**2)+8',
        options: ['-2', '8', '2', '-8'],
        correct: 1,
      },
      {
        prompt:
          'A kitten dips along y = x^2 - 4. Which way does its parabola open?',
        fn: 'x**2-4',
        options: ['Upward', 'Downward', 'Left', 'Right'],
        correct: 0,
      },
      {
        prompt:
          'A kitten dips along y = (x - 3)^2 - 2. Where is the bottom of its dip, the vertex?',
        fn: '(x-3)**2-2',
        options: ['(-3, -2)', '(3, 2)', '(3, -2)', '(-3, 2)'],
        correct: 2,
      },
      {
        prompt:
          'A cat leaps along y = -x^2 + 25. Where does it take off and land, the roots?',
        fn: '-(x**2)+25',
        options: [
          'x = 25 only',
          'x = 0 only',
          'x = 25 and x = -25',
          'x = 5 and x = -5',
        ],
        correct: 3,
      },
      {
        prompt:
          'A cat leaps along y = -(x - 1)^2 + 6. How high is it at x = 3?',
        fn: '-((x-1)**2)+6',
        options: ['6', '4', '2', '-2'],
        correct: 2,
      },
      {
        prompt:
          'A kitten dips along y = x^2 + 3. How high is the lowest point of its dip?',
        fn: 'x**2+3',
        options: ['0', '9', '3', '-3'],
        correct: 2,
      },
    ],
  },
  {
    name: 'Sine Shores',
    introText:
      'The seals of Sine Shores are seasick from the rolling waves. Help them understand their sea.',
    graphOrder: 2,
    prereqs: ['Linear Land'],
    readings: [
      'The seals of Sine Shores float on waves that rise and fall forever. A wave like this is drawn by the sine function y = sin(x). It moves between -1 and 1, and sin(0) = 0. Here x is measured in radians.',
      'In y = a*sin(x), |a| is the amplitude: how far the waves lift a seal above calm sea level and drop it below. A bigger amplitude means a bumpier ride.',
      "In y = a*sin(x) + d, d moves the whole sea up or down, like a tide. The midline, or calm sea level, is the line y = d. A seal's highest point is d + |a| and its lowest point is d - |a|.",
    ],
    hints: [],
    questions: [
      {
        prompt:
          'A seal bobs on y = 3*sin(x). What is the amplitude of the wave?',
        fn: '3*sin(x)',
        options: ['1', '3', '6', '2π'],
        correct: 1,
      },
      {
        prompt:
          'The tide comes in and the sea follows y = sin(x) + 4. What is the calm sea level, the midline?',
        fn: 'sin(x)+4',
        options: ['y = 0', 'y = 1', 'y = 4', 'y = 5'],
        correct: 2,
      },
      {
        prompt: 'A seal rides y = 2*sin(x) + 3. What is its highest point?',
        fn: '2*sin(x)+3',
        options: ['5', '3', '2', '6'],
        correct: 0,
      },
      {
        prompt: 'A seal rides y = 4*sin(x) + 1. What is its lowest point?',
        fn: '4*sin(x)+1',
        options: ['5', '-3', '1', '-4'],
        correct: 1,
      },
      {
        prompt: 'A seal floats on y = 5*sin(x). How high is it at x = 0?',
        fn: '5*sin(x)',
        options: ['5', '1', '-5', '0'],
        correct: 3,
      },
      {
        prompt:
          'The graph shows a wave with an amplitude of 4 and a calm sea level of y = 2. Which equation is it?',
        fn: '4*sin(x)+2',
        options: [
          'y = 2*sin(x) + 4',
          'y = 4*sin(x) + 2',
          'y = 4*sin(x) - 2',
          'y = sin(x) + 6',
        ],
        correct: 1,
      },
      {
        prompt:
          'The graph shows the seal with the bumpiest ride, the biggest amplitude. Which equation is it?',
        fn: '5*sin(x)',
        options: [
          'y = 2*sin(x)',
          'y = 5*sin(x)',
          'y = sin(x) + 5',
          'y = 3*sin(x) + 1',
        ],
        correct: 1,
      },
      {
        prompt:
          'The tide goes out and the sea follows y = 2*sin(x) - 3. What is the calm sea level, the midline?',
        fn: '2*sin(x)-3',
        options: ['y = 2', 'y = -3', 'y = 3', 'y = -1'],
        correct: 1,
      },
      {
        prompt: 'A seal rides y = 3*sin(x) - 1. What is its highest point?',
        fn: '3*sin(x)-1',
        options: ['3', '-1', '2', '-4'],
        correct: 2,
      },
      {
        prompt: 'A seal rides y = 2*sin(x) + 5. What is its lowest point?',
        fn: '2*sin(x)+5',
        options: ['7', '5', '-3', '3'],
        correct: 3,
      },
      {
        prompt: 'A seal rides y = 3*sin(x) + 2. How high is it at x = 0?',
        fn: '3*sin(x)+2',
        options: ['5', '3', '2', '0'],
        correct: 2,
      },
      {
        prompt:
          'The graph shows a wave with an amplitude of 3 and a calm sea level of y = -2. Which equation is it?',
        fn: '3*sin(x)-2',
        options: [
          'y = 3*sin(x) - 2',
          'y = -2*sin(x) + 3',
          'y = 3*sin(x) + 2',
          'y = sin(x) - 5',
        ],
        correct: 0,
      },
    ],
  },
  {
    name: 'Phase Planet',
    introText:
      'The hamsters of Phase Planet power their world with running wheels, but no two spin in time. Help them find their rhythm.',
    graphOrder: 3,
    prereqs: ['Quadratic Quay', 'Sine Shores'],
    readings: [
      'A hamster running in its wheel goes round and round. Follow one spot on the wheel and its height makes a sine wave, one full cycle for every turn.',
      'The period is the length of one full cycle, one turn of the wheel. y = sin(b*x) has period 2π / |b|. A bigger |b| means a faster hamster and a shorter period, so y = sin(2*x) repeats every π.',
      'A hamster that starts at a different spot on its wheel makes the same wave, shifted sideways. This is a phase shift, set by c in y = sin(x + c). A positive c moves the wave left by c, and a negative c moves it right, so y = sin(x - 1) is the wave moved right by 1.',
      'A hamster that starts at the top of its wheel follows y = cos(x). Cosine is sine moved left by π/2, so cos(x) = sin(x + π/2).',
      'Putting it all together, y = a*sin(b*x + c) + d has amplitude |a|, period 2π / |b|, and midline y = d. The wave is shifted left by c / b, or right when c / b is negative. Divide by b first: y = sin(2*x + 2) is shifted left by 2 / 2 = 1, not 2.',
    ],
    hints: [],
    questions: [
      {
        prompt:
          "A hamster's wheel follows y = 3*sin(2*x). What is the period of one turn?",
        fn: '3*sin(2*x)',
        options: ['2π', 'π', '4π', 'π/2'],
        correct: 1,
      },
      {
        prompt:
          'The graph shows the wheel of the hamster that spins fastest, with the shortest period. Which equation is it?',
        fn: '3*sin(3*x)',
        options: [
          'y = 3*sin(x/2)',
          'y = 3*sin(x)',
          'y = 3*sin(3*x)',
          'y = 3*sin(2*x)',
        ],
        correct: 2,
      },
      {
        prompt:
          "A hamster's wheel follows y = 2*sin(x - 1). How is its wave shifted from y = 2*sin(x)?",
        fn: '2*sin(x-1)',
        options: ['Left by 1', 'Right by 1', 'Up by 1', 'Down by 1'],
        correct: 1,
      },
      {
        prompt:
          "A hamster's wheel follows y = 3*sin(x + 2). How is its wave shifted from y = 3*sin(x)?",
        fn: '3*sin(x+2)',
        options: ['Right by 2', 'Up by 2', 'Left by 2', 'Down by 2'],
        correct: 2,
      },
      {
        prompt:
          'A hamster starts at the top of its wheel, so it follows y = 4*cos(x), shown in the graph. Which sine function draws the same wave?',
        fn: '4*cos(x)',
        options: [
          'y = 4*sin(x + π/2)',
          'y = 4*sin(x - π)',
          'y = 4*sin(x) + π/2',
          'y = 4*sin(2*x)',
        ],
        correct: 0,
      },
      {
        prompt:
          "A hamster's wheel follows y = 3*sin(2*x + 2). How is its wave shifted from y = 3*sin(2*x)?",
        fn: '3*sin(2*x+2)',
        options: ['Left by 2', 'Left by 1', 'Right by 1', 'Right by 2'],
        correct: 1,
      },
      {
        prompt:
          "A hamster's wheel follows y = 2*sin(2*x - 2) + 3. What are its period and phase shift?",
        fn: '2*sin(2*x-2)+3',
        options: [
          'Period π, shifted right by 1',
          'Period 2π, shifted right by 1',
          'Period π, shifted right by 2',
          'Period π, shifted left by 1',
        ],
        correct: 0,
      },
      {
        prompt:
          "A hamster's wheel follows y = sin(4*x). What is the period of one turn?",
        fn: 'sin(4*x)',
        options: ['π/2', '2π', '4π', 'π/4'],
        correct: 0,
      },
      {
        prompt:
          "A slow hamster's wheel follows y = 2*sin(x/2). What is the period of one turn?",
        fn: '2*sin(x/2)',
        options: ['π', '4π', '2π', 'π/2'],
        correct: 1,
      },
      {
        prompt:
          "A hamster's wheel follows y = sin(x + 3). How is its wave shifted from y = sin(x)?",
        fn: 'sin(x+3)',
        options: ['Right by 3', 'Up by 3', 'Down by 3', 'Left by 3'],
        correct: 3,
      },
      {
        prompt:
          "A hamster's wheel follows y = 2*sin(3*x - 3). How is its wave shifted from y = 2*sin(3*x)?",
        fn: '2*sin(3*x-3)',
        options: ['Right by 3', 'Right by 1', 'Left by 1', 'Left by 3'],
        correct: 1,
      },
      {
        prompt:
          "A hamster's wheel follows y = 3*sin(x - 2) + 1. What are its amplitude and midline?",
        fn: '3*sin(x-2)+1',
        options: [
          'Amplitude 3, midline y = 1',
          'Amplitude 1, midline y = 3',
          'Amplitude 3, midline y = -2',
          'Amplitude 2, midline y = 1',
        ],
        correct: 0,
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
  const insPrereq = db.prepare(
    'INSERT INTO planet_prereqs (planet_id, prereq_planet_id) VALUES (?, ?)',
  );

  db.transaction(() => {
    const idByName = new Map<string, number>();
    for (const planet of planets) {
      const planetId = Number(
        insPlanet.run(planet.name, planet.introText, planet.graphOrder)
          .lastInsertRowid,
      );
      idByName.set(planet.name, planetId);
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
    // Prereqs go in once every planet has an ID.
    for (const planet of planets) {
      for (const prereq of planet.prereqs ?? []) {
        const prereqId = idByName.get(prereq);
        if (prereqId === undefined) {
          throw new Error(`${planet.name} requires unknown planet ${prereq}.`);
        }
        insPrereq.run(idByName.get(planet.name), prereqId);
      }
    }
  })();
}

if (require.main === module) seed(openDb());
