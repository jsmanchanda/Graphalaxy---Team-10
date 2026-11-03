import type {ScreenModel} from '../UI/types';

import type {Planet} from './SessionCacheModels';

/**
 * something that shows a screen
 */
export interface ScreenDisplay {
  displayScreen(model: ScreenModel): void;
}

/**
 * Where GameManager gets its data from
 */
export interface GameSession {
  /**
   * Shows screens on GameManager's behalf
   * @param planetId id number of planet
   */
  loadPlanet(planetId: number): Promise<Planet>;
}
