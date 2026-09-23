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

// Answers the question on screen with the given function of its answer.
async function answerOnce(doc, window, answerOf) {
  doc.getElementById("wait").value = "0.5";
  doc.getElementById("once").click();
  await new Promise(r => setTimeout(r, 50));
  const a = Number(doc.getElementById("a").textContent);
  const b = Number(doc.getElementById("b").textContent);
  for (const key of String(answerOf(a * b))) {
    doc.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true }));
  }
  // Wait until the answer is shown.
  for (let i = 0; i < 400 && !doc.getElementById("ans").classList.contains("shown"); i++) {
    await new Promise(r => setTimeout(r, 10));
  }
  return a * b;
}
const boxCounts = doc => [...doc.querySelectorAll("#boxes .count")].map(e => Number(e.textContent));

test("a correct answer moves the problem to box 1", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    const c = await answerOnce(doc, dom.window, c => c);
    assert.deepEqual(errors.map(e => e.message), []);
    assert.equal(doc.getElementById("ans").textContent, String(c));
    assert.deepEqual(boxCounts(doc), [168, 1, 0, 0, 0, 0]);
  } finally { dom.window.close(); }
});

test("a wrong answer keeps it in box 0, shows what was typed and insults when asked", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    doc.getElementById("insults").checked = true;
    const c = await answerOnce(doc, dom.window, c => c + 1);
    assert.deepEqual(errors.map(e => e.message), []);
    assert.equal(doc.getElementById("yours").textContent, `Du skrev ${c + 1}`);
    assert.match(doc.getElementById("spoken").textContent, /^[A-ZÅÄÖ].*[.?!]$/);
    assert.deepEqual(boxCounts(doc), [169, 0, 0, 0, 0, 0]);
  } finally { dom.window.close(); }
});

test("clicking a box lists its problems", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    const box0 = doc.querySelector("#boxes .box");
    assert.equal(box0.title, "169 uppgifter. Klicka för att se dem.");
    box0.click();
    assert.deepEqual(errors.map(e => e.message), []);
    assert.equal(doc.getElementById("dlgtitle").textContent, "Låda 0");
    assert.equal(doc.getElementById("dlgsub").textContent, "169 uppgifter, alla nya.");
    const items = doc.querySelectorAll("#dlglist li");
    assert.equal(items.length, 169);
    assert.equal(items[0].textContent, "0 × 0ny");
  } finally { dom.window.close(); }
});
