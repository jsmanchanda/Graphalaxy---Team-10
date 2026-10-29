/*
  @fileoverview Defines the models that store the parsed data from backend's JSON strings.
*/

import {MISSING_FIELDS_ERROR, CLASS_CREATION_ERROR} from './ErrorMessages';

/**
 * Stores user-specific gameplay settings.
 * @param musicVolume The volume level for music.
 * @param sfxVolume The volume level for sound effects.
 */
export class Settings {
  musicVolume: number;
  sfxVolume: number;
  private constructor(musicVolume: number, sfxVolume: number) {
    this.musicVolume = musicVolume;
    this.sfxVolume = sfxVolume;
  }
  /**
   * Creates a Settings instance from a JSON string.
   * @param jsonString The JSON string representing the settings.
   * @returns A Settings instance.
   * @throws {Error} An error if required fields are missing.
   */
  static createFromJson(jsonString: string): Settings {
    const json = JSON.parse(jsonString);
    // check the fields
    const missingFields = [];
    if (!('musicVolume' in json)) {
      missingFields.push('musicVolume');
    }
    if (!('sfxVolume' in json)) {
      missingFields.push('sfxVolume');
    }
    if (missingFields.length > 0) {
      throw new Error(MISSING_FIELDS_ERROR(missingFields));
    }
    const settings = new Settings(json.musicVolume, json.sfxVolume);
    return settings;
  }
}

/**
 * Stores a player's information.
 * @param userId The unique identifier for the player.
 * @param hintQuota The number of hints available to the player.
 * @param settings The player's gameplay settings.
 * @param name The player's display name.
 */
export class Player {
  userId: string;
  hintQuota: number;
  settings: Settings;
  name: string;
  /**
   * Creates a Player instance from a JSON string.
   * @param jsonString The JSON string representing the player.
   * @returns A Player instance.
   * @throws {Error} An error if required fields are missing or if settings creation fails.
   */
  static createFromJson(jsonString: string): Player {
    const json = JSON.parse(jsonString);
    let settings;
    try {
      settings = Settings.createFromJson(JSON.stringify(json.settings));
    } catch (error) {
      throw new Error(CLASS_CREATION_ERROR('Settings', error));
    }

    const missingFields = [];
    if (!('userId' in json)) {
      missingFields.push('userId');
    }
    if (!('name' in json)) {
      missingFields.push('name');
    }
    if (!('hintQuota' in json)) {
      missingFields.push('hintQuota');
    }
    if (!('settings' in json)) {
      missingFields.push('settings');
    }
    if (missingFields.length > 0) {
      throw new Error(MISSING_FIELDS_ERROR(missingFields));
    }

    const player = new Player(json.userId, json.name, json.hintQuota, settings);
    return player;
  }
  private constructor(
    userId: string,
    name: string,
    hintQuota: number,
    settings: Settings,
  ) {
    this.userId = userId;
    this.name = name;
    this.hintQuota = hintQuota;
    this.settings = settings;
  }
}
