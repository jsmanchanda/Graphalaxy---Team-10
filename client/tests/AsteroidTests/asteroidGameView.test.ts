import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from '../helpers/konvaStubs';
import {AsteroidMiniGameController} from '../../src/Asteroids/AsteroidMiniGameController';
import {AsteroidMiniGameModel} from '../../src/Asteroids/AsteroidMiniGameModel';
import type {
  CoefficientInputsHandle,
  CoefficientInputsOptions,
} from '../../src/Asteroids/components/CoefficientInputs';
import {PANEL_FRAME_IMAGE} from '../../src/Asteroids/constants';
import {ASTEROID_RADIUS} from '../../src/Asteroids/math/asteroids';
import type {
  Asteroid,
  AsteroidQuestion,
  Screen,
} from '../../src/Asteroids/types';
import {AsteroidGameView} from '../../src/Asteroids/views/AsteroidGameView';
import {DESIGN_HEIGHT, DESIGN_WIDTH} from '../../src/UI/constants';

// Build the real components in Node; see helpers/konvaStubs.ts
installKonvaStubs();

/** An asteroid at (x, y) with the default radius. */
function asteroidAt(x: number, y: number): Asteroid {
  return {position: {x, y}, radius: ASTEROID_RADIUS, destroyed: false};
}

/**
 * Hand-made questions with known answers, the same as asteroidModel.test.ts.
 * Built fresh for every test, since firing marks asteroids destroyed.
 */
function knownQuestions(): AsteroidQuestion[] {
  return [
    // y = 2x + 1 passes through (1, 3).
    {
      difficulty: 1,
      formId: 'linearSlopeIntercept',
      asteroids: [asteroidAt(1, 3)],
    },
    // y = (x - 0)² + 1 passes through (0, 1) and (1, 2).
    {
      difficulty: 2,
      formId: 'quadraticVertex',
      asteroids: [asteroidAt(0, 1), asteroidAt(1, 2)],
    },
    // y = x³ passes through (0, 0) and (1, 1).
    {
      difficulty: 3,
      formId: 'cubicStandard',
      asteroids: [asteroidAt(0, 0), asteroidAt(1, 1)],
    },
  ];
}

// What the player types, one string per coefficient.
const HITS = [
  ['2', '1'],
  ['1', '0', '1'],
  ['1', '0', '0', '0'],
];
const MISS = ['0', '-5'];

/** Stands in for the HTML boxes, which Vitest can't build. */
interface FakeInputs extends CoefficientInputsHandle {
  options: CoefficientInputsOptions;
  disabled: boolean;
  focused: boolean;
  /** Types into every box, as the player would. */
  type(values: string[]): void;
  /** Presses Enter in a box. */
  pressEnter(): void;
}

function fakeInputs(options: CoefficientInputsOptions): FakeInputs {
  let typed = options.letters.map(() => '');
  const fake: FakeInputs = {
    options,
    disabled: false,
    focused: false,
    values: () => typed,
    focus: () => {
      fake.focused = true;
    },
    disable: () => {
      fake.disabled = true;
    },
    remove: () => {},
    type: values => {
      typed = values;
      options.onInput(values);
    },
    pressEnter: () => options.onEnter(),
  };
  return fake;
}

/**
 * A game view on the given question (0-based), with every earlier question
 * already hit.
 */
function setup(questionIndex = 0) {
  const shows: Screen[] = [];
  const controller = new AsteroidMiniGameController(
    screen => shows.push(screen),
    () => {},
    new AsteroidMiniGameModel(knownQuestions()),
  );
  controller.start();
  controller.launch();
  for (let i = 0; i < questionIndex; i++) {
    controller.fire(HITS[i]);
    controller.next();
  }

  let inputs: FakeInputs | undefined;
  const view = new AsteroidGameView(controller, options => {
    inputs = fakeInputs(options);
    return inputs;
  });
  if (!inputs) {
    throw new Error('The view did not create its inputs');
  }
  return {controller, screen: view.getGroup(), inputs, shows};
}

/** The top-level component on a screen whose text box shows the given text. */
function findComponent(screen: Konva.Group, text: string): Konva.Group {
  const component = screen
    .getChildren()
    .find(
      (child): child is Konva.Group =>
        child instanceof Konva.Group &&
        child.findOne((node: Konva.Node) => node.getAttr('text') === text) !==
          undefined,
    );
  if (!component) {
    throw new Error(`No component showing "${text}"`);
  }
  return component;
}

function hasText(screen: Konva.Group, text: string): boolean {
  return screen.findOne((node: Konva.Node) => node.getAttr('text') === text)
    ? true
    : false;
}

describe('AsteroidGameView', () => {
  it("shows the question's asteroids, header and template", () => {
    const {screen} = setup();

    expect(screen.find('.asteroid')).toHaveLength(1);
    expect(hasText(screen, 'Question 1/3 · Slope-intercept form')).toBe(true);
    expect(hasText(screen, 'y = mx + b')).toBe(true);
  });

  it('draws the cockpit frame full screen, behind everything else', () => {
    const {screen} = setup();
    const frame = screen.findOne<Konva.Group>('.cockpitFrame');
    const image = frame?.findOne<Konva.Image>('Image');

    expect(Konva.Image.fromURL).toHaveBeenCalledWith(
      PANEL_FRAME_IMAGE,
      expect.any(Function),
    );
    expect(screen.getChildren()[0]).toBe(frame);
    expect([frame?.x(), frame?.y()]).toEqual([0, 0]);
    expect([image?.width(), image?.height()]).toEqual([
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
    ]);
  });

  it("makes one focused box per coefficient of the question's form", () => {
    const {inputs} = setup(1);
    expect(inputs.options.letters).toEqual(['a', 'h', 'k']);
    expect(inputs.focused).toBe(true);
  });

  it('starts with Fire dimmed, and clicking it does nothing', () => {
    const {screen, controller} = setup();
    const fire = findComponent(screen, 'Fire');

    expect(fire.opacity()).toBe(0.5);
    fire.fire('click');
    expect(controller.model.hasFired).toBe(false);
  });

  it('enables Fire only while every box holds a number', () => {
    const {screen, inputs} = setup();
    const fire = findComponent(screen, 'Fire');

    inputs.type(['2', '']);
    expect(fire.opacity()).toBe(0.5);
    inputs.type(['2', '1/2']);
    expect(fire.opacity()).toBe(1);
    inputs.type(['2', 'abc']);
    expect(fire.opacity()).toBe(0.5);
  });

  it('draws the curve on the targeting screen while every box holds a number', () => {
    const {screen, inputs} = setup();
    const previewCurves = () => screen.find('.previewCurve');

    expect(previewCurves()).toHaveLength(0);
    inputs.type(['2', '1']);
    expect(previewCurves()).toHaveLength(1);
    inputs.type(['2', 'abc']);
    expect(previewCurves()).toHaveLength(0);
  });

  it('keeps the shot on the targeting screen after Fire', () => {
    const {screen, inputs} = setup();
    inputs.type(HITS[0]);
    findComponent(screen, 'Fire').fire('click');
    expect(screen.find('.previewCurve')).toHaveLength(1);
  });

  it('fires: draws the shot, locks the boxes and shows HIT! and Next', () => {
    const {screen, inputs, controller} = setup();
    inputs.type(HITS[0]);
    findComponent(screen, 'Fire').fire('click');

    expect(controller.model.hasFired).toBe(true);
    expect(screen.find('#shot')).toHaveLength(1);
    expect(inputs.disabled).toBe(true);
    expect(hasText(screen, 'HIT!')).toBe(true);
    expect(findComponent(screen, 'Fire').visible()).toBe(false);
    expect(findComponent(screen, 'Next').visible()).toBe(true);
  });

  it('starts with Next hidden', () => {
    const {screen} = setup();
    expect(findComponent(screen, 'Next').visible()).toBe(false);
  });

  it('says MISS when nothing is hit', () => {
    const {screen, inputs} = setup();
    inputs.type(MISS);
    findComponent(screen, 'Fire').fire('click');
    expect(hasText(screen, 'MISS')).toBe(true);
  });

  it('says how many were hit on a partial hit', () => {
    const {screen, inputs} = setup(1);
    // y = 1 passes through (0, 1) but not (1, 2).
    inputs.type(['0', '0', '1']);
    findComponent(screen, 'Fire').fire('click');
    expect(hasText(screen, '1 of 2 hit')).toBe(true);
  });

  it('labels the button Results on the last question', () => {
    const {screen} = setup(2);
    expect(hasText(screen, 'Results')).toBe(true);
    expect(hasText(screen, 'Next')).toBe(false);
  });

  it('fires on Enter only when Fire is enabled', () => {
    const {inputs, controller} = setup();

    inputs.pressEnter();
    expect(controller.model.hasFired).toBe(false);

    inputs.type(HITS[0]);
    inputs.pressEnter();
    expect(controller.model.hasFired).toBe(true);
  });

  it('goes to the next question when Next is clicked', () => {
    const {screen, inputs, shows} = setup();
    inputs.type(HITS[0]);
    findComponent(screen, 'Fire').fire('click');
    findComponent(screen, 'Next').fire('click');

    expect(shows.at(-1)).toEqual({type: 'AsteroidGame', level: 2});
  });

  it('removes the boxes when the screen is destroyed', () => {
    const {screen, inputs} = setup();
    const remove = vi.spyOn(inputs, 'remove');

    expect(remove).not.toHaveBeenCalled();
    screen.destroy();
    expect(remove).toHaveBeenCalledOnce();
  });
});
