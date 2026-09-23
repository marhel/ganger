const test = require("node:test");
const assert = require("node:assert/strict");
const { pickBox } = require("../leitner.js");

// counts[i] is the number of problems that can be asked from box i.
const fixed = r => () => r;

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

const { pickProblem, nextStreak } = require("../leitner.js");

const ask = opts => pickProblem({
  pool: [], streaks: {}, lastAsked: new Map(), last: null, n: 1, reviewEvery: 10,
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
  const streaks = { "1x1": 0, "1x2": 1 };
  assert.deepEqual(ask({ pool, streaks, last: [1, 1] }), [1, 2]);
});

test("pickProblem lets new and answered problems take turns in a box", () => {
  const pool = [[1, 1], [1, 2]];
  const streaks = { "1x2": 0 };   // 1x1 is new, 1x2 was wrong last time
  assert.deepEqual(ask({ pool, streaks, rand: fixed(0.3) }), [1, 1]);
  assert.deepEqual(ask({ pool, streaks, rand: fixed(0.7) }), [1, 2]);
});

test("pickProblem asks the answered problem asked longest ago", () => {
  const pool = [[1, 1], [1, 2], [1, 3]];
  const streaks = { "1x1": 0, "1x2": 0, "1x3": 0 };
  const lastAsked = new Map([["1x1", 5], ["1x2", 2], ["1x3", 9]]);
  assert.deepEqual(ask({ pool, streaks, lastAsked }), [1, 2]);
  lastAsked.delete("1x3");   // not asked since the page was loaded: first
  assert.deepEqual(ask({ pool, streaks, lastAsked }), [1, 3]);
});

test("pickProblem reviews a higher box on every reviewEvery-th question", () => {
  const pool = [[1, 1], [1, 2]];
  const streaks = { "1x2": 3 };
  assert.deepEqual(ask({ pool, streaks, n: 4, reviewEvery: 4 }), [1, 2]);
  assert.deepEqual(ask({ pool, streaks, n: 5, reviewEvery: 4 }), [1, 1]);
});

test("nextStreak adds one when correct, up to 5, and resets when wrong", () => {
  assert.equal(nextStreak(undefined, true), 1);
  assert.equal(nextStreak(2, true), 3);
  assert.equal(nextStreak(5, true), 5);
  assert.equal(nextStreak(4, false), 0);
  assert.equal(nextStreak(undefined, false), 0);
});

const { migrateOldBoxes } = require("../leitner.js");

test("old box numbers (1000 + correct in a row) become streaks 0-5", () => {
  assert.deepEqual(migrateOldBoxes({ "2x3": 1000, "3x2": 1002, "4x4": 1009, "5x5": 3 }),
    { "2x3": 0, "3x2": 2, "4x4": 5, "5x5": 0 });
  assert.deepEqual(migrateOldBoxes({}), {});
});
