// Smoke test: the page loads in jsdom, with its scripts, and can ask a
// question. No speech or audio here, so it runs silently.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

async function loadPage() {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", e => errors.push(e));
  const dom = await JSDOM.fromFile(path.join(__dirname, "..", "index.html"), {
    runScripts: "dangerously", resources: "usable", pretendToBeVisual: true, virtualConsole
  });
  await new Promise(r => dom.window.addEventListener("load", r));
  return { dom, doc: dom.window.document, errors };
}

test("the page loads without script errors and shows six boxes", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    assert.deepEqual(errors.map(e => e.message), []);
    const counts = [...doc.querySelectorAll("#boxes .count")].map(e => Number(e.textContent));
    assert.equal(counts.length, 6);
    assert.equal(counts.reduce((x, y) => x + y, 0), 169);   // 0-12 times 0-12
  } finally { dom.window.close(); }
});

test("'once' asks a question from the selection", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    doc.getElementById("once").click();
    await new Promise(r => setTimeout(r, 50));
    assert.deepEqual(errors.map(e => e.message), []);
    const a = Number(doc.getElementById("a").textContent);
    const b = Number(doc.getElementById("b").textContent);
    assert.ok(a >= 0 && a <= 12 && b >= 0 && b <= 12, `${a} x ${b}`);
    assert.equal(doc.querySelectorAll("#boxes .box.now").length, 1);
  } finally { dom.window.close(); }
});
