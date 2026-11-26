/*
  @fileoverview How to play Graphalaxy. Shown on the instructions screen before
  the navigation map, and again by the alien on the map when it is clicked.
*/

/** The steps of the game, one per line. */
export const GAME_INSTRUCTIONS: readonly string[] = [
  '1. Bring peace to the galaxy by making every planet peaceful.',
  '2. Click a planet on the map to visit it. Hover over it to see your progress. Grey planets stay locked until the planets before them are peaceful.',
  '3. On the way, play the minigame to earn a hint, or skip it.',
  '4. Read the lesson, then answer its questions. Each question gets one try.',
  '5. Answer every question right to make the planet peaceful. Missed one? Redo the planet from its results screen.',
  '6. The gear in the top right opens Settings, where you can also log out.',
];

/** What the alien says above the instructions on the instructions screen. */
export const INSTRUCTIONS_GREETING =
  "Welcome, pilot! I'm your alien co-pilot. Here's how to play:";

/** The instructions as one block of text. */
export const INSTRUCTIONS_TEXT = GAME_INSTRUCTIONS.join('\n');

/** What the alien on the navigation map says when it is clicked. */
export const NAV_ALIEN_HELP_TEXT =
  "Need a refresher? Here's how to play:\n\n" +
  INSTRUCTIONS_TEXT +
  '\n\nClick me again to close this.';

/** Closing line on the instructions screen, pointing at the alien on the map. */
export const INSTRUCTIONS_REMINDER =
  'Forget something? Click me on the map any time to hear this again.';
