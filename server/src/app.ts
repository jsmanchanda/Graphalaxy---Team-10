import express from 'express';
import type {ErrorRequestHandler} from 'express';
import type {AnswerResult, Planet, Player, Settings} from '@graphalaxy/shared';
import type {DataWriter, User} from './data-writer';
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
  questions: Pick<QuestionManager, 'submit' | 'getPlanet'>;
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

/**
 * Throws INVALID_INPUT unless the value is a positive safe integer. Every ID in
 * a URL or body is parsed here, once; QuestionManager trusts what it is given.
 * Accepts a number, or a string of digits (URL params are always strings), so
 * values like true, [5], '1e3' or ' 5' are rejected.
 */
function parseId(value: unknown, name: string): number {
  const id =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value)
        ? Number(value)
        : NaN;
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
function parseSettings(body: unknown): Settings {
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
 * Converts a stored user to the API's Player.
 * @param user the stored user
 * @returns the player
 */
export function toPlayer(user: User): Player {
  return {
    userId: user.userId,
    name: user.username,
    hintQuota: user.hintQuota,
    settings: {musicVolume: user.musicVolume, sfxVolume: user.sfxVolume},
  };
}

/**
 * Builds the HTTP API the client's ApiClient talks to. The routes and their
 * request and response bodies are listed in shared's api.ts.
 * Errors are returned as ApiErrorBody: {error: {code, message}}.
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
    const body: Player = toPlayer(user);
    res.json(body);
  });

  app.get('/api/users/:userId/planets/:planetId', (req, res) => {
    const user = requireUser(req.params.userId);
    const planetId = parseId(req.params.planetId, 'planetId');
    const body: Planet = questions.getPlanet(user.userId, planetId);
    res.json(body);
  });

  app.patch('/api/users/:userId/settings', (req, res) => {
    const user = requireUser(req.params.userId);
    const settings = parseSettings(req.body);
    dataWriter.users.saveSettings(user.userId, settings);
    const body: Player = toPlayer({...user, ...settings});
    res.json(body);
  });

  // Grades and records an attempt. This is the only place answers are checked.
  app.post('/api/users/:userId/questions/:questionId/answer', (req, res) => {
    const user = requireUser(req.params.userId);
    const questionId = parseId(req.params.questionId, 'questionId');
    const optionId = parseId(req.body?.optionId, 'optionId');
    const body: AnswerResult = questions.submit(
      user.userId,
      questionId,
      optionId,
    );
    res.json(body);
  });

  app.use(errorHandler);
  return app;
}
