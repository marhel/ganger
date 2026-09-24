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

  const pick = (list, rand = Math.random) => list[Math.floor(rand() * list.length)];

  // Praise is used sparingly: only on some correct answers, and kept
  // proportionate to the task.
  const praise = ["bra", "rätt", "korrekt", "riktigt", "stämmer", "utmärkt", "precis",
    "mycket riktigt", "jajamen", "exakt", "just det", "sant", "bravo",
    "snyggt", "perfekt", "toppen", "kanon", "fint", "klockrent", "helt rätt", "mitt i prick",
    "där satt den", "pang på", "fullträff", "alldeles riktigt", "självklart",
    "japp", "stiligt", "absolut"];
  const praiseWord = (rand = Math.random) => pick(praise, rand);

  const lateRemarks = ["För sent!", "För sent.", "Tiden tog slut.", "Du hann nästan.", "Lite för långsamt."];
  const lateRemark = (rand = Math.random) => pick(lateRemarks, rand);

  // Mild schoolyard insults for wrong answers (opt-in). Spoken first,
  // followed by the whole fact ("a gånger b är c"), so the question and
  // the answer still end up next to each other.
  const insultNouns = ["ärthjärna", "knasboll", "pantskalle", "fårskalle", "klantskalle",
    "tokstolle", "pundhuvud", "dummerjöns", "träskalle", "knäppgök", "dumbom", "fjant",
    "fåntratt", "pottsork", "mushjärna", "slöfock", "latmask", "skolkare"];
  const insultAdjectives = ["galen", "pantad", "urblåst", "hjärndöd", "puckad", "bakom flötet",
    "knäpp", "tokig", "snurrig", "ute och cyklar", "tappad bakom en vagn", "borta",
    "dum i huvudet", "felvaggad", "bortkollrad", "korkad", "knasig", "vilse"];
  // Verdicts are judgements that can follow each other ("Uselt, pinsamt").
  // Exclamations of surprise only make sense first, so they are their own
  // category and only ever open a line.
  const insultVerdicts = ["visset", "kasst", "uselt", "dåligt", "fel", "miss", "tyvärr",
    "inte i närheten", "verkligen inte", "pinsamt", "inte ens nära", "inte riktigt",
    "jag förstår inte hur du tänker", "absolut inte", "knappast"];
  const insultOpeners = ["va?", "jasså?", "verkligen?", "det tror du?", "nää!", "hoppsan", "aj aj aj", "hallå?"];

  // Two different elements of list.
  function pickTwo(list, rand) {
    const i = Math.floor(rand() * list.length);
    const j = (i + 1 + Math.floor(rand() * (list.length - 1))) % list.length;
    return [list[i], list[j]];
  }

  const insultTemplates = [
    (N, A, V, U) => phrase(["nej", N()]),
    (N, A, V, U) => `Är du helt ${A()}?`,
    (N, A, V, U) => phrase([V()]),
    (N, A, V, U) => phrase([V(), N()]),
    (N, A, V, U) => `Men ${N()}!`,
    (N, A, V, U) => `${phrase([V()])} Är du helt ${A()}?`,
    (N, A, V, U) => `${phrase(["nej", N()])} Är du helt ${A()}?`,
    (N, A, V, U) => `Men ${N()}, är du helt ${A()}?`,
    (N, A, V, U) => `Är du helt ${A()}, ${N()}?`,
    (N, A, V, U) => `Hörru ${N()}. ${phrase([V()])}`,
    (N, A, V, U, two) => phrase([...two(insultVerdicts), N()]),
    (N, A, V, U) => phrase([U()]),
    (N, A, V, U) => phrase([U(), N()]),
    (N, A, V, U) => phrase([U(), V(), N()]),
    (N, A, V, U) => phrase([U(), `är du helt ${A()}?`]),
  ];
  function insult(rand = Math.random) {
    const from = list => () => pick(list, rand);
    return pick(insultTemplates, rand)(from(insultNouns), from(insultAdjectives),
      from(insultVerdicts), from(insultOpeners), list => pickTwo(list, rand));
  }

  // The answer is spoken bare. Only punctuation varies, to nudge intonation.
  // With praise it gets the word; after a jab (insult or late remark) the
  // whole fact is repeated, so question and answer end up together.
  const answerTemplates = [c => `${c}.`, c => `${c}!`];
  function answerText({ a, b, c, praise, jab, v }, rand = Math.random) {
    if (praise) return `${say(c)}, ${praise}!`;
    if (jab) return `${jab} ${cap(say(a))} gånger ${say(b)} är ${say(c)}.`;
    return choose(answerTemplates, v, rand)(say(c));
  }

  // Listen mode, or no thinking time: question and answer as one phrase.
  const listenText = (a, b, c, v, rand = Math.random) =>
    `${say(a)} gånger ${say(b)} är ${say(c)}${rand() < v / 2 ? "!" : "."}`;

  // Pitch and rate for one utterance: the chosen base, varied by up to
  // ±0.3 in pitch and ±15 % in rate at full variation v, within what the
  // speech engines accept.
  function varyVoice({ pitch, rate }, v, rand = Math.random) {
    const between = (lo, hi) => lo + rand() * (hi - lo);
    const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
    return {
      pitch: clamp(pitch + between(-0.3, 0.3) * v, 0.1, 2),
      rate: clamp(rate * (1 + between(-0.15, 0.15) * v), 0.3, 2),
    };
  }

  // Said when nothing is due and nothing is new, before practice pauses.
  const restedText = until =>
    `Du har övat klart! Nästa uppgift är dags ${until}. Tryck på Starta om du vill öva ändå.`;

  Object.assign(exports, {
    restedText, varyVoice,
    say, lead, cap, phrase, choose, question,
    pick, praiseWord, lateRemark, insult, answerText, listenText
  });
})(typeof module !== "undefined" ? module.exports : (window.Phrases = {}));
