import Konva from 'konva';
import {RetryWarningScreenModel, UiAction, View} from '../types';
import {ButtonComponent, TextBoxComponent} from '../components';
import {
  RETRY_WARNING_BUTTON_HEIGHT,
  RETRY_WARNING_BUTTON_WIDTH,
  RETRY_WARNING_BUTTON_Y,
  RETRY_WARNING_CANCEL_X,
  RETRY_WARNING_CONFIRM_X,
  RETRY_WARNING_TEXT_HEIGHT,
  RETRY_WARNING_TEXT_WIDTH,
  RETRY_WARNING_TEXT_X,
  RETRY_WARNING_TEXT_Y,
} from '../constants';

/**
 * Warning shown before a planet is redone. The player has to confirm before
 * their progress on the planet is reset.
 */
export class RetryWarningScreenView implements View {
  private group: Konva.Group;

  /**
   * Builds the warning screen.
   * @param onAction Called when the player selects Confirm or Cancel.
   */
  constructor(
    onAction: (action: UiAction) => void,
    model: RetryWarningScreenModel,
  ) {
    this.group = new Konva.Group();

    const warningText = new TextBoxComponent(
      RETRY_WARNING_TEXT_X,
      RETRY_WARNING_TEXT_Y,
      RETRY_WARNING_TEXT_WIDTH,
      RETRY_WARNING_TEXT_HEIGHT,
      model.message,
    );

    const cancelButton = new ButtonComponent(
      RETRY_WARNING_CANCEL_X,
      RETRY_WARNING_BUTTON_Y,
      RETRY_WARNING_BUTTON_WIDTH,
      RETRY_WARNING_BUTTON_HEIGHT,
      'Cancel',
      () => onAction({type: 'cancelRetry'}),
    );

    const confirmButton = new ButtonComponent(
      RETRY_WARNING_CONFIRM_X,
      RETRY_WARNING_BUTTON_Y,
      RETRY_WARNING_BUTTON_WIDTH,
      RETRY_WARNING_BUTTON_HEIGHT,
      'Confirm',
      () => onAction({type: 'confirmRetry'}),
    );

    this.group.add(warningText.getGroup());
    this.group.add(cancelButton.getGroup());
    this.group.add(confirmButton.getGroup());
  }

  /**
   * Gets the warning screen group.
   * @returns The Konva group containing the warning screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }
}
