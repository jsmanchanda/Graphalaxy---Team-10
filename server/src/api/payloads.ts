import type {DataWriter, Question, User} from '../data-writer';
import {QuestionManagerError} from '../question-manager/QuestionManager';

//MOCK 4 DEMO. TEST IN SPRINT 2.

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
 * Builds a planet with its readings first (in reading order), then its
 * multiple-choice questions (in question order), each marked solved or not for
 * this user. Questions of other types are skipped because the client cannot
 * show them.
 *
 * NOTE: this sends each question's correct answer index to the browser, as the
 * client's `QuestionTask` model requires. Anyone can read it from the network
 * tab, so it is fine for a demo but not for graded play.
 * @param dataWriter the Data Writer (only content and answers are used)
 * @param userId the player the `solved` flags are for
 * @param planetId the planet to load
 * @throws {QuestionManagerError} NOT_FOUND if the planet does not exist, or
 * INVALID_CONTENT if a question's options or graph are malformed.
 */
export function buildPlanetPayload(
  dataWriter: Pick<DataWriter, 'content' | 'answers'>,
  userId: number,
  planetId: number,
): PlanetPayload {
  const {content} = dataWriter;
  const planet = content.getPlanet(planetId);
  if (!planet) {
    throw new QuestionManagerError(
      'NOT_FOUND',
      `Planet ${planetId} does not exist.`,
    );
  }

  const readings: ReadingTaskPayload[] = [...content.getReadings(planetId)]
    .sort(
      (a, b) => a.readingNumber - b.readingNumber || a.readingId - b.readingId,
    )
    .map(reading => ({type: 'Reading', text: reading.text}));

  const questions = content
    .getQuestions(planetId)
    .filter(question => question.qtype === 'mcq')
    .map(question => toQuestionTask(dataWriter, question, userId));

  return {
    planetId: planet.planetId,
    name: planet.name,
    introText: planet.introText,
    graphOrder: planet.graphOrder,
    tasks: [...readings, ...questions],
  };
}

/** Builds one question slide, checking that its options make sense. */
function toQuestionTask(
  {content, answers}: Pick<DataWriter, 'content' | 'answers'>,
  question: Question,
  userId: number,
): QuestionTaskPayload {
  const options = content.getPublicOptions(question.questionId);
  const correctOption = content.getCorrectOption(question.questionId);
  const correct = correctOption
    ? options.findIndex(option => option.optionId === correctOption.optionId)
    : -1;
  if (options.length < 2 || options.length > 4 || correct < 0) {
    throw new QuestionManagerError(
      'INVALID_CONTENT',
      `Question ${question.questionId} must have two to four options and one correct option.`,
    );
  }
  const graph = parseGraph(question);
  return {
    type: 'Question',
    questionId: question.questionId,
    prompt: question.prompt,
    ...(graph === undefined ? {} : {graph}),
    options: options.map(option => option.text),
    correct,
    solved: answers.hasSolved(userId, question.questionId),
  };
}

/** Parses the stored graph JSON (e.g. {"fn":"2*x+3"}), or undefined if none. */
function parseGraph(question: Question): Record<string, unknown> | undefined {
  if (question.graph === null) return undefined;
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
