# Database & Data Writer Documentation

## Overview

Graphalaxy keeps all game state in one SQLite file, and the Data Writer is the only code that should read or write it: managers call typed repository methods and never write SQL.

Two pieces make this up, both under `server/`:

- **Database** (`server/src/db`, `server/migrations`): the schema, a connection helper, a migration runner and a seed script.
- **Data Writer** (`server/src/data-writer`): five repositories (users, content, answers, progress, hints) plus one `transaction()` wrapper. Interfaces live in `repository.ts`; the SQLite implementations live in `repository-impl.ts`.

The only consumer in the repo today is `QuestionManager`, which loads readings and questions, grades answers and notifies a progress handler, all through the Data Writer. The stack is TypeScript, `better-sqlite3` (synchronous, no promises) and Vitest, on Node 22.22.2 or newer.

Managers call typed repository methods; SQL lives only in the repository classes, and the `db/` scripts create and fill the file.

Everything below is read from the source in the shared zip. The test suite was not executed while writing this, because dependencies could not be installed; see the testing section.

## Repository layout

All database and Data Writer code is in `server/`; `shared/` and `client/` do not touch the database.

| Path | What it is |
| --- | --- |
| `server/migrations/001_schema.sql` | The full schema. Add new `NNN_name.sql` files beside it. |
| `server/src/db/connection.ts` | `openDb()`: opens SQLite and turns on foreign keys. |
| `server/src/db/migrate.ts` | `migrate(db)`: applies unapplied `.sql` files in filename order. |
| `server/src/db/seed.ts` | `seed(db)`: inserts the "Linear Land" planet, 2 readings, 3 hints, 5 questions. |
| `server/src/db/db.test.ts` | Schema and constraint tests. |
| `server/src/data-writer/repository.ts` | Interfaces and row types for the five repositories. |
| `server/src/data-writer/repository-impl.ts` | `Sqlite*Rep` classes that implement them. |
| `server/src/data-writer/index.ts` | `createDataWriter(db)` and the `DataWriter` type. |
| `server/src/data-writer/data-writer.test.ts` | Repository and transaction tests. |
| `server/src/question-manager/` | The one consumer: `QuestionManager` and its tests. |
| `server/var/game.db` | The default database file. It ships in the zip, already migrated and seeded. |

The `var/` folder is created on demand and the zip has no `.gitignore`, so `game.db` is currently a committed binary.

## Database implementation

The database is one SQLite file with 10 tables, built by a single migration and opened with foreign keys enforced. SQLite does not enforce foreign keys unless asked, so `openDb()` always runs `PRAGMA foreign_keys = ON`.

### Connection (`connection.ts`)

`openDb(file?)` picks the file in this order: the argument, then the `DB_PATH` environment variable, then `server/var/game.db`. It creates the parent folder if needed. Pass `':memory:'` for a throwaway database; each call gets its own empty one, which is how every test isolates itself.

### Schema (`migrations/001_schema.sql`)

| Table | Purpose | Key constraints |
| --- | --- | --- |
| `users` | Player account and settings | `username` unique; `hint_quota` >= 0 (default 3); volumes between 0 and 1 (default 0.5) |
| `planets` | A topic the player conquers | `name` unique; `graph_order` sets layout depth |
| `planet_prereqs` | Unlock graph edges (planet requires prereq) | Composite key; a planet cannot require itself |
| `readings` | Numbered reading pages for a planet | Unique `(planet_id, reading_number)` |
| `questions` | Questions on a planet | `qtype` is `mcq` or `free_response`; `graph` is a JSON string such as `{"fn":"2*x+3"}` |
| `answer_options` | Choices for a question | `label` in a to d; unique `(question_id, label)`; at most one `is_correct = 1` per question |
| `planet_hints` | Numbered hints for a planet | Unique `(planet_id, hint_number)` |
| `user_hints` | Which hints a user has used | Composite key `(user_id, hint_id)` |
| `user_answer` | Every attempt a user makes | Composite foreign key ties the chosen option to the same question; at most one correct row per user and question |
| `planet_progress` | Per-user status of a planet | `status` is `hostile` (default) or `peaceful`; `correct_count` >= 0 |

Two design choices matter when you write code against it:

- **Option must belong to the question.** `user_answer` references `answer_options(question_id, option_id)`, which is why `answer_options` carries a redundant `UNIQUE (question_id, option_id)`. Do not remove it.
- **Business rules live in partial unique indexes.** `uq_one_correct_option` allows one correct option per question; `uq_one_correct_answer` allows many wrong attempts but only one correct one per user and question. The database throws a `UNIQUE` error if code breaks either rule.

Deleting a user cascades to that user's answers, hints and progress. Deleting a planet, question or answer option that any user has already answered fails with a `FOREIGN KEY` error, because `user_answer` has no cascade for the option it points at (see How to improve).

### Migrations (`migrate.ts`)

`migrate(db)` creates `schema_migrations(filename, applied_at)`, lists `migrations/*.sql` in sorted filename order, and skips files already recorded. Each new file runs inside a transaction together with its bookkeeping row, so a failed migration leaves nothing half-applied. It is idempotent and logs `applied <file>` for each file it runs.

Migrations are tracked by filename only. There is no checksum and no down-migration, so never edit a file that has already shipped; add a new one.

### Seed (`seed.ts`)

`seed(db)` does nothing if `planets` already has any row. Otherwise, in one transaction, it inserts the planet "Linear Land" with 2 readings, 3 hints and 5 multiple-choice questions of 4 options each. Question content is the hard-coded `QUESTIONS` array at the top of the file. It does not insert any `planet_prereqs`.

## Data writer implementation

The Data Writer is a plain object with five repositories and a `transaction()` helper, built by `createDataWriter(db)`. Callers depend on the interfaces in `repository.ts`, so a manager can be tested against a fake and the SQLite classes can be swapped out later.

| Repository | Methods | Notes |
| --- | --- | --- |
| `users` | `findById`, `findByUsername`, `create`, `saveSettings`, `spendHint`, `addHints` | `spendHint` is one conditional `UPDATE ... WHERE hint_quota > 0`; it returns `false` instead of going negative. |
| `content` (read-only) | `listPlanets`, `getPlanet`, `listPrereqs`, `getReadings`, `countQuestions`, `getQuestion`, `getQuestions`, `nextUnsolvedQuestion`, `getPublicOptions`, `findOption`, `getCorrectOption` | `getPublicOptions` omits `isCorrect`; `findOption` and `getCorrectOption` include it. Keep those server-side. |
| `answers` | `hasSolved`, `record` | `record` inserts one attempt and throws on a second correct answer or a mismatched option. |
| `progress` | `ensure`, `listForUser`, `incrementCorrect`, `setStatus` | `ensure`, `incrementCorrect` and `setStatus` create the `(user, planet)` row if it is missing. |
| `hints` | `list`, `markUsed` | `list` returns every hint on a planet with a per-user `used` flag; `markUsed` is idempotent. |

### How the code is built

- **Statements are prepared once**, in each class constructor, and reused. Create one Data Writer per connection and share it.
- **Row mapping is done in SQL.** Each query aliases snake\_case columns to camelCase (`hint_quota AS hintQuota`) and the result is cast to the interface type. Nothing checks the shape at runtime, so if you rename a column, update the alias and the interface together.
- **Two values are converted by hand.** SQLite stores booleans as 0 and 1, so `toGraded` and `toHint` turn them into `isCorrect` and `used`. The `graph` column stays a JSON string; parse it where it is used.
- **Errors are not wrapped.** A missing row returns `undefined` (or `[]`). A broken rule throws the raw `better-sqlite3` error, whose message contains `UNIQUE`, `CHECK` or `FOREIGN KEY`. `QuestionManager` is where these become typed `STORAGE_ERROR`s.

### Transactions

`transaction(fn)` runs `fn` through `db.transaction(fn)()`. It commits if `fn` returns, rolls back every write if it throws, and returns `fn`'s value. Nested calls join the outer transaction, so a failure in the outer function undoes the inner work too. `fn` must be synchronous; an `async` function would commit before its promise resolves.

Use a transaction whenever two writes must succeed together. The tests cover these cases: spending a hint and marking it used, recording an answer and incrementing progress, and any step that can throw a constraint error.

### Rules the callers must follow

1. Check `answers.hasSolved()` before `answers.record(..., true)`. The database rejects the second correct answer, but only after the write is attempted.
2. Call `progress.incrementCorrect()` yourself, once, on the first correct answer. Nothing links it to `answers.record`. `QuestionManager` does this through its `AnswerProgress` handler inside the same transaction.
3. Do not send `PrivateOption` objects to the client. Use `getPublicOptions` for anything that leaves the server.
4. Pair `users.spendHint()` with `hints.markUsed()` in one transaction. Neither method calls the other.
5. The Data Writer stores state; it does not decide it. Which planets are unlocked, and when a planet becomes `peaceful`, is manager logic. `listPrereqs()` returns raw edges only.

## Setup and configuration

Install once from the repo root, then run the database scripts from `server/`. You need Node 22.22.2 or newer and npm.

```bash
npm install                 # repo root: installs client, server and shared workspaces
cd server
npm run db:migrate          # create/upgrade the schema in var/game.db
npm run db:seed             # insert the Linear Land sample content
npm run db:reset            # delete var/game.db, then migrate and seed
```

| Setting | Where | Effect |
| --- | --- | --- |
| `DB_PATH` | Environment variable | Overrides the database file used by `openDb()` and by `db:migrate` / `db:seed`. Default is `server/var/game.db`. |
| `':memory:'` | Argument to `openDb()` | A private in-memory database. Used by all tests. |

`db:reset` always deletes `var/game.db` in the current folder and ignores `DB_PATH`. If you set `DB_PATH`, delete that file yourself before re-running migrate and seed.

The root `package.json` configures Husky, `lint-staged` (`eslint --fix` on staged `.ts` files) and commitlint with Conventional Commits types (`feat`, `fix`, `docs`, `test` and so on). The `.husky/` hook scripts were not in the zip, so confirm they exist in your clone.

## How to use

Open the database once at startup, migrate it, build one Data Writer, and pass that to your managers. The examples below mirror how `QuestionManager` already uses it.

### Boot

```ts
import {openDb} from './db/connection';
import {migrate} from './db/migrate';
import {seed} from './db/seed';
import {createDataWriter} from './data-writer';

const db = openDb();   // DB_PATH, else server/var/game.db
migrate(db);           // safe on every start; only runs new files
seed(db);              // no-op if any planet exists; use for dev/demo data
const dw = createDataWriter(db);
```

### Read content for a player

```ts
const planets = dw.content.listPlanets();
const question = dw.content.nextUnsolvedQuestion(userId, planetId); // undefined when done
const options = question
  ? dw.content.getPublicOptions(question.questionId)  // safe to send to the client
  : [];
```

### Grade an answer (all-or-nothing)

```ts
dw.transaction(() => {
  const option = dw.content.findOption(questionId, optionId);
  if (!option) throw new Error('option does not belong to this question');

  const solved = dw.answers.hasSolved(userId, questionId);
  if (!option.isCorrect || !solved) {
    dw.answers.record(userId, questionId, optionId, option.isCorrect);
  }
  if (option.isCorrect && !solved) {
    dw.progress.incrementCorrect(userId, planetId); // once per question
  }
});
```

### Spend a hint

```ts
dw.transaction(() => {
  const hint = dw.hints.list(userId, planetId).find(h => h.hintId === hintId);
  if (!hint || hint.used) return;                  // markUsed is idempotent, spendHint is not
  if (!dw.users.spendHint(userId)) throw new Error('no hints left');
  dw.hints.markUsed(userId, hintId);
});
```

### Use it through QuestionManager

```ts
const questions = new QuestionManager(dw, {
  onAnswer: e => dw.progress.incrementCorrect(e.userId, e.planetId),
});
questions.nextQuestion(userId, planetId);
questions.submit(userId, questionId, optionId); // throws QuestionManagerError with a code
```

If `onAnswer` throws, the answer row is rolled back with it, so the player can retry.

## How to test

Every test runs against a fresh in-memory SQLite database, so tests need no setup, leave nothing behind and can run in any order. Counting `it(` blocks in the source gives 102 tests across four files in `server/src`. They have not been executed as part of writing this doc, so run them first and treat the counts as approximate.

```bash
cd server
npm test              # vitest run (once)
npm run test:watch    # re-run on change
npx vitest run src/data-writer      # one folder
npx vitest run -t "rolls back"      # tests whose name matches

cd ..                 # repo root
npm test              # compile (tsc), lint, then every workspace's tests
```

| File | Tests | What it covers |
| --- | --- | --- |
| `db/db.test.ts` | 20 | `openDb` (foreign keys, folder creation, isolated `:memory:`), then schema constraints against the seeded data: label range, unique keys, cascades, composite foreign key, one-correct indexes, seed idempotency. |
| `data-writer/data-writer.test.ts` | 49 | Every repository method including `undefined` and `[]` results, per-user isolation, constraint errors, and `transaction()` commit, rollback and nesting. |
| `question-manager/QuestionManager.test.ts` | 19 | Manager logic against a fake Data Writer. |
| `question-manager/QuestionManager.integration.test.ts` | 14 | Manager against the real migration, seed and Data Writer, including rollback when the progress handler throws. |

### Test pattern to copy

```ts
beforeEach(() => {
  db = openDb(':memory:');
  migrate(db);
  seed(db);               // planet 1, questions 1-5, hints 1-3
  dw = createDataWriter(db);
  user = dw.users.create('test');
});
```

The seeded ids are stable on a fresh database (planet 1, questions 1 to 5), which is why the tests hard-code them. Tests that need other shapes insert rows with raw SQL through `db`, as `addPlanet()` and `addFreeResponse()` do in `data-writer.test.ts`.

### What a new change needs

- **New table, column or rule:** add a case to `db.test.ts` that proves the constraint rejects bad data. Match on the error text (`/UNIQUE/`, `/CHECK/`, `/FOREIGN KEY/`).
- **New repository method:** add it to the interface, the class and `data-writer.test.ts`. Cover the found, not-found and per-user cases.
- **Anything that writes twice:** add a rollback test like "rolls back every write when fn throws".
- **Manager behaviour:** test it with a fake Data Writer first, then add one integration case.

The manager unit tests use a `FakeDataWriter` class defined inside `QuestionManager.test.ts`. It is not shared, so copy it or move it to a shared helper before another manager needs it. The zip contains no coverage report and no CI workflow.

## How to improve

The layer is small and consistent, so most improvements are additions. The table lists what I found, highest value first; rows marked "verified" were reproduced against the schema in SQLite.

| # | Limitation | Suggested fix |
| --- | --- | --- |
| 1 | **Answered content cannot be deleted** (verified). Once any user answers a question, deleting that question, its option or its planet fails with `FOREIGN KEY`. | Prefer an `archived` flag over deletes. If deletes are needed, rebuild `user_answer` with a cascading foreign key in a new migration. |
| 2 | **Only foreign keys are configured.** `openDb()` sets no WAL mode and no busy timeout, so two processes writing at once can hit `SQLITE_BUSY`. | Add `journal_mode = WAL` and `busy_timeout` in `openDb()` (not for `:memory:`), with a test. |
| 3 | **Content has no write path.** `ContentRep` is read-only, so planets, questions and prereqs come only from `seed.ts` or raw SQL, and seed skips any database that already has a planet. | Add authoring methods or an import script that upserts content by a stable key, and seed prereqs for a second planet. |
| 4 | **Schema features without code.** `free_response` questions are rejected by `QuestionManager`; nothing decides when a planet becomes `peaceful` or unlocks from `planet_prereqs`. | Put these rules in a manager, and add tests that use `listPrereqs()` and `setStatus()`. |
| 5 | **Raw database errors escape.** Callers must match text such as `/UNIQUE/`. | Catch in the repositories and throw typed errors (for example a duplicate-username error). |
| 6 | **Migrations are tracked by filename only.** No checksum, no down step, and `db:reset` ignores `DB_PATH`. | Store a checksum in `schema_migrations`; make `db:reset` use `openDb()`'s path. |
| 7 | **Migration path may break in a compiled build.** `migrate.ts` reads `../../migrations` relative to its own folder. The root `tsc` writes to `build/`, where the `.sql` files are not copied. Not tested here. | Copy `migrations/` in the build, or pass the folder in as an argument. |
| 8 | **`game.db` is in the zip and there is no `.gitignore`.** | Ignore `server/var/` and rely on `db:reset`. |
| 9 | **Row types are unchecked casts.** A wrong alias compiles and returns `undefined` fields. | Keep alias and interface changes in one commit, and add a shape assertion per new query. |
| 10 | **Naming drift.** `shared/src/api.ts` and `QuestionManager` still say "lesson" for what the database calls a reading, and the header comment in `repository.ts` points to `sqlite.ts` (the file is `repository-impl.ts`). | Rename the shared types to planet and reading; fix the comment. |
| 11 | **Small gaps.** `questions.planet_id` has no index. `saveSettings` and `addHints` do nothing, without an error, for an unknown user. `createdAt` is a UTC `YYYY-MM-DD HH:MM:SS` string with no zone marker. | Add the index when content grows; check `changes` in those methods; document or convert the timestamp. |

### Add a column or table

1. Create `server/migrations/002_<name>.sql`. Never edit `001_schema.sql` once anyone has run it.
2. Run `npm run db:migrate`, or `npm run db:reset` for a clean local copy.
3. Update the interface and the SQL alias together, then add a constraint test to `db.test.ts`.
4. If the seed needs the new data, edit `seed.ts`. Existing databases are skipped by the seed, so ship a data migration for them.

SQLite cannot add a `CHECK` to an existing column, so that change means rebuilding the table. `migrate()` wraps each file in a transaction, and `PRAGMA foreign_keys` has no effect inside one, so a rebuild of a referenced table needs a change to the runner first.

### Add a repository method

1. Declare it, with JSDoc, in the interface in `repository.ts`. The repo uses `eslint-plugin-jsdoc`.
2. Prepare the statement in the class constructor and add the method in `repository-impl.ts`.
3. Add tests in `data-writer.test.ts` for the found, not-found and per-user cases.

### Add a whole repository

Do the same, then add it to the `DataWriter` interface and to `createDataWriter()` in `index.ts`. Managers that take `Pick<DataWriter, ...>` pick it up without other changes.

### Change database engine

The interfaces are synchronous because `better-sqlite3` is. A networked database would need async interfaces, which changes every caller, so treat that as a rewrite of the manager layer too.
