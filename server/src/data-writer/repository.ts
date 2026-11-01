/**
 * repository.ts defines the interfaces for the various repositories that access the database. The implementations are in sqlite.ts.
 */

/**
 * User represents a user in the system.
 */
export interface User {
  userId: number;
  username: string;
  hintQuota: number;
  musicVolume: number;
  sfxVolume: number;
  createdAt: string;
}

/**
 * UserSettings represents the settings for a user. Both volumes are between 0 and 1.
 */
export interface UserSettings {
  musicVolume: number;
  sfxVolume: number;
}

/**
 * Reads and writes users: accounts, audio settings, and hint quota.
 */
export interface UserRep {
  /**
   * Finds user by id.
   * @param userId the id of the user
   */
  findById(userId: number): User | undefined;
  /**
   * Finds user by username.
   * @param username the username of the user
   */
  findByUsername(username: string): User | undefined;
  /**
   * Creates user with the given username and returns the new user.
   * @param username the username of the new user
   */
  create(username: string): User;
  /**
   * Changes the user's music and sfx volume settings.
   * @param userId the id of the user
   * @param settings the new settings
   */
  saveSettings(userId: number, settings: UserSettings): void;
  /**
   * Spends one hint, ATOMICALLY!!! Returns false if quota is 0.
   * @param userId the id of the user
   */
  spendHint(userId: number): boolean;
  /**
   * Adds hints to the user's quota from a minigame result.
   * @param userId the id of the user
   * @param count the number of hints to add
   */
  addHints(userId: number, count: number): void;
}

/**
 * A planet on the selection screen, graphOrder controls layout depth, unlocking decided by prereq.
 */
export interface Planet {
  planetId: number;
  name: string;
  introText: string;
  graphOrder: number;
}

/**
 * Decides which planets are unlocked by which other planets. Each row means planet_id requires prereq_planet_id.
 */
export interface Prereq {
  planetId: number;
  prereqPlanetId: number;
}

/**
 * One page of reading for a lesson, ordered by lesson_number. Each planet has 1 or more lessons.
 */
export interface Lesson {
  lessonId: number;
  planetId: number;
  lessonNumber: number;
  text: string;
}

/**
 * A question on a planet without its options.
 */
export interface Question {
  questionId: number;
  planetId: number;
  prompt: string;
  qtype: 'mcq' | 'free_response';
  graph: string | null; //shld b JSON string, ie {"fn":"2*x+3"} or null
}

/**
 * Client-side answer options.
 */
export interface PublicOption {
  questionId: number;
  optionId: number;
  label: string;
  text: string;
}

/**
 * Server-side answer options, with is_correct.
 */
export interface PrivateOption extends PublicOption {
  isCorrect: boolean;
}

/**
 * Read-only access to content: planets, lessons, questions, and answer options.
 */
export interface ContentRep {
  /**
   * Lists all planets in graph order.
   * @returns The planets, ordered by graph_order then planet_id.
   */
  listPlanets(): Planet[];
  /**
   * Gets a planet by id, or undefined if not found.
   * @param planetId the id of the planet
   */
  getPlanet(planetId: number): Planet | undefined;
  /**
   * Lists all planet prerequisites.
   * @returns The prerequisites, each row indicating that planet_id requires prereq_planet_id.
   */
  listPrereqs(): Prereq[];
  /**
   * Gets all lessons for a planet, ordered by lesson_number.
   * @param planetId the id of the planet
   */
  getLessons(planetId: number): Lesson[];
  /**
   * Counts the number of questions for a planet.
   * @param planetId the id of the planet
   */
  countQuestions(planetId: number): number;
  /**
   * Gets a question by id, or undefined if not found.
   * @param questionId the id of the question
   */
  getQuestion(questionId: number): Question | undefined;
  /**
   * The next unsolved question for a user on a planet, or undefined if all are solved.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  nextUnsolvedQuestion(userId: number, planetId: number): Question | undefined;
  /**
   * Gets the public answer options for a question, ordered by label.
   * @param questionId the id of the question
   */
  getPublicOptions(questionId: number): PublicOption[];
  /**
   * The option only if it belongs to the question, or undefined.
   * @param questionId the id of the question
   * @param optionId the id of the option
   */
  findOption(questionId: number, optionId: number): PrivateOption | undefined;
  /**
   * Gets the correct option for a question, or undefined if not found.
   * @param questionId the id of the question
   */
  getCorrectOption(questionId: number): PrivateOption | undefined;
}

/**
 * Reads and writes user answers.
 */
export interface AnswerRep {
  /**
   * Says whether the user has already solved the question.
   * @param userId the id of the user
   * @param questionId the id of the question
   */
  hasSolved(userId: number, questionId: number): boolean;
  /**
   * Inserts one attempt. Throws if the option doesn't belong to the question or if a
   * second correct answer is recorded. (so check hasSolved 1st)
   * @param userId the id of the user
   * @param questionId the id of the question
   * @param optionId the id of the option
   * @param correct whether the answer is correct
   */
  record(
    userId: number,
    questionId: number,
    optionId: number,
    correct: boolean,
  ): void;
}

/**
 * The status of a planet.
 */
export type PlanetStatus = 'hostile' | 'peaceful';

/**
 * Represents the progress of a user on a planet.
 */
export interface PlanetProgress {
  userId: number;
  planetId: number;
  status: PlanetStatus;
  correctCount: number;
}

/**
 * Reads and writes user progress on planets.
 */
export interface ProgressRep {
  /**
   * Gets the planet progress row for a user and planet, creating it if needed.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  ensure(userId: number, planetId: number): PlanetProgress;
  /**
   * Lists all planet progress rows for a user.
   * @param userId the id of the user
   */
  listForUser(userId: number): PlanetProgress[];
  /**
   * Adds 1 to correct_count and returns the updated row.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  incrementCorrect(userId: number, planetId: number): PlanetProgress;
  /**
   * Sets the status for a user and planet.
   * @param userId the id of the user
   * @param planetId the id of the planet
   * @param status the new status of the planet
   */
  setStatus(userId: number, planetId: number, status: PlanetStatus): void;
}

/**
 * A hint's text for one user and one question.
 */
export interface Hint {
  hintId: number;
  userId: number;
  questionId: number;
  text: string;
  used: boolean;
}

/**
 * Reads and writes hints for users and questions. Implementations should ensure that each user has at most one hint per question.
 */
export interface HintRep {
  /**
   * Finds a hint for a user and question, or undefined if none exists.
   * @param userId the id of the user
   * @param questionId the id of the question
   */
  find(userId: number, questionId: number): Hint | undefined;
  /**
   * Creates a new hint for a user and question, returning the new hint.
   * @param userId the id of the user
   * @param questionId the id of the question
   * @param text the text of the hint
   */
  create(userId: number, questionId: number, text: string): Hint;
  /**
   * Marks a hint as used. Does nothing if the hint is already used.
   * @param hintId the id of the hint
   */
  markUsed(hintId: number): void;
}
