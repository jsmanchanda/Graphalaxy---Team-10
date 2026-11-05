import type {User} from '../data-writer';
import {
  QuestionManagerError,
  type PlanetContent,
  type PlanetQuestion,
} from '../question-manager/QuestionManager';
//MOCK 4 DEMO. REDO IN SPRINT 2.

/** A player in the shape the client's `Player` model parses. */
export interface PlayerPayload {
  userId: number;
  name: string;
  hintQuota: number;
  settings: {musicVolume: number; sfxVolume: number};
}

/** A reading slide. */
export interface ReadingTaskPayload {
  type: 'Reading';
  text: string;
}

/**
 * A multiple-choice slide in the shape the client's `QuestionTask` parses.
 * `correct` is the index of the right answer in `options`.
 */
export interface QuestionTaskPayload {
  type: 'Question';
  questionId: number;
  prompt: string;
  graph?: Record<string, unknown>;
  options: string[];
  correct: number;
  solved: boolean;
}

/** A planet in the shape the client's `Planet` model parses. */
export interface PlanetPayload {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
  tasks: Array<ReadingTaskPayload | QuestionTaskPayload>;
}

/**
 * Converts a stored user to the client's player shape.
 * @param user the stored user
 */
export function toPlayerPayload(user: User): PlayerPayload {
  return {
    userId: user.userId,
    name: user.username,
    hintQuota: user.hintQuota,
    settings: {musicVolume: user.musicVolume, sfxVolume: user.sfxVolume},
  };
}
/**
 * Converts QuestionManager's planet content to the client's planet shape:
 * readings first, then questions. All loading, ordering and validation happens
 * in QuestionManager; this only changes the shape.
 *
 * NOTE: this sends each question's correct answer index to the browser, as the
 * client's `QuestionTask` model requires. Anyone can read it from the network
 * tab, so it is fine for a demo but not for graded play.
 * @param planet the planet content from QuestionManager.getPlanetContent
 * @throws {QuestionManagerError} INVALID_CONTENT if a question's graph is not a
 * JSON object.
 */
export function toPlanetPayload(planet: PlanetContent): PlanetPayload {
  return {
    planetId: planet.planetId,
    name: planet.name,
    introText: planet.introText,
    graphOrder: planet.graphOrder,
    tasks: [...planet.readings, ...planet.questions.map(toQuestionTask)],
  };
}

/** Converts one question to the client's slide shape. */
function toQuestionTask(question: PlanetQuestion): QuestionTaskPayload {
  const graph = parseGraph(question);
  return {
    type: 'Question',
    questionId: question.questionId,
    prompt: question.prompt,
    ...(graph === undefined ? {} : {graph}),
    options: question.options.map(option => option.text),
    // QuestionManager has already checked the correct option is in the list.
    correct: question.options.findIndex(
      option => option.optionId === question.correctOptionId,
    ),
    solved: question.solved,
  };
}

/** Parses the stored graph JSON (e.g. {"fn":"2*x+3"}), or undefined if none. */
function parseGraph(
  question: PlanetQuestion,
): Record<string, unknown> | undefined {
  if (question.graph === undefined) return undefined;
  try {
    const graph: unknown = JSON.parse(question.graph);
    if (typeof graph === 'object' && graph !== null && !Array.isArray(graph)) {
      return graph as Record<string, unknown>;
    }
  } catch {
    // fall through to the error below
  }
  throw new QuestionManagerError(
    'INVALID_CONTENT',
    `Question ${question.questionId} has an invalid graph.`,
  );
}
