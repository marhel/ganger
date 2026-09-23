// What is said aloud: questions, answers, praise and insults.
// Loaded as a plain script in the browser, tested with `node --test`.
// Functions that vary take the random source as a parameter.
(function (exports) {
  // A lone 1 is read as "en" by most engines; we want "ett".
  const say = n => n === 1 ? "ett" : String(n);

  // After a verb, "ett" is read as an article ("är ett bord"),
  // so we add a colon to force a pause before it.
  const lead = (intro, a) => a === "ett" ? `${intro}: ${a}` : `${intro} ${a}`;

  const cap = t => t[0].toUpperCase() + t.slice(1);
  const endsSentence = t => /[?!]$/.test(t);

  // Joins parts with commas. A part ending in "?" or "!" ends its sentence;
  // the next part then starts a new one instead of a comma.
  function phrase(parts, end = ".") {
    let out = cap(parts[0]);
    for (let i = 1; i < parts.length; i++) {
      out += endsSentence(parts[i - 1]) ? " " + cap(parts[i]) : ", " + parts[i];
    }
    return endsSentence(parts[parts.length - 1]) ? out : out + end;
  }

  // First entry of each list is the "neutral" form used when variation is 0.
  // v in [0,1]; the chance of leaving the neutral form grows with v.
  function choose(list, v, rand = Math.random) {
    if (rand() >= v) return list[0];
    return list[1 + Math.floor(rand() * (list.length - 1))];
  }

  // Flavor text may only come BEFORE the question and AFTER the answer,
  // so "a gånger b" is always immediately followed by the answer.
  const questionTemplates = [
    (a, b) => `${a} gånger ${b}?`,
    (a, b) => `${lead("Vad blir", a)} gånger ${b}?`,
    (a, b) => `${lead("Hur mycket är", a)} gånger ${b}?`,
    (a, b) => `Okej, ${a} gånger ${b}?`,
    (a, b) => `Och ${a} gånger ${b}?`,
    (a, b) => `Nästa: ${a} gånger ${b}?`,
  ];
  const question = (a, b, v, rand = Math.random) =>
    choose(questionTemplates, v, rand)(say(a), say(b));

  Object.assign(exports, { say, lead, cap, phrase, choose, question });
})(typeof module !== "undefined" ? module.exports : (window.Phrases = {}));
