// Box selection for the Leitner boxes, kept free of the page so it can be
// tested with `node --test`. Loaded as a plain script in the browser.
(function (exports) {
  // counts[i] is the number of problems that can be asked from box i.
  // Picks a non-empty box: box 0 has weight 1, box 1 weight 1/2, ...
  // regardless of how many problems each box holds.
  function pickBox(counts, rand = Math.random) {
    const candidates = counts.map((c, i) => i).filter(i => counts[i] > 0);
    const weights = candidates.map(i => Math.pow(2, -i));
    let r = rand() * weights.reduce((x, y) => x + y, 0);
    let k = 0;
    while (k < weights.length - 1 && r >= weights[k]) { r -= weights[k]; k++; }
    return candidates[k];
  }

  exports.pickBox = pickBox;
})(typeof module !== "undefined" ? module.exports : (window.Leitner = {}));
