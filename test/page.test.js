// Smoke test: the page loads in jsdom, with its scripts, and can ask a
// question. No speech or audio here, so it runs silently.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { JSDOM, VirtualConsole, requestInterceptor } = require("jsdom");

// Serves the project's files as http://ganger.test/..., since pages from
// file: URLs get no localStorage in jsdom. Anything else (the web fonts)
// gets an empty answer, so the tests never touch the network.
const ROOT = path.join(__dirname, "..");
const BASE = "http://ganger.test/";
const serveFiles = requestInterceptor(request => {
  if (!request.url.startsWith(BASE)) return new Response("");
  const body = fs.readFileSync(path.join(ROOT, new URL(request.url).pathname));
  return new Response(body, { headers: { "Content-Type": "text/javascript" } });
});

async function loadPage(storage = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", e => errors.push(e));
  const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
  const dom = new JSDOM(html, {
    url: BASE + "index.html", resources: { interceptors: [serveFiles] },
    runScripts: "dangerously", pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      for (const k in storage) window.localStorage.setItem(k, JSON.stringify(storage[k]));
    }
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

test("the saved selection, boxes and settings are read at start", async () => {
  const { dom, doc, errors } = await loadPage({
    "gangertabell-urval": { tables: [2], factors: [3, 4], inverted: false },
    "gangertabell-irad": { "2x3": 1, "2x4": 5 },
    "gangertabell-settings": { reviewEvery: "4" }
  });
  try {
    assert.deepEqual(errors.map(e => e.message), []);
    assert.deepEqual(boxCounts(doc), [0, 1, 0, 0, 0, 1]);
    assert.equal(doc.getElementById("reviewEvery").value, "4");
    assert.equal(doc.getElementById("reviewOut").textContent, "4");
  } finally { dom.window.close(); }
});

test("old box numbers are migrated", async () => {
  const { dom, doc } = await loadPage({
    "gangertabell-urval": { tables: [2], factors: [3, 4], inverted: false },
    "gangertabell-lador": { "2x3": 1002 }
  });
  try {
    assert.deepEqual(boxCounts(doc), [1, 0, 1, 0, 0, 0]);
    assert.equal(dom.window.localStorage.getItem("gangertabell-lador"), null);
  } finally { dom.window.close(); }
});

test("moving the review slider saves it", async () => {
  const { dom, doc } = await loadPage();
  try {
    const slider = doc.getElementById("reviewEvery");
    slider.value = "7";
    slider.dispatchEvent(new dom.window.Event("input"));
    assert.equal(doc.getElementById("reviewOut").textContent, "7");
    const saved = JSON.parse(dom.window.localStorage.getItem("gangertabell-settings"));
    assert.equal(saved.reviewEvery, "7");
  } finally { dom.window.close(); }
});

test("with no thinking time the answer is shown at once and no box changes", async () => {
  const { dom, doc, errors } = await loadPage();
  try {
    doc.getElementById("wait").value = "0";
    doc.getElementById("once").click();
    await new Promise(r => setTimeout(r, 50));
    assert.deepEqual(errors.map(e => e.message), []);
    const a = Number(doc.getElementById("a").textContent);
    const b = Number(doc.getElementById("b").textContent);
    assert.equal(doc.getElementById("ans").textContent, String(a * b));
    assert.deepEqual(boxCounts(doc), [169, 0, 0, 0, 0, 0]);
  } finally { dom.window.close(); }
});

test("'Börja om' needs a second click, then empties the boxes", async () => {
  const { dom, doc } = await loadPage({ "gangertabell-irad": { "2x3": 3 } });
  try {
    assert.deepEqual(boxCounts(doc), [168, 0, 0, 1, 0, 0]);
    const reset = doc.getElementById("resetBoxes");
    reset.click();
    assert.match(reset.textContent, /^Säker\?/);
    assert.deepEqual(boxCounts(doc), [168, 0, 0, 1, 0, 0]);
    reset.click();
    assert.equal(reset.textContent, "Börja om");
    assert.deepEqual(boxCounts(doc), [169, 0, 0, 0, 0, 0]);
  } finally { dom.window.close(); }
});

test("an answer is saved as [box, due], and such entries are read back", async () => {
  const { dom, doc } = await loadPage({
    "gangertabell-urval": { tables: [2], factors: [3, 4], inverted: false },
    "gangertabell-irad": { "2x3": [3, 1234] }
  });
  try {
    assert.deepEqual(boxCounts(doc), [1, 0, 0, 1, 0, 0]);
    const before = Date.now();
    await answerOnce(doc, dom.window, c => c);   // 2 x 4, the only one in box 0
    const [box, due] = JSON.parse(dom.window.localStorage.getItem("gangertabell-irad"))["2x4"];
    assert.equal(box, 1);
    assert.ok(due >= before + 4 * 60e3 && due <= Date.now() + 6 * 60e3, String(due - before));
  } finally { dom.window.close(); }
});
