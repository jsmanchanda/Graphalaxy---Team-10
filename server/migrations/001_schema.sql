CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    hint_quota INTEGER NOT NULL DEFAULT 3 CHECK (hint_quota >= 0),
    music_volume REAL NOT NULL DEFAULT 0.5 CHECK (music_volume BETWEEN 0 AND 1),
    sfx_volume REAL NOT NULL DEFAULT 0.5 CHECK (sfx_volume BETWEEN 0 AND 1),
    date_of_creation TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE planets (
    planet_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    intro_text TEXT NOT NULL,
    graph_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE planet_prereqs (
    planet_id INTEGER NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    prereq_planet_id INTEGER NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    PRIMARY KEY (planet_id, prereq_planet_id),
    CHECK (planet_id != prereq_planet_id)
);

CREATE TABLE questions (
    question_id INTEGER PRIMARY KEY AUTOINCREMENT,
    planet_id INTEGER NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    qtype TEXT NOT NULL DEFAULT 'mcq' CHECK (qtype IN ('mcq', 'free_response')) ,
    graph TEXT --for holding JSON files
);

CREATE TABLE answer_options (
    option_id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    label TEXT NOT NULL,-- should be 'a', 'b', 'c', 'd'
    text TEXT NOT NULL,
    is_correct INTEGER NOT NULL DEFAULT 0 CHECK (is_correct IN (0, 1)),
    UNIQUE (question_id, label),
    UNIQUE (question_id, option_id) --for fk in user_answer
);

CREATE TABLE hints (
    hint_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(question_id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0 CHECK (used IN (0, 1)),
    UNIQUE (user_id, question_id)
);

CREATE TABLE lessons (
    lesson_id INTEGER PRIMARY KEY AUTOINCREMENT,
    planet_id INTEGER NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    lesson_number INTEGER NOT NULL,
    text TEXT NOT NULL,
    UNIQUE (planet_id, lesson_number)
);

CREATE TABLE user_answer (
    answer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL,
    selected_option_id INTEGER NOT NULL,
    correct INTEGER NOT NULL CHECK (correct IN (0, 1)),
    answered_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (question_id, selected_option_id) --option belongs to question
        REFERENCES answer_options(question_id, option_id)
);

CREATE TABLE planet_progress (
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    planet_id INTEGER NOT NULL REFERENCES planets(planet_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'hostile' CHECK (status IN ('hostile', 'peaceful')),
    correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
    PRIMARY KEY (user_id, planet_id)
);

CREATE UNIQUE INDEX uq_one_correct_option
    ON answer_options(question_id) WHERE is_correct = 1;

CREATE UNIQUE INDEX uq_one_correct_answer
    ON user_answer(user_id, question_id) WHERE correct = 1;