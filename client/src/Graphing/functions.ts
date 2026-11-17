/**
 * 1 Dimensional Interval
 */
export class Interval {
  start: number;
  finish: number;
  distanceBetweenTicks: number;
  isPi: boolean;

  /**
   * defines bounds of the interval
   */
  constructor(
    start: number,
    finish: number,
    distanceBetweenTicks: number,
    isPi: boolean = false,
  ) {
    this.start = start;
    this.finish = finish;
    this.distanceBetweenTicks = distanceBetweenTicks;
    this.isPi = isPi;
  }

  /**
   * returns length of the interval
   */
  getLength(): number {
    return Math.abs(this.start - this.finish);
  }

  /**
   * returns center value of the interval
   */
  getCenter(): number {
    return this.start + this.getLength() / 2;
  }
}
