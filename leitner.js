// The Leitner boxes: which problem to ask next, and how an answer moves it.
// Loaded as a plain script in the browser, tested with `node --test`.
(function (exports) {
  const BOXES = 6;
  const MAX_STREAK = BOXES - 1;
  const keyOf = p => p[0] + "x" + p[1];

  // Each problem (2x3 and 3x2 separately) has an entry: its box, which is
  // its number of correct answers in a row capped at 5, and when it is due
  // (ms since 1970). It is stored as [box, due]. Earlier versions stored the
  // box alone; such an entry is due since long ago. A problem never answered
  // has no entry and lives in box 0.
  const readEntry = v => v === undefined ? null : Array.isArray(v) ? { box: v[0], due: v[1] } : { box: v, due: 0 };
  const writeEntry = ({ box, due }) => [box, due];
  const boxOf = (entries, p) => readEntry(entries[keyOf(p)])?.box ?? 0;

  // How long until a problem in each box is due again.
  const MIN = 60 * 1000, DAY = 24 * 60 * MIN;
  const INTERVALS = [1 * MIN, 5 * MIN, 30 * MIN, 1 * DAY, 3 * DAY, 10 * DAY];

  // A correct answer moves the problem up a box (at most 5), a wrong one to
  // box 0. It is then due after its box's interval, spread by ±20 % so that
  // problems answered together don't all come back together. A correct
  // answer before the problem is due (practising ahead) keeps its box, so
  // that practising ahead doesn't rush problems up the boxes.
  function answer(entry, correct, now, rand = Math.random) {
    const early = entry && entry.due > now;
    const box = !correct ? 0 : early ? entry.box : Math.min(MAX_STREAK, (entry?.box ?? 0) + 1);
    return { box, due: now + Math.round(INTERVALS[box] * (0.8 + 0.4 * rand())) };
  }

  // The problems of the pool in each of the six boxes (some may be empty).
  function groupBoxes(pool, entries) {
    const groups = Array.from({ length: BOXES }, () => []);
    for (const p of pool) groups[boxOf(entries, p)].push(p);
    return groups;
  }

  // Earlier versions stored box numbers as 1000 + correct in a row.
  function migrateOldBoxes(old) {
    const entries = {};
    for (const k in old) entries[k] = Math.max(0, Math.min(MAX_STREAK, (old[k] | 0) - 1000));
    return entries;
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // A problem is not asked again until this many others have been.
  const MIN_GAP = 4;

  // Picks the next problem for question number `question` at time `now`.
  // lastAsked maps a problem's key to the number of the question it was
  // last asked in. Among the problems not asked in the last MIN_GAP
  // questions, it takes
  //   1. the most overdue one (the lowest box first among equally overdue),
  //   2. else a new one, at random,
  //   3. else the one due soonest.
  // If every problem was asked that recently, the one asked longest ago.
  function pickProblem({ pool, entries, lastAsked, question, now, rand = Math.random }) {
    if (!pool.length) return null;
    const asked = p => lastAsked.get(keyOf(p)) ?? -Infinity;
    const spaced = pool.filter(p => question - asked(p) > MIN_GAP);
    if (!spaced.length) return pool.reduce((x, y) => asked(y) < asked(x) ? y : x);

    const entry = p => readEntry(entries[keyOf(p)]);
    const unseen = spaced.filter(p => !entry(p));
    const seen = shuffle(spaced.filter(p => entry(p)), rand)
      .sort((x, y) => entry(x).due - entry(y).due || entry(x).box - entry(y).box);
    if (seen.length && entry(seen[0]).due <= now) return seen[0];
    if (unseen.length) return unseen[Math.floor(rand() * unseen.length)];
    return seen[0];
  }

  // When nothing in the pool is due or new: the time the first problem is
  // due. Else null.
  function restingUntil(pool, entries, now) {
    let first = Infinity;
    for (const p of pool) {
      const e = readEntry(entries[keyOf(p)]);
      if (!e || e.due <= now) return null;
      first = Math.min(first, e.due);
    }
    return pool.length ? first : null;
  }

  // Texts for showing the boxes.
  const boxName = i => i === MAX_STREAK ? `${i}+` : `${i}`;   // top box is "5+"
  const countText = n => `${n} ${n === 1 ? "uppgift" : "uppgifter"}`;
  // n problems in box i, unseen of them never answered.
  function boxSummary(i, n, unseen) {
    const what = i > 0 ? (i === MAX_STREAK ? `${i} eller fler rätt i rad` : `${i} rätt i rad`)
      : !n ? "" : unseen === n ? "alla nya" : unseen ? "nya eller fel senast" : "fel senast";
    return countText(n) + (what ? `, ${what}.` : ".");
  }
  // "om 12 minuter", rounded up to whole minutes, hours or days.
  function untilText(ms) {
    const HOUR = 60 * MIN;
    const unit = (n, one, many) => `om ${n} ${n === 1 ? one : many}`;
    if (Math.ceil(ms / MIN) < 60) return unit(Math.max(1, Math.ceil(ms / MIN)), "minut", "minuter");
    if (Math.ceil(ms / HOUR) < 24) return unit(Math.ceil(ms / HOUR), "timme", "timmar");
    return unit(Math.ceil(ms / DAY), "dygn", "dygn");
  }
  const itemNote = (i, unseen) => unseen ? "ny" : i === 0 ? "fel senast" : "";

  Object.assign(exports, {
    restingUntil, untilText,
    readEntry, writeEntry, answer,
    BOXES, MAX_STREAK, keyOf, boxOf, groupBoxes, migrateOldBoxes,
    pickProblem, boxName, countText, boxSummary, itemNote
  });
})(typeof module !== "undefined" ? module.exports : (window.Leitner = {}));
