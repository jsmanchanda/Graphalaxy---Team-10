-- Question-owned tables only. Data Writer must create users and planets first
-- and enable PRAGMA foreign_keys = ON on its shared connection.
-- This is an initial schema, not a migration of existing production data.
CREATE TABLE lessons (
  lesson_id INTEGER PRIMARY KEY,
  planet_id INTEGER NOT NULL REFERENCES planets(planet_id),
  lesson_number INTEGER NOT NULL CHECK (lesson_number >= 0),
  text TEXT NOT NULL,
  UNIQUE (planet_id, lesson_number)
);

CREATE TABLE questions (
  question_id INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL REFERENCES lessons(lesson_id),
  prompt TEXT NOT NULL,
  graph TEXT,
  type TEXT NOT NULL CHECK (type = 'mcq'),
  question_order INTEGER NOT NULL CHECK (question_order >= 0),
  UNIQUE (lesson_id, question_order)
);

CREATE TABLE answer_options (
  option_id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(question_id),
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  UNIQUE (question_id, label)
);

-- One row per attempt. A later incorrect attempt must not erase completion.
CREATE TABLE user_answer (
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  question_id INTEGER NOT NULL REFERENCES questions(question_id),
  correct INTEGER NOT NULL CHECK (correct IN (0, 1))
);
CREATE INDEX user_answer_completion ON user_answer(user_id, question_id, correct);
