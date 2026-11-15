import {describe, expect, it} from 'vitest';
import {editText} from '../src/UI/textInput';

const MAX = 5;
const type = (text: string, key: string) => editText(text, {key}, MAX);

describe('editText', () => {
  it('adds a typed character to the end', () => {
    expect(type('', 'a')).toBe('a');
    expect(type('am', 'y')).toBe('amy');
    expect(type('amy', '7')).toBe('amy7');
    expect(type('amy', '_')).toBe('amy_');
  });

  it('keeps upper and lower case as typed', () => {
    expect(type('a', 'B')).toBe('aB');
  });

  it('allows a space inside the text but not at the start', () => {
    expect(type('amy', ' ')).toBe('amy ');
    expect(type('', ' ')).toBe('');
  });

  it('removes the last character on Backspace', () => {
    expect(type('amy', 'Backspace')).toBe('am');
    expect(type('a', 'Backspace')).toBe('');
    expect(type('', 'Backspace')).toBe('');
  });

  it('stops adding characters once the text is full', () => {
    expect(type('abcd', 'e')).toBe('abcde');
    expect(type('abcde', 'f')).toBe('abcde');
    expect(type('abcde', 'Backspace')).toBe('abcd');
  });

  it.each(['Shift', 'Enter', 'Tab', 'ArrowLeft', 'Escape', 'F5', 'Delete'])(
    'ignores the %s key',
    key => {
      expect(type('amy', key)).toBe('amy');
    },
  );

  it.each([
    {name: 'Ctrl+R', press: {key: 'r', ctrlKey: true}},
    {name: 'Cmd+V', press: {key: 'v', metaKey: true}},
    {name: 'Ctrl+Backspace', press: {key: 'Backspace', ctrlKey: true}},
  ])('ignores the shortcut $name', ({press}) => {
    expect(editText('amy', press, MAX)).toBe('amy');
  });

  it('accepts characters typed with AltGr or Option', () => {
    expect(editText('a', {key: '@', ctrlKey: true, altKey: true}, MAX)).toBe(
      'a@',
    );
    expect(editText('a', {key: 'ø', altKey: true}, MAX)).toBe('aø');
  });
});
