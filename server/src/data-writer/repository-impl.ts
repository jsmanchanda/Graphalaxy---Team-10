import type {Database, Statement} from 'better-sqlite3';
import type {
  AnswerRep,
  ContentRep,
  PrivateOption,
  Hint,
  HintRep,
  Planet,
  PlanetProgress,
  PlanetStatus,
  Prereq,
  ProgressRep,
  PublicOption,
  Question,
  Reading,
  User,
  UserRep,
  UserSettings,
} from './repository';

const USER_COLS = `user_id AS userId, username, hint_quota AS hintQuota,
  music_volume AS musicVolume, sfx_volume AS sfxVolume,
  date_of_creation AS createdAt`;

const QUESTION_COLS = `question_id AS questionId, planet_id AS planetId,
  prompt, qtype, graph`;

const PROGRESS_COLS = `user_id AS userId, planet_id AS planetId, status,
  correct_count AS correctCount`;

const toGraded = (row: unknown): PrivateOption | undefined => {
  if (!row) return undefined;
  const r = row as Omit<PrivateOption, 'isCorrect'> & {isCorrect: number}; //private option w/o isCorrect. add isCorrect as a number
  return {...r, isCorrect: r.isCorrect === 1}; //copy all of r, then change isCorrect to true/false
};

const toHint = (row: unknown): Hint => {
  const r = row as Omit<Hint, 'used'> & {used: number};
  return {...r, used: r.used === 1};
};

/**
 * SqliteUserRep is a UserRep that uses the given db to implement the interface.
 */
export class SqliteUserRep implements UserRep {
  private readonly byId: Statement; //readonly -- only assigned in constructor
  private readonly byName: Statement;
  private readonly insert: Statement;
  private readonly settings: Statement;
  private readonly spend: Statement;
  private readonly add: Statement;

  /**
   * Prepares the statements for the user repository.
   * @param db database
   */
  constructor(db: Database) {
    this.byId = db.prepare(`SELECT ${USER_COLS} FROM users WHERE user_id = ?`); //tmp literal, select cols where user id matches
    this.byName = db.prepare(
      `SELECT ${USER_COLS} FROM users WHERE username = ?`,
    );
    this.insert = db.prepare('INSERT INTO users (username) VALUES (?)'); //sets username
    this.settings = db.prepare(
      'UPDATE users SET music_volume = ?, sfx_volume = ? WHERE user_id = ?',
    ); //update settings 4 specific user
    this.spend = db.prepare(
      'UPDATE users SET hint_quota = hint_quota - 1 WHERE user_id = ? AND hint_quota > 0',
    );
    this.add = db.prepare(
      'UPDATE users SET hint_quota = hint_quota + ? WHERE user_id = ?',
    );
  }

  /**
   * Finds user by id.
   * @param userId the id of the user
   */
  findById(userId: number): User | undefined {
    return this.byId.get(userId) as User | undefined; //get runs the template ltieral, returns first row as obj or undefined
  }

  /**
   * Finds user by username.
   * @param username the username of the user
   */
  findByUsername(username: string): User | undefined {
    return this.byName.get(username) as User | undefined;
  }

  /**
   * Creates user with the given username and returns the new user.
   * @param username the username of the new user
   */
  create(username: string): User {
    const info = this.insert.run(username);
    return this.byId.get(info.lastInsertRowid) as User;
  }

  /**
   * Changes the user's music and sfx volume settings.
   * @param userId the id of the user
   * @param settings the new settings
   */
  saveSettings(userId: number, settings: UserSettings): void {
    this.settings.run(settings.musicVolume, settings.sfxVolume, userId);
  }

  /**
   * Spends one hint, ATOMICALLY!!! Returns false if quota is 0.
   * @param userId the id of the user
   */
  spendHint(userId: number): boolean {
    return this.spend.run(userId).changes === 1;
  }

  /**
   * Adds hints to the user's quota from a minigame result.
   * @param userId the id of the user
   * @param count the number of hints to add
   */
  addHints(userId: number, count: number): void {
    this.add.run(count, userId);
  }
}

/**
 * SqliteContentRep is a ContentRep that uses the given db to implement the interface.
 */
export class SqliteContentRep implements ContentRep {
  private readonly planets: Statement;
  private readonly planet: Statement;
  private readonly prereqs: Statement;
  private readonly readings: Statement;
  private readonly countQ: Statement;
  private readonly question: Statement;
  private readonly questions: Statement;
  private readonly nextQ: Statement;
  private readonly publicOpts: Statement;
  private readonly option: Statement;
  private readonly correctOpt: Statement;

  /**
   * Prepares the statements for the content repository.
   * @param db database
   */
  constructor(db: Database) {
    this.planets = db.prepare(
      'SELECT planet_id AS planetId, name, intro_text AS introText, graph_order AS graphOrder FROM planets ORDER BY graph_order, planet_id',
    );
    this.planet = db.prepare(
      'SELECT planet_id AS planetId, name, intro_text AS introText, graph_order AS graphOrder FROM planets WHERE planet_id = ?',
    );
    this.prereqs = db.prepare(
      'SELECT planet_id AS planetId, prereq_planet_id AS prereqPlanetId FROM planet_prereqs',
    );
    this.readings = db.prepare(
      'SELECT reading_id as readingId, planet_id AS planetId, reading_number AS readingNumber, text FROM readings WHERE planet_id = ? ORDER BY reading_number',
    );
    this.countQ = db.prepare(
      'SELECT COUNT(*) FROM questions WHERE planet_id = ?',
    );
    this.question = db.prepare(
      `SELECT ${QUESTION_COLS} FROM questions WHERE question_id = ?`,
    );
    this.questions = db.prepare(
      `SELECT ${QUESTION_COLS} FROM questions WHERE planet_id = ? ORDER BY question_id`,
    );
    this.nextQ = db.prepare(
      `SELECT ${QUESTION_COLS} FROM questions q
       WHERE q.planet_id = @planetId
         AND NOT EXISTS (
           SELECT 1 FROM user_answer ua
           WHERE ua.user_id = @userId
             AND ua.question_id = q.question_id
             AND ua.correct = 1)
       ORDER BY q.question_id
       LIMIT 1`,
    ); //QUESTION COLS, from questions table, set q = table alias so questions = q. then
    //planet_id = @planetId the named parameter {userId, planetId}, and keep the question if the following finds no rows:
    //any row in ua with the same user_id and question_id and correct = 1.EXCLUDE THOSE. order by the question id (lowest first), and only return 1 row.
    this.publicOpts = db.prepare(
      'SELECT option_id AS optionId, question_id as questionId, label, text FROM answer_options WHERE question_id = ? ORDER BY label',
    );
    this.option = db.prepare(
      `SELECT option_id AS optionId, question_id as questionId, label, text, is_correct AS isCorrect
       FROM answer_options WHERE question_id = ? AND option_id = ?`,
    );
    this.correctOpt = db.prepare(
      `SELECT option_id AS optionId, question_id as questionId, label, text, is_correct AS isCorrect
       FROM answer_options WHERE question_id = ? AND is_correct = 1`,
    );
  }

  /**
   * Lists all planets in graph order.
   * @returns The planets, ordered by graph_order then planet_id.
   */
  listPlanets(): Planet[] {
    return this.planets.all() as Planet[];
  }

  /**
   * Gets a planet by id, or undefined if not found.
   * @param planetId the id of the planet
   */
  getPlanet(planetId: number): Planet | undefined {
    return this.planet.get(planetId) as Planet | undefined;
  }

  /**
   * Lists all planet prerequisites.
   * @returns The prerequisites, each row indicating that planet_id requires prereq_planet_id.
   */
  listPrereqs(): Prereq[] {
    return this.prereqs.all() as Prereq[];
  }

  /**
   * Gets all readings for a planet, ordered by reading_number.
   * @param planetId the id of the planet
   */
  getReadings(planetId: number): Reading[] {
    return this.readings.all(planetId) as Reading[];
  }

  /**
   * Counts the number of questions for a planet.
   * @param planetId the id of the planet
   */
  countQuestions(planetId: number): number {
    return this.countQ.pluck().get(planetId) as number;
  }

  /**
   * Gets a question by id, or undefined if not found.
   * @param questionId the id of the question
   */
  getQuestion(questionId: number): Question | undefined {
    return this.question.get(questionId) as Question | undefined;
  }

  /**
   * Gets all questions for a planet, ordered by question_id.
   * @param planetId the id of the planet
   */
  getQuestions(planetId: number): Question[] {
    return this.questions.all(planetId) as Question[];
  }

  /**
   * The next unsolved question for a user on a planet, or undefined if all are solved.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  nextUnsolvedQuestion(userId: number, planetId: number): Question | undefined {
    return this.nextQ.get({userId, planetId}) as Question | undefined;
  }

  /**
   * Gets the public answer options for a question, ordered by label.
   * @param questionId the id of the question
   */
  getPublicOptions(questionId: number): PublicOption[] {
    return this.publicOpts.all(questionId) as PublicOption[];
  }

  /**
   * The option only if it belongs to the question, or undefined.
   * @param questionId the id of the question
   * @param optionId the id of the option
   */
  findOption(questionId: number, optionId: number): PrivateOption | undefined {
    return toGraded(this.option.get(questionId, optionId));
  }

  /**
   * Gets the correct option for a question, or undefined if not found.
   * @param questionId the id of the question
   */
  getCorrectOption(questionId: number): PrivateOption | undefined {
    return toGraded(this.correctOpt.get(questionId));
  }
}

/**
 * SqliteAnswerRep is an AnswerRep that uses the given db to implement the interface.
 */
export class SqliteAnswerRep implements AnswerRep {
  private readonly solved: Statement;
  private readonly insert: Statement;

  /**
   * Prepares the statements for the answer repository.
   * @param db database
   */
  constructor(db: Database) {
    this.solved = db.prepare(
      'SELECT 1 FROM user_answer WHERE user_id = ? AND question_id = ? AND correct = 1',
    );
    this.insert = db.prepare(
      'INSERT INTO user_answer (user_id, question_id, selected_option_id, correct) VALUES (?, ?, ?, ?)',
    );
  }

  /**
   * Says whether the user has already solved the question.
   * @param userId the id of the user
   * @param questionId the id of the question
   */
  hasSolved(userId: number, questionId: number): boolean {
    return this.solved.get(userId, questionId) !== undefined;
  }

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
  ): void {
    this.insert.run(userId, questionId, optionId, correct ? 1 : 0);
  }
}

/**
 * SqliteProgressRep is a ProgressRep that uses the given db to implement the interface.
 */
export class SqliteProgressRep implements ProgressRep {
  private readonly ensureRow: Statement;
  private readonly byKey: Statement;
  private readonly list: Statement;
  private readonly inc: Statement;
  private readonly status: Statement;

  /**
   * Prepares the statements for the progress repository.
   * @param db database
   */
  constructor(db: Database) {
    this.ensureRow = db.prepare(
      'INSERT OR IGNORE INTO planet_progress (user_id, planet_id) VALUES (?, ?)',
    );
    this.byKey = db.prepare(
      `SELECT ${PROGRESS_COLS} FROM planet_progress WHERE user_id = ? AND planet_id = ?`,
    );
    this.list = db.prepare(
      `SELECT ${PROGRESS_COLS} FROM planet_progress WHERE user_id = ?`,
    );
    this.inc = db.prepare(
      'UPDATE planet_progress SET correct_count = correct_count + 1 WHERE user_id = ? AND planet_id = ?',
    );
    this.status = db.prepare(
      'UPDATE planet_progress SET status = ? WHERE user_id = ? AND planet_id = ?',
    );
  }

  /**
   * Gets the planet progress row for a user and planet, creating it if needed.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  ensure(userId: number, planetId: number): PlanetProgress {
    this.ensureRow.run(userId, planetId);
    return this.byKey.get(userId, planetId) as PlanetProgress;
  }

  /**
   * Lists all planet progress rows for a user.
   * @param userId the id of the user
   */
  listForUser(userId: number): PlanetProgress[] {
    return this.list.all(userId) as PlanetProgress[];
  }

  /**
   * Adds 1 to correct_count and returns the updated row.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  incrementCorrect(userId: number, planetId: number): PlanetProgress {
    this.ensureRow.run(userId, planetId);
    this.inc.run(userId, planetId);
    return this.byKey.get(userId, planetId) as PlanetProgress;
  }

  /**
   * Sets the status for a user and planet, creating the progress row if needed.
   * @param userId the id of the user
   * @param planetId the id of the planet
   * @param status the new status of the planet
   */
  setStatus(userId: number, planetId: number, status: PlanetStatus): void {
    this.ensureRow.run(userId, planetId);
    this.status.run(status, userId, planetId);
  }
}

/**
 * SqliteHintRep is a HintRep that uses the given db to implement the interface.
 */
export class SqliteHintRep implements HintRep {
  private readonly byPlanet: Statement;
  private readonly used: Statement;

  /**
   * Prepares the statements for the hint repository.
   * @param db database
   */
  constructor(db: Database) {
    this.byPlanet = db.prepare(
      `SELECT h.hint_id AS hintId, h.planet_id AS planetId, h.hint_number AS hintNumber,
         h.text, uh.user_id IS NOT NULL AS used
       FROM planet_hints h
       LEFT JOIN user_hints uh ON uh.hint_id = h.hint_id AND uh.user_id = @userId
       WHERE h.planet_id = @planetId
       ORDER BY h.hint_number`,
    ); // h = planet_hints alias. LEFT JOIN user_hints, alias uh: user_hints.hint_id = planet_hints hint id.
    // match hint to user. LEFT JOIN - hint appears even when no matching user record exists.
    //LEFT JOIN - return all rows from left table and matching ones from right table.
    this.used = db.prepare(
      'INSERT OR IGNORE INTO user_hints (user_id, hint_id) VALUES (?, ?)',
    );
  }

  /**
   * Gets all hints for a planet, ordered by hint_number, with whether the user has used each one.
   * @param userId the id of the user
   * @param planetId the id of the planet
   */
  list(userId: number, planetId: number): Hint[] {
    return this.byPlanet.all({userId, planetId}).map(toHint);
  }

  /**
   * Marks a hint as used by a user. Does nothing if the user already used the hint.
   * @param userId the id of the user
   * @param hintId the id of the hint
   */
  markUsed(userId: number, hintId: number): void {
    this.used.run(userId, hintId);
  }
}
