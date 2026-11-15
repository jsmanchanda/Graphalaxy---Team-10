/**
 * A key press: the parts of a browser KeyboardEvent that typing text needs.
 */
export interface KeyPress {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Applies one key press to a line of text the player is typing. A character
 * key adds that character, unless the text is full or would start with a
 * space. Backspace removes the last character. Every other key, and every
 * shortcut such as Ctrl+R, leaves the text as it is.
 * @param text The text typed so far.
 * @param press The key that was pressed.
 * @param maxLength The most characters the text may hold.
 * @returns The text after the key press.
 */
export function editText(
  text: string,
  press: KeyPress,
  maxLength: number,
): string {
  // Ctrl+Alt together is AltGr, which types characters on some keyboards.
  if (press.metaKey || (press.ctrlKey && !press.altKey)) {
    return text;
  }
  if (press.key === 'Backspace') {
    return Array.from(text).slice(0, -1).join('');
  }
  // Named keys such as 'Shift' or 'ArrowLeft' are longer than one character.
  const isCharacter = press.key.length === 1;
  const fits = text.length < maxLength;
  const leadingSpace = press.key === ' ' && text === '';
  return isCharacter && fits && !leadingSpace ? text + press.key : text;
}
