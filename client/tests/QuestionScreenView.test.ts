import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {QuestionScreenModel} from '../src/UI/types';

// Create mock components for testing
vi.mock('../src/UI/components', () => {
  // GraphComponent extends Component, so the mock must provide it too
  class Component {
    protected group: Konva.Group;

    constructor(x: number, y: number) {
      this.group = new Konva.Group({x, y});
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  class ButtonComponent extends Component {
    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      onClick?: () => void,
    ) {
      super(x, y);
      this.group.add(new Konva.Rect({width, height}));
      void text;
      if (onClick) {
        this.group.on('click tap', onClick);
      }
    }
  }

  class ImageComponent {
    private group = new Konva.Group();

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      url: string,
    ) {
      void x;
      void y;
      void width;
      void height;
      void url;
    }

    getGroup(): Konva.Group {
      return this.group;
    }
  }

  class TextBoxComponent extends ButtonComponent {}

  class AlienDialogue extends ImageComponent {
    setWidth(width: number): void {
      void width;
    }
  }

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Component,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ButtonComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ImageComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextBoxComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    AlienDialogue,
  };
});

import {
  QuestionScreenView,
  hintButtonLabel,
  hintPanelText,
} from '../src/UI/screens/QuestionScreenView';
import {
  MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
  TEXT_BOX_FILL_COLOR,
} from '../src/UI/constants';

// Children are added in this order: background, alien, border, settings icon,
// back button, alien dialogue, hint button, prompt, confirm button, then the
// options
const CONFIRM_INDEX = 8;
const FIRST_OPTION_INDEX = 9;

const questionModel: QuestionScreenModel = {
  type: 'question',
  question: {
    prompt: 'What is the answer?',
    options: ['Answer 1', 'Answer 2', 'Answer 3', 'Answer 4'],
  },
};

function getOptionButtons(view: QuestionScreenView): Konva.Group[] {
  return view
    .getGroup()
    .getChildren()
    .filter((child): child is Konva.Group => child instanceof Konva.Group)
    .slice(FIRST_OPTION_INDEX);
}

function getButtonBackground(button: Konva.Group): Konva.Rect {
  return button.getChildren()[0] as Konva.Rect;
}

describe('QuestionScreenView option selection', () => {
  it('highlights the selected option', () => {
    const view = new QuestionScreenView(vi.fn(), questionModel);
    const [option1] = getOptionButtons(view);

    option1.fire('click');

    expect(getButtonBackground(option1).fill()).toBe(
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
    );
  });

  it('moves the highlight when a different option is selected', () => {
    const view = new QuestionScreenView(vi.fn(), questionModel);
    const [option1, option2] = getOptionButtons(view);

    option1.fire('click');
    option2.fire('click');

    expect(getButtonBackground(option1).fill()).not.toBe(
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
    );
    expect(getButtonBackground(option2).fill()).toBe(
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
    );
  });

  it('submits the selected option when confirm is clicked', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, questionModel);
    const children = view.getGroup().getChildren();
    const confirmButton = children[CONFIRM_INDEX] as Konva.Group;
    const option3 = getOptionButtons(view)[2];

    option3.fire('click');
    confirmButton.fire('click');

    expect(onAction).toHaveBeenCalledWith({type: 'answer', option: 2});
  });

  it('does not submit when no option is selected', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, questionModel);
    const confirmButton = view.getGroup().getChildren()[
      CONFIRM_INDEX
    ] as Konva.Group;

    confirmButton.fire('click');

    expect(onAction).not.toHaveBeenCalled();
  });
});

describe('QuestionScreenView with fewer than four options', () => {
  // background, alien, border, settings, back, dialogue, hint, prompt, confirm
  const OTHER_COMPONENTS = 9;

  it.each([2, 3, 4])('builds one button per option for %i options', count => {
    const options = ['A', 'B', 'C', 'D'].slice(0, count);
    const view = new QuestionScreenView(vi.fn(), {
      type: 'question',
      question: {prompt: 'Pick one', options},
    });

    expect(view.getGroup().getChildren()).toHaveLength(
      OTHER_COMPONENTS + count,
    );
  });

  it('submits the last of two options', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, {
      type: 'question',
      question: {prompt: 'True or false?', options: ['True', 'False']},
    });
    const children = view.getGroup().getChildren() as Konva.Group[];
    const confirmButton = children[CONFIRM_INDEX];
    const lastOption = children[children.length - 1]; // options are last

    lastOption.fire('click');
    confirmButton.fire('click');

    expect(getButtonBackground(lastOption).fill()).toBe(
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
    );
    expect(onAction).toHaveBeenCalledWith({type: 'answer', option: 1});
  });
});

describe('QuestionScreenView hints', () => {
  const HINT_BUTTON = 6; // see the child order at the top of this file

  it('labels the hint button with the credits left', () => {
    expect(hintButtonLabel(3)).toBe('Hint (3 left)');
    expect(hintButtonLabel(0)).toBe('Hint (0 left)');
    expect(hintButtonLabel()).toBe('Hint');
  });

  it('asks for a hint with the selected option, or null without one', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, {
      ...questionModel,
      hintsLeft: 3,
    });
    const hintButton = view.getGroup().getChildren()[HINT_BUTTON];

    hintButton.fire('click');
    getOptionButtons(view)[1].fire('click');
    hintButton.fire('click');

    expect(onAction.mock.calls).toEqual([
      [{type: 'requestHint', selectedOption: null}],
      [{type: 'requestHint', selectedOption: 1}],
    ]);
  });

  it('highlights the option that was selected before it was redrawn', () => {
    const view = new QuestionScreenView(vi.fn(), {
      ...questionModel,
      selectedOption: 2,
    });

    const fills = getOptionButtons(view).map(b =>
      getButtonBackground(b).fill(),
    );
    expect(fills).toEqual([
      TEXT_BOX_FILL_COLOR,
      TEXT_BOX_FILL_COLOR,
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
      TEXT_BOX_FILL_COLOR,
    ]);
  });

  it('shows no hint panel until one is given', () => {
    const view = new QuestionScreenView(vi.fn(), questionModel);
    // the 9 fixed components and the 4 options
    expect(view.getGroup().getChildren()).toHaveLength(13);
  });

  it('draws the hint panel over the screen, and Close closes it', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, {
      ...questionModel,
      selectedOption: 0,
      hintPanel: {hints: ['Hint one.'], message: 'No more hints.'},
    });
    const children = view.getGroup().getChildren();
    const close = children[children.length - 1];

    // overlay, panel text and Close are drawn on top of everything else
    expect(children).toHaveLength(16);
    expect(children[13]).toBeInstanceOf(Konva.Rect);
    close.fire('click');

    expect(onAction).toHaveBeenCalledExactlyOnceWith({type: 'closeHints'});
  });

  it('numbers the unlocked hints and adds the message', () => {
    expect(
      hintPanelText({hints: ['Look at x.', 'Set x = 0.'], message: 'Done.'}),
    ).toBe('Hint 1: Look at x.\n\nHint 2: Set x = 0.\n\nDone.');
    expect(hintPanelText({hints: [], message: 'No hints.'})).toBe('No hints.');
  });
});
