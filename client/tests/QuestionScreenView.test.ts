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

import {QuestionScreenView} from '../src/UI/screens/QuestionScreenView';
import {MULTIPLE_CHOICE_OPTION_SELECTED_COLOR} from '../src/UI/constants';

// Children are added in this order: back button, alien, prompt, confirm
// button, the options, then the alien dialogue
const CONFIRM_INDEX = 3;
const FIRST_OPTION_INDEX = 4;

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
    .slice(FIRST_OPTION_INDEX, -1);
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
  const OTHER_COMPONENTS = 5; // back button, alien, prompt, confirm, dialogue

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
    const lastOption = children[children.length - 2]; // dialogue is last

    lastOption.fire('click');
    confirmButton.fire('click');

    expect(getButtonBackground(lastOption).fill()).toBe(
      MULTIPLE_CHOICE_OPTION_SELECTED_COLOR,
    );
    expect(onAction).toHaveBeenCalledWith({type: 'answer', option: 1});
  });
});
