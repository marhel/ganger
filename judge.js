// Judging answers and timing the thinking time.
// Loaded as a plain script in the browser, tested with `node --test`.
(function (exports) {
  // Harder problems get more thinking time: base * (1 + answer/144).
  const thinkMs = (baseSec, c) => baseSec * 1000 * (1 + c / 144);

  const CORRECT_SETTLE_MS = 250;   // a correct answer ends the wait this soon
  const WRONG_SETTLE_MS = 2000;    // a wrong answer left alone this long ends it

  // Whether the wait for an answer to c is over at time now: "timeout" when
  // the time is up, "early" when a correct answer has stood for 250 ms or a
  // wrong one for 2 s since the last edit (typedAt), else null. Any edit
  // restarts both clocks, so there's always time to correct.
  function waitOutcome({ now, end, typed, typedAt, c }) {
    if (now >= end) return "timeout";
    if (typed === "") return null;
    const settle = Number(typed) === c ? CORRECT_SETTLE_MS : WRONG_SETTLE_MS;
    return now - typedAt >= settle ? "early" : null;
  }

  // Time ran out while typing the start of the right answer ("10" for 108):
  // too slow rather than wrong. It keeps its box. No answer at all
  // (distracted?) also leaves the box alone; only an actual attempt moves
  // the problem.
  function judge(typed, c, ended) {
    const correct = typed !== "" && Number(typed) === c;
    const late = typed !== "" && !correct && ended === "timeout" && String(c).startsWith(typed);
    const wrong = typed !== "" && !correct && !late;
    return { correct, wrong, late, record: correct || wrong };
  }

  Object.assign(exports, { thinkMs, waitOutcome, judge });
})(typeof module !== "undefined" ? module.exports : (window.Judge = {}));
