# Integration and browser tests

Install dependencies from the root with `npm ci`. Use the Node version in
`.nvmrc`. Run `npx playwright install chromium` once to install the browser.
On Linux, use `npx playwright install --with-deps chromium` instead.
On PowerShell, use `npm.cmd` and `npx.cmd` if script execution is disabled.

## Commands

```sh
npm run test:integration
npm run test:e2e
npm test -w server
npm test -w client
npx tsc --noEmit
npm run lint
```

The integration suites run as part of the ordinary server tests, too.
Playwright tests live outside the workspaces so Vitest does not discover them.
The existing CI job runs the integration suites. A separate browser job installs
Chromium, runs the browser tests, and uploads the report and any failure traces.

## What is covered

| File | Boundaries exercised |
| --- | --- |
| `server/tests/Api.integration.test.ts` | Real Express routes, Question Manager, Progress Manager, Hint Manager dependencies, Data Writer, official migration and SQLite. Covers login, settings, readings and safe next-question responses, question ordering and exhaustion, wrong/correct answers, duplicate rejection, progress persistence, prerequisite unlocking, isolated reset, invalid inputs, missing records, malformed JSON, and rollback after answer or progress storage failures. |
| `server/tests/Frontend.integration.test.ts` | Real SessionCache, ApiClient, JSON parsing, screen mapping, HTTP server and SQLite. Covers loading summaries and readings, settings, dynamically fetching and answering every question on the seeded first planet, screen mapping, duplicate rejection, reset and replay, persisted progress after login, server errors, account switching and player isolation. |
| `server/tests/QuestionManager.integration.test.ts` | Existing manager integration suite, including transaction rollback and the progress callback. |
| `test/e2e/game.e2e.ts` | Real Chromium, canvas clicks, GameManager, UI, session, API client, running backend and SQLite. Covers explicit username login, planet selection, reading navigation, a complete planet, correct/wrong feedback, persisted peaceful progress, reload and resume, reset cancellation and confirmation, selection, pending requests, navigation during a request, network failures, and viewport resizing. |

The API fixture uses the production migration, seed, repositories and managers.
Each integration test gets a fresh in-memory database. The frontend integration
suite listens on an OS-assigned port and closes both its listener and database
after each test. The API fixture follows production startup: one Data Writer is
shared by the real Progress Manager, Question Manager and Hint Manager. The same
Progress Manager instance handles Question Manager answer events and HTTP
progress routes. The prerequisite-unlock test adds an edge to its own database
using the official table; the production seed and migrations are unchanged.

## Browser isolation and canvas interaction

Playwright starts the real production server entry point through
`test/e2e/start-server.ts`, with `DB_PATH=:memory:` and port 3100. Vite starts on
5174 using a test-only proxy configuration. Existing local servers are never
reused, and ports already in use cause a failure. Playwright stops its servers
when the run ends. Your saved `server/var/game.db` is never opened or reset.

Tests run with one worker and a fresh browser context and a unique username for
each case. A reload test explicitly logs back into that same username to verify
persistence and resume. Other cases never share its answers or progress. The
backend database is fresh for each suite run; integration databases are fresh
for each individual test. The suites do not depend on test order.

Canvas text is not normal DOM text. The browser helper reads visible labels in
the actual Konva scene and calculates their scaled positions, then sends real
mouse clicks. Planet selection uses the loaded planet image's bounds because
planet names are hidden hover labels. It does not call GameManager methods or
fire synthetic Konva events. This also exercises smaller viewport sizes.
Text clicks target groups with click handlers, so numeric graph-axis labels
cannot be mistaken for answer buttons with the same text.

Lesson tests type a username using real keyboard events and click `Log In`.
Login loads planet summaries; `Start` opens the map. Tests choose an unlocked
planet with questions from those summaries, wait for its actual content request,
then choose `Go to lesson` and advance through the intro and readings. Questions
are not bundled into the planet: tests observe the real `/questions/next`
responses and answer the rendered question through canvas controls.

Each question accepts one answer, whether right or wrong. The next-question
endpoint keeps returning an unanswered question until it is answered, then
advances to another unanswered question in the attempt's shuffled order.
Options are shuffled too, so tests find the correct option by its text. Duplicate submissions return
`409 ALREADY_ANSWERED`; exhaustion returns `question: null` with the latest
progress. Wrong answers do not increase the correct count. A fully correct run
makes the planet peaceful. Browser completion checks the result screen and
persisted progress before returning to the map through `Ok`.

Reload does not reset answers: the player logs in again and resumes at the next
unanswered question. Replaying requires `Redo Planet` and confirmation. The
browser test verifies that cancelling sends no reset and that confirming calls
the real DELETE progress route, clears the score, and loads the first question.
Correct-answer expectations come from the production seed, never from canned
HTTP responses. Integration tests also verify submitted option IDs in SQLite.

Success-path tests use the real backend. Failure tests deliberately abort a
request, while pending-request tests delay and then forward the real request.
Those tests are identified by their names; they do not replace all API calls
with canned responses.

## Reports and limitations

Playwright writes `playwright-report/` and `test-results/`, both ignored by Git
and ESLint. Failed browser tests retain a screenshot and a trace. Open the HTML
report with `npx playwright show-report`, or inspect a trace with
`npx playwright show-trace <path-to-trace.zip>`.

These tests cover the implemented flows on `feature/CI_Testing`, including
navigation into the demo lesson. Hint Manager has its own service and API tests;
the shared integration fixture also supplies the real Hint Manager, matching
production startup. Hint API tests seed the stable `TEST_PLANET` fixture so
changes to the production planets do not collide with their empty-planet setup.
The regular API and browser integration fixtures still use the production seed.

The navigation summaries and selected planet content now come from the real
backend. Progress Manager is integrated and tested through the shared fixture.
Prerequisite unlocking and reset isolation are exercised in API integration
using explicit prerequisite test data (the production seed has no edges).
Browser tests choose `Go to lesson`; they do not claim coverage of minigame
gameplay or its rewards. Current browser coverage is Chromium only.

The browser suite tests the current application and return-to-navigation flow.
It does not prove accessibility, pixel-perfect rendering, or production
deployment behavior. Existing application warnings, such as the alien image's
`public/assets` path, are not repaired by this testing-only change.
