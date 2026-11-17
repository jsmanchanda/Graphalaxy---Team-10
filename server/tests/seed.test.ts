import {describe, it, expect, beforeEach} from 'vitest';
import type {Question} from '@graphalaxy/shared';
import type {Database} from 'better-sqlite3';
import {openDb} from '../src/db/connection';
import {migrate} from '../src/db/migrate';
import {PLANETS, seed} from '../src/db/seed';
import {createDataWriter} from '../src/data-writer';
import {QuestionManager} from '../src/question-manager/QuestionManager';

const PLACEHOLDER =
  /placeholder|lorem|ipsum|\btodo\b|\btbd\b|\bxxx\b|\bfixme\b/i;

/**
 * Turns a graph equation into a function the same way the client's
 * GraphComponent.stringToMathFunction does: `sin` and `cos` become
 * `Math.sin` and `Math.cos`, then the equation runs as JavaScript.
 * @param equation - The expression in x, like `3*sin(2*x)`.
 * @returns The function of x it describes.
 */
function toFunction(equation: string): (x: number) => number {
  const body = equation.replace(/(?<!\.)\b(sin|cos)\(/g, 'Math.$1(');
  return new Function('x', `return ${body};`) as (x: number) => number;
}

/**
 * Turns an answer option written for players, like `y = -4x + 1` or
 * `y = 4*sin(x + π/2)`, into a function of x.
 * @param option - The option text, starting with `y =`.
 * @returns The function of x it describes.
 */
function optionToFunction(option: string): (x: number) => number {
  const expression = option
    .replace(/^y\s*=\s*/, '')
    .replace(/(\d|\)|π)(?=\s*(x|\(|sin|cos|π))/g, '$1*') // 4x -> 4*x
    .replace(/π/g, 'Math.PI')
    .replace(/\^/g, '**');
  return toFunction(expression);
}

const SAMPLE_XS = Array.from({length: 41}, (unused, i) => -10 + i / 2);

/**
 * Whether two functions give the same y at every sample x.
 * @param f - The first function.
 * @param g - The second function.
 * @returns True if they match at every sample.
 */
function sameCurve(f: (x: number) => number, g: (x: number) => number) {
  return SAMPLE_XS.every(x => Math.abs(f(x) - g(x)) < 1e-9);
}

describe('seed content', () => {
  it('has exactly four planets with graph_order 0-3, each used once', () => {
    expect(PLANETS).toHaveLength(4);
    expect(PLANETS.map(p => p.graphOrder).sort()).toEqual([0, 1, 2, 3]);
    expect(new Set(PLANETS.map(p => p.name)).size).toBe(4);
  });

  describe.each(PLANETS.map(p => [p.name, p] as const))(
    '%s',
    (name, planet) => {
      it('has an intro, at least one reading, and at least 5 questions', () => {
        expect(planet.introText.trim()).not.toBe('');
        expect(planet.readings.length).toBeGreaterThanOrEqual(1);
        expect(planet.questions.length).toBeGreaterThanOrEqual(5);
      });

      it('has no empty or placeholder text', () => {
        const texts = [
          planet.name,
          planet.introText,
          ...planet.readings,
          ...planet.hints,
          ...planet.questions.flatMap(q => [q.prompt, ...q.options]),
        ];
        for (const text of texts) {
          expect(text.trim()).not.toBe('');
          expect(text).not.toMatch(PLACEHOLDER);
        }
      });

      it('has 4 distinct options per question and a valid correct index', () => {
        for (const q of planet.questions) {
          expect(q.options).toHaveLength(4);
          expect(new Set(q.options).size).toBe(4);
          expect([0, 1, 2, 3]).toContain(q.correct);
        }
      });

      it('has no duplicate prompts', () => {
        const prompts = planet.questions.map(q => q.prompt);
        expect(new Set(prompts).size).toBe(prompts.length);
      });

      it('has a graph expression on every question that parses and plots', () => {
        for (const q of planet.questions) {
          const fn = toFunction(q.fn);
          const ys = [-10, -5, -1, 0, 1, 5, 10].map(fn);
          for (const y of ys) {
            expect(typeof y).toBe('number');
            expect(Number.isFinite(y)).toBe(true);
          }
          // Part of the curve falls inside the client's default [-10, 10] y range.
          const visible = Array.from({length: 201}, (unused, i) =>
            fn(-10 + i / 10),
          );
          expect(visible.some(y => y >= -10 && y <= 10)).toBe(true);
        }
      });

      it('graphs the correct option when the options are equations in x', () => {
        // Options like "y = 4" (a midline) are lines, not the curve shown.
        const equationQuestions = planet.questions.filter(q =>
          q.options.every(
            option => option.startsWith('y =') && option.includes('x'),
          ),
        );
        for (const q of equationQuestions) {
          const graph = toFunction(q.fn);
          q.options.forEach((option, i) => {
            expect(
              sameCurve(graph, optionToFunction(option)),
              `"${q.prompt}" option "${option}"`,
            ).toBe(i === q.correct);
          });
        }
      });
    },
  );
});

describe('seed', () => {
  let db: Database;

  beforeEach(() => {
    db = openDb(':memory:');
    migrate(db);
    seed(db);
  });

  it('inserts every planet, reading, hint, question, and option', () => {
    const count = (table: string) =>
      db.prepare(`SELECT COUNT(*) FROM ${table}`).pluck().get();
    const questions = PLANETS.flatMap(p => p.questions);
    expect(count('planets')).toBe(PLANETS.length);
    expect(count('readings')).toBe(PLANETS.flatMap(p => p.readings).length);
    expect(count('planet_hints')).toBe(PLANETS.flatMap(p => p.hints).length);
    expect(count('questions')).toBe(questions.length);
    expect(count('answer_options')).toBe(questions.length * 4);
  });

  it('stores options a-d with exactly one correct, matching the content', () => {
    const rows = db
      .prepare(
        `SELECT q.prompt, GROUP_CONCAT(o.label, '') AS labels,
                SUM(o.is_correct) AS correctCount,
                MAX(CASE WHEN o.is_correct = 1 THEN o.text END) AS correctText
         FROM questions q JOIN answer_options o USING (question_id)
         GROUP BY q.question_id ORDER BY q.question_id`,
      )
      .all() as Array<{
      prompt: string;
      labels: string;
      correctCount: number;
      correctText: string;
    }>;
    const questions = PLANETS.flatMap(p => p.questions);
    expect(rows).toHaveLength(questions.length);
    rows.forEach((row, i) => {
      expect(row.prompt).toBe(questions[i].prompt);
      expect([...row.labels].sort().join('')).toBe('abcd');
      expect(row.correctCount).toBe(1);
      expect(row.correctText).toBe(questions[i].options[questions[i].correct]);
    });
  });

  it('stores each graph as {"fn": ...} JSON', () => {
    const graphs = db
      .prepare('SELECT graph FROM questions ORDER BY question_id')
      .pluck()
      .all() as string[];
    expect(graphs.map(g => JSON.parse(g))).toEqual(
      PLANETS.flatMap(p => p.questions).map(q => ({fn: q.fn})),
    );
  });

  it('is idempotent', () => {
    seed(db);
    expect(db.prepare('SELECT COUNT(*) FROM planets').pluck().get()).toBe(
      PLANETS.length,
    );
  });

  it('serves every planet in graph order with its readings and questions', () => {
    const writer = createDataWriter(db);
    const user = writer.users.create('player');
    const manager = new QuestionManager(writer, {onAnswer: () => {}});
    const planets = writer.content.listPlanets();
    expect(planets.map(p => p.name)).toEqual(
      [...PLANETS].sort((a, b) => a.graphOrder - b.graphOrder).map(p => p.name),
    );
    for (const {planetId, name} of planets) {
      const content = PLANETS.find(p => p.name === name);
      if (!content) throw new Error(`unexpected planet ${name}`);
      const {tasks} = manager.getPlanet(user.userId, planetId);
      expect(tasks).toEqual(
        content.readings.map(text => ({type: 'Reading', text})),
      );
      const questions: Question[] = [];
      for (
        let question = manager.nextQuestion(user.userId, planetId);
        question;
        question = manager.nextQuestion(user.userId, planetId)
      ) {
        questions.push(question);
        manager.submit(
          user.userId,
          question.questionId,
          question.options[0].optionId,
        );
      }
      expect(questions.map(q => q.prompt)).toEqual(
        content.questions.map(q => q.prompt),
      );
      for (const [i, q] of questions.entries()) {
        expect(q.graph).toEqual({fn: content.questions[i].fn});
        expect(q.options.map(o => o.label)).toEqual(['a', 'b', 'c', 'd']);
      }
    }
  });
});
