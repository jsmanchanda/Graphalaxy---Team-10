/**
 * The HTTP API contract shared by the client and the server. Every request and
 * response body is one of these types; neither side keeps its own copy.
 *
 *   POST  /api/users: LoginRequest -> Player
 *   GET   /api/users/:userId/planets/:planetId -> Planet
 *   PATCH /api/users/:userId/settings: Settings -> Player
 *   POST  /api/users/:userId/questions/:questionId/answer: AnswerRequest -> AnswerResult
 *
 * Errors are sent as ApiErrorBody with a 4xx or 5xx status.
 */

/** A player's audio settings. Both volumes are between 0 and 1. */
export interface Settings {
  musicVolume: number;
  sfxVolume: number;
}

/** The logged-in player. */
export interface Player {
  userId: number;
  name: string;
  hintQuota: number;
  settings: Settings;
}

/** An answer option safe to send before a question is graded. */
export interface AnswerOption {
  optionId: number;
  label: string;
  text: string;
}

/** The graph drawn with a question, e.g. {fn: '2*x+3'}. */
export type GraphSpec = Record<string, string>;

/** A multiple-choice question; answer keys remain on the server. */
export interface Question {
  questionId: number;
  prompt: string;
  graph?: GraphSpec;
  type: 'mcq';
  options: AnswerOption[];
}

/** The reading displayed before a lesson's questions. */
export interface ReadingTask {
  type: 'Reading';
  text: string;
  graph?: GraphSpec;
}

/** A question slide in a lesson, and whether this player has solved it. */
export interface QuestionTask {
  type: 'Question';
  question: Question;
  // solved: boolean;
}

/** One slide on a planet. */
export type Task = ReadingTask | QuestionTask;

/** A planet with its slides in display order: readings, then questions. */
export interface Planet {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
  tasks: Task[];
}

/** The body of POST /api/users. */
export interface LoginRequest {
  username: string;
}

/** The body of POST .../questions/:questionId/answer. */
export interface AnswerRequest {
  optionId: number;
}

/** Feedback released only after a valid answer submission. */
export interface AnswerResult {
  questionId: number;
  correct: boolean;
  correctOption: AnswerOption;
}

/** The body of every error response. */
export interface ApiErrorBody {
  error: {code: string; message: string};
}
