# Frontend Logic: Session Cache and API Client

How Session Cache and API Client work, and the HTTP API they need from the backend.

**Status: proposed.** The HTTP API has not been agreed with Team 1 yet, and no routes exist. See [Open questions](#open-questions) and [Differences from other docs](#differences-from-other-docs).

## When loading a question

```text
UI --intents--> Game Manager --actions--> Session Cache --requests--> API Client --HTTP/JSON--> Backend
```

## Session Cache

### State

| Field              | Type                             | Meaning                                             |
| ------------------ | -------------------------------- | --------------------------------------------------- |
| `player`           | `Player \| null`                 | Logged-in player, including settings and hint quota |
| `planets`          | `PlanetSummary[]`                | Planets for the selection screen                    |
| `currentPlanet`    | `Planet \| null`                 | Planet being played, with its ordered tasks         |
| `currentTaskIndex` | `number`                         | Position in `currentPlanet.tasks`                   |
| `selectedOption`   | `number \| null`                 | Index into the current question's `options`         |
| `hintsShown`       | `string[]`                       | Hints revealed for the current question             |
| `lastResult`       | `AnswerResult \| null`           | Result of the last saved answer                     |
| `status`           | `'idle' \| 'loading' \| 'error'` | Request status, for spinners and retries            |
| `error`            | `ApiError \| null`               | Last request error                                  |

### Actions

| Action                         | Calls API Client       | What it does                                                          |
| ------------------------------ | ---------------------- | --------------------------------------------------------------------- |
| `login(username)`              | `login`                | Stores `player`                                                       |
| `loadPlanets()`                | `getPlanets`           | Stores `planets`                                                      |
| `enterPlanet(planetId)`        | `getPlanet`            | Stores the planet and moves to the first unsolved task                |
| `nextTask()`, `previousTask()` | none                   | Moves the index and clears the selection, hints, and result           |
| `selectOption(index)`          | none                   | Records the selection, rejecting an index outside the current options |
| `submitAnswer()`               | `submitAnswer`         | Grades locally, saves the answer, and updates progress                |
| `requestHint()`                | `requestHint`          | Adds the hint and updates the quota                                   |
| `reportMiniGameResult(result)` | `reportMiniGameResult` | Updates the quota                                                     |
| `saveSettings(settings)`       | `saveSettings`         | Updates `player`                                                      |
| `subscribe(listener)`          | none                   | Registers a listener for change events                                |

Every action that changes state publishes a change event.

### Rules

| Rule                                                             | Enforced by   |
| ---------------------------------------------------------------- | ------------- |
| The selected option belongs to the current question              | Session Cache |
| Hint quota never goes negative                                   | Session Cache |
| A failed submit keeps the selection                              | Session Cache |
| No submit without a selection                                    | Game Manager  |
| No double submit                                                 | Game Manager  |
| No hint request at quota 0, unless the hint was already revealed | Game Manager  |

## API Client

```ts
interface ServerGateway {
  login(username: string): Promise<Player>;
  getPlanets(): Promise<PlanetSummary[]>;
  getPlanet(planetId: number): Promise<Planet>;
  submitAnswer(questionId: number, optionId: number): Promise<AnswerResult>;
  requestHint(questionId: number): Promise<HintResult>;
  reportMiniGameResult(result: MiniGameResult): Promise<number>; // new hintQuota
  saveSettings(settings: Settings): Promise<Player>;
}
```

Session Cache depends on this interface, so its tests can use a fake gateway.

- **User identity:** stores `userId` after `login` and adds it to each request path.
- **Parsing:** passes the response text to each model's `createFromJson`.
- **Errors:** throws a typed `ApiError` with a `kind` of `network`, `timeout`, `http`, or `parse`, plus `status` and `code` where they apply.
- **Timeouts:** every request has a timeout. The starting values are 5 seconds and 2 retries.
- **Retries:** only `GET` and `PATCH` requests are retried. The answer and hint `POST` requests are never retried, because a repeat could record a second attempt or charge a second hint.

## HTTP API

All paths start with `/api`, and all JSON keys are camelCase.

| Method and path                                     | Request                                                  | Response                                                    |
| --------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /users` (gets or creates the user)            | `{ "username": "alice" }`                                | Player                                                      |
| `GET /users/:userId/planets`                        | none                                                     | PlanetSummary[]                                             |
| `GET /users/:userId/planets/:planetId`              | none                                                     | Planet                                                      |
| `POST /users/:userId/questions/:questionId/answers` | `{ "optionId": 1 }`                                      | AnswerResult                                                |
| `POST /users/:userId/questions/:questionId/hints`   | none                                                     | `{ "text": "...", "hintQuota": 2 }`, or `409 NO_HINTS_LEFT` |
| `POST /users/:userId/minigame-results`              | `{ "game": "asteroid", "score": 80, "completed": true }` | `{ "hintQuota": 4 }`                                        |
| `PATCH /users/:userId/settings`                     | `{ "musicVolume": 0.7, "sfxVolume": 0.3 }`               | Player                                                      |

### Errors

Every error response uses the same format:

```json
{ "error": { "code": "NOT_FOUND", "message": "Planet not found" } }
```

### JSON Responses

**Player**

`name` comes from `users.username`. Volumes are between 0 and 1.

```json
{
  "userId": 1,
  "name": "alice",
  "hintQuota": 3,
  "settings": { "musicVolume": 0.5, "sfxVolume": 0.5 }
}
```

**PlanetSummary**

```json
{
  "planetId": 1,
  "name": "Linear Land",
  "graphOrder": 0,
  "prereqIds": [],
  "unlocked": true,
  "status": "hostile",
  "completionPct": 0.4
}
```

**Planet**

`tasks` is one ordered list of readings and questions, in the order the player sees them. A reading's `text` comes from `lessons.text`. `correct` is the index of the right answer in `options`, so options must be sorted by `label` before it is worked out.

```json
{
  "planetId": 1,
  "name": "Linear Land",
  "introText": "A hostile world of straight lines.",
  "graphOrder": 0,
  "tasks": [
    { "type": "Reading", "text": "A linear function has the form y = mx + b." },
    {
      "type": "Question",
      "questionId": 1,
      "prompt": "What is the slope of y = 2x + 3?",
      "graph": { "fn": "2*x+3" },
      "options": [
        { "optionId": 1, "label": "a", "text": "2" },
        { "optionId": 2, "label": "b", "text": "3" }
      ],
      "correct": 0,
      "solved": false
    }
  ]
}
```

**AnswerResult**

`correct` is whether the saved answer was right. `planet` is the updated PlanetSummary. `newlyUnlocked` lists planet IDs unlocked by this answer.

```json
{
  "correct": true,
  "planet": {
    "planetId": 1,
    "name": "Linear Land",
    "graphOrder": 0,
    "prereqIds": [],
    "unlocked": true,
    "status": "hostile",
    "completionPct": 0.6
  },
  "newlyUnlocked": []
}
```

### Grading

The frontend grades answers for now, using `correct`, to give instant feedback. The answer request leaves out `correct` because the backend can look it up with `findOption` when it saves the attempt, so a client can't fake what gets saved. Players can still find answers in network traffic.

## Models

| Model                                                           | Status                                                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Settings`, `Player`, `ReadingTask`, `Planet`                   | In PR #49                                                                                        |
| `QuestionTask`                                                  | In PR #49, but needs `questionId`, `graph`, `solved`, and `options` as objects to match this API |
| `PlanetSummary`, `AnswerResult`, `HintResult`, `MiniGameResult` | Not built yet                                                                                    |
