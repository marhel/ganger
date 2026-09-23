const test = require("node:test");
const assert = require("node:assert/strict");
const { thinkMs, waitOutcome, judge } = require("../judge.js");

test("harder problems get more thinking time: base * (1 + answer/144)", () => {
  assert.equal(thinkMs(3, 0), 3000);
  assert.equal(thinkMs(3, 144), 6000);
  assert.equal(thinkMs(2, 72), 3000);
});

// Waiting for the answer to 7 x 8, until time 10000.
const at = (now, typed = "", typedAt = 0) => waitOutcome({ now, end: 10000, typed, typedAt, c: 56 });

test("the wait goes on while nothing is typed, until the time is up", () => {
  assert.equal(at(9999), null);
  assert.equal(at(10000), "timeout");
});

test("a correct answer ends the wait 250 ms after it was typed", () => {
  assert.equal(at(1249, "56", 1000), null);
  assert.equal(at(1250, "56", 1000), "early");
});

test("a wrong answer ends the wait when left alone for 2 s", () => {
  assert.equal(at(2999, "57", 1000), null);
  assert.equal(at(3000, "57", 1000), "early");
  assert.equal(at(3000, "5", 1000), "early");
});

test("the time running out wins over an early end", () => {
  assert.equal(at(10000, "56", 9900), "timeout");
});

test("judge: the right answer is correct and moves the problem", () => {
  assert.deepEqual(judge("56", 56, "early"), { correct: true, wrong: false, late: false, record: true });
});

test("judge: a wrong answer is wrong and moves the problem", () => {
  assert.deepEqual(judge("57", 56, "early"), { correct: false, wrong: true, late: false, record: true });
  assert.deepEqual(judge("6", 56, "timeout"), { correct: false, wrong: true, late: false, record: true });
});

test("judge: the start of the right answer when time ran out is late, not wrong", () => {
  assert.deepEqual(judge("5", 56, "timeout"), { correct: false, wrong: false, late: true, record: false });
  assert.deepEqual(judge("10", 108, "timeout"), { correct: false, wrong: false, late: true, record: false });
});

test("judge: no answer at all leaves the problem where it is", () => {
  assert.deepEqual(judge("", 56, "timeout"), { correct: false, wrong: false, late: false, record: false });
});

const { editAnswer } = require("../judge.js");

test("digits are added to the answer, up to three", () => {
  assert.equal(editAnswer("", "5"), "5");
  assert.equal(editAnswer("5", "6"), "56");
  assert.equal(editAnswer("144", "4"), "144");
});

test("backspace removes the last digit", () => {
  assert.equal(editAnswer("56", "Backspace"), "5");
  assert.equal(editAnswer("", "Backspace"), "");
});

test("other keys are not answer keys", () => {
  assert.equal(editAnswer("5", "a"), null);
  assert.equal(editAnswer("5", "Enter"), null);
});
