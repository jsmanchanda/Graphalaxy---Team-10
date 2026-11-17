import type {SeedPlanet} from '../../src/db/seed';

/**
 * Fixed content for tests that check the schema and repositories, so they do
 * not change when the game's seed content changes. Seeded into an empty
 * database with `seed(db, [TEST_PLANET])`, it gets planet ID 1, readings 1-2,
 * hints 1-3, and questions 1-5.
 */
export const TEST_PLANET: SeedPlanet = {
  name: 'Test Planet',
  introText: 'A planet for tests.',
  graphOrder: 0,
  readings: ['First reading.', 'Second reading.'],
  hints: ['First hint.', 'Second hint.', 'Third hint.'],
  questions: [
    {prompt: 'Q1', fn: '2*x+3', options: ['2', '3', '5', '0'], correct: 0},
    {prompt: 'Q2', fn: '2*x+3', options: ['2', '3', '-3', '0'], correct: 1},
    {prompt: 'Q3', fn: '-4*x+1', options: ['1', '2', '3', '4'], correct: 1},
    {prompt: 'Q4', fn: '3*x-1', options: ['5', '6', '7', '4'], correct: 0},
    {prompt: 'Q5', fn: '4', options: ['1', '2', '0', '-1'], correct: 2},
  ],
};
