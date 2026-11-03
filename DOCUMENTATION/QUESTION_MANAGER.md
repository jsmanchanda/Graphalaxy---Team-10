# Question Manager

Checked against the repository on November 2, 2026. This document describes the
implemented service and its current demo integration. See
[Project architecture](PROJECT_ARCHITECTURE.md) for the rest of the application.

## Files and dependencies

| File | Responsibility |
| --- | --- |
| [QuestionManager.ts](../server/src/question-manager/QuestionManager.ts) | Reading retrieval, next-question selection, grading, serialization, and typed errors |
| [AnswerProgress.ts](../server/src/question-manager/AnswerProgress.ts) | First-correct event and synchronous progress callback interfaces |
| [QuestionManager.test.ts](../server/src/question-manager/QuestionManager.test.ts) | Unit tests using a fake Data Writer |
| [QuestionManager.integration.test.ts](../server/src/question-manager/QuestionManager.integration.test.ts) | Integration tests using the official migration, Data Writer, and in-memory SQLite |

The constructor accepts `Pick<DataWriter, 'content' | 'answers' | 'transaction'>`
and an `AnswerProgress` handler. The service uses the existing
[Data Writer](../server/src/data-writer/index.ts) and
[official migration](../server/migrations/001_schema.sql). It opens no connection,
contains no SQL, and does not write progress tables directly. The earlier
QuestionRepo, SQLiteQuestionRepo, and question-schema.sql implementations are no
longer part of the codebase.

Response types come from [shared/src/api.ts](../shared/src/api.ts), exported by
`@graphalaxy/shared`. Stored row types come from the Data Writer; these are
separate from objects intended for the client.

## Public methods

### getLessons(planetId): Lesson[]

Checks that the planet exists, loads `content.getReadings(planetId)`, and sorts by
`readingNumber`, then `readingId`. Each reading becomes one display page:

```json
{
  "lessonId": 10,
  "lessonNumber": 1,
  "lessonName": "Reading 1",
  "tasks": [{"type": "Reading", "text": "A line has constant slope."}]
}
```

`lessonId` and `lessonNumber` retain legacy response names; their values are the
reading ID and reading number. These are reading-only display wrappers, not rows
in a lessons table. `planets.intro_text` remains planet metadata and is not
converted into an introduction reading. An existing planet with no readings
returns `[]`.

Readings and questions both belong directly to a planet. There is no foreign key
or junction table associating a particular reading with questions. Accordingly,
this method does not attach question tasks to reading pages.

### nextQuestion(userId, planetId): Question | null

Checks the planet and delegates to `content.nextUnsolvedQuestion`. The official
repository selects by ascending `question_id`, excluding questions with a
correct attempt by this user. Wrong attempts remain eligible; another user's
completion has no effect. Questions can be retrieved even without any readings.
Returns `null` when none remain, including an existing planet with no questions.

The response contains `questionId`, `prompt`, `type: 'mcq'`, optional `graph`, and
`options: AnswerOption[]`. Each option contains only `optionId`, `label`, and
`text`. Options are ordered by label by the Data Writer. The stored `qtype` field
maps to response `type`. Null graphs are omitted; non-null graph text is returned
unchanged, including seeded JSON strings such as `'{"fn":"2*x+3"}'`.

This method does not authenticate a user or enforce planet prerequisites. The
caller owns those checks; the current HTTP layer checks user existence.

### submit(userId, questionId, optionId): AnswerResult

Runs these steps inside `dataWriter.transaction()`:

1. Load the question; reject a missing question or unsupported question type.
2. Validate the public options and the server-side correct option.
3. Use `content.findOption(questionId, optionId)` to verify option ownership and
   check that its correctness agrees with the correct option.
4. Check `answers.hasSolved(userId, questionId)`.
5. Record the attempt through `answers.record(userId, questionId, optionId, correct)`
   unless it is a repeated correct submission.
6. Invoke `progress.onAnswer({userId, questionId, planetId})` only for a first
   correct answer. A thrown handler rolls back the answer and same-connection
   progress writes.
7. Return `{questionId, correct, correctOption}`. The correct option is serialized
   to the same safe option shape used elsewhere.

The official schema requires `selected_option_id` and permits only one correct
row per user/question. A repeated correct submission still validates and returns
feedback, but creates no additional attempt or progress update. Incorrect
submissions are recorded, including those made after completion. They never erase
the earlier correct row. Completion survives new manager instances.

## Validation, serialization, and errors

All public identifiers must be positive safe integers. MCQs must have two to four
options, distinct option IDs, matching question ownership, and a correct option
in the public option set. The official partial unique index enforces at most one
correct option per question; the manager rejects content with no valid correct
option. The schema permits `free_response`, but the manager supports only `mcq`.

Responses are constructed with explicit property lists. Extra fields on Data
Writer objects, including `isCorrect`, `is_correct`, and answer keys, are not
copied into service question responses. Grading feedback is returned only after
a valid submission. This service guarantee does not cover the separate demo
planet payload described below.

| Error code | Meaning | Current HTTP mapping |
| --- | --- | --- |
| `INVALID_INPUT` | Invalid ID or option outside the question | 400 |
| `NOT_FOUND` | Missing question or planet | 404 |
| `INVALID_CONTENT` | Unsupported type or malformed question content | 500 |
| `STORAGE_ERROR` | Data Writer operation or transaction failed | 500 |
| `PROGRESS_UPDATE_FAILED` | Synchronous progress handler threw | 500 |

`QuestionManagerError` preserves an internal `cause`. The HTTP error handler logs
that cause and sends only `{error: {code, message}}`. Database foreign keys reject
unknown users when an attempt is inserted; direct service calls wrap that failure
as `STORAGE_ERROR`. The HTTP layer looks up the user first and returns 404 instead.

## Current HTTP and demo integration

[server/src/index.ts](../server/src/index.ts) opens the database, runs migrations
and the seed, creates the Data Writer, and constructs Question Manager. Its
current `onAnswer` handler is a no-op. Consequently, a correct answer is saved,
but startup does not increment `planet_progress`, mark planets peaceful, or
compute unlocks. Replaying an already saved correct answer will not backfill
missing progress later.

[server/src/app.ts](../server/src/app.ts) calls `submit` through:

```text
POST /api/users/:userId/questions/:questionId/answer
Body: {"optionId": 1}
Response: {"questionId": 1, "correct": true, "correctOption": {...}}
```

The route validates user existence; the user ID in the URL is not an authenticated
session. There are no HTTP routes for `getLessons` or `nextQuestion` yet.

The existing `GET /api/users/:userId/planets/:planetId` route uses
[api/payloads.ts](../server/src/api/payloads.ts) directly, not Question Manager's
read methods. It returns readings followed by all MCQs, with string options,
parsed graph objects, per-user `solved` flags, and a **pre-submission `correct`
answer index**. This is an implemented demo compatibility path, not the safe
shared `Question` contract. It also omits database option IDs from the options.

The current frontend `QuestionTask` model requires that answer index and
`options: string[]`; it does not preserve extra question IDs, graphs, or solved
flags when constructing its model. The UI expects `option1` through `option4`
and emits positions 1 through 4. A future API/Session Cache adapter must preserve
question and option IDs, map UI positions to those IDs, and use server feedback
instead of requiring an answer key. The current UI demo uses fixed mock data;
it does not call the answer route.

## Progress integration contract

`AnswerProgress.onAnswer(event): void` must run synchronously and use the same
Data Writer connection for its writes. The callback owns counts, peaceful status,
and unlock rules. The manager neither implements a second Progress Manager nor
accesses `dataWriter.progress` itself.

The existing transaction wrapper calls `db.transaction(fn)()`; it does not request
`BEGIN IMMEDIATE`. Callback or database errors roll back participating writes.
Async callbacks, other database connections, and external side effects do not
participate in that rollback. The current integration tests exercise repeated
submissions across manager instances on one connection, not simultaneous writers
on separate connections.

## Verification and commands

Run from the repository root. Use `npm.cmd` in PowerShell if script execution is
disabled:

```bash
npm test -w server -- src/question-manager/QuestionManager.test.ts src/question-manager/QuestionManager.integration.test.ts
npm test -w server
npm run compile
npm run lint
npm test
```

The unit suite uses a transactional fake implementing the official interfaces.
The integration suite uses `openDb(':memory:')`, the real `migrate` function,
`createDataWriter`, and the production seed. It covers reading and question order,
safe serialization, grading, selected option persistence, missing/invalid inputs,
duplicate completion, user isolation, and answer/progress rollback and retry.
The seeded integration scenario completes all five questions.

The current suites contain 47 Question Manager cases. The repository has 200
tests total: 116 server and 84 client. These suites do not include HTTP route
tests, API payload-builder tests, or a browser-to-database test. Passing the
service tests does not establish that the current demo HTTP responses hide
answer keys or that startup updates progress.
