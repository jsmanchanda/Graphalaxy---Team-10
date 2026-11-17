/**
 * The HTTP API contract shared by the client and the server. Every request and
 * response body is one of these types; neither side keeps its own copy.
 *
<<<<<<< HEAD
 *   POST   /api/users: LoginRequest -> Player
 *   GET    /api/users/:userId/planets -> PlanetSummary[]
 *   GET    /api/users/:userId/planets/:planetId -> Planet
 *   GET    /api/users/:userId/planets/:planetId/questions/next -> NextQuestion
 *   DELETE /api/users/:userId/planets/:planetId/progress -> PlanetSummary
 *   PATCH  /api/users/:userId/settings: Settings -> Player
 *   POST   /api/users/:userId/questions/:questionId/answer: AnswerRequest -> AnswerResult
 *   GET    /api/users/:userId/hints/balance -> HintBalanceResult
 *   GET    /api/users/:userId/planets/:planetId/hints -> UnlockedHint[]
 *   POST   /api/users/:userId/planets/:planetId/hints/unlock -> HintUnlockResult
=======
 *   POST  /api/users: LoginRequest -> Player
 *   GET   /api/users/:userId/planets/:planetId -> Planet
 *   PATCH /api/users/:userId/settings: Settings -> Player
 *   POST  /api/users/:userId/questions/:questionId/answer: AnswerRequest -> AnswerResult
 *   GET   /api/users/:userId/hints/balance -> HintBalanceResult
 *   POST  /api/users/:userId/hints/award: AwardHintCreditsRequest -> HintBalanceResult
 *   GET   /api/users/:userId/planets/:planetId/hints -> UnlockedHint[]
 *   POST  /api/users/:userId/planets/:planetId/hints/unlock -> HintUnlockResult
>>>>>>> bcac7de43438fc447915421d230a67280db772ab
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

/**
 * A planet with its lesson slides in display order. The server sends only the
 * readings here; questions are loaded one at a time as NextQuestion.
 */
export interface Planet {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
  tasks: Task[];
}

/** Whether a planet's aliens are still hostile or have been made peaceful. */
export type PlanetStatus = 'hostile' | 'peaceful';

/**
 * One player's progress on a planet. correctCount is how many of the planet's
 * questionCount questions they have answered correctly, and completionPct is
 * that share from 0 to 1. A planet is unlocked once every planet in prereqIds
 * is peaceful.
 */
export interface PlanetSummary {
  planetId: number;
  name: string;
  graphOrder: number;
  prereqIds: number[];
  unlocked: boolean;
  status: PlanetStatus;
  correctCount: number;
  questionCount: number;
  completionPct: number;
}

/**
 * The next question the player has not answered yet on a planet, in question
 * ID order, or null once they have answered every one. Each question is asked
 * once, whether the answer is right or wrong. Comes with their progress on
 * that planet.
 */
export interface NextQuestion {
  question: Question | null;
  progress: PlanetSummary;
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

/** Requested credits; this demo endpoint does not verify minigame completion. */
export interface AwardHintCreditsRequest {
  count: number;
}

/** The result of unlocking the next hint. */
export interface HintUnlockResult {
  /** Null when there are no more hints to unlock. */
  hint: UnlockedHint | null;
  hintQuota: number;
}
