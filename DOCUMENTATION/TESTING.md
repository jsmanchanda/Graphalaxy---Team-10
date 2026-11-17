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
| `server/tests/Api.integration.test.ts` | Real Express routes, Question Manager, Data Writer, official migration and SQLite. Covers login, settings, safe content, wrong/correct/repeated attempts, invalid inputs, missing records, malformed JSON, and rollback after a storage failure. |
| `server/tests/Frontend.integration.test.ts` | Real SessionCache, ApiClient, JSON parsing, screen mapping, HTTP server and SQLite. Covers loading, settings, answering every seeded question, server errors, account switching and player isolation. |
| `server/tests/QuestionManager.integration.test.ts` | Existing manager integration suite, including transaction rollback and the progress callback. |
| `test/e2e/game.e2e.ts` | Real Chromium, canvas clicks, GameManager, UI, session, API client, running backend and SQLite. Covers reading navigation, a complete planet, correct/wrong feedback, reload, selection, pending requests, navigation during a request, network failures, and viewport resizing. |

The API fixture uses the production migration, seed, repositories and managers.
Each integration test gets a fresh in-memory database. The frontend integration
suite listens on an OS-assigned port and closes both its listener and database
after each test. The API fixture uses the same no-op progress handler as current
production startup; it does not pretend that a Progress Manager is integrated.

## Browser isolation and canvas interaction

Playwright starts the real production server entry point through
`test/e2e/start-server.ts`, with `DB_PATH=:memory:` and port 3100. Vite starts on
5174 using a test-only proxy configuration. Existing local servers are never
reused, and ports already in use cause a failure. Playwright stops its servers
when the run ends. Your saved `server/var/game.db` is never opened or reset.

Tests run with one worker and a fresh browser context for each case. The demo
account is shared within the disposable backend run because the application
currently logs in as `demo`; tests must not assume it has no prior answers.
Start a new run for a fresh database. The suites do not depend on test order.

Canvas text is not normal DOM text. The browser helper reads the actual Konva
scene to locate labels and calculate their scaled positions, then sends real
mouse clicks. It does not call GameManager methods or fire synthetic Konva
events. This also exercises layout at smaller viewport sizes.

Success-path tests use the real backend. Failure tests deliberately abort a
request, while pending-request tests delay and then forward the real request.
Those tests are identified by their names; they do not replace all API calls
with canned responses.

## Reports and limitations

Playwright writes `playwright-report/` and `test-results/`, both ignored by Git
and ESLint. Failed browser tests retain a screenshot and a trace. Open the HTML
report with `npx playwright show-report`, or inspect a trace with
`npx playwright show-trace <path-to-trace.zip>`.

These tests cover the implemented flows on `feature/CI_Testing`. This branch
does not contain Hint Manager, Progress Manager, Asteroids, Radio Waves, or
planet-selection integration. Add real suites for those features when their
implementations are brought into the branch; do not count placeholder or
skipped tests as coverage. Current browser coverage is Chromium only.

The browser suite tests the current application, including its placeholder end
screen. It does not prove accessibility, pixel-perfect rendering, or production
deployment behavior. Existing application warnings, such as the alien image's
`public/assets` path, are not repaired by this testing-only change.
