import {describe, expect, it} from 'vitest';
import Konva from 'konva';
import {installKonvaStubs} from './helpers/konvaStubs';
import {GraphComponent} from '../src/Graphing/GraphComponent';
import {Interval} from '../src/Graphing/functions';

// Build the real GraphComponent in Node; see helpers/konvaStubs.ts
installKonvaStubs();

const WIDTH = 200;
const HEIGHT = 100;

// Default intervals are x: [-10, 10] and y: [-10, 10], one tick per unit
function makeGraph(equation?: string): GraphComponent {
  return new GraphComponent(
    5,
    7,
    WIDTH,
    HEIGHT,
    undefined,
    undefined,
    equation,
  );
}

function curves(graph: GraphComponent): Konva.Line[] {
  return graph.getGroup().find('.displayFunction') as Konva.Line[];
}

function gridLines(graph: GraphComponent): Konva.Line[] {
  return graph
    .getGroup()
    .getChildren()
    .filter(
      (node): node is Konva.Line =>
        node instanceof Konva.Line && node.name() !== 'displayFunction',
    );
}

function labelTexts(graph: GraphComponent): string[] {
  return graph
    .getGroup()
    .find('.lineLabel')
    .map(label => label.getAttr('text') as string);
}

describe('GraphComponent setup', () => {
  it('places the group at its position and clips to its size', () => {
    const group = makeGraph().getGroup();

    expect(group.position()).toEqual({x: 5, y: 7});
    expect(group.clip()).toEqual({x: 0, y: 0, width: WIDTH, height: HEIGHT});
  });

  it('draws a vertical grid line at every x tick', () => {
    const xs = gridLines(makeGraph())
      .filter(line => line.points()[0] === line.points()[2])
      .map(line => line.points()[0]);

    // 21 ticks from -10 to 10, 10px apart on a 200px wide graph
    const expected = [...Array(21).keys()].map(k => k * 10);
    expect([...new Set(xs)].sort((a, b) => a - b)).toEqual(expected);
  });

  it('draws a horizontal grid line at every y tick', () => {
    const ys = gridLines(makeGraph())
      .filter(line => line.points()[1] === line.points()[3])
      .map(line => line.points()[1]);

    // 21 ticks from -10 to 10, 5px apart on a 100px tall graph
    const expected = [...Array(21).keys()].map(k => k * 5);
    expect([...new Set(ys)].sort((a, b) => a - b)).toEqual(expected);
  });

  it('labels every tick', () => {
    const labels = new Set(labelTexts(makeGraph()));

    for (let value = -10; value <= 10; value++) {
      expect(labels).toContain(String(value));
    }
  });

  it('labels a π interval in multiples of π', () => {
    const graph = new GraphComponent(
      0,
      0,
      WIDTH,
      HEIGHT,
      new Interval(-2 * Math.PI, 2 * Math.PI, Math.PI / 2, true),
    );
    const labels = new Set(labelTexts(graph));

    for (const label of ['-2π', '-1.5π', '-1π', '-0.5π', '0.5π', '1π', '2π']) {
      expect(labels).toContain(label);
    }
  });

  it('draws no curve without an equation', () => {
    expect(curves(makeGraph())).toHaveLength(0);
  });

  it('draws the equation passed to the constructor', () => {
    expect(curves(makeGraph('x*x'))).toHaveLength(1);
  });
});

describe('GraphComponent coordinate conversion', () => {
  it('maps the x interval onto the graph width', () => {
    const graph = makeGraph();

    expect(graph.convertToPixelsX(-10)).toBe(0);
    expect(graph.convertToPixelsX(0)).toBe(WIDTH / 2);
    expect(graph.convertToPixelsX(10)).toBe(WIDTH);
  });

  it('maps the y interval onto the graph height, flipped', () => {
    const graph = makeGraph();

    expect(graph.convertToPixelsY(-10)).toBe(HEIGHT);
    expect(graph.convertToPixelsY(0)).toBe(HEIGHT / 2);
    expect(graph.convertToPixelsY(10)).toBe(0);
  });

  it('handles an interval that does not start at a negative value', () => {
    const graph = new GraphComponent(
      0,
      0,
      WIDTH,
      HEIGHT,
      new Interval(0, 4, 1),
      new Interval(0, 2, 1),
    );

    expect(graph.convertToPixelsX(1)).toBe(50);
    expect(graph.convertToPixelsY(1)).toBe(50);
  });
});

describe('GraphComponent labels', () => {
  it('rounds plain labels to the hundredth', () => {
    const graph = makeGraph();

    expect(graph.valueToLabel(2, false)).toBe('2');
    expect(graph.valueToLabel(1.234, false)).toBe('1.23');
    expect(graph.valueToLabel(-0.336, false)).toBe('-0.34');
  });

  it('writes π labels as multiples of π', () => {
    const graph = makeGraph();

    expect(graph.valueToLabel(Math.PI, true)).toBe('1π');
    expect(graph.valueToLabel(Math.PI / 2, true)).toBe('0.5π');
    expect(graph.valueToLabel(-2 * Math.PI, true)).toBe('-2π');
  });
});

describe('GraphComponent equations', () => {
  it('turns an equation string into a function of x', () => {
    const f = makeGraph().stringToMathFunction('2*x+3');

    expect(f(0)).toBe(3);
    expect(f(1)).toBe(5);
    expect(f(-2)).toBe(-1);
  });

  it('can use Math functions', () => {
    const f = makeGraph().stringToMathFunction('Math.sin(x)');

    expect(f(Math.PI / 2)).toBeCloseTo(1);
  });

  it('throws on an equation that is not valid code', () => {
    expect(() => makeGraph().stringToMathFunction('2**')).toThrow(SyntaxError);
  });

  it('draws the curve across the x interval in pixel space', () => {
    const graph = makeGraph();
    graph.addFunction('x', 'line');
    const points = curves(graph)[0].points();

    // y = x starts at (-10, -10): the bottom-left corner
    expect(points[0]).toBeCloseTo(0);
    expect(points[1]).toBeCloseTo(HEIGHT);
    // and ends just short of (10, 10): the top-right corner
    expect(points.at(-2)).toBeCloseTo(WIDTH, 0);
    expect(points.at(-1)).toBeCloseTo(0, 0);
  });
});

describe('GraphComponent adding and clearing functions', () => {
  it('gives an added function the id it was given', () => {
    const graph = makeGraph();
    graph.addFunction('x', 'f1');

    expect(graph.getGroup().findOne('#f1')).toBeDefined();
  });

  it('can draw several functions at once', () => {
    const graph = makeGraph();
    graph.addFunction('x', 'f1');
    graph.addFunction('x*x', 'f2');

    expect(curves(graph)).toHaveLength(2);
  });

  it('keeps the labels drawn on top of the curves', () => {
    const graph = makeGraph();
    graph.addFunction('x');
    const children = graph.getGroup().getChildren();
    const curveIndex = children.indexOf(curves(graph)[0]);

    for (const label of graph.getGroup().find('.lineLabel')) {
      expect(label.zIndex()).toBeGreaterThan(curveIndex);
    }
  });

  it('clears only the function with the given id', () => {
    const graph = makeGraph();
    graph.addFunction('x', 'f1');
    graph.addFunction('x*x', 'f2');

    graph.clearFunction('f1');

    expect(curves(graph).map(curve => curve.id())).toEqual(['f2']);
  });

  it('clears every function when no id is given', () => {
    const graph = makeGraph();
    const gridLineCount = gridLines(graph).length;
    graph.addFunction('x', 'f1');
    graph.addFunction('x*x', 'f2');

    graph.clearFunction();

    expect(curves(graph)).toHaveLength(0);
    expect(gridLines(graph)).toHaveLength(gridLineCount);
  });

  it('does nothing when clearing an id that does not exist', () => {
    const graph = makeGraph();
    graph.addFunction('x', 'f1');

    expect(() => graph.clearFunction('missing')).not.toThrow();
    expect(curves(graph)).toHaveLength(1);
  });
});
