const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPool } = require("../problems.js");

test("pairs every table with every factor, table first", () => {
  assert.deepEqual(buildPool([2, 3], [4, 5], false), [[2, 4], [2, 5], [3, 4], [3, 5]]);
});

test("adds the inverted problem after each one when asked to", () => {
  assert.deepEqual(buildPool([2], [4, 5], true), [[2, 4], [4, 2], [2, 5], [5, 2]]);
});

test("does not add the same problem twice", () => {
  assert.deepEqual(buildPool([2, 3], [2, 3], true), [[2, 2], [2, 3], [3, 2], [3, 3]]);
});

test("sorts tables and factors, which may be any iterable", () => {
  assert.deepEqual(buildPool(new Set([3, 1]), new Set([2]), false), [[1, 2], [3, 2]]);
});

test("is empty when no table or no factor is chosen", () => {
  assert.deepEqual(buildPool([], [1, 2], true), []);
  assert.deepEqual(buildPool([1, 2], [], true), []);
});
