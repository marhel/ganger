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
