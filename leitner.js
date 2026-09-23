// Box selection for the Leitner boxes, kept free of the page so it can be
// tested with `node --test`. Loaded as a plain script in the browser.
(function (exports) {
  // counts[i] is the number of problems that can be asked from box i,
  // n is the question number (1, 2, ...). Asks from the lowest non-empty
  // box, except every reviewEvery-th question, which reviews one of the
  // higher boxes.
  // A review picks box i with weight count/2^i, so each problem in box 1
  // is twice as likely as one in box 2, and so on.
  function pickBox(counts, n, reviewEvery, rand = Math.random) {
    const nonEmpty = counts.map((c, i) => i).filter(i => counts[i] > 0);
    const higher = nonEmpty.slice(1);
    if (n % reviewEvery !== 0 || !higher.length) return nonEmpty[0];
    const weights = higher.map(i => counts[i] * Math.pow(2, -i));
    let r = rand() * weights.reduce((x, y) => x + y, 0);
    let k = 0;
    while (k < weights.length - 1 && r >= weights[k]) { r -= weights[k]; k++; }
    return higher[k];
  }

  const BOXES = 6;
  const MAX_STREAK = BOXES - 1;
  const keyOf = p => p[0] + "x" + p[1];

  // Each problem (2x3 and 3x2 separately) keeps its number of correct
  // answers in a row, capped at 5: correct -> +1, wrong -> 0.
  // A problem never answered has no streak (undefined) and lives in box 0.
  const nextStreak = (streak, correct) => correct ? Math.min(MAX_STREAK, (streak ?? 0) + 1) : 0;
  const boxOf = (streaks, p) => streaks[keyOf(p)] ?? 0;

  // The problems of the pool in each of the six boxes (some may be empty).
  function groupBoxes(pool, streaks) {
    const groups = Array.from({ length: BOXES }, () => []);
    for (const p of pool) groups[boxOf(streaks, p)].push(p);
    return groups;
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Picks the next problem: a box with pickBox, then within the box
  // never-answered and answered problems take turns (half the draws each
  // when both exist); among the answered ones, the problem asked longest ago
  // (lastAsked: key -> question number) wins. The problem just asked is
  // skipped when there is any other.
  function pickProblem({ pool, streaks, lastAsked, last, n, reviewEvery, rand = Math.random }) {
    if (!pool.length) return null;
    const groups = groupBoxes(pool, streaks);
    const isUnseen = p => streaks[keyOf(p)] === undefined;
    const notLast = p => !(last && keyOf(p) === keyOf(last));
    // Non-empty boxes, skipping a box whose only problem is the one just asked.
    let counts = groups.map(g => g.filter(notLast).length);
    if (counts.every(c => !c)) counts = groups.map(g => g.length);
    const box = pickBox(counts, n, reviewEvery, rand);
    let items = groups[box].filter(notLast);
    if (!items.length) items = groups[box];

    const unseen = shuffle(items.filter(isUnseen), rand);
    const seen = shuffle(items.filter(p => !isUnseen(p)), rand);
    seen.sort((x, y) => (lastAsked.get(keyOf(x)) ?? -1) - (lastAsked.get(keyOf(y)) ?? -1));
    if (unseen.length && seen.length) return rand() < 0.5 ? unseen[0] : seen[0];
    return unseen[0] || seen[0];
  }

  exports.pickBox = pickBox;
  exports.pickProblem = pickProblem;
  exports.nextStreak = nextStreak;
  exports.groupBoxes = groupBoxes;
  exports.keyOf = keyOf;
  exports.BOXES = BOXES;
  exports.MAX_STREAK = MAX_STREAK;
})(typeof module !== "undefined" ? module.exports : (window.Leitner = {}));
