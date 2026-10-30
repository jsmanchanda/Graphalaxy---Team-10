import type {Database} from 'better-sqlite3';
import type {
  AnswerRep,
  ContentRep,
  PrivateOption,
  Hint,
  HintRep,
  PlanetProgress,
  ProgressRep,
  Question,
  User,
  UserRep,
} from './repository';

// only call AFTER you migrate()!!

const USER_COLS = `user_id AS userId, username, hint_quota AS hintQuota,
  music_volume AS musicVolume, sfx_volume AS sfxVolume,
  date_of_creation AS createdAt`;

const QUESTION_COLS = `question_id AS questionId, planet_id AS planetId,
  prompt, qtype, graph`;

const PROGRESS_COLS = `user_id AS userId, planet_id AS planetId, status,
  correct_count AS correctCount`;

/**
 * sqliteUsers returns a UserRep that uses the given db to implement the interface.
 * @param db database
 * @returns user repository
 */
export function sqliteUsers(db: Database): UserRep {
  const byId = db.prepare(`SELECT ${USER_COLS} FROM users WHERE user_id = ?`);
  const byName = db.prepare(
    `SELECT ${USER_COLS} FROM users WHERE username = ?`,
  );
  const insert = db.prepare('INSERT INTO users (username) VALUES (?)');
  const settings = db.prepare(
    'UPDATE users SET music_volume = ?, sfx_volume = ? WHERE user_id = ?',
  );
  const spend = db.prepare(
    'UPDATE users SET hint_quota = hint_quota - 1 WHERE user_id = ? AND hint_quota > 0',
  );
  const add = db.prepare(
    'UPDATE users SET hint_quota = hint_quota + ? WHERE user_id = ?',
  );

  return {
    findById: id => byId.get(id) as User | undefined,
    findByUsername: name => byName.get(name) as User | undefined,
    create(username) {
      const info = insert.run(username);
      return byId.get(info.lastInsertRowid) as User;
    },
    saveSettings(userId, s) {
      settings.run(s.musicVolume, s.sfxVolume, userId);
    },
    spendHint: userId => spend.run(userId).changes === 1,
    addHints(userId, count) {
      add.run(count, userId);
    },
  };
}

/**
 * sqliteContent returns a ContentRep that uses the given db to implement the interface.
 * @param db database
 * @returns content repository
 */
export function sqliteContent(db: Database): ContentRep {
  const planets = db.prepare(
    'SELECT planet_id AS planetId, name, intro_text AS introText, graph_order AS graphOrder FROM planets ORDER BY graph_order, planet_id',
  );
  const planet = db.prepare(
    'SELECT planet_id AS planetId, name, intro_text AS introText, graph_order AS graphOrder FROM planets WHERE planet_id = ?',
  );
  const prereqs = db.prepare(
    'SELECT planet_id AS planetId, prereq_planet_id AS prereqPlanetId FROM planet_prereqs',
  );
  const lessons = db.prepare(
    'SELECT lesson_number AS lessonNumber, text FROM lessons WHERE planet_id = ? ORDER BY lesson_number',
  );
  const countQ = db.prepare(
    'SELECT COUNT(*) FROM questions WHERE planet_id = ?',
  );
  const question = db.prepare(
    `SELECT ${QUESTION_COLS} FROM questions WHERE question_id = ?`,
  );
  const nextQ = db.prepare(
    `SELECT ${QUESTION_COLS} FROM questions q
     WHERE q.planet_id = @planetId
       AND NOT EXISTS (
         SELECT 1 FROM user_answer ua
         WHERE ua.user_id = @userId
           AND ua.question_id = q.question_id
           AND ua.correct = 1)
     ORDER BY q.question_id
     LIMIT 1`,
  );
  const publicOpts = db.prepare(
    'SELECT option_id AS optionId, label, text FROM answer_options WHERE question_id = ? ORDER BY label',
  );
  const option = db.prepare(
    `SELECT option_id AS optionId, label, text, is_correct AS isCorrect
     FROM answer_options WHERE question_id = ? AND option_id = ?`,
  );
  const correctOpt = db.prepare(
    `SELECT option_id AS optionId, label, text, is_correct AS isCorrect
     FROM answer_options WHERE question_id = ? AND is_correct = 1`,
  );

  const toGraded = (row: unknown): PrivateOption | undefined => {
    if (!row) return undefined;
    const r = row as Omit<PrivateOption, 'isCorrect'> & {isCorrect: number};
    return {...r, isCorrect: r.isCorrect === 1};
  };

  return {
    listPlanets: () => planets.all() as ReturnType<ContentRep['listPlanets']>,
    getPlanet: id => planet.get(id) as ReturnType<ContentRep['getPlanet']>,
    listPrereqs: () => prereqs.all() as ReturnType<ContentRep['listPrereqs']>,
    getLessons: id => lessons.all(id) as ReturnType<ContentRep['getLessons']>,
    countQuestions: id => countQ.pluck().get(id) as number,
    getQuestion: id => question.get(id) as Question | undefined,
    nextUnsolvedQuestion: (userId, planetId) =>
      nextQ.get({userId, planetId}) as Question | undefined,
    getPublicOptions: id =>
      publicOpts.all(id) as ReturnType<ContentRep['getPublicOptions']>,
    findOption: (questionId, optionId) =>
      toGraded(option.get(questionId, optionId)),
    getCorrectOption: questionId => toGraded(correctOpt.get(questionId)),
  };
}

/**
 * sqliteAnswers returns an AnswerRep that uses the given db to implement the interface.
 * @param db database
 * @returns answer repository
 */
export function sqliteAnswers(db: Database): AnswerRep {
  const solved = db.prepare(
    'SELECT 1 FROM user_answer WHERE user_id = ? AND question_id = ? AND correct = 1',
  );
  const insert = db.prepare(
    'INSERT INTO user_answer (user_id, question_id, selected_option_id, correct) VALUES (?, ?, ?, ?)',
  );

  return {
    hasSolved: (userId, questionId) =>
      solved.get(userId, questionId) !== undefined,
    record(userId, questionId, optionId, correct) {
      insert.run(userId, questionId, optionId, correct ? 1 : 0);
    },
  };
}

/**
 * sqliteProgress returns a ProgressRep that uses the given db to implement the interface.
 * @param db database
 * @returns progress repository
 */
export function sqliteProgress(db: Database): ProgressRep {
  const ensureRow = db.prepare(
    'INSERT OR IGNORE INTO planet_progress (user_id, planet_id) VALUES (?, ?)',
  );
  const get = db.prepare(
    `SELECT ${PROGRESS_COLS} FROM planet_progress WHERE user_id = ? AND planet_id = ?`,
  );
  const list = db.prepare(
    `SELECT ${PROGRESS_COLS} FROM planet_progress WHERE user_id = ?`,
  );
  const inc = db.prepare(
    'UPDATE planet_progress SET correct_count = correct_count + 1 WHERE user_id = ? AND planet_id = ?',
  );
  const status = db.prepare(
    'UPDATE planet_progress SET status = ? WHERE user_id = ? AND planet_id = ?',
  );

  const ensure = (userId: number, planetId: number) => {
    ensureRow.run(userId, planetId);
    return get.get(userId, planetId) as PlanetProgress;
  };

  return {
    ensure,
    listForUser: userId => list.all(userId) as PlanetProgress[],
    incrementCorrect(userId, planetId) {
      ensureRow.run(userId, planetId);
      inc.run(userId, planetId);
      return get.get(userId, planetId) as PlanetProgress;
    },
    setStatus(userId, planetId, s) {
      status.run(s, userId, planetId);
    },
  };
}
/**
 * sqliteHints returns a HintRep that uses the given db to implement the interface.
 * @param db database
 * @returns hint repository
 */
export function sqliteHints(db: Database): HintRep {
  const COLS =
    'hint_id AS hintId, user_id AS userId, question_id AS questionId, text, used';
  const toHint = (row: unknown): Hint | undefined => {
    if (!row) return undefined;
    const r = row as Omit<Hint, 'used'> & {used: number};
    return {...r, used: r.used === 1};
  };

  const find = db.prepare(
    `SELECT ${COLS} FROM hints WHERE user_id = ? AND question_id = ?`,
  );
  const byId = db.prepare(`SELECT ${COLS} FROM hints WHERE hint_id = ?`);
  const insert = db.prepare(
    'INSERT INTO hints (user_id, question_id, text) VALUES (?, ?, ?)',
  );
  const used = db.prepare('UPDATE hints SET used = 1 WHERE hint_id = ?');

  return {
    find: (userId, questionId) => toHint(find.get(userId, questionId)),
    create(userId, questionId, text) {
      const info = insert.run(userId, questionId, text);
      return toHint(byId.get(info.lastInsertRowid)) as Hint;
    },
    markUsed(hintId) {
      used.run(hintId);
    },
  };
}
