/// <reference lib="dom" />

import Konva from 'konva';
import {LoginScreenModel, UiAction, View} from '../types';
import {ButtonComponent, TextBoxComponent} from '../components';
import {editText} from '../textInput';
import {
  FONT_PLANET_KOSMOS,
  LOGIN_BUTTON_HEIGHT,
  LOGIN_BUTTON_WIDTH,
  LOGIN_BUTTON_X,
  LOGIN_BUTTON_Y,
  LOGIN_INPUT_HEIGHT,
  LOGIN_INPUT_Y,
  LOGIN_MESSAGE_HEIGHT,
  LOGIN_MESSAGE_Y,
  LOGIN_PROMPT_HEIGHT,
  LOGIN_PROMPT_Y,
  LOGIN_ROW_WIDTH,
  LOGIN_ROW_X,
  LOGIN_TITLE_HEIGHT,
  LOGIN_TITLE_WIDTH,
  LOGIN_TITLE_X,
  LOGIN_TITLE_Y,
  LOGIN_USERNAME_MAX_LENGTH,
} from '../constants';

// Shown after the typed text, so the player can see where typing goes.
const CURSOR = '_';

/**
 * Login screen: the player types their username on the keyboard, then presses
 * Enter or the Log In button. The canvas has no text field of its own, so
 * this screen listens to the keyboard while it is showing.
 */
export class LoginScreenView implements View {
  private group: Konva.Group;
  private username: string;
  private onKeyDown: (event: KeyboardEvent) => void;

  /**
   * Builds the login screen and starts listening to the keyboard.
   * @param onAction Called when the player presses Enter or selects Log In.
   */
  constructor(onAction: (action: UiAction) => void, model: LoginScreenModel) {
    this.group = new Konva.Group();
    this.username = model.username;

    const title = new TextBoxComponent(
      LOGIN_TITLE_X,
      LOGIN_TITLE_Y,
      LOGIN_TITLE_WIDTH,
      LOGIN_TITLE_HEIGHT,
      'Graphalaxy',
    );
    title.setFontSize(45);
    title.setFontFamily(FONT_PLANET_KOSMOS);

    const prompt = new TextBoxComponent(
      LOGIN_ROW_X,
      LOGIN_PROMPT_Y,
      LOGIN_ROW_WIDTH,
      LOGIN_PROMPT_HEIGHT,
      'Type your username',
    );

    const input = new TextBoxComponent(
      LOGIN_ROW_X,
      LOGIN_INPUT_Y,
      LOGIN_ROW_WIDTH,
      LOGIN_INPUT_HEIGHT,
      this.username + CURSOR,
    );

    const submit = (): void =>
      onAction({type: 'login', username: this.username});

    const loginButton = new ButtonComponent(
      LOGIN_BUTTON_X,
      LOGIN_BUTTON_Y,
      LOGIN_BUTTON_WIDTH,
      LOGIN_BUTTON_HEIGHT,
      'Log In',
      submit,
    );

    this.group.add(title.getGroup());
    this.group.add(prompt.getGroup());
    this.group.add(input.getGroup());
    this.group.add(loginButton.getGroup());

    if (model.message) {
      const message = new TextBoxComponent(
        LOGIN_ROW_X,
        LOGIN_MESSAGE_Y,
        LOGIN_ROW_WIDTH,
        LOGIN_MESSAGE_HEIGHT,
        model.message,
      );
      this.group.add(message.getGroup());
    }

    this.onKeyDown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
        return;
      }
      const edited = editText(this.username, event, LOGIN_USERNAME_MAX_LENGTH);
      if (edited !== this.username) {
        // Stops the browser acting on the key too, e.g. Space scrolling.
        event.preventDefault();
        this.username = edited;
        input.setText(edited + CURSOR);
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  /**
   * Gets the login screen group.
   * @returns The Konva group containing the login screen.
   */
  getGroup(): Konva.Group {
    return this.group;
  }

  /**
   * Stops listening to the keyboard. UiManager calls this when another screen
   * replaces this one.
   */
  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
