// Box selection for the Leitner boxes, kept free of the page so it can be
// tested with `node --test`. Loaded as a plain script in the browser.
(function (exports) {
  const REVIEW_EVERY = 10;

  // counts[i] is the number of problems that can be asked from box i,
  // n is the question number (1, 2, ...). Asks from the lowest non-empty
  // box, except every 10th question, which reviews one of the higher boxes.
  // A review picks box i with weight count/2^i, so each problem in box 1
  // is twice as likely as one in box 2, and so on.
  function pickBox(counts, n, rand = Math.random) {
    const nonEmpty = counts.map((c, i) => i).filter(i => counts[i] > 0);
    const higher = nonEmpty.slice(1);
    if (n % REVIEW_EVERY !== 0 || !higher.length) return nonEmpty[0];
    const weights = higher.map(i => counts[i] * Math.pow(2, -i));
    let r = rand() * weights.reduce((x, y) => x + y, 0);
    let k = 0;
    while (k < weights.length - 1 && r >= weights[k]) { r -= weights[k]; k++; }
    return higher[k];
  }

  exports.pickBox = pickBox;
})(typeof module !== "undefined" ? module.exports : (window.Leitner = {}));
