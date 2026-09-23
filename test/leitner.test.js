const test = require("node:test");
const assert = require("node:assert/strict");
const { pickBox } = require("../leitner.js");

// counts[i] is the number of problems that can be asked from box i.
const fixed = r => () => r;

test("picks among non-empty boxes with weight 1/2^i per box", () => {
  // Weights 1, 1/2, 1/4 of 1.75: box 0 below 0.571, box 1 below 0.857.
  const counts = [90, 2, 1, 0, 0, 0];
  assert.equal(pickBox(counts, fixed(0.5)), 0);
  assert.equal(pickBox(counts, fixed(0.6)), 1);
  assert.equal(pickBox(counts, fixed(0.9)), 2);
});

test("skips empty boxes", () => {
  assert.equal(pickBox([0, 0, 3, 0, 0, 0], fixed(0.99)), 2);
});
