const test = require("node:test");
const assert = require("node:assert/strict");
const P = require("../phrases.js");

// A random source that returns the given values in turn, cycling.
const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
// Many different random sources, for properties that must always hold.
const sources = () => Array.from({ length: 200 }, (_, k) => seq((k * 0.618) % 1, (k * 0.382) % 1, (k * 0.1) % 1));

test("say reads a lone 1 as 'ett', other numbers as digits", () => {
  assert.equal(P.say(1), "ett");
  assert.equal(P.say(0), "0");
  assert.equal(P.say(12), "12");
});

test("lead puts a colon before 'ett' so it is not read as an article", () => {
  assert.equal(P.lead("Vad blir", "ett"), "Vad blir: ett");
  assert.equal(P.lead("Vad blir", "7"), "Vad blir 7");
});

test("cap capitalises the first letter", () => {
  assert.equal(P.cap("nej"), "Nej");
  assert.equal(P.cap("7"), "7");
});

test("phrase joins parts with commas, or starts a new sentence after ? and !", () => {
  assert.equal(P.phrase(["nej", "dumbom"]), "Nej, dumbom.");
  assert.equal(P.phrase(["va?", "dumbom"]), "Va? Dumbom.");
  assert.equal(P.phrase(["uselt", "pinsamt", "fjant"]), "Uselt, pinsamt, fjant.");
  assert.equal(P.phrase(["hallå?"]), "Hallå?");
  assert.equal(P.phrase(["nej"], "!"), "Nej!");
});

test("choose takes the neutral first form unless the draw is below v", () => {
  const list = ["a", "b", "c"];
  assert.equal(P.choose(list, 0, seq(0)), "a");
  assert.equal(P.choose(list, 0.5, seq(0.5)), "a");
  assert.equal(P.choose(list, 0.5, seq(0.4, 0)), "b");
  assert.equal(P.choose(list, 0.5, seq(0.4, 0.99)), "c");
});

test("question is plain 'a gånger b?' without variation", () => {
  assert.equal(P.question(7, 8, 0, seq(0.5)), "7 gånger 8?");
  assert.equal(P.question(1, 8, 0, seq(0.5)), "ett gånger 8?");
});

test("question always ends with 'a gånger b?'", () => {
  for (const rand of sources()) {
    const q = P.question(1, 9, 1, rand);
    assert.ok(q.endsWith("ett gånger 9?"), q);
  }
});
