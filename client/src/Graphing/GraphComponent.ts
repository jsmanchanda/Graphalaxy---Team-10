import Konva from 'konva';
import {TEXT_BOX_BORDER_COLOR, TEXT_BOX_FILL_COLOR} from '../UI/constants';
import {Component} from '../UI/components';
import {Interval} from './functions';

const NUMBER_OF_X_LINES = 10;
const NUMBER_OF_Y_LINES = 10;

const DEFAULT_INTERVAL_X = new Interval(-10, 10);
const DEFAULT_INTERVAL_Y = new Interval(-10, 10);

/**
 * Renders graph in the screen
 */
export class GraphComponent extends Component {
  protected pixelWidth: number;
  protected pixelHeight: number;
  protected unitWidth: number;
  protected unitHeight: number;
  protected xInterval: Interval;
  protected yInterval: Interval;

  /**
   * Builds the button.
   */
  constructor(
    x: number,
    y: number,
    width: number,
    height: number,
    xInterval: Interval = DEFAULT_INTERVAL_X,
    yInterval: Interval = DEFAULT_INTERVAL_Y,
    equation?: string,
  ) {
    super(x, y);

    // clip graph component so graphs dont show outside the component
    this.group.setAttrs({
      clipX: 0,
      clipY: 0,
      clipWidth: width,
      clipHeight: height,
    });

    this.unitWidth = xInterval.getLength();
    this.unitHeight = yInterval.getLength();
    this.pixelWidth = width;
    this.pixelHeight = height;
    this.xInterval = xInterval = DEFAULT_INTERVAL_X;
    this.yInterval = yInterval = DEFAULT_INTERVAL_Y;

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
      let i = xInterval.start;
      i <= xInterval.finish;
      i += this.unitWidth / NUMBER_OF_X_LINES
    )
    // i += (this.unitWidth / width) * pixelGapBetweenLines
    {
      const linePositionX = Math.abs(i - xInterval.start) * pixelsPerUnitWidth;
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
        x: Math.abs(i - xInterval.start) * pixelsPerUnitWidth + 3,
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
      let i = yInterval.start;
      i <= yInterval.finish;
      i += this.unitHeight / NUMBER_OF_Y_LINES
    )
    // i += (this.unitHeight / this.pixelHeight) * pixelGapBetweenLines
    {
      const linePositionY =
        this.pixelHeight - Math.abs(i - yInterval.start) * pixelsPerUnitHeight;
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
    if (equation) {
      this.addFunction(equation);
    }
  }

  /**
   * Adds Function to the graph given in string form
   * @param equation the equation form of the string
   * @param id the html element attribute
   */
  addFunction(equation: string, id?: string) {
    this.renderFunction(this.stringToMathFunction(equation), id);
  }

  /**
   * Converts a string to the function it corresponds to
   * TODO: make parse sin and cos to Math.sin and Math.cos
   */
  stringToMathFunction(equation: string): (x: number) => number {
    const functionBody = `return ${equation};`;
    const dynamicMathFunc = new Function('x', functionBody) as (
      x: number,
    ) => number;
    return dynamicMathFunc;
  }

  /**
   * draws lines
   */
  renderFunction(onCompute: (x: number) => number, id?: string): void {
    const pixelPoints: number[] = []; // [x1, y1 ,x2, y2,...]
    for (let i = this.xInterval.start; i < this.xInterval.finish; i += 0.001) {
      let x = i;
      let y = onCompute(i);
      x = this.convertToPixelsX(x);
      y = this.convertToPixelsY(y);
      pixelPoints.push(x);
      pixelPoints.push(y);
    }

    const functionCurve = new Konva.Line({
      id: id,
      name: 'displayFunction', // class name
      points: pixelPoints,
      stroke: 'green',
      strokeWidth: 2.5,
      lineCap: 'round',
      lineJoin: 'round',
    });
    this.group.add(functionCurve);
  }

  /**
   * Clears the functions on the screen, if no id specified, clears all;
   * @param id tag id of the function to remove.
   */
  clearFunction(id?: string): void {
    if (id) {
      const targetNode = this.group.findOne('#' + id);
      if (targetNode) {
        targetNode.destroy();
      }
      // throw error if no id found
    } else {
      const allFunctions = this.group.find('.displayFunction');
      allFunctions.forEach(func => {
        func.destroy();
      });
    }

    this.group.getLayer()?.batchDraw();
  }

  /**
   * convert interval point to pixel value
   */
  convertToPixelsX(x: number) {
    const pixelsPerUnitWidth = this.pixelWidth / this.unitWidth;
    return (x - this.xInterval.start) * pixelsPerUnitWidth;
  }

  /**
   * convert interval point to pixel
   */
  convertToPixelsY(y: number) {
    const pixelsPerUnitHeight = this.pixelHeight / this.unitHeight;
    return this.pixelHeight - (y - this.yInterval.start) * pixelsPerUnitHeight;
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
}
