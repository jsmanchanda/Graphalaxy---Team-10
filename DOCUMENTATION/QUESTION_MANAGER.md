# Question Manager integration

`QuestionManager` is a synchronous backend service. Its constructor requires a
`QuestionRepo` and an `AnswerProgress` handler, so tests need neither Express nor
a live database. `SqliteQuestionRepo` implements the Data Writer boundary using
an existing `better-sqlite3` connection. It never opens or closes a connection.

## Public methods and response types

- `getLessons(planetId): Lesson[]` returns intro (lesson number zero) and lessons
  ordered by lesson number, then lesson ID. Each lesson contains a `ReadingTask`
  followed by `QuestionTask`s ordered by question position, then question ID.
  Names are `Introduction` or `Lesson N` because the schema has no title column.
- `nextQuestion(userId, planetId): Question | null` returns the first question
  without a correct attempt by that user, ordered across the planet's lessons.
  Incorrect attempts remain eligible. Existing planets without questions return
  `null`; nonexistent planets throw `NOT_FOUND`.
- `submit(userId, questionId, optionId): AnswerResult` validates question/option
  ownership, grades the MCQ, appends an attempt, and returns `correct` and
  `correctOption`. Only a first correct attempt calls `onAnswer` with
  `{userId, questionId, planetId}`. Repeated submissions still produce attempt rows
  and feedback, but do not award progress again. Completion is per user.

Shared types are exported from `@graphalaxy/shared` via `shared/src/index.ts`.
`Question` and `AnswerOption` contain no answer keys. The manager constructs
responses by explicitly selecting allowed fields, including nested lesson
questions; extra fields on repository records cannot leak through serialization.
Graphs are optional function strings passed through unchanged.

Example lesson response:

```json
{
  "lessonId": 10,
  "lessonNumber": 1,
  "lessonName": "Lesson 1",
  "tasks": [
    {"type": "Reading", "text": "A line has constant slope."},
    {
      "type": "Question",
      "question": {
        "questionId": 2,
        "prompt": "What is the slope?",
        "graph": "2*x+1",
        "type": "mcq",
        "options": [
          {"optionId": 21, "label": "A", "text": "2"},
          {"optionId": 22, "label": "B", "text": "3"}
        ]
      }
    }
  ]
}
```

The existing `client/src/Frontend/types.ts` is an unused draft of separate union
members (for example, a `Lesson` is a name *or* tasks). It cannot express the
complete response and its question draft includes correctness. It is left intact
to avoid overwriting frontend work. Session Cache should adopt the shared types
or explicitly map these responses into its display models, retaining option IDs
for submission. Pre-submission questions must never contain a `correct` index.

## Schema decision and queries

There was no implemented schema, migration, seed, or Data Writer in the checkout.
The consolidated architecture document proposes `questions.planet_id`; this
component instead implements the requested direct relationship:

```text
planets -> lessons (planet_id) -> questions (lesson_id) -> answer_options
users -> user_answer (user_id, question_id, correct; one row per attempt)
```

`server/src/question-schema.sql` is the initial schema for these four
question-owned tables. Data Writer must create `users(user_id)` and
`planets(planet_id)` first and enable `PRAGMA foreign_keys = ON` on the shared
connection. The SQL is applied once by the future database initializer, not by
the manager. It is intentionally not an idempotent migration; if another branch
introduces a populated `questions.planet_id` schema, its owner must assign each
question to a lesson and position before migrating. Planet ownership must resolve
through lessons, with no junction table or redundant question planet column.

Lesson numbers are unique per planet; question positions are unique per lesson.
MCQs must have at least two options and exactly one correct option, checked by the
manager before returning content or recording an answer. The schema constrains
boolean flags and foreign keys. Intro lessons may contain only a reading.

The repository uses bound parameters for all identifiers and aliases snake_case
columns into camelCase records. Its operations are:

| Method | Query / behavior |
| --- | --- |
| `planetExists` | Lookup planet separately from authored lessons |
| `getLessons` | Filter by planet, order by lesson number / ID |
| `getQuestions` | Join questions to lessons, filter by lesson's planet, order by lesson and question position |
| `getQuestion` | Join a question to its lesson to resolve planet identity |
| `getAnswerOptions` | Filter by question; order by label / ID; convert SQLite correctness flag to boolean |
| `getCompletedQuestionIds` | Distinct correct attempts for user, joined through lessons to filter planet |
| `recordAnswer` | Check for an existing correct attempt, insert the new attempt, return first-correct flag |
| `transaction` | Run submission and progress handler in `BEGIN IMMEDIATE` transaction |

The `(user_id, question_id, correct)` index supports completion checks. Attempts
are appended, so a later wrong answer never erases an earlier completion.

## API Manager, Data Writer, and Progress Manager handoff

Composition at the backend boundary, once these components exist:

```ts
const questionRepo = new SqliteQuestionRepo(dataWriterConnection);
const questionManager = new QuestionManager(questionRepo, progressManager);

const lessons = questionManager.getLessons(planetId);
const question = questionManager.nextQuestion(authenticatedUserId, planetId);
const result = questionManager.submit(authenticatedUserId, questionId, optionId);
```

The API Manager owns authentication/user lookup, body parsing, routes, and error
serialization. Pass numeric positive safe-integer IDs; do not trust a client body
to establish the authenticated user. The database rejects unknown users on writes.
Possible error mapping:

| Code | Suggested HTTP status | Meaning |
| --- | --- | --- |
| `INVALID_INPUT` | 400 | Invalid ID or option does not belong to question |
| `NOT_FOUND` | 404 | Missing question or planet |
| `INVALID_CONTENT` | 500 | Unsupported type, malformed options, or missing lesson |
| `STORAGE_ERROR` | 500 | Repository read/write/transaction failed |
| `PROGRESS_UPDATE_FAILED` | 500 | Progress handler threw |

Serialize only the code and public message; `cause` is for internal diagnostics.
The manager does not implement HTTP routes or write `planet_progress`.

Progress Manager must implement `onAnswer(event): void` **synchronously**, using
the same Data Writer connection for its writes. It receives only first-correct
events and owns all progress/status/unlock calculations. `BEGIN IMMEDIATE`
serializes SQLite writers before the prior-completion check. A thrown handler
rolls back both the attempt and same-connection progress writes, so a retry can
award progress. The constructor deliberately requires a handler to avoid silently
dropping progress when composition is forgotten. Do not use an async callback,
another database connection, network calls, or external side effects inside this
transaction; those effects cannot be rolled back. An asynchronous event system
would require a separate durable delivery design.

Remaining work for other components: database initialization and authored seed
content, real Progress Manager, API routes/authentication plus HTTP-level answer
privacy tests, and Session Cache adoption of the shared models. `server/src/app.ts`
is still an empty placeholder; there is no server startup command yet.

## Verification and commands

From the repository root:

```bash
npm ci
npm test -w server
npm test -w server -- src/QuestionManager.test.ts
npm run test:watch -w server
npm run compile
npm run lint
npm test
```

On Windows PowerShell with script execution disabled, use `npm.cmd` instead of
`npm`. No dependencies were added. Root `npm test` now compiles, runs workspace
tests where configured, and lints. TypeScript uses `NodeNext` module resolution
so the installed Vitest/Vite exported type paths resolve without suppressing
library checks.

The fake-repository unit suite covers lesson/question order, completed-question
skipping, empty/missing planets, answer privacy, grading, invalid IDs/options,
duplicate submissions across manager instances/users, malformed content, storage
failures, and rollback/retry after progress failure. The SQLite suite verifies
actual joins, ordering, integer conversion, attempt history, schema constraints,
duplicate completion, unknown-user rejection, and answer/progress rollback.
