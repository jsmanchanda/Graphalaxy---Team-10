import {describe, expect, it} from 'vitest';
import {Settings, Player} from './SessionCacheModels';
import {MISSING_FIELDS_ERROR, CLASS_CREATION_ERROR} from './ErrorMessages';

describe('parseSettings', () => {
  it('parse valid setting JSON strings', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 50, sfxVolume: 75});
    const settings = Settings.createFromJson(JSON_STRING);
    expect(settings).toStrictEqual({musicVolume: 50, sfxVolume: 75});
  });
  it('throws an error when missing sfxVolume', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 50});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['sfxVolume']),
    );
  });
  it('throws an error when missing musicVolume', () => {
    const JSON_STRING = JSON.stringify({sfxVolume: 75});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume']),
    );
  });
  it('throws an error for missing both musicVolume and sfxVolume', () => {
    const JSON_STRING = JSON.stringify({});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['musicVolume', 'sfxVolume']),
    );
  });
});

describe('parsePlayer', () => {
  it('throws an error when missing userId', () => {
    const JSON_STRING = JSON.stringify({
      name: 'Player1',
      hintQuota: 3,
      settings: {musicVolume: 50, sfxVolume: 75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['userId']),
    );
  });
  it('throws an error when class creation fails for settings', () => {
    const JSON_STRING = JSON.stringify({
      userId: 'user123',
      name: 'Player1',
      hintQuota: 3,
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      CLASS_CREATION_ERROR(
        'Settings',
        new Error(MISSING_FIELDS_ERROR(['settings'])),
      ),
    );
  });
});
