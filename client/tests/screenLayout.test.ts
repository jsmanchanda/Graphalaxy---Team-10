import {describe, expect, it} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../src/UI/constants';
import {View} from '../src/UI/types';
import {TitleScreenView} from '../src/UI/screens/TitleScreenView';
import {LessonIntroScreenView} from '../src/UI/screens/LessonIntroScreenView';
import {ReadingScreenView} from '../src/UI/screens/ReadingScreenView';
import {QuestionScreenView} from '../src/UI/screens/QuestionScreenView';
import {QuestionResultScreenView} from '../src/UI/screens/QuestionResultView';
import {LessonResultScreenView} from '../src/UI/screens/LessonResultScreenView';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The area a top-level child actually shows on screen. A clipped group
 * (like the graph) only shows its clip box, even if its curve runs far past it.
 */
function visibleBox(node: Konva.Node, screen: Konva.Group): Box {
  if (node instanceof Konva.Group && node.clipWidth()) {
    return {
      x: node.x() + node.clipX(),
      y: node.y() + node.clipY(),
      width: node.clipWidth(),
      height: node.clipHeight(),
    };
  }
  return node.getClientRect({relativeTo: screen, skipStroke: true});
}

// checks if components overlap. Not sure if we will have intentional overlaps later
// uncomment if we don't want any overlapping UI components
// function overlaps(a: Box, b: Box): boolean {
//   return (
//     a.x < b.x + b.width &&
//     b.x < a.x + a.width &&
//     a.y < b.y + b.height &&
//     b.y < a.y + a.height
//   );
// }

const onAction = () => {};
const question = {prompt: 'p', options: ['a', 'b', 'c', 'd']};

const screens: Array<[string, () => View]> = [
  ['title', () => new TitleScreenView(onAction, {type: 'title', title: 't'})],
  [
    'lesson intro',
    () =>
      new LessonIntroScreenView(onAction, {
        type: 'intro',
        title: 't',
        description: 'd',
      }),
  ],
  [
    'reading',
    () => new ReadingScreenView(onAction, {type: 'reading', readingText: 'r'}),
  ],
  [
    'reading with graph',
    () =>
      new ReadingScreenView(onAction, {
        type: 'reading',
        readingText: 'r',
        equation: 'x*x',
      }),
  ],
  [
    'question',
    () => new QuestionScreenView(onAction, {type: 'question', question}),
  ],
  [
    'question with graph',
    () =>
      new QuestionScreenView(onAction, {
        type: 'question',
        question,
        equation: 'x*x',
      }),
  ],
  [
    'question result',
    () =>
      new QuestionResultScreenView(onAction, {
        type: 'questionResult',
        result: 'r',
      }),
  ],
  [
    'lesson result',
    () =>
      new LessonResultScreenView(onAction, {type: 'lessonResult', result: 'r'}),
  ],
];

describe.each(screens)('%s screen layout', (name, build) => {
  const screen = build().getGroup();
  const boxes = screen.getChildren().map(child => visibleBox(child, screen));

  it('keeps every component inside the screen', () => {
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(DESIGN_WIDTH);
      expect(box.y + box.height).toBeLessThanOrEqual(DESIGN_HEIGHT);
    }
  });

  // See line 53
  // it('does not overlap components', () => {
  //   const collisions: string[] = [];
  //   boxes.forEach((a, i) =>
  //     boxes.slice(i + 1).forEach(b => {
  //       if (overlaps(a, b)) {
  //         collisions.push(`${JSON.stringify(a)} x ${JSON.stringify(b)}`);
  //       }
  //     }),
  //   );
  //   expect(collisions, name).toEqual([]);
  // });
});
