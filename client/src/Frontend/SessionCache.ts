import {ApiClient, type ServerGateway} from './ApiClient';
import type {Planet, Player} from './SessionCacheModels';

/**
 * Holds the player's session data and loads data from the backend.
 */
export class SessionCache {
  player: Player | null = null;
  currentPlanet: Planet | null = null;
  // Counts loadPlanet calls so only the latest request sets currentPlanet.
  private planetRequestId = 0;

  /**
   * Creates a new SessionCache object.
   * @param client Handles talking to the backend.
   */
  constructor(private readonly client: ServerGateway = new ApiClient()) {}

  /**
   * Logs in and stores the player. Clears the previous player's planet.
   * @param username Player's username.
   * @returns The logged-in player.
   * @throws {ApiError} If the login fails.
   */
  async login(username: string): Promise<Player> {
    const player = await this.client.login(username);
    this.player = player;
    this.currentPlanet = null;
    this.planetRequestId++;
    return player;
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
    }
    return planet;
  }
}
