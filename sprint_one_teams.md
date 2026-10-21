# Task Splits
 #### TEAM 1: BACKEND, DATA
- Handles: Database, Data Writer, Question Manager, API Manager, Progress Manager (if time allows)
- Create the **schema** for `users`, `planets`, `questions`, `answer_options`, and `user_answer`. Can also create schema for rest of the database, as time allows.
- Write the seed script: one planet, ~5 questions, with a few functions to pass to the **Graph Renderer**.
- Build the **Data Writer** behind repository interfaces, with an in-memory fake for tests.
- Build the **Question Manager**:
    - Get next question: skip questions already answered correctly, and return the options without is_correct.
    - Submit answer: check that the option belongs to the question, write User_answer, and return correct or not plus the right option.
- Build the **API Manager**: routing, request validation, user lookup, consistent errors, and a guarantee that is_correct never appears in a response.
- **Progress Manager** that increments correct_count on a first correct answer and flips status to peaceful at the threshold.
- **Tests**: Question Manager against a fake store, an API-level test confirming is_correct never leaks, and a duplicate-submit test.
#### TEAM 2: FRONTEND LOGIC
- Owns: Game Manager, Session Manager, API Client, user handling
- Define the ServerGateway interface, then implement the API Client behind it: requests, parsing, timeouts, retries, and typed errors.
- Build Session Manager:
    - Hold the current question, the selected option, the last result, and the request status.
    - Enforce its rules: one selection, and the selected option must belong to the current question.
    - Build loadNextQuestion and submitAnswer, publish a change event, and call the gateway.
- Build the Game Manager rules: no submit without a selection (“Click an option to submit”), no double submit, and the next-question flow after a result.
- Minimal user handling: a hardcoded or username-only user passed on every request.
- Tests: Game Manager against a fake Session Manager, Session Manager against a fake gateway (including a failed submit that keeps the selection), and API Client retry and error mapping against a mocked HTTP layer.
- Own the end-to-end integration test at the end of the sprint, since this team touches both sides.
#### TEAM 3: UI, GRAPHING
- Owns: UI Manager, Graph Renderer
- Build the question screen: prompt, option buttons, selected highlight, submit button, feedback message (correct or incorrect with the right answer), and the loading and error states.
- Emit intents (selectOption, submit) to the Game Manager and redraw on Session Manager’s change event.
- Build Graph Manager v1: parse the graph spec, evaluate points, and draw axes and the curve on the canvas.
- Draw the question’s graph from the question screen (the new UI  to Graph Manager connector).
- Tests: UI  against fake state (renders the right thing, emits the right intent), and Graph Manager input/output tests (spec gives expected points, invalid spec is flagged).

# DECISIONS
| Contract | Between | Contents |
|---|---|---|
| **HTTP API** (two endpoints, request and response JSON) | Team 1 and Team 2 | Next-question and submit shapes, error format, the user identity field |
| **Graph spec format** (`Questions.graph`) | Team 1 and Team 3 | Function type, parameters, axis ranges |
| **State shape and change event** | Team 2 and Team 3 | The fields Session State exposes and when it publishes |
| **Controller intents** | Team 3 and Team 2 | Intent names and payloads |
