/**
 * The HTTP API contract shared by the client and the server. Every request and
 * response body is one of these types; neither side keeps its own copy.
 *
 *   POST  /api/users: LoginRequest -> Player
 *   GET   /api/users/:userId/planets/:planetId -> Planet
 *   PATCH /api/users/:userId/settings: Settings -> Player
 *   POST  /api/users/:userId/questions/:questionId/answer: AnswerRequest -> AnswerResult
 *   GET   /api/users/:userId/hints/balance -> HintBalanceResult
 *   GET   /api/users/:userId/planets/:planetId/hints -> UnlockedHint[]
 *   POST  /api/users/:userId/planets/:planetId/hints/unlock -> HintUnlockResult
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

/**
 * Planet display data (Brina might change)
 */
export interface PlanetSummary {
  planetId: number;
  name: string;
  graphOrder: number;
  prereqIds: number[] | null; // Planet id (OR relation)
  unlocked: boolean; // true if any prereq is unlocked
  status: 'friendly' | 'hostile';
  completionPct: number; // percentage 0-1
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

/** A hint the player has unlocked and can review. */
export interface UnlockedHint {
  hintId: number;
  planetId: number;
  hintNumber: number;
  text: string;
}

/** The player's available hint credits. */
export interface HintBalanceResult {
  hintQuota: number;
}

/** The result of unlocking the next hint. */
export interface HintUnlockResult {
  /** Null when there are no more hints to unlock. */
  hint: UnlockedHint | null;
  hintQuota: number;
}
