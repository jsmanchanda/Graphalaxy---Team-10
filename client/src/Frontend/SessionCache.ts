import type {
  AnswerResult,
  Planet,
  PlanetSummary,
  Player,
  Question,
  Settings,
} from '@graphalaxy/shared';
import {ApiClient, type ServerGateway} from './ApiClient';
import {ApiError} from './ApiError';

/** The server's error code for a second answer to the same question. */
export const ALREADY_ANSWERED = 'ALREADY_ANSWERED';

/**
 * Holds the player's session data and loads data from the backend.
 */
export class SessionCache {
  player: Player | null = null;
  // The player's progress on every planet, loaded at login.
  planets: PlanetSummary[] = [];
  currentPlanet: Planet | null = null;
  // The question being asked on currentPlanet, loaded one at a time.
  currentQuestion: Question | null = null;
  // Counts loadPlanet calls so only the latest request sets currentPlanet.
  private planetRequestId = 0;

  /**
   * Creates a new SessionCache object.
   * @param client Handles talking to the backend.
   */
  constructor(private readonly client: ServerGateway = new ApiClient()) {}

  /**
   * Logs in and stores the player, whose settings come with them, then loads
   * their progress on every planet. Clears the previous player's data.
   * @param username Player's username.
   * @returns The logged-in player.
   * @throws {ApiError} If the login fails or the progress cannot be loaded.
   */
  async login(username: string): Promise<Player> {
    const player = await this.client.login(username);
    this.player = player;
    this.planets = [];
    this.currentPlanet = null;
    this.currentQuestion = null;
    this.planetRequestId++;
    await this.loadPlanets();
    return player;
  }

  /**
   * Logs the player out: forgets them and everything loaded for them, so the
   * next login starts fresh. Replies to requests still in flight are dropped,
   * since they belong to a player who is no longer logged in.
   */
  logout(): void {
    this.player = null;
    this.planets = [];
    this.currentPlanet = null;
    this.currentQuestion = null;
    this.planetRequestId++;
    this.client.logout?.();
  }

  /**
   * Loads the logged-in player's progress on every planet and stores it,
   * unless another player logged in while the request was in flight.
   * @returns The planet summaries.
   * @throws {ApiError} If the progress cannot be loaded.
   */
  async loadPlanets(): Promise<PlanetSummary[]> {
    const player = this.player;
    const planets = await this.client.getPlanets();
    if (this.player === player) {
      this.planets = planets;
    }
    return planets;
  }

  /**
   * Finds the player's progress on a planet.
   * @param planetId The planet's ID.
   * @returns The planet's summary, or null if it has not been loaded.
   */
  progressFor(planetId: number): PlanetSummary | null {
    return this.planets.find(planet => planet.planetId === planetId) ?? null;
  }

  /**
   * Loads a planet and stores it as currentPlanet, unless a newer
   * loadPlanet call was made while this one was in flight.
   * @param planetId The planet's ID for database.
   * @returns The planet.
   * @throws {ApiError} If the planet cannot be loaded.
   */
  async loadPlanet(planetId: number): Promise<Planet> {
    const requestId = ++this.planetRequestId;
    const planet = await this.client.getPlanet(planetId);
    if (requestId === this.planetRequestId) {
      this.currentPlanet = planet;
      this.currentQuestion = null;
    }
    return planet;
  }

  /**
   * Loads the next question the player has not answered yet on the current
   * planet. Stores it as currentQuestion along with the player's
   * progress there, unless the planet changed while the request was in flight.
   * @returns The question, or null once none are left.
   * @throws {Error} If no planet is loaded.
   * @throws {ApiError} If the question cannot be loaded.
   */
  async loadNextQuestion(): Promise<Question | null> {
    const planet = this.requirePlanet();
    const next = await this.client.getNextQuestion(planet.planetId);
    if (this.currentPlanet === planet) {
      this.currentQuestion = next.question;
      await this.storeProgress(next.progress);
    }
    return next.question;
  }

  /**
   * Erases the player's answers and progress on the current planet so they
   * can redo it. Stores the reset progress and forgets the current question.
   * @returns The player's progress on the planet after the reset.
   * @throws {Error} If no planet is loaded.
   * @throws {ApiError} If the planet cannot be reset.
   */
  async resetPlanet(): Promise<PlanetSummary> {
    const planet = this.requirePlanet();
    const progress = await this.client.resetPlanet(planet.planetId);
    if (this.currentPlanet === planet) {
      this.currentQuestion = null;
      await this.storeProgress(progress);
    }
    return progress;
  }

  /**
   * Saves the player's audio settings and stores the updated player, unless
   * another player logged in while the request was in flight.
   * @param settings The new settings.
   * @returns The updated player.
   * @throws {ApiError} If the settings cannot be saved.
   */
  async saveSettings(settings: Settings): Promise<Player> {
    const player = this.player;
    const updated = await this.client.saveSettings(settings);
    if (this.player === player) {
      this.player = updated;
    }
    return updated;
  }

  /**
   * Adds earned hint credits and stores the balance returned by the server.
   * @param count how many credits the minigame earned
   * @returns the updated hint balance
   */
  async awardHintCredits(count: number): Promise<number> {
    const player = this.player;
    if (!player) throw new Error('Must log in before awarding hint credits');
    const result = await this.client.awardHintCredits(count);
    if (this.player === player) {
      this.player = {...player, hintQuota: result.hintQuota};
    }
    return result.hintQuota;
  }

  /**
   * Sends an answer to the server, which grades it. Once currentQuestion is
   * graded, right or wrong, forgets it: each question is answered once. Also
   * forgets it if the server says it was answered before, which happens when
   * an earlier answer was recorded but its reply never arrived.
   * @param questionId The question's ID.
   * @param optionId The ID of the chosen option.
   * @returns The server's verdict.
   * @throws {ApiError} If the answer cannot be submitted.
   */
  async submitAnswer(
    questionId: number,
    optionId: number,
  ): Promise<AnswerResult> {
    const forget = (): void => {
      if (this.currentQuestion?.questionId === questionId) {
        this.currentQuestion = null;
      }
    };
    try {
      const result = await this.client.submitAnswer(questionId, optionId);
      forget();
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.code === ALREADY_ANSWERED) {
        forget();
      }
      throw error;
    }
  }

  /**
   * Gets the planet being played.
   * @returns The current planet.
   * @throws {Error} If no planet is loaded.
   */
  private requirePlanet(): Planet {
    if (!this.currentPlanet) {
      throw new Error('Must load a planet before making this request');
    }
    return this.currentPlanet;
  }

  /**
   * Replaces the stored summary for a planet, or adds it if there is none.
   * When the planet turns peaceful or hostile, other planets may unlock or
   * lock, so the whole list is reloaded from the server. If that reload
   * fails, the old list is kept until the next login.
   * @param progress The planet's latest summary.
   */
  private async storeProgress(progress: PlanetSummary): Promise<void> {
    const before = this.progressFor(progress.planetId);
    this.replaceProgress(progress);
    if (before && before.status !== progress.status) {
      try {
        await this.loadPlanets();
      } catch (error) {
        console.error(error);
      }
    }
  }

  /**
   * Replaces the stored summary for a planet, or adds it if there is none.
   * @param progress The planet's latest summary.
   */
  private replaceProgress(progress: PlanetSummary): void {
    const index = this.planets.findIndex(
      planet => planet.planetId === progress.planetId,
    );
    if (index === -1) {
      this.planets = [...this.planets, progress];
    } else {
      this.planets = this.planets.map((planet, i) =>
        i === index ? progress : planet,
      );
    }
  }
}
