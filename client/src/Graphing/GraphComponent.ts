import Konva from 'konva';
import {TEXT_BOX_BORDER_COLOR, TEXT_BOX_FILL_COLOR} from '../UI/constants';
import {Component} from '../UI/components';
import {Interval} from './functions';

const DEFAULT_INTERVAL_X = new Interval(-10, 10, 1);
const DEFAULT_INTERVAL_Y = new Interval(-10, 10, 1);

// const MAX_DISTANCE_BETWEEN_LINES_PIXELS = 20;
const LABEL_FONTSIZE = 8;
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
    this.xInterval = xInterval;
    this.yInterval = yInterval;

    // Graph background
    const box = new Konva.Rect({
      width,
      height,
      cornerRadius: 0,
      fill: TEXT_BOX_FILL_COLOR,
      stroke: TEXT_BOX_BORDER_COLOR,
    });

    this.group.add(box);

    // Draw horizontal lines and labels
    for (
      let i = xInterval.getCenter(), j = xInterval.getCenter();
      i <= xInterval.finish || j >= xInterval.start;
      i += xInterval.distanceBetweenTicks, j -= xInterval.distanceBetweenTicks
    ) {
      const rightLinePositionX = this.convertToPixelsX(i);
      const leftLinePositionX = this.convertToPixelsX(j);
      const rightLineX = new Konva.Line({
        points: [rightLinePositionX, 0, rightLinePositionX, height],
        stroke: '#ffffff',
        strokeWidth: 1,
      });
      this.group.add(rightLineX);
      const leftLineX = new Konva.Line({
        points: [leftLinePositionX, 0, leftLinePositionX, height],
        stroke: '#ffffff',
        strokeWidth: 1,
      });
      this.group.add(leftLineX);

      const labelOffsetPerChar = 4;
      const leftLabel = this.valueToLabel(i, xInterval.isPi);
      const rightLineLabel = new Konva.Text({
        name: 'lineLabel',
        x: rightLinePositionX + labelOffsetPerChar,
        y: height / 2 + 1,
        text: leftLabel,
        fontSize: LABEL_FONTSIZE,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      const rightLabel = this.valueToLabel(j, xInterval.isPi);
      const leftLineLabel = new Konva.Text({
        name: 'lineLabel',
        x: leftLinePositionX + labelOffsetPerChar,
        y: height / 2 + 1,
        text: rightLabel,
        fontSize: LABEL_FONTSIZE,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      this.group.add(rightLineLabel);
      this.group.add(leftLineLabel);
    }

    // Draw the vertical lines and labels
    for (
      let i = yInterval.getCenter(), j = yInterval.getCenter();
      i <= yInterval.finish && j >= yInterval.start;
      i += yInterval.distanceBetweenTicks, j -= yInterval.distanceBetweenTicks
    ) {
      const rightLinePositionY = this.convertToPixelsY(i);
      const leftLinePositionY = this.convertToPixelsY(j);
      const rightLineY = new Konva.Line({
        points: [0, rightLinePositionY, width, rightLinePositionY],
        stroke: '#d9d9e3',
        strokeWidth: 1,
      });
      this.group.add(rightLineY);

      const leftLineY = new Konva.Line({
        points: [0, leftLinePositionY, width, leftLinePositionY],
        stroke: '#d9d9e3',
        strokeWidth: 1,
      });
      this.group.add(leftLineY);

      const rightLineLabel = new Konva.Text({
        name: 'lineLabel',
        x: width / 2 + 4,
        y: rightLinePositionY + 1,
        text: this.valueToLabel(i, yInterval.isPi),
        fontSize: LABEL_FONTSIZE,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      const leftLineLabel = new Konva.Text({
        name: 'lineLabel',
        x: width / 2 + 4,
        y: leftLinePositionY + 1,
        text: this.valueToLabel(j, yInterval.isPi),
        fontSize: LABEL_FONTSIZE,
        fontFamily: 'Calibri',
        fill: 'white',
        draggable: true,
      });
      this.group.add(rightLineLabel);
      this.group.add(leftLineLabel);
    }

    // if constructed with an equation, draw it
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

    // move labels to the top every function
    const allLabels = this.group.find('.lineLabel');
    allLabels.forEach(label => {
      label.moveToTop();
    });
    this.group.getLayer()?.batchDraw();
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
   * Calculates axis labels and turns into strings
   */
  valueToLabel(value: number, isPi: boolean): string {
    // π based labels
    if (isPi) {
      return String(value / Math.PI) + 'π';
    }

    // round to nearest hundredth place
    return String(Math.round(value * 100) / 100);
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
   * debug point in terms of the graph units
   */
  debugPoint(x: number, y: number, unit: boolean) {
    console.log(` Unit: (${x}, ${y})`);
    const pixelX = this.convertToPixelsX(x);
    const pixelY = this.convertToPixelsY(y);
    console.log(`Pixel: (${pixelX}, ${pixelY})`);

    const debugPoint = new Konva.Circle({
      x: unit ? x : pixelX, // X coordinate of the center
      y: unit ? y : pixelY, // Y coordinate of the center
      radius: 2.5, // Circle radius
      fill: 'red', // Fill color
      draggable: true,
    });
    this.group.add(debugPoint);
  }
}
