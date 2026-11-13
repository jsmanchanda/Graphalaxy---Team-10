import {afterEach, describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import {GraphComponent} from '../src/Graphing/GraphComponent';
import {ReadingScreenView} from '../src/UI/screens/ReadingScreenView';
import {QuestionScreenView} from '../src/UI/screens/QuestionScreenView';
import {QuestionScreenModel, ReadingScreenModel} from '../src/UI/types';
import {
  MULTIPLE_CHOICE_PROMPT_WIDTH,
  MULTIPLE_CHOICE_PROMPT_X,
  MULTIPLE_CHOICE_PROMPT_Y,
  QUESTION_GRAPH_HEIGHT,
  QUESTION_GRAPH_WIDTH,
  QUESTION_GRAPH_X,
  QUESTION_GRAPH_Y,
  READING_TEXT_WIDTH,
  READING_TEXT_X,
  READING_TEXT_Y,
  VISUAL_QUESTION_PROMPT_WIDTH,
  VISUAL_QUESTION_PROMPT_X,
  VISUAL_QUESTION_PROMPT_Y,
  VISUAL_READING_GRAPH_HEIGHT,
  VISUAL_READING_GRAPH_WIDTH,
  VISUAL_READING_GRAPH_X,
  VISUAL_READING_GRAPH_Y,
  VISUAL_READING_TEXT_WIDTH,
  VISUAL_READING_TEXT_X,
  VISUAL_READING_TEXT_Y,
} from '../src/UI/constants';

// Build the real components and GraphComponent in Node; see helpers/konvaStubs.ts
installKonvaStubs();

const addFunction = vi.spyOn(GraphComponent.prototype, 'addFunction');
afterEach(() => addFunction.mockClear());

const SELECTED_FILL = '#3b82f6';

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

/** The clipped group GraphComponent draws into, if the screen has one. */
function findGraph(screen: Konva.Group): Konva.Group | undefined {
  return screen
    .getChildren()
    .find(
      (child): child is Konva.Group =>
        child instanceof Konva.Group && child.clipWidth() > 0,
    );
}

/** Position and width of a component, read from its background box. */
function placement(component: Konva.Group) {
  return {
    x: component.x(),
    y: component.y(),
    width: (component.getChildren()[0] as Konva.Rect).width(),
  };
}

function background(button: Konva.Group): Konva.Rect {
  return button.getChildren()[0] as Konva.Rect;
}

describe('ReadingScreenView with a graph', () => {
  const model: ReadingScreenModel = {
    type: 'reading',
    readingText: 'Slope is rise over run',
    equation: '2*x+3',
  };

  it('draws the equation on a graph', () => {
    const screen = new ReadingScreenView(vi.fn(), model).getGroup();
    const graph = findGraph(screen);

    expect(addFunction).toHaveBeenCalledOnce();
    expect(addFunction).toHaveBeenCalledWith('2*x+3');
    expect(graph?.find('.displayFunction')).toHaveLength(1);
  });

  it('places the graph in the graph layout', () => {
    const screen = new ReadingScreenView(vi.fn(), model).getGroup();
    const graph = findGraph(screen);

    expect(graph?.position()).toEqual({
      x: VISUAL_READING_GRAPH_X,
      y: VISUAL_READING_GRAPH_Y,
    });
    expect(graph?.clipWidth()).toBe(VISUAL_READING_GRAPH_WIDTH);
    expect(graph?.clipHeight()).toBe(VISUAL_READING_GRAPH_HEIGHT);
  });

  it('moves the reading text beside the graph', () => {
    const screen = new ReadingScreenView(vi.fn(), model).getGroup();

    expect(placement(findComponent(screen, model.readingText))).toEqual({
      x: VISUAL_READING_TEXT_X,
      y: VISUAL_READING_TEXT_Y,
      width: VISUAL_READING_TEXT_WIDTH,
    });
  });

  it('still sends next and back', () => {
    const onAction = vi.fn();
    const screen = new ReadingScreenView(onAction, model).getGroup();

    findComponent(screen, 'Next').fire('click');
    findComponent(screen, 'back').fire('click');

    expect(onAction.mock.calls).toEqual([[{type: 'next'}], [{type: 'back'}]]);
  });
});

describe('ReadingScreenView without a graph', () => {
  const model: ReadingScreenModel = {type: 'reading', readingText: 'Hello'};

  it('does not draw a graph', () => {
    const screen = new ReadingScreenView(vi.fn(), model).getGroup();

    expect(findGraph(screen)).toBeUndefined();
    expect(addFunction).not.toHaveBeenCalled();
  });

  it('uses the full-width reading text layout', () => {
    const screen = new ReadingScreenView(vi.fn(), model).getGroup();

    expect(placement(findComponent(screen, 'Hello'))).toEqual({
      x: READING_TEXT_X,
      y: READING_TEXT_Y,
      width: READING_TEXT_WIDTH,
    });
  });
});

describe('QuestionScreenView with a graph', () => {
  const model: QuestionScreenModel = {
    type: 'question',
    question: {
      prompt: 'What is the slope?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
    },
    equation: 'x*x',
  };

  it('draws the equation on a graph', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();
    const graph = findGraph(screen);

    expect(addFunction).toHaveBeenCalledOnce();
    expect(addFunction).toHaveBeenCalledWith('x*x');
    expect(graph?.find('.displayFunction')).toHaveLength(1);
  });

  it('places the graph in the graph layout', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();
    const graph = findGraph(screen);

    expect(graph?.position()).toEqual({
      x: QUESTION_GRAPH_X,
      y: QUESTION_GRAPH_Y,
    });
    expect(graph?.clipWidth()).toBe(QUESTION_GRAPH_WIDTH);
    expect(graph?.clipHeight()).toBe(QUESTION_GRAPH_HEIGHT);
  });

  it('moves the prompt beside the graph', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();

    expect(placement(findComponent(screen, model.question.prompt))).toEqual({
      x: VISUAL_QUESTION_PROMPT_X,
      y: VISUAL_QUESTION_PROMPT_Y,
      width: VISUAL_QUESTION_PROMPT_WIDTH,
    });
  });

  it('highlights only the selected option', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();
    const [a, b] = ['Option A', 'Option B'].map(text =>
      findComponent(screen, text),
    );

    a.fire('click');
    b.fire('click');

    expect(background(a).fill()).not.toBe(SELECTED_FILL);
    expect(background(b).fill()).toBe(SELECTED_FILL);
  });

  it('submits the selected option when confirm is clicked', () => {
    const onAction = vi.fn();
    const screen = new QuestionScreenView(onAction, model).getGroup();

    findComponent(screen, 'Option C').fire('click');
    findComponent(screen, 'Confirm').fire('click');

    expect(onAction).toHaveBeenCalledWith({type: 'answer', option: 2});
  });

  it('does not submit when no option is selected', () => {
    const onAction = vi.fn();
    const screen = new QuestionScreenView(onAction, model).getGroup();

    findComponent(screen, 'Confirm').fire('click');

    expect(onAction).not.toHaveBeenCalled();
  });

  it('still sends back', () => {
    const onAction = vi.fn();
    const screen = new QuestionScreenView(onAction, model).getGroup();

    findComponent(screen, 'Back To Lesson').fire('click');

    expect(onAction).toHaveBeenCalledWith({type: 'back'});
  });
});

describe('QuestionScreenView without a graph', () => {
  const model: QuestionScreenModel = {
    type: 'question',
    question: {prompt: 'Pick one', options: ['A', 'B', 'C', 'D']},
  };

  it('does not draw a graph', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();

    expect(findGraph(screen)).toBeUndefined();
    expect(addFunction).not.toHaveBeenCalled();
  });

  it('uses the full-width prompt layout', () => {
    const screen = new QuestionScreenView(vi.fn(), model).getGroup();

    expect(placement(findComponent(screen, 'Pick one'))).toEqual({
      x: MULTIPLE_CHOICE_PROMPT_X,
      y: MULTIPLE_CHOICE_PROMPT_Y,
      width: MULTIPLE_CHOICE_PROMPT_WIDTH,
    });
  });
});
