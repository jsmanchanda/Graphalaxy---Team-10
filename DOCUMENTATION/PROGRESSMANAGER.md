# Progress Manager

Tracks each player's progress on each planet: questions loaded one at a time, redoing a planet, 
settings screen, login screen, and additional fixes.

## User Stories

- **Log in with username.** The game opens on a login screen instead
  of logging in a hardcoded `demo` user.
- **Progress and settings loaded at login.** Progress shows on the
  lesson intro and on the lesson result. Settings show on the settings screen.
- **Answer planet questions one at a time.** Each question is asked once,
  right or wrong. After the last one a result screen shows the score.
- **Redo a planet.** A warning asks for confirmation; confirming resets
  progress on that planet and starts the questions again.
- **Change and save volumes** on settings screen.

## Files

### New

| File | Purpose |
| --- | --- |
| `server/src/progress-manager/ProgressManager.ts` | The Progress Manager |
| `client/src/UI/screens/LoginScreenView.ts` | Login screen |
| `client/src/UI/screens/SettingsScreenView.ts` | Settings screen |
| `client/src/UI/screens/RetryWarningScreenView.ts` | Redo warning |
| `client/src/UI/textInput.ts` | Pure text-editing helper for typed input |
| `server/tests/ProgressManager.test.ts` | Progress Manager on a real in-memory database |
| `server/tests/app.test.ts` | HTTP route tests |
| `client/tests/progressScreens.test.ts` | Result, warning, title and settings views |
| `client/tests/LoginView.test.ts` | Login view |
| `client/tests/textInput.test.ts` | Text-editing helper |

### Changed

| Area | Files |
| --- | --- |
| Shared contract | `shared/src/api.ts`, `shared/src/index.ts` |
| Server | `server/src/app.ts`, `server/src/index.ts`, `server/src/question-manager/QuestionManager.ts`, `server/src/data-writer/repository.ts`, `server/src/data-writer/repository-impl.ts` |
| Client logic | `client/src/Frontend/GameManager.ts`, `SessionCache.ts`, `ApiClient.ts`, `SessionCacheParse.ts`, `screenModelMaker.ts` |
| Client UI | `client/src/UI/UIManager.ts`, `types.ts`, `constants.ts`, `components.ts`, `screens/TitleScreenView.ts`, `screens/LessonResultScreenView.ts`, `screens/QuestionScreenView.ts` |
| Tests | `server/tests/QuestionManager.test.ts`, `QuestionManager.integration.test.ts`, `data-writer.test.ts`, `client/tests/GameManager.test.ts`, `SessionCache.test.ts`, `ApiClient.test.ts`, `SessionCacheParse.test.ts`, `QuestionScreenView.test.ts` |

`SessionCacheModels.ts` and its test were renamed to `SessionCacheParse.ts` and
`SessionCacheParse.test.ts` on this branch.

## Progress Manager (server)

`ProgressManager` implements `AnswerProgress`, the hook Question Manager
already published first-correct answers through. `server/src/index.ts` now
passes a `ProgressManager` to `QuestionManager` in place of the old no-op. No
second event system was added.

| Method | What it does |
| --- | --- |
| `onAnswer(event)` | Adds one to the player's correct count on the planet. Makes the planet peaceful once the threshold is reached. Runs inside Question Manager's transaction, so a failure here also undoes the recorded answer. |
| `listPlanets(userId)` | Every planet in graph order with this player's progress. Planets not started are hostile with nothing correct. Reading does not write rows. |
| `getPlanetSummary(userId, planetId)` | One planet's progress, or `NOT_FOUND`. |
| `resetPlanet(userId, planetId)` | Deletes the player's answers on the planet and sets progress back to hostile and zero, in one transaction. |

`PEACEFUL_THRESHOLD` is the share of a planet's questions that must be correct
for it to turn peaceful. It is `1`, so every question must be correct.

A planet is `unlocked` when every planet in its `prereqIds` is peaceful. This is
computed and returned, but nothing enforces it yet.

## API

| Route | Returns | Status |
| --- | --- | --- |
| `POST /api/users` | `Player` | existing |
| `GET /api/users/:userId/planets` | `PlanetSummary[]` | new |
| `GET /api/users/:userId/planets/:planetId` | `Planet` | changed: readings only |
| `GET /api/users/:userId/planets/:planetId/questions/next` | `NextQuestion` | new |
| `DELETE /api/users/:userId/planets/:planetId/progress` | `PlanetSummary` | new |
| `PATCH /api/users/:userId/settings` | `Player` | existing |
| `POST /api/users/:userId/questions/:questionId/answer` | `AnswerResult` | changed: one answer per question |

New shared types in `shared/src/api.ts`:

```ts
type PlanetStatus = 'hostile' | 'peaceful';

interface PlanetSummary {
  planetId: number;
  name: string;
  graphOrder: number;
  prereqIds: number[];
  unlocked: boolean;
  status: PlanetStatus;
  correctCount: number;
  questionCount: number;
  completionPct: number; // 0 to 1
}

interface NextQuestion {
  question: Question | null; // null once every question is answered
  progress: PlanetSummary;
}
```

A second answer to the same question is rejected with status 409 and code
`ALREADY_ANSWERED`.

## Question rules

- **One at a time.** A planet's payload no longer includes its questions. The
  client asks for the next one when the player reaches it.
- **In question ID order.** The next question is the first one, by ascending
  ID, that the player has not answered.
- **Asked once.** A wrong answer counts as answered and the player moves on.
- **Multiple choice only.** Questions of any other type are never asked and do
  not count toward a planet's total.
- **Redo is the only way to raise a score.** With the threshold at 1, a planet
  turns peaceful only on a perfect run.

## Data Writer additions

| Method | What it does |
| --- | --- |
| `content.nextUnansweredQuestion(userId, planetId)` | First multiple-choice question with no attempt by this user. |
| `answers.hasAnswered(userId, questionId)` | Whether the user has attempted the question at all. |
| `answers.clearForPlanet(userId, planetId)` | Deletes the user's attempts on a planet's questions. Returns the count. |
| `progress.reset(userId, planetId)` | Sets the row to hostile and zero, creating it if needed. |

Behaviour changes to existing methods:

- `content.countQuestions` counts multiple-choice questions only.
- `users.findByUsername` ignores capitalisation. If older rows differ only by
  case, the first one created is returned.

`content.nextUnsolvedQuestion` is unchanged but the app no longer calls it.

## Client flow

`GameManager` tracks which kind of screen is showing and ignores actions that
do not belong to it.

1. **Login.** The player types a username and presses Enter or Log In.
   `SessionCache.login` logs in, then loads progress for every planet.
   Failures stay on the login screen with a message.
2. **Title.** Start begins the lesson. Settings opens the settings screen.
3. **Lesson.** The intro shows the player's progress, followed by the readings.
4. **Questions.** Loaded one at a time. Back returns to the last reading;
   coming forward again reuses the loaded question without a new request.
5. **Lesson result.** Shows the score and whether the planet is peaceful. Ok
   returns to the title. Redo Planet opens the warning.
6. **Redo warning.** Cancel returns to the result. Confirm resets the planet
   and starts at the first question.

A reply that arrives after the player has moved to another screen is dropped.
Answers and planet resets are guarded against double clicks.

### SessionCache additions

`planets`, `currentQuestion`, `loadPlanets()`, `progressFor(planetId)`,
`loadNextQuestion()`, `resetPlanet()`, `saveSettings(settings)`.
`submitAnswer` forgets the current question once it is graded, or once the
server reports it was already answered.

### ApiClient additions

`getPlanets()`, `getNextQuestion(planetId)`, `resetPlanet(planetId)`. Error
responses now carry the server's `code` and `message` on `ApiError`.

## Screens

| Screen | Notes |
| --- | --- |
| Login | Keyboard input only: the canvas has no text field, so the view listens for key presses while it is showing. Usernames can be typed up to 20 characters (the server accepts 32). |
| Settings | Minus and plus buttons change each volume in steps of 10%. Save sends them; Back discards. |
| Redo warning | States the current progress and what will be reset. |
| Lesson result | Gained a Redo Planet button. |
| Title | Gained a Settings button. |
| Question | Builds one button per option, so two- and three-option questions work. |

`View` has a new optional `destroy()`. `UiManager` calls it before replacing a
view, which is how the login screen removes its keyboard listener.

## Error messages

When the server cannot be reached, the game says "Server offline" on login,
answering, loading a question, saving settings and redoing a planet. Other
failures get a message specific to the action. An `ALREADY_ANSWERED` reply
tells the player to move on rather than trapping them on the question.

## Known limitations

- Redoing a planet deletes that player's answer history for it. The schema
  allows one correct row per user and question, so nothing is kept.
- The planet is still hardcoded to planet 1. There is no planet-select screen.
- Locks from `unlocked` are not enforced.
- Nothing plays audio, so saved volumes have no audible effect.
- The login screen has no on-screen keyboard and no paste. There is no log out;
  reload the page to switch players.
- A new username creates a new player. There are no passwords.
- Save and Next give no feedback while waiting for a slow server.
- Hints exist in the database and repository but have no route or UI.
- Answers recorded before the Progress Manager existed were never counted.
  Run `npm run db:reset -w server` on older local databases.

## Verification

Server and client suites cover the Progress Manager against a real in-memory
database, every new route, the new parsers, the Game Manager flow, and each new
view.

```sh
npm test
npx tsc --noEmit
npm run lint
```
