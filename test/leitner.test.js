const test = require("node:test");
const assert = require("node:assert/strict");

// counts[i] is the number of problems that can be asked from box i.
const fixed = r => () => r;
// A random source that returns the given values in turn, cycling.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };

const { pickProblem } = require("../leitner.js");

// Question 100 at time 1000000, nothing asked recently unless given.
const ask = opts => pickProblem({
  pool: [], entries: {}, lastAsked: new Map(), question: 100, now: 1e6,
  rand: fixed(0.3), ...opts
});
const A = [1, 1], B = [1, 2], C = [1, 3];

test("pickProblem returns null for an empty pool", () => {
  assert.equal(ask({ pool: [] }), null);
});

test("pickProblem asks the most overdue problem", () => {
  const entries = { "1x1": [1, 5e5], "1x2": [0, 2e5], "1x3": [2, 9e5] };
  assert.deepEqual(ask({ pool: [A, B, C], entries }), B);
});

test("among problems due equally long, the lowest box goes first", () => {
  const entries = { "1x1": 3, "1x2": 1, "1x3": 2 };   // old format: due since 1970
  assert.deepEqual(ask({ pool: [A, B, C], entries }), B);
});

test("a due problem goes before a new one", () => {
  assert.deepEqual(ask({ pool: [A, B], entries: { "1x2": [4, 9e5] } }), B);
});

test("a new problem goes before one that is not due yet", () => {
  assert.deepEqual(ask({ pool: [A, B], entries: { "1x2": [0, 2e6] } }), A);
});

test("new problems are taken in random order", () => {
  const pool = [A, B, C];
  const picked = [0, 0.4, 0.9].map(r => ask({ pool, rand: fixed(r) }));
  assert.equal(new Set(picked.map(String)).size, 3, JSON.stringify(picked));
});

test("with nothing due and nothing new, the problem due soonest is asked", () => {
  const entries = { "1x1": [2, 5e6], "1x2": [1, 3e6] };
  assert.deepEqual(ask({ pool: [A, B], entries }), B);
});

test("a problem is not asked again until four others have been", () => {
  const entries = { "1x1": [0, 0], "1x2": [3, 9e5] };   // 1x1 is the most overdue
  const after = q => ask({ pool: [A, B], entries, lastAsked: new Map([["1x1", q]]) });
  assert.deepEqual(after(99), B);   // just asked
  assert.deepEqual(after(96), B);   // three others since
  assert.deepEqual(after(95), A);   // four others since
});

test("when every problem was asked recently, the one asked longest ago is asked", () => {
  const lastAsked = new Map([["1x1", 99], ["1x2", 97], ["1x3", 98]]);
  assert.deepEqual(ask({ pool: [A, B, C], lastAsked }), B);
  assert.deepEqual(ask({ pool: [A], lastAsked }), A);
});

const { migrateOldBoxes } = require("../leitner.js");

test("old box numbers (1000 + correct in a row) become boxes 0-5", () => {
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

test("a correct answer before the problem is due keeps its box and waits again", () => {
  const now = 1e12, mid = seq(0.5);
  assert.deepEqual(answer({ box: 3, due: now + 1000 }, true, now, mid), { box: 3, due: now + DAY });
  assert.deepEqual(answer({ box: 0, due: now + 1000 }, true, now, mid), { box: 0, due: now + MIN });
});

test("a wrong answer before the problem is due still sends it to box 0", () => {
  const now = 1e12, mid = seq(0.5);
  assert.deepEqual(answer({ box: 3, due: now + 1000 }, false, now, mid), { box: 0, due: now + MIN });
});

const { restingUntil, untilText } = require("../leitner.js");

test("resting until the first due time when nothing is due and nothing new", () => {
  const pool = [[1, 1], [1, 2]];
  assert.equal(restingUntil(pool, { "1x1": [2, 5000], "1x2": [3, 3000] }, 1000), 3000);
});

test("not resting while something is due or new", () => {
  const pool = [[1, 1], [1, 2]];
  assert.equal(restingUntil(pool, { "1x1": [2, 5000], "1x2": [3, 1000] }, 1000), null);
  assert.equal(restingUntil(pool, { "1x1": [2, 5000] }, 1000), null);
  assert.equal(restingUntil([], {}, 1000), null);
});

test("untilText rounds up to minutes, hours or days", () => {
  assert.equal(untilText(10 * 1000), "om 1 minut");
  assert.equal(untilText(11.5 * MIN), "om 12 minuter");
  assert.equal(untilText(59 * MIN), "om 59 minuter");
  assert.equal(untilText(60 * MIN), "om 1 timme");
  assert.equal(untilText(2.2 * 60 * MIN), "om 3 timmar");
  assert.equal(untilText(23.5 * 60 * MIN), "om 1 dygn");
  assert.equal(untilText(DAY + 1), "om 2 dygn");
  assert.equal(untilText(DAY), "om 1 dygn");
});
