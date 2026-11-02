import {ApiError} from './ApiError';
import {Planet, Player} from './SessionCacheModels';
import type {Settings} from './SessionCacheModels';

type Method = 'GET' | 'POST' | 'PATCH';

/**
 * Interface for any client that communicates with the backend.
 */
export interface ServerGateway {
  login(username: string): Promise<Player>;
  getPlanet(planetId: number): Promise<Planet>;
  saveSettings(settings: Settings): Promise<Player>;
}

const DEFAULT_OPTIONS = {baseUrl: '/api', timeoutMs: 5000, retries: 2};

/**
 * Sends requests to the backend over HTTP and parses the responses into models.
 */
export class ApiClient implements ServerGateway {
  private userId: number | null = null;

  /**
   * Creates a new ApiClient instance.
   * @param http The function that sends requests.
   * @param options The base URL, timeout per attempt, and retries.
   */
  constructor(
    private readonly http: typeof fetch = globalThis.fetch.bind(globalThis),
    private readonly options = DEFAULT_OPTIONS,
  ) {}

  /**
   * Gets or creates the user, and uses them for later requests.
   * @param username The user's name.
   * @returns The logged-in player.
   * @throws {ApiError} An error if the request or parsing fails.
   */
  async login(username: string): Promise<Player> {
    const text = await this.request('POST', '/users', {username});
    const player = parseWith(() => Player.createFromJson(text));
    this.userId = player.userId;
    return player;
  }

  /**
   * Gets a planet with its ordered tasks.
   * @param planetId The planet's ID.
   * @returns The planet.
   * @throws {ApiError} An error if the request or parsing fails.
   */
  async getPlanet(planetId: number): Promise<Planet> {
    const text = await this.request(
      'GET',
      this.userPath(`/planets/${planetId}`),
    );
    return parseWith(() => Planet.createFromJson(text));
  }

  /**
   * Saves the player's audio settings.
   * @param settings The new settings.
   * @returns The updated player.
   * @throws {ApiError} An error if the request or parsing fails.
   */
  async saveSettings(settings: Settings): Promise<Player> {
    const text = await this.request(
      'PATCH',
      this.userPath('/settings'),
      settings,
    );
    return parseWith(() => Player.createFromJson(text));
  }

  /**
   * Sends a request, retries failed GET and PATCH requests.
   * Never retries POST.
   * @param method The HTTP method.
   * @param path The request path, relative to the base URL.
   * @param body The value to send as the JSON body, if any.
   * @returns The response body as text.
   * @throws {ApiError} The last error, once it can't be retried or no attempts
   * are left.
   */
  private async request(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<string> {
    const maxAttempts = method === 'POST' ? 1 : this.options.retries + 1;
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.attempt(method, path, body);
      } catch (error) {
        if (!isRetryable(error) || attempt >= maxAttempts) {
          throw error;
        }
      }
    }
  }

  /**
   * Makes one try at a request.
   * Aborts if timeout.
   * Timing includes requesting+reading the response.
   * @param method The HTTP method.
   * @param path The request path, relative to the base URL.
   * @param body The value to send as the JSON body, if any.
   * @returns The response body as text.
   * @throws {ApiError} An error of kind `timeout` if the request runs past the
   * timeout, `http` on a non-2xx response, or `network` if the request fails.
   */
  private async attempt(
    method: Method,
    path: string,
    body?: unknown,
  ): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs);
    try {
      const response = await this.http(this.options.baseUrl + path, {
        method,
        signal: controller.signal,
        headers:
          body === undefined ? undefined : {'Content-Type': 'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await response.text();
      if (!response.ok) {
        throw new ApiError(
          'http',
          `Request failed with status ${response.status}`,
          response.status,
        );
      }
      return text;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      if (controller.signal.aborted) {
        throw new ApiError('timeout', `${method} ${path} timed out`);
      }
      throw new ApiError('network', `${method} ${path} failed: ${error}`);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Builds a path for the logged-in user.
   * @param path The path after the user's ID.
   * @returns The full request path.
   * @throws {Error} An error if no user has logged in.
   */
  private userPath(path: string): string {
    if (this.userId === null) {
      throw new Error('Must log in before making this request');
    }
    return `/users/${this.userId}${path}`;
  }
}

/**
 * Checks whether a failed request could succeed if sent again.
 * @param error The error from the failed attempt.
 * @returns True for network errors, timeouts, and 5xx responses.
 */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }
  return (
    error.kind === 'network' ||
    error.kind === 'timeout' ||
    (error.kind === 'http' && (error.status ?? 0) >= 500)
  );
}

/**
 * Runs a parser, reporting any failure as a `parse` error.
 * @param parse The function that parses the response.
 * @returns The parsed value.
 * @throws {ApiError} An error of kind `parse` if the parser throws.
 */
function parseWith<T>(parse: () => T): T {
  try {
    return parse();
  } catch (error) {
    throw new ApiError('parse', `Invalid server response: ${error}`);
  }
}
