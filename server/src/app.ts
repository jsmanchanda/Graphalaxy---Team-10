import express from 'express';
import type {ErrorRequestHandler} from 'express';
import type {DataWriter, User} from './data-writer';
import {toPlanetPayload, toPlayerPayload} from './api/payloads';
import {
  QuestionManagerError,
  type QuestionErrorCode,
  type QuestionManager,
} from './question-manager/QuestionManager';

//MOCK APP FOR DEMO. REDO IN SPRINT 2.

/**
 * Maps a QuestionManager error code to an HTTP status.
 * @param code the error code
 * @returns 400 for bad input, 404 for missing things, 500 for the rest
 */
function statusFor(code: QuestionErrorCode): number {
  switch (code) {
    case 'INVALID_INPUT':
      return 400;
    case 'NOT_FOUND':
      return 404;
    default:
      return 500;
  }
}

const MAX_USERNAME_LENGTH = 32;

/** What the HTTP layer needs. Narrow types keep tests easy to fake. */
export interface AppDeps {
  questions: Pick<QuestionManager, 'submit' | 'getPlanetContent'>;
  dataWriter: Pick<DataWriter, 'users'>;
}

/**
 * Turns thrown errors into {error: {code, message}} responses.
 * The internal cause of a QuestionManagerError is logged, never sent.
 */
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Express only treats a function as an error handler if it takes 4 arguments.
  // If a response has already started, let Express close the connection.
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof QuestionManagerError) {
    if (err.cause) console.error(err.code, err.cause);
    res
      .status(statusFor(err.code))
      .json({error: {code: err.code, message: err.message}});
    return;
  }
  // express.json() reports a malformed request body with status 400
  if (
    typeof err?.status === 'number' &&
    err.status >= 400 &&
    err.status < 500
  ) {
    res
      .status(err.status)
      .json({error: {code: 'INVALID_INPUT', message: 'Malformed request.'}});
    return;
  }
  console.error(err);
  res
    .status(500)
    .json({error: {code: 'INTERNAL', message: 'Something went wrong.'}});
};

/** Throws INVALID_INPUT unless the value is a positive safe integer. */
function parseId(value: unknown, name: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new QuestionManagerError(
      'INVALID_INPUT',
      `${name} must be a positive safe integer.`,
    );
  }
  return id;
}

/** Returns the trimmed username, or throws INVALID_INPUT. */
function parseUsername(value: unknown): string {
  const username = typeof value === 'string' ? value.trim() : '';
  if (username === '' || username.length > MAX_USERNAME_LENGTH) {
    throw new QuestionManagerError(
      'INVALID_INPUT',
      `username must be 1 to ${MAX_USERNAME_LENGTH} characters.`,
    );
  }
  return username;
}

/** Returns valid audio settings (each from 0 to 1), or throws INVALID_INPUT. */
function parseSettings(body: unknown): {
  musicVolume: number;
  sfxVolume: number;
} {
  const {musicVolume, sfxVolume} = (body ?? {}) as Record<string, unknown>;
  for (const [name, value] of [
    ['musicVolume', musicVolume],
    ['sfxVolume', sfxVolume],
  ] as const) {
    if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
      throw new QuestionManagerError(
        'INVALID_INPUT',
        `${name} must be a number between 0 and 1.`,
      );
    }
  }
  return {musicVolume: musicVolume as number, sfxVolume: sfxVolume as number};
}

/**
 * Builds the HTTP API the client's ApiClient talks to. Errors are returned as
 * {error: {code, message}}.
 *
 *   POST  /api/users                                    {username}  -> Player
 *   GET   /api/users/:userId/planets/:planetId                      -> Planet
 *   PATCH /api/users/:userId/settings   {musicVolume, sfxVolume}    -> Player
 *   POST  /api/users/:userId/questions/:questionId/answer
 *                                       {optionId}              -> AnswerResult
 * @param deps the services the routes use (or fakes in tests)
 * @param deps.questions loads planets and records and grades answers
 * @param deps.dataWriter reads and writes users
 * @returns the Express app, ready to listen
 */
export function createApp({questions, dataWriter}: AppDeps): express.Express {
  const app = express();
  app.use(express.json());

  /** Looks up the user in the URL, or throws INVALID_INPUT / NOT_FOUND. */
  const requireUser = (value: unknown): User => {
    const userId = parseId(value, 'userId');
    const user = dataWriter.users.findById(userId);
    if (!user) {
      throw new QuestionManagerError(
        'NOT_FOUND',
        `User ${userId} does not exist.`,
      );
    }
    return user;
  };

  // Gets or creates the user. There is no password yet.
  app.post('/api/users', (req, res) => {
    const username = parseUsername(req.body?.username);
    const user =
      dataWriter.users.findByUsername(username) ??
      dataWriter.users.create(username);
    res.json(toPlayerPayload(user));
  });

  app.get('/api/users/:userId/planets/:planetId', (req, res) => {
    const user = requireUser(req.params.userId);
    // QuestionManager validates planetId and throws INVALID_INPUT / NOT_FOUND.
    const planet = questions.getPlanetContent(
      user.userId,
      Number(req.params.planetId),
    );
    res.json(toPlanetPayload(planet));
  });

  app.patch('/api/users/:userId/settings', (req, res) => {
    const user = requireUser(req.params.userId);
    const settings = parseSettings(req.body);
    dataWriter.users.saveSettings(user.userId, settings);
    res.json(toPlayerPayload({...user, ...settings}));
  });

  // Records an attempt. The client does not call this yet, so `solved` stays
  // false until it does.
  app.post('/api/users/:userId/questions/:questionId/answer', (req, res) => {
    const user = requireUser(req.params.userId);
    res.json(
      questions.submit(
        user.userId,
        Number(req.params.questionId),
        Number(req.body?.optionId),
      ),
    );
  });

  app.use(errorHandler);
  return app;
}
