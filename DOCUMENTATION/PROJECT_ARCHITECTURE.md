# Consolidated Architecture
also consider changing the name of these so it's not manager manager manager
## FRONTEND
#### UI
- Calls **Graph Renderer** to draw graphs
- Renders screens, planet select (laid out by graph_order), intro and lessons, question, hints, mini-games, settings
- Captures user input, turns it into intents (i.e. selectanswer, nextpage) and sends it to **Game Manager**
- Redraws from **Session Cache**'s change event
#### GAME MANAGER
- Enforces rules, i.e. no submit without a selection, no double submit, hint quota 0, etc.
- Handles the flow of the game: switching between screens, pause, what follows a result (i.e. next question, planet cleared, return to planet select)
- Starts minigames, handles minigame results, early exits, passes result to **Session Cache** 
- Does NOT call **API Client**, store data, or draw

#### SESSION CACHE
- Holds the user data (settings, hint quota, completion), the current planet and planet status, the lesson pages for the planet, the current question and question options, the selected option, the hints revealed for this question, the last result, and the progress map
- Handles actions. When a user wants to do `action`, **Session Cache** will call the necessary functions. 
    - EX: The user wants to `loadNextQuestion`. **Session Cache** will call the API Client, store the reply, clear the old selection, and publish a change event.
    - EX: Other actions may include `submit answer`, `fetch hint`, `report minigame results`, `load progress`, `save settings`
- Calls **API Client** for each action (or optionally at a save point) and writes the reply into itself
- (OPTIONAL) Tracks request status so the UI can show a spinner or retry
- Enforces rules regarding data: selected option belongs to current question, quota never negative, etc
- Publishes change event, produces and restores snapshots

#### API CLIENT
- Makes HTTPS/JSON requests for necessary actions and parses replies
- Attaches the user identity
- Handles timeouts, retries, and typed errors
- Does NOT have game logic

#### ASTEROID SHOOTER
- yay minigame

#### RADIO WAVES
- yay minigame 2

#### GRAPH RENDERER
- Parses function input and flags invalid input
- Evaluates points and renders graph

## BACKEND
#### API MANAGER
- Handles and validates requests, identifies user

#### PROFILE MANAGER
- Handles users. Creates if not pre-existing and looks up if existing from `users`
- Read/write user settings
- Saves and loads game snapshot

#### QUESTION MANAGER
- When a user loads questions:
    - Picks the next question, skips questions already answered correctly
    - Returns question with its options minus `is_correct`
- When a user clicks onto a planet:
    - Return the intro and lessons in order
- When a user answers a question:
    - Checks that the selected option belongs to the question and read `is_correct`
    - Writes to `user_answer`, publishes *change event*, returns the result (correct, incorrect) with the correct option

#### PROGRESS MANAGER
- Subscribes to **QUESTION MANAGER**'s *change event*
- Increments `correct_count` the first time a question is answered correctly
- Flips `status` from hostile to peaceful at the threshold
- Computes completion percentage and returns progress for the navigation screen

#### HINT MANAGER
- Returns a question's hint
- Decrements 1 from `hint_quota` and updates the `used` to true
- Converts minigame results into hints
- Returns updated hint quota

#### DATA WRITER
- Handles repository interfaces per table group and
- Allows tests swap in fake data


#### DATABASE TABLES
- **users**: user_id, username, hint_quota, music_volume, sfx_volume, date_of_creation
- **planets**: planet_id, name, lesson, intro_text, graph_order (like which depth in the graph they are for the selection)
- **<span style="color:lightblue">planet_prereqs: planet_id, prereq_planet_id</span>**
> [name=dureduck] edges of the graph
prereq_planet_id
- **questions**: question_id, planet_id, prompt (ie the actual question), graph (optional, for holding the graph visualization), type (mcq, free-response, etc)
- **answer_options**: option_id, question_id, label (ie a, b, c,d), text (ie the text of the question), is_correct (bool)
- **hints**: hint_id, user_id, question_id, text, used (for allowing previous hints to be seen again?) (shift hints to user table?)
- **lessons**: lesson_id, planet_id, lesson_number, text
- **user_answer**: user_id, question_id, correct
- **planet_progress**: user_id, planet_id, status (hostile, peaceful), correct_count

## Scenario
A user is logged in and finished a lesson. 
1. The user clicks next on the lesson. The **UI** categorizes it into an intent: `startQuestions` and sends it to the **Game Manager**
2. The **Game Manager** tells **Session Cache** to load the next question. The **Session Cache** calls the **API Client**, which routes it to the **Question Manager**.
3. **Question Manager** reads `user_answer` to skip previously solved questions, `questions`, and `answer_options`. It returns the prompt, graphing function (as input for **Graph Manger**), and answer options, excluding whether they are correct or not. 
4. **Session Cache** stores the question, clears the old data, and publishes the *change event*. The **UI** redraws and calls **Graph Renderer** to draw the graph.
5. The user chooses B. The **Game Manager**  checks that a question is loaded and not submitted. Then, **Session State** records the selection, enforcing that B belongs to this question. The **UI** highlights it.
6. The user chooses a hint. If hint quota is 0 and no hint was previously used on this question, the **Game Manger** shows "out of hints" with the option to do a minigame. Otherwise **Session Cache** connects to **Hint Manger**, which updates relevant fields. The hint and hint quota are updated, and the **UI** redraws.
7. Once the user submits, **Game Manager** calls **Session State**, which then calls **API CLient**, and **Question Manager** updates relevant fields. A *change event* is published and **Progress Manager** updates all relevant fields. 
8. The correctness of the user's answer, the correct option, planet progress and status are returned. **Session Cache** stores it and **UI** redraws. 

```mermaid
flowchart TB
  subgraph FE[FRONTEND]
    direction TB
    UI([UI])
    GM([Game Manager])
    SC([Session Cache])
    AC([API Client])
    AS{{Asteroid Shooter}}
    RW{{Radio Waves}}
    GR([Graph Renderer])
  end

  subgraph BE[BACKEND]
    direction TB
    API(API Manager)
    PM(Profile Manager)
    QM(Question Manager)
    PG(Progress Manager)
    HM(Hint Manager)
    DW(Data Writer)
    DB[(DB)]
  end

  %% frontend
  UI -->|intents| GM
  UI -->|draw| GR
  GM -->|actions| SC
  GM -->|start| AS
  GM -->|start| RW
  AS -->|draw| GR
  RW -->|draw| GR
  SC -. change event .-> UI
  SC -->|requests| AC

  %% client-server
  AC ==>|HTTPS / JSON| API

  %% backend
  API --> PM
  API --> QM
  API --> PG
  API --> HM
  QM -. change event .-> PG
  PM --> DW
  QM --> DW
  PG --> DW
  HM --> DW
  DW --- DB

  classDef client fill:#e8f1ff,stroke:#3b6fd8,color:#000
  classDef game fill:#fff4e0,stroke:#d88a1e,color:#000
  classDef server fill:#eef8ee,stroke:#3a8f3a,color:#000
  class UI,GM,SC,AC,GR client
  class AS,RW game
  class API,PM,QM,PG,HM,DW,DB server
```

# Module View (aligned with C&C)

Each diagram maps to one C&C region. Names follow the consolidated doc.

## 1. Frontend: Display (UI)

```mermaid
classDiagram
  class Screen {
    <<abstract>>
    +frames: Frame[]
    +nextFrame() void
    +previousFrame() void
    +render() void
  }
  class NavigationScreen {
    +planets: PlanetSummary[]
    +selectPlanet(planetId: int) void
  }
  class PlanetScreen {
    +planet: Planet
    +question: Question
  }
  class AsteroidScreen {
    +game: AsteroidMiniGame
  }
  class RadioScreen {
    +game: RadioMiniGame
  }
  class SettingsScreen {
    +settings: Settings
  }
  class Frame {
    +components: Component[]
    +render() void
  }
  class Component {
    <<abstract>>
    +x: int
    +y: int
    +color: str
    +render() void
  }
  class Button {
    +onPress: function
  }
  class TextBox {
    +isActive: bool
    +inputText: str
  }
  class Slider {
    +value: float
    +onChange: function
  }
  class Picture {
    +pathToFile: str
  }
  class GraphView {
    +fn: str
    +pane: Point[2]
  }

  Screen <|-- NavigationScreen
  Screen <|-- PlanetScreen
  Screen <|-- AsteroidScreen
  Screen <|-- RadioScreen
  Screen <|-- SettingsScreen
  Screen "1" *-- "1..*" Frame : frames
  Frame "1" *-- "0..*" Component : components
  Component <|-- Button
  Component <|-- TextBox
  Component <|-- Slider
  Component <|-- Picture
  Component <|-- GraphView
```

## 2. Frontend: Logic (Game Manager, Session Cache, API Client, Minigames, Graph Renderer)

```mermaid
classDiagram
  class GameManager {
    +screen: Screen
    +handle(intent: Intent) void
    +changeScreen(s: Screen) void
    +startMiniGame(type: str) void
    +onMiniGameEnd(r: MiniGameResult) void
    +pause() void
  }
  class SessionCache {
    +player: Player
    +planets: PlanetSummary[]
    +currentPlanet: Planet
    +currentQuestion: Question
    +selectedAnswer: Answer
    +hintsShown: str[]
    +lastResult: AnswerResult
    +status: RequestStatus
    +subscribe(fn: function) void
    +loadPlanets() void
    +enterPlanet(planetId: int) void
    +loadNextQuestion() void
    +selectAnswer(a: Answer) void
    +submitAnswer() void
    +requestHint() void
    +reportMiniGameResult(r: MiniGameResult) void
    +saveSettings(s: Settings) void
  }
  class ApiClient {
    +get(path: str) json
    +post(path: str, body: json) json
  }
  class Player {
    +userId: int
    +hintQuota: int
    +settings: Settings
  }
  class Settings {
    +musicVolume: float
    +sfxVolume: float
  }
  class MiniGame {
    <<abstract>>
    +score: int
    +play() void
    +finish() MiniGameResult
  }
  class AsteroidMiniGame {
    +questions: PracticeQuestion[]
    +asteroids: Asteroid[]
    +pane: Point[2]
  }
  class RadioMiniGame {
    +questions: PracticeQuestion[]
    +pane: Point[2]
  }
  class Asteroid {
    +position: Point
    +radius: int
    +isDestroyed: bool
    +destroy() void
  }
  class PracticeQuestion {
    +prompt: str
    +fn: str
    +isCorrect(a: Answer) bool
  }
  class MiniGameResult {
    +game: str
    +score: int
    +completed: bool
  }
  class GraphRenderer {
    +parse(fn: str) ParsedFn
    +render(fn: ParsedFn, pane: Point[2]) void
  }
  class Point {
    +x: float
    +y: float
  }

  GameManager --> SessionCache : actions
  GameManager --> MiniGame : starts
  SessionCache --> ApiClient : requests
  SessionCache o-- Player
  Player *-- Settings
  MiniGame <|-- AsteroidMiniGame
  MiniGame <|-- RadioMiniGame
  AsteroidMiniGame "1" *-- "0..*" Asteroid
  AsteroidMiniGame --> PracticeQuestion
  RadioMiniGame --> PracticeQuestion
  MiniGame ..> GraphRenderer : draws with
  MiniGame ..> MiniGameResult : returns
  Asteroid --> Point
```

## 3. Shared data models (what the API sends)

The client never receives answers for planet questions.

```mermaid
classDiagram
  class PlanetSummary {
    +planetId: int
    +name: str
    +graphOrder: int
    +prereqIds: int[]
    +unlocked: bool
    +status: str
    +completionPct: float
  }
  class Planet {
    +planetId: int
    +name: str
    +lessons: Lesson[]
  }
  class Lesson {
    +lessonNumber: int
    +text: str
  }
  class Question {
    <<abstract>>
    +questionId: int
    +prompt: str
    +graph: str
    +type: str
  }
  class MultipleChoiceQuestion {
    +options: Option[]
  }
  class SliderQuestion {
    +sliders: Interval[]
  }
  class ShortAnswerQuestion {
    +parseInput(s: str) bool
  }
  class Option {
    +optionId: int
    +label: str
    +text: str
  }
  class Interval {
    +start: float
    +end: float
  }
  class AnswerResult {
    +correct: bool
    +correctAnswer: Answer
    +planet: PlanetSummary
    +newlyUnlocked: int[]
  }

  Planet "1" *-- "1..*" Lesson : ordered
  Question <|-- MultipleChoiceQuestion
  Question <|-- SliderQuestion
  Question <|-- ShortAnswerQuestion
  MultipleChoiceQuestion "1" *-- "2..*" Option
  SliderQuestion "1" *-- "1..*" Interval : slider bounds
  AnswerResult --> PlanetSummary
```

## 4. Backend

`isCorrect()` moves here as a `Grader` per question type.

```mermaid
classDiagram
  class ApiManager {
    +authenticate(req) int
    +route(req) Response
  }
  class ProfileManager {
    +getOrCreateUser(userId: int) Player
    +getSettings(userId: int) Settings
    +saveSettings(userId: int, s: Settings) void
    +saveSnapshot(userId: int, s: Snapshot) void
    +loadSnapshot(userId: int) Snapshot
  }
  class QuestionManager {
    +getLessons(planetId: int) Lesson[]
    +nextQuestion(userId: int, planetId: int) Question
    +submit(userId: int, questionId: int, a: Answer) AnswerResult
  }
  class Grader {
    <<interface>>
    +grade(questionId: int, a: Answer) bool
  }
  class MultipleChoiceGrader
  class SliderGrader
  class ShortAnswerGrader
  class ProgressManager {
    +onAnswer(e: AnswerEvent) void
    +listPlanets(userId: int) PlanetSummary[]
  }
  class HintManager {
    +requestHint(userId: int, questionId: int) str
    +addHints(userId: int, r: MiniGameResult) int
  }
  class DataWriter {
    +users: UserRepo
    +content: ContentRepo
    +progress: ProgressRepo
    +hints: HintRepo
  }

  ApiManager --> ProfileManager
  ApiManager --> QuestionManager
  ApiManager --> ProgressManager
  ApiManager --> HintManager
  QuestionManager --> Grader
  Grader <|.. MultipleChoiceGrader
  Grader <|.. SliderGrader
  Grader <|.. ShortAnswerGrader
  QuestionManager ..> ProgressManager : change event
  ProfileManager --> DataWriter
  QuestionManager --> DataWriter
  ProgressManager --> DataWriter
  HintManager --> DataWriter
```

## What changed from the original module view

| Original | Now | Why |
|---|---|---|
| `GameEngine` | `GameManager` | Matches C&C |
| `Player.Progress`, `HintStateTracker` | `SessionCache` + server tables | One owner for client state; server is the source of truth |
| `HintController` | `SessionCache.requestHint()` → `HintManager` | Quota is enforced server-side |
| `SettingsManager` | `Player.settings` | A single float doesn't need its own manager |
| `Question.isCorrect()`, `correctOption`, `acceptableRanges` on the client | `Grader` classes on the backend | The client must not hold the answers |
| `MainScreen` subclass | Instance of `Screen` | It adds only a title, no behavior |
| `Planet.tasks: Task[]` (Reading / Quiz) | `Planet.lessons` + questions fetched one at a time | Matches the DB and the C&C flow |
| (missing) | `ApiClient`, `GraphRenderer`, `GraphView`, backend classes | They were in C&C but not in the module view |

## Current Gaps: proposed answers

| Gap | Answer |
|---|---|
| How to store progress | `planet_progress` + `user_answer` tables. No JSON blob |
| FE display vs BE logic objects | Display = `Screen/Frame/Component`. Models = section 3, sent over the API. Logic = backend services. Frame ≠ Task |
| Object vs instance | Subclass only when you add behavior or fields used by logic. Otherwise configure an instance |
| When to pull data | Planet list on login. Lessons on planet enter. Questions one at a time |
| Interface vs abstract class | Has shared fields → abstract (`Screen`, `Component`, `MiniGame`, `Question`). Behavior only → interface (`Grader`) |
| Generating questions | Author them for the MVP. Generated functions can come later as question templates |

# DB Diagram

<span style="color:lightblue">Fields marked ★ are proposed changes from the current consolidated doc.</span>

## Entity-Relationship

```mermaid
erDiagram
  users {
    int user_id PK
    str username
    int hint_quota
    float music_volume
    float sfx_volume
    int last_planet_id FK "★ resume point"
    datetime created_at
  }
  planets {
    int planet_id PK
    text name
    int graph_order "layout depth only"
  }
  planet_prereqs {
    int planet_id PK, FK
    int prereq_planet_id PK, FK
  }
  lessons {
    int lesson_id PK
    int planet_id FK
    int lesson_number "0 = intro ★"
    text text
  }
  questions {
    int question_id PK
    int planet_id FK
    text prompt
    text graph "nullable function string"
    text type "mcq | slider | short"
    text answer_key "★ short answer only"
  }
  answer_options {
    int option_id PK
    int question_id FK
    text label
    text text
    bool is_correct
  }
  slider_ranges {
    int question_id PK, FK
    int slider_index PK
    float min
    float max
    float accept_start
    float accept_end
  }
  hints {
    int hint_id PK
    int question_id FK
    text text
  }
  user_hint {
    int user_id PK, FK
    int hint_id PK, FK
  }
  user_answer {
    int answer_id PK
    int user_id FK
    int question_id FK
    int option_id FK "nullable, mcq only ★"
    text response "nullable, slider/short ★"
    bool correct
    datetime answered_at "★"
  }
  planet_progress {
    int user_id PK, FK
    int planet_id PK, FK
    text status "hostile | peaceful"
    int correct_count
  }

  users ||--o{ user_answer : submits
  users ||--o{ planet_progress : has
  users ||--o{ user_hint : unlocks
  users }o--o| planets : "last visited"

  planets ||--o{ lessons : contains
  planets ||--o{ questions : contains
  planets ||--o{ planet_prereqs : "is unlocked by"
  planets ||--o{ planet_prereqs : "is prereq of"
  planets ||--o{ planet_progress : tracked_in

  questions ||--o{ answer_options : "mcq options"
  questions ||--o{ slider_ranges : "slider bounds"
  questions ||--o{ hints : has
  questions ||--o{ user_answer : answered_in
  answer_options |o--o{ user_answer : chosen
  hints ||--o{ user_hint : unlocked_as
```

## Content vs user data

```mermaid
flowchart LR
  subgraph Content["Content (authored, read-only at runtime)"]
    planets
    planet_prereqs
    lessons
    questions
    answer_options
    slider_ranges
    hints
  end
  subgraph User["User data (written during play)"]
    users
    user_answer
    planet_progress
    user_hint
  end
```

## Which service writes which table

| Table | Read by | Written by |
|---|---|---|
| users | Profile, Hint | Profile (settings, last_planet_id), Hint (hint_quota) |
| planets, planet_prereqs | Progress | seed script |
| lessons | Question | seed script |
| questions, answer_options, slider_ranges | Question | seed script |
| hints | Hint | seed script |
| user_answer | Question, Progress | Question |
| planet_progress | Progress | Progress |
| user_hint | Hint | Hint |

## Changes from previous discussion
1. `hints.user_id` and `hints.used` → new `user_hint` table, so hint text isn't copied per user
2. `planets.lesson` and `planets.intro_text` removed; the intro becomes `lessons.lesson_number = 0`
3. `user_answer` gets one row per attempt, plus `option_id` / `response` / `answered_at`
4. `slider_ranges` + `questions.answer_key` support non-MCQ grading

