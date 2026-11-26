import Konva from 'konva';
import type {Settings} from '@graphalaxy/shared';
import {SettingsScreenModel, UiAction, View} from '../types';
import {ButtonComponent, TextBoxComponent} from '../components';
import {
  BACK_BUTTON_HEIGHT,
  BACK_BUTTON_WIDTH,
  BACK_BUTTON_X,
  BACK_BUTTON_Y,
  NEXT_BUTTON_HEIGHT,
  NEXT_BUTTON_WIDTH,
  NEXT_BUTTON_X,
  NEXT_BUTTON_Y,
  SETTINGS_LABEL_WIDTH,
  SETTINGS_LABEL_X,
  SETTINGS_LOGOUT_BUTTON_HEIGHT,
  SETTINGS_LOGOUT_BUTTON_WIDTH,
  SETTINGS_LOGOUT_BUTTON_X,
  SETTINGS_LOGOUT_BUTTON_Y,
  SETTINGS_MESSAGE_HEIGHT,
  SETTINGS_MESSAGE_WIDTH,
  SETTINGS_MESSAGE_X,
  SETTINGS_MESSAGE_Y,
  SETTINGS_MINUS_X,
  SETTINGS_MUSIC_ROW_Y,
  SETTINGS_PLUS_X,
  SETTINGS_ROW_HEIGHT,
  SETTINGS_SFX_ROW_Y,
  SETTINGS_STEP_BUTTON_WIDTH,
  SETTINGS_TITLE_HEIGHT,
  SETTINGS_TITLE_WIDTH,
  SETTINGS_TITLE_X,
  SETTINGS_TITLE_Y,
  SETTINGS_VALUE_WIDTH,
  SETTINGS_VALUE_X,
  SETTINGS_VOLUME_STEP,
} from '../constants';

/**
 * Moves a volume one step up or down, keeping it between 0 and 1.
 * @param volume The current volume, from 0 to 1.
 * @param direction 1 to turn it up, -1 to turn it down.
 * @returns The new volume, rounded so repeated steps do not drift.
 */
export function stepVolume(volume: number, direction: 1 | -1): number {
  const stepped = volume + direction * SETTINGS_VOLUME_STEP;
  return Math.min(1, Math.max(0, Math.round(stepped * 100) / 100));
}

/**
 * Formats a volume for display.
 * @param volume The volume, from 0 to 1.
 * @returns The volume as a percentage, e.g. '50%'.
 */
export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`;
}

/**
 * Settings screen: shows the player's music and sound effect volumes and lets
 * them change and save them, or log out.
 */
export class SettingsScreenView implements View {
  private group: Konva.Group;

  /**
   * Builds the settings screen from the player's current settings.
   * @param onAction Called when the player selects Save, Back, or Log Out.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: SettingsScreenModel,
  ) {
    this.group = new Konva.Group();

    // The volumes as edited on this screen; sent to Game Manager on Save
    const settings: Settings = {...model.settings};

    const title = new TextBoxComponent(
      SETTINGS_TITLE_X,
      SETTINGS_TITLE_Y,
      SETTINGS_TITLE_WIDTH,
      SETTINGS_TITLE_HEIGHT,
      'Settings',
    );
    this.group.add(title.getGroup());

    this.addVolumeRow(
      'Music Volume',
      SETTINGS_MUSIC_ROW_Y,
      settings,
      'musicVolume',
    );
    this.addVolumeRow('SFX Volume', SETTINGS_SFX_ROW_Y, settings, 'sfxVolume');

    if (model.message) {
      const message = new TextBoxComponent(
        SETTINGS_MESSAGE_X,
        SETTINGS_MESSAGE_Y,
        SETTINGS_MESSAGE_WIDTH,
        SETTINGS_MESSAGE_HEIGHT,
        model.message,
      );
      this.group.add(message.getGroup());
    }

    const backButton = new ButtonComponent(
      BACK_BUTTON_X,
      BACK_BUTTON_Y,
      BACK_BUTTON_WIDTH,
      BACK_BUTTON_HEIGHT,
      'Back',
      () => onAction({type: 'back'}),
    );

    const saveButton = new ButtonComponent(
      NEXT_BUTTON_X,
      NEXT_BUTTON_Y,
      NEXT_BUTTON_WIDTH,
      NEXT_BUTTON_HEIGHT,
      'Save',
      () => onAction({type: 'saveSettings', settings: {...settings}}),
    );

    const logoutButton = new ButtonComponent(
      SETTINGS_LOGOUT_BUTTON_X,
      SETTINGS_LOGOUT_BUTTON_Y,
      SETTINGS_LOGOUT_BUTTON_WIDTH,
      SETTINGS_LOGOUT_BUTTON_HEIGHT,
      'Log Out',
      () => onAction({type: 'logout'}),
    );

    this.group.add(backButton.getGroup());
    this.group.add(logoutButton.getGroup());
    this.group.add(saveButton.getGroup());
  }

  /**
   * Adds one volume's row: its name, a minus button, its value, and a plus
   * button. The buttons change the value in `settings` and on screen.
   * @param name The name shown for the volume.
   * @param y The row's vertical position.
   * @param settings The settings being edited.
   * @param field Which volume this row edits.
   */
  private addVolumeRow(
    name: string,
    y: number,
    settings: Settings,
    field: keyof Settings,
  ): void {
    const label = new TextBoxComponent(
      SETTINGS_LABEL_X,
      y,
      SETTINGS_LABEL_WIDTH,
      SETTINGS_ROW_HEIGHT,
      name,
    );

    const value = new TextBoxComponent(
      SETTINGS_VALUE_X,
      y,
      SETTINGS_VALUE_WIDTH,
      SETTINGS_ROW_HEIGHT,
      formatVolume(settings[field]),
    );

    const step = (direction: 1 | -1): void => {
      settings[field] = stepVolume(settings[field], direction);
      value.setText(formatVolume(settings[field]));
    };

    const minusButton = new ButtonComponent(
      SETTINGS_MINUS_X,
      y,
      SETTINGS_STEP_BUTTON_WIDTH,
      SETTINGS_ROW_HEIGHT,
      '-',
      () => step(-1),
    );

    const plusButton = new ButtonComponent(
      SETTINGS_PLUS_X,
      y,
      SETTINGS_STEP_BUTTON_WIDTH,
      SETTINGS_ROW_HEIGHT,
      '+',
      () => step(1),
    );

    this.group.add(label.getGroup());
    this.group.add(minusButton.getGroup());
    this.group.add(value.getGroup());
    this.group.add(plusButton.getGroup());
  }

  /**
   * Gets the settings screen group.
   * @returns The Konva group containing the settings screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
