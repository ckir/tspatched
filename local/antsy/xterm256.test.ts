import * as assert from "node:assert";
import * as xterm256 from "../lib/antsy/xterm256.js";

describe("xterm256", () => {
  describe("finds the nearest", () => {
    it("color cube", () => {
      assert.deepEqual(xterm256.nearest_color_cube(0, 0, 0), [ 0, 0 ]);
      assert.deepEqual(xterm256.nearest_color_cube(47, 47, 47), [ 0, 3 * 47 * 47 ]);
      assert.deepEqual(xterm256.nearest_color_cube(48, 48, 48), [ 1 * 36 + 1 * 6 + 1, 3 * 47 * 47 ]);
      assert.deepEqual(xterm256.nearest_color_cube(255, 140, 2), [ 5 * 36 + 2 * 6 + 0, 5 * 5 + 2 * 2 ]);
      assert.deepEqual(xterm256.nearest_color_cube(127, 0, 250), [ 2 * 36 + 0 * 6 + 5, 8 * 8 + 5 * 5 ]);
      assert.deepEqual(xterm256.nearest_color_cube(255, 255, 255), [ 5 * 36 + 5 * 6 + 5, 0 ]);
    });

    it("gray", () => {
      assert.deepEqual(xterm256.nearest_gray(0, 0, 0), [ 0, 3 * 8 * 8 ]);
      assert.deepEqual(xterm256.nearest_gray(18, 18, 18), [ 1, 0 ]);
      assert.deepEqual(xterm256.nearest_gray(17, 19, 20), [ 1, 1 + 1 + 4 ]);
      assert.deepEqual(xterm256.nearest_gray(255, 255, 255), [ 23, 3 * 17 * 17 ]);
      assert.deepEqual(xterm256.nearest_gray(127, 127, 127), [ 12, 3 ]);
      assert.deepEqual(xterm256.nearest_gray(0, 128, 64), [ 6, 68 * 68 + 60 * 60 + 4 * 4 ]);
    });

    it("ansi color", () => {
      assert.deepEqual(xterm256.nearest_ansi(0, 0, 0), [ 0, 0 ]);
      assert.deepEqual(xterm256.nearest_ansi(0xc0, 0xc0, 0xc0), [ 7, 0 ]);
      assert.deepEqual(xterm256.nearest_ansi(250, 250, 250), [ 15, 3 * 5 * 5 ]);
      assert.deepEqual(xterm256.nearest_ansi(64, 32, 200), [ 12, 64 * 64 + 32 * 32 + 55 * 55 ]);
    });

    it("color, in general", () => {
      assert.deepEqual(xterm256.nearest_color(0, 0, 0), 0);
      assert.deepEqual(xterm256.nearest_color(12, 12, 12), 232); // 080808
      assert.deepEqual(xterm256.nearest_color(127, 127, 0), 3);
      assert.deepEqual(xterm256.nearest_color(133, 133, 0), 100); // 878700
      assert.deepEqual(xterm256.nearest_color(250, 40, 100), 197); // ff005f
      assert.deepEqual(xterm256.nearest_color(217, 217, 217), 253); // dadada
      assert.deepEqual(xterm256.nearest_color(216, 216, 216), 188); // d7d7d7
    });

    it("color, from hex", () => {
      assert.deepEqual(xterm256.color_from_hex("000"), 16);
      assert.deepEqual(xterm256.color_from_hex("000000"), 16);
      assert.deepEqual(xterm256.color_from_hex("ccc"), 252); // d0d0d0
      assert.deepEqual(xterm256.color_from_hex("0c0c0c"), 232); // 080808
      assert.deepEqual(xterm256.color_from_hex("7f7f00"), 3);
      assert.deepEqual(xterm256.color_from_hex("858500"), 100); // 878700
      assert.deepEqual(xterm256.color_from_hex("fa2864"), 197); // ff005f
      assert.deepEqual(xterm256.color_from_hex("d9d9d9"), 253); // dadada
      assert.deepEqual(xterm256.color_from_hex("d8d8d8"), 188); // d7d7d7
    });

    it("color by name", () => {
      assert.deepEqual(xterm256.get_color("blue"), 12);
      assert.deepEqual(xterm256.get_color("gray"), 8);
      assert.deepEqual(xterm256.get_color("#000"), 16);
      assert.deepEqual(xterm256.get_color("wuh"), 7);
      assert.deepEqual(xterm256.get_color("black"), 16);
    });

    it("get_rgb", () => {
      assert.deepEqual(xterm256.xterm_to_rgb(0), 0x000000);
      assert.deepEqual(xterm256.xterm_to_rgb(3), 0x808000);
      assert.deepEqual(xterm256.xterm_to_rgb(12), 0x0000ff);
      assert.deepEqual(xterm256.xterm_to_rgb(15), 0xffffff);
      assert.deepEqual(xterm256.xterm_to_rgb(16), 0x000000);
      assert.deepEqual(xterm256.xterm_to_rgb(100), 0x878700);
      assert.deepEqual(xterm256.xterm_to_rgb(188), 0xd7d7d7);
      assert.deepEqual(xterm256.xterm_to_rgb(197), 0xff005f);
      assert.deepEqual(xterm256.xterm_to_rgb(231), 0xffffff);
      assert.deepEqual(xterm256.xterm_to_rgb(232), 0x080808);
      assert.deepEqual(xterm256.xterm_to_rgb(252), 0xd0d0d0);
      assert.deepEqual(xterm256.xterm_to_rgb(253), 0xdadada);
      assert.deepEqual(xterm256.xterm_to_rgb(255), 0xeeeeee);
    });
  });
});
