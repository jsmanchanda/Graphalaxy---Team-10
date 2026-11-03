# Graphalaxy Next Steps

## 1. The biggest problem: two contracts that don't match

There are three sets of API types, in two shapes that can't be swapped for each other:

| Where | Question shape | Used by |
| --- | --- | --- |
| `shared/src/api.ts` | `options: {optionId, label, text}[]`, no `correct` | Only `QuestionManager` (`nextQuestion`, `submit`) |
| `server/src/api/payloads.ts` | `options: string[]`, `correct: number`, `questionId`, `solved`, `graph` | The planet route the client actually calls |
| `client/src/Frontend/types.ts` | `options: string[]`, `correct: number` | Client models and UI |

- The client lists `@graphalaxy/shared` as a dependency but never imports it. The shared package exists to prevent exactly this drift.
- The secure design (answer keys stay on the server) is in `shared` + `QuestionManager`. The insecure design (`correct` sent to the browser) is what actually runs.
- Grading happens in two places. The client grades at `GameManager.ts:79` (`action.option === task.correct`). The server has a full `submit()` with transactions and progress hooks, but nothing reaches it.
- The client also throws away `questionId`, `solved`, and `graph` when parsing (`SessionCacheModels.ts:352-383`). So even if you wanted to call the answer endpoint, the client has no `questionId` to send.
- The comment at `screenModelMaker.ts:50` says "The correct answer is left out so the UI never receives it." The code below it does pass `correct` to the UI. Either the comment or the code is wrong.

**Fix:** Use `shared` as the single source of truth. Put `Planet`, `Player`, and `Settings` payload types in `shared/src/api.ts`, then import them from both `payloads.ts` and the client. Send options as `{optionId, text}` with no `correct`, and have the client call `POST .../answer` to grade. Then you can delete `client/src/Frontend/types.ts` and the `correct` field.

## 2. Duplicate logic on the server

`payloads.ts` re-implements most of `QuestionManager`:

| `payloads.ts` | `QuestionManager.ts` | Same thing? |
| --- | --- | --- |
| Reading sort, L85-89 | `getLessons` sort, L55-60 | Identical |
| 2–4 options + `correct` check in `toQuestionTask`, L116 | `validOptions`, L175-189 | Weaker copy |
| Planet `NOT_FOUND`, L78 | `requirePlanet` | Identical |
| `parseId` in `app.ts:73` | `validateId`, L219 | Identical |

On top of that, `getLessons()` and `nextQuestion()` have tests but no routes, so they're dead code from the API's point of view.

**Fix:** Pick one owner. Either move "build the planet view" into `QuestionManager` (or a new `PlanetManager`) and have the route call it, or delete `getLessons`/`nextQuestion`. Also, `buildPlanetPayload` isn't wrapped in `withStorageError`, so DB failures there come back as a generic `INTERNAL` error instead of `STORAGE_ERROR`.

## 3. Redundant code on the client

- **Class models plus interfaces plus `toType()`.** `Planet`/`ReadingTask`/`QuestionTask` classes mirror the interfaces in `types.ts`. `toType()` is only called from tests. `screenModelMaker.ts:58-63` builds a `Question` by hand instead of calling it. Keep one: plain interfaces plus validator functions is usually enough.
- **JSON round-trips.** `createFromJson` takes a string. So `Planet` re-stringifies each task and parses it again (L245-247), and `Player` does the same for settings (L144). Have `ApiClient` call `JSON.parse` once and have the validators take `unknown`.
- **Repeated checks.** `Player.validateJson` runs `isObject`, then `assertHasFields` runs `isObject` again (L114-118).
- **Unused interfaces.** `GameSession` and `ScreenDisplay` in `contracts.ts` are never implemented or used. `GameManager` takes a concrete `SessionCache` and builds its own `UiManager`. Either use them for dependency injection, which would make `GameManager` testable, or delete them.
- **`userId` is stored twice.** `ApiClient` keeps a private `userId` (L22) and `SessionCache.player.userId` holds the same value. Hidden state in the transport layer is easy to get out of sync. Better to pass `userId` explicitly or let `SessionCache` own it.
- **`saveSettings` isn't wired up.** It's on `ServerGateway` but `SessionCache` doesn't expose it, so nothing can call it.

## 4. ApiClient behavior

- **Server error bodies are ignored.** The server sends `{error: {code, message}}`, but `ApiError.code` is never filled in (TODO #99 at L131). This is cheap to fix and makes the UI's error messages much better.
- **Retries content errors that will never succeed.** A 500 `INVALID_CONTENT` (bad seed data) gets retried even though it fails the same way every time. Retry only on network errors, timeouts, and 502/503/504, or skip retries when there's a `code`.
- **No backoff.** Retries fire immediately. With a 5 s timeout and 3 attempts, a dead server takes about 15 s to show "Server offline". Add a short delay (e.g. 200 ms, then 400 ms), or lower the timeout.
- **Error type doesn't match the docs.** `userPath` throws a plain `Error`, but the method docs say `@throws {ApiError}`. Code that checks `instanceof ApiError` would miss it.

## 5. Server route details

- **Inconsistent ID parsing.** The answer route uses `Number(req.params.questionId)` and `Number(req.body?.optionId)` while the other routes use `parseId`. `submit()` validates them anyway, so it works, but it's inconsistent.
- **Any user's data is reachable.** `userId` in the URL with no authentication means anyone can GET or PATCH any user. That's fine for the demo. Later, a session cookie with `/api/me/...` routes would remove `userId` from URLs entirely and fix the duplicated client state from section 3.
- **Login race.** `findByUsername ?? create` can hit the unique constraint if two logins with the same name arrive at once, and that returns a 500. `INSERT ... ON CONFLICT DO NOTHING` followed by a select fixes it.
- **Query count.** Each question runs 3 queries (`getPublicOptions`, `getCorrectOption`, `hasSolved`). That's fine at this size, but worth knowing.

## Order

1. Put all API types in `shared`, import them in both client and server, and delete `client/.../types.ts` and the duplicate payload interfaces.
2. Stop sending `correct`. The client keeps `questionId`/`optionId` and calls `POST .../answer`, so the server is the only place that grades.
3. Merge `buildPlanetPayload` into `QuestionManager` (or a new manager), and either expose or delete `getLessons`/`nextQuestion`.
4. Make the models parse once from `unknown`, and drop `toType()`, the JSON round-trips, and `contracts.ts` (or start using it).
5. Parse server error bodies into `ApiError.code` and tighten the retry rules.
