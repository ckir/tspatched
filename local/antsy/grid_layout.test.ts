import * as assert from "node:assert";
import { Canvas, Region } from "../lib/antsy/canvas.js";
import { GridLayout } from "../lib/antsy/grid_layout.js";


function dimensions(r: Region): [ number, number, number, number ] {
  return [ r.x1, r.y1, r.cols, r.rows ];
}


describe("GridLayout", () => {
  it("basic layout", () => {
    const c = new Canvas(80, 24);
    // left panel of 8 chars, bottom panel of 2
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.fixed(8), GridLayout.stretch(1) ],
      [ GridLayout.stretch(1), GridLayout.fixed(2) ],
    );
    assert.deepEqual(grid.lefts, [ 0, 8, 80 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);
    const r1 = grid.layoutAt(0, 0);
    const r2 = grid.layoutAt(1, 0);
    const r3 = grid.layout(0, 1, 2, 2);
    assert.deepEqual(dimensions(r1), [ 0, 0, 8, 22 ]);
    assert.deepEqual(dimensions(r2), [ 8, 0, 72, 22 ]);
    assert.deepEqual(dimensions(r3), [ 0, 22, 80, 2 ]);

    // no room
    c.resize(6, 20);
    assert.deepEqual(grid.lefts, [ 0, 6, 6 ]);
    assert.deepEqual(grid.tops, [ 0, 18, 20 ]);
    assert.deepEqual(dimensions(r1), [ 0, 0, 6, 18 ]);
    assert.deepEqual(dimensions(r2), [ 6, 0, 0, 18 ]);
    assert.deepEqual(dimensions(r3), [ 0, 18, 6, 2 ]);
  });

  it("multiple stretch zones", () => {
    const c = new Canvas(80, 24);
    // left panel of 8 chars, bottom panel of 2
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.fixed(8), GridLayout.stretch(2), GridLayout.stretch(1) ],
      [ GridLayout.stretch(1), GridLayout.fixed(2) ],
    );
    assert.deepEqual(grid.lefts,  [ 0, 8, 56, 80 ]);
    assert.deepEqual(grid.tops,  [ 0, 22, 24 ]);
    const r1 = grid.layoutAt(0, 0);
    const r2 = grid.layoutAt(1, 0);
    const r3 = grid.layoutAt(2, 0);
    const r4 = grid.layout(0, 1, 3, 2);
    assert.deepEqual(dimensions(r1), [ 0, 0, 8, 22 ]);
    assert.deepEqual(dimensions(r2), [ 8, 0, 48, 22 ]);
    assert.deepEqual(dimensions(r3), [ 56, 0, 24, 22 ]);
    assert.deepEqual(dimensions(r4), [ 0, 22, 80, 2 ]);

    // no room
    c.resize(6, 20);
    assert.deepEqual(grid.lefts, [ 0, 6, 6, 6 ]);
    assert.deepEqual(grid.tops, [ 0, 18, 20 ]);
    assert.deepEqual(dimensions(r1), [ 0, 0, 6, 18 ]);
    assert.deepEqual(dimensions(r2), [ 6, 0, 0, 18 ]);
    assert.deepEqual(dimensions(r3), [ 6, 0, 0, 18 ]);
    assert.deepEqual(dimensions(r4), [ 0, 18, 6, 2 ]);

    // fractional column
    c.resize(79, 24);
    assert.deepEqual(grid.lefts, [ 0, 8, 56, 79 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);
    assert.deepEqual(dimensions(r1), [ 0, 0, 8, 22 ]);
    assert.deepEqual(dimensions(r2), [ 8, 0, 48, 22 ]);
    assert.deepEqual(dimensions(r3), [ 56, 0, 23, 22 ]);
    assert.deepEqual(dimensions(r4), [ 0, 22, 79, 2 ]);

    c.resize(78, 24);
    assert.deepEqual(grid.lefts,  [ 0, 8, 55, 78 ]);
    assert.deepEqual(grid.tops,  [ 0, 22, 24 ]);
    assert.deepEqual(dimensions(r1),  [ 0, 0, 8, 22 ]);
    assert.deepEqual(dimensions(r2),  [ 8, 0, 47, 22 ]);
    assert.deepEqual(dimensions(r3),  [ 55, 0, 23, 22 ]);
    assert.deepEqual(dimensions(r4),  [ 0, 22, 78, 2 ]);
  });

  it("stretch with minimum", () => {
    const c = new Canvas(60, 24);
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.stretchWithMinimum(1, 8), GridLayout.stretch(2) ],
      [ GridLayout.stretch(1), GridLayout.fixed(2) ],
    );

    assert.deepEqual(grid.lefts, [ 0, 20, 60 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);

    c.resize(18, 24);
    assert.deepEqual(grid.lefts, [ 0, 8, 18 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);
  });

  it("several fixed", () => {
    // 10-min sidebar on each side, 1/2 center column, 1/6 right column
    const c = new Canvas(120, 24);
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.stretchWithMinimum(1, 10), GridLayout.stretch(3), GridLayout.stretch(1), GridLayout.stretchWithMinimum(1, 10) ],
      [ GridLayout.stretch(1) ],
    );

    assert.deepEqual(grid.lefts, [ 0, 20, 80, 100, 120 ]);
    assert.deepEqual(grid.tops, [ 0, 24 ]);

    c.resize(60, 24);
    assert.deepEqual(grid.lefts, [ 0, 10, 40, 50, 60 ]);
    assert.deepEqual(grid.tops, [ 0, 24 ]);

    c.resize(40, 24);
    assert.deepEqual(grid.lefts, [ 0, 10, 25, 30, 40 ]);
    assert.deepEqual(grid.tops, [ 0, 24 ]);
  });

  it("adjust constraints", () => {
    const c = new Canvas(60, 24);
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.stretchWithMinimum(1, 8), GridLayout.stretch(2) ],
      [ GridLayout.stretch(1), GridLayout.fixed(2) ],
    );

    assert.deepEqual(grid.lefts, [ 0, 20, 60 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);
    const r1 = grid.layoutAt(0, 0);
    const r2 = grid.layoutAt(1, 0);
    assert.deepEqual(dimensions(r1), [ 0, 0, 20, 22 ]);
    assert.deepEqual(dimensions(r2), [ 20, 0, 40, 22 ]);

    grid.adjustCol(0, GridLayout.stretchWithMinimum(1, 30));
    assert.deepEqual(grid.lefts, [ 0, 30, 60 ]);
    assert.deepEqual(grid.tops, [ 0, 22, 24 ]);
    assert.deepEqual(dimensions(r1), [ 0, 0, 30, 22 ]);
    assert.deepEqual(dimensions(r2), [ 30, 0, 30, 22 ]);
  });

  describe("grid with all fixed widths", () => {
    const c = new Canvas(60, 24);

    it("goldilocks", () => {
      const grid = new GridLayout(
        c.all(),
        [ GridLayout.stretch(1) ],
        [ 6, 15, 3 ].map(n => GridLayout.fixed(n)),
      );

      assert.deepEqual(grid.tops, [ 0, 6, 21, 24 ]);
    });

    it("too small", () => {
      const grid = new GridLayout(
        c.all(),
        [ GridLayout.stretch(1) ],
        [ 10, 15, 3 ].map(n => GridLayout.fixed(n)),
      );

      // remainders should be zero-height
      assert.deepEqual(grid.tops, [ 0, 10, 24, 24 ]);
    });

    it("too big", () => {
      const grid = new GridLayout(
        c.all(),
        [ GridLayout.stretch(1) ],
        [ 5, 10, 3 ].map(n => GridLayout.fixed(n)),
      );

      // empty space at the end
      assert.deepEqual(grid.tops, [ 0, 5, 15, 18 ]);
    });
  });

  it("resizes a nested region correctly", () => {
    const c = new Canvas(10, 10);
    const grid1 = new GridLayout(
      c.all(),
      [ 5, 5 ].map(n => GridLayout.fixed(n)),
      [ 5, 5 ].map(n => GridLayout.fixed(n)),
    );
    const grid2 = new GridLayout(
      grid1.layoutAt(1, 1),
      [ GridLayout.fixed(2), GridLayout.stretch(1) ],
      [ GridLayout.fixed(2), GridLayout.stretch(1) ],
    );
    const r = grid2.layoutAt(1, 1);
    assert.deepEqual([ r.x1, r.y1, r.x2, r.y2 ],  [ 7, 7, 10, 10 ]);

    // inner region is moved
    grid2.adjustCol(0, GridLayout.fixed(3));
    assert.deepEqual([ r.x1, r.y1, r.x2, r.y2 ],  [ 8, 7, 10, 10 ]);

    // outer region is moved
    grid1.adjustRow(0, GridLayout.fixed(4));
    assert.deepEqual([ r.x1, r.y1, r.x2, r.y2 ],  [ 8, 6, 10, 9 ]);

    // outer region grows
    grid1.adjustRow(1, GridLayout.stretch(1));
    assert.deepEqual([ r.x1, r.y1, r.x2, r.y2 ],  [ 8, 6, 10, 10 ]);
  });

  it("stretch min-max", () => {
    const c = new Canvas(80, 24);
    const grid = new GridLayout(
      c.all(),
      [ GridLayout.stretchWithMinMax(1, 10, 20), GridLayout.stretch(2), GridLayout.stretch(1) ],
      [ GridLayout.stretch(1) ],
    );

    assert.deepEqual(grid.lefts, [ 0, 20, 60, 80 ]);
    assert.deepEqual(grid.tops, [ 0, 24 ]);

    c.resize(86, 24);
    assert.deepEqual(grid.lefts, [ 0, 20, 64, 86 ]);
    assert.deepEqual(grid.tops, [ 0, 24 ]);
  });
});
