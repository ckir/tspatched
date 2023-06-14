import { computeDiff } from "./canvas_diff.js";
import { Terminal } from "./terminal.js";
import { TextBuffer } from "./text_buffer.js";
import * as xterm256 from "./xterm256.js";

const WHITE = 7; // xterm256.get_color("gray");
const BLACK = 16; // xterm256.get_color("black");
const DEFAULT_ATTR = (BLACK << 8) | WHITE;

const SPACE = 0x20;


let ID = 1;

export class Canvas {
  // next: what we're drawing
  nextBuffer: TextBuffer;
  // current: what's currently on the screen
  currentBuffer?: TextBuffer;
  // cache the main region
  _all?: Region;
  // do we want to be redrawn?
  dirty = true;
  // do we want to force the entire canvas to be redrawn?
  forceAll = false;
  // track a debounce listener for dirty events
  dirtyListener?: () => void;
  dirtyTimer?: NodeJS.Timeout;
  dirtyDebounceDelay = 0;

  // for debugging
  id: number;

  constructor(public cols: number, public rows: number) {
    this.nextBuffer = new TextBuffer(cols, rows);
    this.nextBuffer.clearBox(0, 0, cols, rows, DEFAULT_ATTR);
    this.id = ID++;
  }

  toString(): string {
    return `Canvas(${this.nextBuffer.cols} x ${this.nextBuffer.rows}, ` +
      `cursor (${this.nextBuffer.cursorX}, ${this.nextBuffer.cursorY}), dirty=${this.dirty}`;
  }

  get cursor(): [ number, number ] {
    return [ this.nextBuffer.cursorX, this.nextBuffer.cursorY ];
  }

  onDirty(debounceDelay: number, f: (() => void) | undefined) {
    this.dirtyListener = f;
    this.dirtyDebounceDelay = debounceDelay;
  }

  resize(cols: number, rows: number) {
    this.nextBuffer.resize(cols, rows, DEFAULT_ATTR);
    delete this.currentBuffer;
    this.cols = cols;
    this.rows = rows;
    if (this._all) this._all.resize(0, 0, this.cols, this.rows);
  }

  redraw() {
    this.forceAll = true;
    this.setDirty();
  }

  all(): Region {
    if (!this._all) this._all = new Region(this, 0, 0, this.cols, this.rows);
    return this._all;
  }

  clip(x1: number, y1: number, x2: number, y2: number): Region {
    return this.all().clip(x1, y1, x2, y2);
  }

  setDirty() {
    this.dirty = true;
    if (!this.dirtyListener) return;
    if (!this.dirtyTimer) this.dirtyTimer = setTimeout(() => {
      this.dirtyTimer = undefined;
      if (this.dirty && this.dirtyListener) {
        try {
          this.dirtyListener();
        } catch (error) {
          // pass
        }
      }
    }, this.dirtyDebounceDelay);
  }

  write(x: number, y: number, attr: number, s: string) {
    this.writeChars(x, y, attr, [...s]);
  }

  writeChars(x: number, y: number, attr: number, chars: string[]) {
    this.setDirty();
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i].codePointAt(0) ?? SPACE;
      this.nextBuffer.put(x++, y, attr, ch);
      if (x >= this.cols || y >= this.rows) return;
    }
  }

  // return [ fg, bg?, char? ]
  transform(f: (fg: number, bg: number, char: number, x: number, y: number) => number[]) {
    this.nextBuffer.transform(f);
  }

  paint(): string {
    // don't create currentBuffer unless they actually call paint
    if (this.currentBuffer === undefined) {
      this.currentBuffer = new TextBuffer(this.cols, this.rows);
    }

    let clear = "";
    if (this.forceAll) {
      this.forceAll = false;
      this.currentBuffer = new TextBuffer(this.cols, this.rows);
      this.nextBuffer.pendingClear = DEFAULT_ATTR;
      this.nextBuffer.setAllDirty();
    }

    this.dirty = false;
    return clear + computeDiff(this.currentBuffer, this.nextBuffer);
  }

  // generate linefeed-terminated lines of text, assuming we don't own the
  // screen, so we can't move the cursor and have to output every char.
  paintInline(): string {
    return [...Array(this.nextBuffer.rows).keys()].map(y => {
      let line = "";
      let fg = -1, bg = -1;

      for (let x = 0; x < this.nextBuffer.cols; x++) {
        const attr = this.nextBuffer.getAttr(x, y);
        if ((attr >> 8) != bg) line += Terminal.bg(attr >> 8);
        if ((attr & 0xff) != fg) line += Terminal.fg(attr & 0xff);
        line += String.fromCodePoint(this.nextBuffer.getChar(x, y));
        fg = attr & 0xff;
        bg = attr >> 8;
      }

      line += Terminal.noColor() + "\n";
      return line;
    }).join("");
  }
}


// Clipped region of a canvas
export class Region {
  public cursorX: number;
  public cursorY: number;
  public attr: number;
  public resizeListeners: Set<() => void> = new Set();

  // used when this region was created by clipping another region:
  // remember the parent region so resizes can be relative to it
  public parent?: Region;

  constructor(
    public canvas: Canvas,
    public x1: number,
    public y1: number,
    public x2: number,
    public y2: number
  ) {
    this.cursorX = 0;
    this.cursorY = 0;
    this.attr = (BLACK << 8) | WHITE;
  }

  toString(): string {
    return `Region((${this.x1}, ${this.y1}) -> (${this.x2}, ${this.y2}) ` +
      `of Canvas ${this.canvas.id}, ` +
      `cursor (${this.cursorX}, ${this.cursorY}), attr=$${this.attr.toString(16)}, ` +
      `listeners=${this.resizeListeners.size})`;
  }

  get cols(): number {
    return this.x2 - this.x1;
  }

  get rows(): number {
    return this.y2 - this.y1;
  }

  // how many cols/rows are we offset within our parent?
  get parentOffset(): [ number, number ] {
    return [ this.x1 - (this.parent?.x1 ?? 0), this.y1 - (this.parent?.y1 ?? 0) ];
  }

  offsetFrom(region: Region): [ number, number ] {
    return [ this.x1 - region.x1, this.y1 - region.y1 ];
  }

  onResize(f: () => void) {
    this.resizeListeners.add(f);
  }

  removeOnResize(f: () => void) {
    this.resizeListeners.delete(f);
  }

  all(): Region {
    return this;
  }

  clip(x1: number, y1: number, x2: number, y2: number): Region {
    x1 = Math.max(this.x1, Math.min(this.x1 + x1, this.x2));
    x2 = Math.max(this.x1, Math.min(this.x1 + x2, this.x2));
    y1 = Math.max(this.y1, Math.min(this.y1 + y1, this.y2));
    y2 = Math.max(this.y1, Math.min(this.y1 + y2, this.y2));
    const r = new Region(this.canvas, x1, y1, x2, y2);
    r.attr = this.attr;
    r.parent = this;
    return r.at(this.cursorX - x1, this.cursorY - y1);
  }

  // usually called by a layout engine
  resize(x1: number, y1: number, x2: number, y2: number) {
    this.x1 = x1 + (this.parent?.x1 ?? 0);
    this.y1 = y1 + (this.parent?.y1 ?? 0);
    this.x2 = x2 + (this.parent?.x1 ?? 0);
    this.y2 = y2 + (this.parent?.y1 ?? 0);
    // clip cursor:
    this.at(this.cursorX, this.cursorY);
    for (const f of [...this.resizeListeners]) f();
  }

  color(fg?: string | number, bg?: string | number): this {
    if (fg !== undefined) {
      const attr = (typeof fg === "string") ? xterm256.get_color(fg) : fg;
      this.attr = (this.attr & 0xff00) | attr;
    }
    if (bg !== undefined) {
      const attr = (typeof bg === "string") ? xterm256.get_color(bg) : bg;
      this.attr = (this.attr & 0xff) | (attr << 8);
    }
    return this;
  }

  backgroundColor(bg: string | number): this {
    return this.color(undefined, bg);
  }

  at(x: number, y: number): this {
    this.cursorX = Math.max(Math.min(x, this.cols - 1), 0);
    this.cursorY = Math.max(Math.min(y, this.rows - 1), 0);
    return this;
  }

  move(xDelta: number, yDelta: number): this {
    return this.at(this.cursorX + xDelta, this.cursorY + yDelta);
  }

  clear(): this {
    this.canvas.nextBuffer.clearBox(this.x1, this.y1, this.x2, this.y2, this.attr);
    this.canvas.setDirty();
    return this;
  }

  clearToEndOfLine(): this {
    this.canvas.nextBuffer.clearToEndOfLine(this.x1 + this.cursorX, this.y1 + this.cursorY, this.attr);
    this.canvas.setDirty();
    return this;
  }

  write(s: string): this {
    const lines = s.split("\n");
    this.writeLine(lines.shift() ?? "");
    while (lines.length > 0) {
      this.lf();
      this.writeLine(lines.shift() ?? "");
    }
    return this;
  }

  private writeLine(s: string): this {
    let chars = [...s];
    while (chars.length > 0) {
      // check for auto-scroll, only when we need to write another glyph
      if (this.cursorX >= this.cols) this.lf();

      const n = this.cols - this.cursorX;
      const slice = chars.slice(0, n);
      this.canvas.writeChars(this.x1 + this.cursorX, this.y1 + this.cursorY, this.attr, slice);
      this.cursorX += slice.length;
      chars = chars.slice(slice.length);
    }

    return this;
  }

  private lf() {
    this.cursorX = 0;
    this.cursorY++;
    if (this.cursorY >= this.rows) {
      this.scrollUp();
      this.cursorY = this.rows - 1;
    }
  }

  draw(other: Region): this {
    const maxx = this.cols - this.cursorX, maxy = this.rows - this.cursorY;
    if (other.cols > maxx || other.rows > maxy) other = other.clip(0, 0, maxx, maxy);
    const x = this.x1 + this.cursorX;
    const y = this.y1 + this.cursorY;
    this.canvas.nextBuffer.putBox(x, y, other.canvas.nextBuffer, other.x1, other.y1, other.x2, other.y2);
    this.canvas.setDirty();
    return this;
  }

  scrollUp(rows: number = 1): this {
    this.canvas.nextBuffer.scrollUp(this.x1, this.y1, this.x2, this.y2, rows, this.attr);
    this.canvas.setDirty();
    return this;
  }

  scrollDown(rows: number = 1): this {
    this.canvas.nextBuffer.scrollDown(this.x1, this.y1, this.x2, this.y2, rows, this.attr);
    this.canvas.setDirty();
    return this;
  }

  scrollLeft(cols: number = 1): this {
    this.canvas.nextBuffer.scrollLeft(this.x1, this.y1, this.x2, this.y2, cols, this.attr);
    this.canvas.setDirty();
    return this;
  }

  scrollRight(cols: number = 1): this {
    this.canvas.nextBuffer.scrollRight(this.x1, this.y1, this.x2, this.y2, cols, this.attr);
    this.canvas.setDirty();
    return this;
  }

  moveCursor(x: number = this.cursorX, y: number = this.cursorY): this {
    this.canvas.nextBuffer.cursorX = this.x1 + x;
    this.canvas.nextBuffer.cursorY = this.y1 + y;
    this.canvas.setDirty();
    return this;
  }
}
