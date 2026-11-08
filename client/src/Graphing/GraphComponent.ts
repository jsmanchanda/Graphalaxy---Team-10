import Konva from 'konva';
import {TEXT_BOX_BORDER_COLOR, TEXT_BOX_FILL_COLOR} from '../UI/constants';
import {Component} from '../UI/components';
import {MathFunction} from './functions';

const NUMBER_OF_X_LINES = 10;
const NUMBER_OF_Y_LINES = 10;

/**
 * Renders graph in the screen
 */
export class GraphComponent extends Component {
  protected pixelWidth: number;
  protected pixelHeight: number;
  protected unitWidth: number;
  protected unitHeight: number;
  protected mathFunction: MathFunction;

  /**
   * Builds the button.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    mathFunction: MathFunction,
  ) {
    super(x, y);
    this.mathFunction = mathFunction;
    this.unitWidth = mathFunction.xInterval.getLength();
    this.unitHeight = mathFunction.yInterval.getLength();
    this.pixelWidth = width;
    this.pixelHeight = height;

    // Graph background
    const box = new Konva.Rect({
      width,
      height,
      cornerRadius: 0,
      fill: TEXT_BOX_FILL_COLOR,
      stroke: TEXT_BOX_BORDER_COLOR,
    });

    this.group.add(box);

    const pixelsPerUnitWidth = this.pixelWidth / this.unitWidth;
    const pixelsPerUnitHeight = this.pixelHeight / this.unitHeight;
    const pixelGapBetweenLines = 40;

    // Graph lines and labels
    for (
      let i = mathFunction.xInterval.start;
      i <= mathFunction.xInterval.finish;
      i += this.unitWidth / NUMBER_OF_X_LINES
    )
    // i += (this.unitWidth / width) * pixelGapBetweenLines
    {
      const linePositionX =
        Math.abs(i - mathFunction.xInterval.start) * pixelsPerUnitWidth;
      const xLine = new Konva.Line({
        points: [linePositionX, 0, linePositionX, height],
        stroke: '#ffffff',
        strokeWidth: 1,
      });
      this.group.add(xLine);

      if (linePositionX >= width || linePositionX <= 0) {
        continue;
      }
      const lineLabel = new Konva.Text({
        x: Math.abs(i - mathFunction.xInterval.start) * pixelsPerUnitWidth + 3,
        y: height / 2,
        text: String(Math.round(i * 100) / 100),
        fontSize: 8,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      this.group.add(lineLabel);
    }
    for (
      let i = mathFunction.yInterval.start;
      i <= mathFunction.yInterval.finish;
      i += this.unitHeight / NUMBER_OF_Y_LINES
    )
    // i += (this.unitHeight / this.pixelHeight) * pixelGapBetweenLines
    {
      const linePositionY =
        this.pixelHeight -
        Math.abs(i - mathFunction.yInterval.start) * pixelsPerUnitHeight;
      const yLine = new Konva.Line({
        points: [0, linePositionY, width, linePositionY],
        stroke: '#d9d9e3',
        strokeWidth: 1,
      });
      this.group.add(yLine);
      if (linePositionY >= height || linePositionY <= 0) {
        continue;
      }
      const roundedLabel = Math.round(i * 100) / 100;
      const labelOffset = 8;
      const lineLabel = new Konva.Text({
        x: width / 2 - labelOffset,
        y: linePositionY,
        text: String(roundedLabel),
        fontSize: pixelGapBetweenLines / 5,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      this.group.add(lineLabel);
    }

    this.drawFunction(mathFunction.toFunction());
  }

  /**
   * convert interval point to pixel value
   */
  convertToPixelsX(x: number) {
    const pixelsPerUnitWidth = this.pixelWidth / this.unitWidth;
    return (x - this.mathFunction.xInterval.start) * pixelsPerUnitWidth;
  }

  /**
   * convert interval point to pixel
   */
  convertToPixelsY(y: number) {
    const pixelsPerUnitHeight = this.pixelHeight / this.unitHeight;
    return (
      this.pixelHeight -
      (y - this.mathFunction.yInterval.start) * pixelsPerUnitHeight
    );
  }

  /**
   * debug
   */
  debugPoint(x: number, y: number) {
    console.log(`x: ${x}\ny: ${y}`);
    const debugPoint = new Konva.Circle({
      x: x, // X coordinate of the center
      y: y, // Y coordinate of the center
      radius: 5, // Circle radius
      fill: 'red', // Fill color
    });
    this.group.add(debugPoint);
  }

  /**
   * draws lines
   */
  drawFunction(onCompute: (x: number) => number): void {
    const pixelPoints: number[] = []; // [x1, y1 ,x2, y2,...]
    for (
      let i = this.mathFunction.xInterval.start;
      i < this.mathFunction.xInterval.finish;
      i += 0.001
    ) {
      let x = i;
      let y = onCompute(i);
      x = this.convertToPixelsX(x);
      y = this.convertToPixelsY(y);
      if (y >= 0 && y <= this.pixelHeight) {
        pixelPoints.push(x);
        pixelPoints.push(y);
      }
    }

    const functionCurve = new Konva.Line({
      points: pixelPoints,
      stroke: 'green',
      strokeWidth: 2.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
    this.group.add(functionCurve);
  }
}
