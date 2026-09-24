const test = require("node:test");
const assert = require("node:assert/strict");
const { pickBox } = require("../leitner.js");

// counts[i] is the number of problems that can be asked from box i.
const fixed = r => () => r;
// A random source that returns the given values in turn, cycling.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

test("asks from the lowest non-empty box, whatever the other boxes hold", () => {
  assert.equal(pickBox([90, 2, 1, 0, 0, 0], 1, 10, fixed(0.99)), 0);
  assert.equal(pickBox([0, 5, 3, 0, 0, 80], 7, 10, fixed(0.99)), 1);
});

test("every 10th question reviews a higher box, weighted count/2^i", () => {
  // Box 1: 2 * 1/2 = 1, box 2: 1 * 1/4 = 0.25, so box 1 below 0.8.
  const counts = [90, 2, 1, 0, 0, 0];
  assert.equal(pickBox(counts, 10, 10, fixed(0.5)), 1);
  assert.equal(pickBox(counts, 20, 10, fixed(0.9)), 2);
});

test("a review with no higher box asks from the only box", () => {
  assert.equal(pickBox([0, 0, 3, 0, 0, 0], 10, 10, fixed(0.99)), 2);
});

test("the review interval is a parameter", () => {
  const counts = [90, 2, 1, 0, 0, 0];
  assert.equal(pickBox(counts, 3, 3, fixed(0.5)), 1);
  assert.equal(pickBox(counts, 10, 3, fixed(0.5)), 0);
});

const { pickProblem } = require("../leitner.js");

const ask = opts => pickProblem({
  pool: [], entries: {}, lastAsked: new Map(), last: null, n: 1, reviewEvery: 10,
  rand: fixed(0.3), ...opts
});

test("pickProblem returns null for an empty pool", () => {
  assert.equal(ask({ pool: [] }), null);
});

test("pickProblem avoids the problem just asked when there is another", () => {
  const pool = [[2, 3], [3, 2]];
  for (const r of [0, 0.3, 0.7, 0.99]) {
    assert.deepEqual(ask({ pool, last: [2, 3], rand: fixed(r) }), [3, 2]);
  }
});

test("pickProblem asks the same problem again when it is the only one", () => {
  assert.deepEqual(ask({ pool: [[2, 3]], last: [2, 3] }), [2, 3]);
});

test("pickProblem moves on to the next box when the lowest only holds the last problem", () => {
  const pool = [[1, 1], [1, 2]];
  const entries = { "1x1": 0, "1x2": 1 };
  assert.deepEqual(ask({ pool, entries, last: [1, 1] }), [1, 2]);
});

test("pickProblem lets new and answered problems take turns in a box", () => {
  const pool = [[1, 1], [1, 2]];
  const entries = { "1x2": 0 };   // 1x1 is new, 1x2 was wrong last time
  assert.deepEqual(ask({ pool, entries, rand: fixed(0.3) }), [1, 1]);
  assert.deepEqual(ask({ pool, entries, rand: fixed(0.7) }), [1, 2]);
});

test("pickProblem asks the answered problem asked longest ago", () => {
  const pool = [[1, 1], [1, 2], [1, 3]];
  const entries = { "1x1": 0, "1x2": 0, "1x3": 0 };
  const lastAsked = new Map([["1x1", 5], ["1x2", 2], ["1x3", 9]]);
  assert.deepEqual(ask({ pool, entries, lastAsked }), [1, 2]);
  lastAsked.delete("1x3");   // not asked since the page was loaded: first
  assert.deepEqual(ask({ pool, entries, lastAsked }), [1, 3]);
});

test("pickProblem reviews a higher box on every reviewEvery-th question", () => {
  const pool = [[1, 1], [1, 2]];
  const entries = { "1x2": 3 };
  assert.deepEqual(ask({ pool, entries, n: 4, reviewEvery: 4 }), [1, 2]);
  assert.deepEqual(ask({ pool, entries, n: 5, reviewEvery: 4 }), [1, 1]);
});


const { migrateOldBoxes } = require("../leitner.js");

test("old box numbers (1000 + correct in a row) become entries 0-5", () => {
  assert.deepEqual(migrateOldBoxes({ "2x3": 1000, "3x2": 1002, "4x4": 1009, "5x5": 3 }),
    { "2x3": 0, "3x2": 2, "4x4": 5, "5x5": 0 });
  assert.deepEqual(migrateOldBoxes({}), {});
});

const { boxName, countText, boxSummary, itemNote } = require("../leitner.js");

test("the top box is named 5+", () => {
  assert.equal(boxName(0), "0");
  assert.equal(boxName(4), "4");
  assert.equal(boxName(5), "5+");
});

test("countText says uppgift or uppgifter", () => {
  assert.equal(countText(0), "0 uppgifter");
  assert.equal(countText(1), "1 uppgift");
  assert.equal(countText(12), "12 uppgifter");
});

test("the summary of box 0 tells new from wrong last time", () => {
  assert.equal(boxSummary(0, 0, 0), "0 uppgifter.");
  assert.equal(boxSummary(0, 3, 3), "3 uppgifter, alla nya.");
  assert.equal(boxSummary(0, 3, 1), "3 uppgifter, nya eller fel senast.");
  assert.equal(boxSummary(0, 1, 0), "1 uppgift, fel senast.");
});

test("the summary of a higher box tells the correct answers in a row", () => {
  assert.equal(boxSummary(2, 4, 0), "4 uppgifter, 2 rätt i rad.");
  assert.equal(boxSummary(5, 1, 0), "1 uppgift, 5 eller fler rätt i rad.");
});

test("problems in box 0 are marked new or wrong last time", () => {
  assert.equal(itemNote(0, true), "ny");
  assert.equal(itemNote(0, false), "fel senast");
  assert.equal(itemNote(3, false), "");
});

const { readEntry, writeEntry, answer, groupBoxes } = require("../leitner.js");
const MIN = 60 * 1000, DAY = 24 * 60 * MIN;

test("a stored entry is [box, due]; a lone number is a box, due long ago", () => {
  assert.deepEqual(readEntry([2, 1234]), { box: 2, due: 1234 });
  assert.deepEqual(readEntry(3), { box: 3, due: 0 });
  assert.equal(readEntry(undefined), null);   // never answered
});

test("an entry is written as [box, due]", () => {
  assert.deepEqual(writeEntry({ box: 2, due: 1234 }), [2, 1234]);
});

test("a correct answer moves the problem up a box, a wrong one to box 0", () => {
  const now = 1e12, mid = seq(0.5);
  assert.equal(answer(null, true, now, mid).box, 1);
  assert.equal(answer({ box: 2, due: 0 }, true, now, mid).box, 3);
  assert.equal(answer({ box: 5, due: 0 }, true, now, mid).box, 5);
  assert.equal(answer({ box: 4, due: 0 }, false, now, mid).box, 0);
  assert.equal(answer(null, false, now, mid).box, 0);
});

test("the problem is due again after its new box's interval", () => {
  const now = 1e12, mid = seq(0.5);
  const dueIn = (entry, correct) => answer(entry, correct, now, mid).due - now;
  assert.equal(dueIn({ box: 3, due: 0 }, false), 1 * MIN);
  assert.equal(dueIn(null, true), 5 * MIN);
  assert.equal(dueIn({ box: 1, due: 0 }, true), 30 * MIN);
  assert.equal(dueIn({ box: 2, due: 0 }, true), 1 * DAY);
  assert.equal(dueIn({ box: 3, due: 0 }, true), 3 * DAY);
  assert.equal(dueIn({ box: 4, due: 0 }, true), 10 * DAY);
  assert.equal(dueIn({ box: 5, due: 0 }, true), 10 * DAY);
});

test("the interval is spread by ±20 %", () => {
  const now = 1e12;
  assert.equal(answer(null, true, now, seq(0)).due - now, 4 * MIN);
  assert.equal(answer(null, true, now, seq(1)).due - now, 6 * MIN);
});

test("groupBoxes reads both stored forms", () => {
  const pool = [[1, 1], [1, 2], [1, 3]];
  const groups = groupBoxes(pool, { "1x1": 2, "1x2": [4, 1234] });
  assert.deepEqual(groups.map(g => g.length), [1, 0, 1, 0, 1, 0]);
});
