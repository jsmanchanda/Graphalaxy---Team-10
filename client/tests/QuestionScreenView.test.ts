import {describe, expect, it, vi} from 'vitest';
import Konva from 'konva';
import {QuestionScreenModel} from '../src/UI/types';

// Create mock components for testing
vi.mock('../src/UI/components', () => {
  class ButtonComponent {
    protected group: Konva.Group;

    constructor(
      x: number,
      y: number,
      width: number,
      height: number,
      text: string,
      onClick?: () => void,
    ) {
      this.group = new Konva.Group({x, y});
      this.group.add(new Konva.Rect({width, height}));
      void text;
      if (onClick) {
        this.group.on('click tap', onClick);
      }
    }

    getGroup(): Konva.Group {
      return this.group;
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

  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ButtonComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ImageComponent,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    TextBoxComponent,
  };
});

import {QuestionScreenView} from '../src/UI/screens/QuestionScreenView';

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
    .slice(-4);
}

function getButtonBackground(button: Konva.Group): Konva.Rect {
  return button.getChildren()[0] as Konva.Rect;
}

describe('QuestionScreenView option selection', () => {
  it('highlights the selected option', () => {
    const view = new QuestionScreenView(vi.fn(), questionModel);
    const [option1] = getOptionButtons(view);

    option1.fire('click');

    expect(getButtonBackground(option1).fill()).toBe('#3b82f6');
  });

  it('moves the highlight when a different option is selected', () => {
    const view = new QuestionScreenView(vi.fn(), questionModel);
    const [option1, option2] = getOptionButtons(view);

    option1.fire('click');
    option2.fire('click');

    expect(getButtonBackground(option1).fill()).not.toBe('#3b82f6');
    expect(getButtonBackground(option2).fill()).toBe('#3b82f6');
  });

  it('submits the selected option when confirm is clicked', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, questionModel);
    const children = view.getGroup().getChildren();
    const confirmButton = children[3] as Konva.Group;
    const option3 = getOptionButtons(view)[2];

    option3.fire('click');
    confirmButton.fire('click');

    expect(onAction).toHaveBeenCalledWith({type: 'answer', option: 2});
  });

  it('does not submit when no option is selected', () => {
    const onAction = vi.fn();
    const view = new QuestionScreenView(onAction, questionModel);
    const confirmButton = view.getGroup().getChildren()[3] as Konva.Group;

    confirmButton.fire('click');

    expect(onAction).not.toHaveBeenCalled();
  });
});
