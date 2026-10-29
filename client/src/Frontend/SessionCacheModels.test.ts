import {describe, expect, it} from 'vitest';
import {Settings, Player} from './SessionCacheModels';
import {
  MISSING_FIELDS_ERROR,
  CLASS_CREATION_ERROR,
  FIELD_RANGE_ERROR,
} from './ErrorMessages';

describe('parseSettings', () => {
  it('parse valid setting JSON strings', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5, sfxVolume: 0.75});
    const settings = Settings.createFromJson(JSON_STRING);
    expect(settings).toStrictEqual({musicVolume: 0.5, sfxVolume: 0.75});
  });
  it('throws an error when missing sfxVolume', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      MISSING_FIELDS_ERROR(['sfxVolume']),
    );
  });
  it('throws an error when missing musicVolume', () => {
    const JSON_STRING = JSON.stringify({sfxVolume: 0.75});
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
  it('throws an error when musicVolume is out of range', () => {
    const JSON_STRING = JSON.stringify({musicVolume: -0.1, sfxVolume: 0.75});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('musicVolume', 0, 1),
    );
  });
  it('throws an error when sfxVolume is out of range', () => {
    const JSON_STRING = JSON.stringify({musicVolume: 0.5, sfxVolume: 1.1});
    expect(() => Settings.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('sfxVolume', 0, 1),
    );
  });
});

describe('parsePlayer', () => {
  it('throws an error when missing userId', () => {
    const JSON_STRING = JSON.stringify({
      name: 'Player1',
      hintQuota: 3,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
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
  it('throws an error when hintQuota is negative', () => {
    const JSON_STRING = JSON.stringify({
      userId: 'user123',
      name: 'Player1',
      hintQuota: -1,
      settings: {musicVolume: 0.5, sfxVolume: 0.75},
    });
    expect(() => Player.createFromJson(JSON_STRING)).toThrowError(
      FIELD_RANGE_ERROR('hintQuota', 0, Infinity),
    );
  });
});
