// Which problems to practise, from the chosen tables and factors.
// Loaded as a plain script in the browser, tested with `node --test`.
(function (exports) {
  // Every table times every factor, in order, each followed by its inverted
  // form (4 x 2 after 2 x 4) when inverted is set. No problem twice.
  function buildPool(tables, factors, inverted) {
    const seen = new Set();
    const pool = [];
    const add = (a, b) => {
      const k = a + "x" + b;
      if (!seen.has(k)) { seen.add(k); pool.push([a, b]); }
    };
    const sorted = xs => [...xs].sort((x, y) => x - y);
    for (const t of sorted(tables)) {
      for (const f of sorted(factors)) {
        add(t, f);
        if (inverted) add(f, t);
      }
    }
    return pool;
  }

  // The saved selection (JSON), or every table and factor 0-12, inverted
  // too, when there is none.
  function parseSelection(json) {
    try {
      const s = JSON.parse(json || "null");
      if (s) return { tables: new Set(s.tables), factors: new Set(s.factors), inverted: !!s.inverted };
    } catch {}
    const all = () => new Set(Array.from({ length: 13 }, (_, i) => i));
    return { tables: all(), factors: all(), inverted: true };
  }

  Object.assign(exports, { buildPool, parseSelection });
})(typeof module !== "undefined" ? module.exports : (window.Problems = {}));
