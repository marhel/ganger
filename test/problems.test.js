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

const { parseSelection } = require("../problems.js");
const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

test("a saved selection is read back", () => {
  const s = parseSelection('{"tables":[2,3],"factors":[4],"inverted":false}');
  assert.deepEqual([...s.tables], [2, 3]);
  assert.deepEqual([...s.factors], [4]);
  assert.equal(s.inverted, false);
});

test("without a saved selection, everything is chosen, inverted too", () => {
  for (const json of [null, "", "not json", "null"]) {
    const s = parseSelection(json);
    assert.deepEqual([...s.tables], all, json);
    assert.deepEqual([...s.factors], all, json);
    assert.equal(s.inverted, true, json);
  }
});
