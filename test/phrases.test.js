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

test("pick takes an element by the draw", () => {
  assert.equal(P.pick(["a", "b", "c"], seq(0)), "a");
  assert.equal(P.pick(["a", "b", "c"], seq(0.99)), "c");
});

test("praise words, late remarks and insults are never empty", () => {
  for (const rand of sources()) {
    assert.ok(P.praiseWord(rand));
    assert.ok(P.lateRemark(rand));
  }
});

test("an insult is one or more capitalised sentences", () => {
  for (const rand of sources()) {
    const t = P.insult(rand);
    assert.match(t, /^[A-ZÅÄÖ].*[.?!]$/, t);
    assert.doesNotMatch(t, /\s\s|,,|, [A-ZÅÄÖ]|[.?!] [a-zåäö]/, t);
  }
});

test("the answer with praise is the number and the word", () => {
  assert.equal(P.answerText({ a: 7, b: 8, c: 56, praise: "bra", v: 0 }, seq(0.5)), "56, bra!");
});

test("the answer after a jab repeats the whole fact", () => {
  assert.equal(P.answerText({ a: 1, b: 8, c: 8, jab: "För sent!", v: 0 }, seq(0.5)), "För sent! Ett gånger 8 är 8.");
});

test("the plain answer is just the number", () => {
  assert.equal(P.answerText({ a: 7, b: 8, c: 56, v: 0 }, seq(0.5)), "56.");
  assert.equal(P.answerText({ a: 7, b: 8, c: 56, v: 1 }, seq(0.1, 0.5)), "56!");
});

test("listen mode reads the whole fact in one phrase", () => {
  assert.equal(P.listenText(1, 8, 8, 0, seq(0.5)), "ett gånger 8 är 8.");
  assert.equal(P.listenText(7, 8, 56, 1, seq(0.1)), "7 gånger 8 är 56!");
  assert.equal(P.listenText(7, 8, 56, 1, seq(0.6)), "7 gånger 8 är 56.");
});

test("without variation the voice keeps its pitch and rate", () => {
  assert.deepEqual(P.varyVoice({ pitch: 1, rate: 0.95 }, 0, seq(0.9)), { pitch: 1, rate: 0.95 });
});

test("variation moves pitch by up to ±0.3 and rate by up to ±15 %", () => {
  const up = P.varyVoice({ pitch: 1, rate: 1 }, 1, seq(1));
  assert.ok(Math.abs(up.pitch - 1.3) < 1e-9 && Math.abs(up.rate - 1.15) < 1e-9, JSON.stringify(up));
  const down = P.varyVoice({ pitch: 1, rate: 1 }, 0.5, seq(0));
  assert.ok(Math.abs(down.pitch - 0.85) < 1e-9 && Math.abs(down.rate - 0.925) < 1e-9, JSON.stringify(down));
});

test("pitch stays within 0.1-2 and rate within 0.3-2", () => {
  assert.deepEqual(P.varyVoice({ pitch: 1.9, rate: 1.9 }, 1, seq(1)), { pitch: 2, rate: 2 });
  assert.deepEqual(P.varyVoice({ pitch: 0.2, rate: 0.3 }, 1, seq(0)), { pitch: 0.1, rate: 0.3 });
});
