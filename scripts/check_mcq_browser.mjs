// Start scripts/run_mcq_test_api.py, Vite on 4173 and headless Chrome on 9224.
// Every API call is redirected to the isolated SQLite test API, never MySQL.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = "http://127.0.0.1:8002/api/v1";
const guest = await fetch(base + "/auth/guest", {
  method: "POST",
  headers: { "X-Client": "native" },
}).then((r) => r.json());
const headers = {
  Authorization: `Bearer ${guest.access_token}`,
  "Content-Type": "application/json",
};
const catalog = await fetch(base + "/mcqs", { headers }).then((r) => r.json());
const keys = {
  q01: 3,
  q02: 1,
  q03: 2,
  q04: 3,
  q05: 1,
  q06: 2,
  q07: 1,
  q08: 2,
  q09: 1,
  q10: 0,
  q11: 1,
  q12: 1,
};
const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0,
  failCompletion = true;
const waiting = new Map(),
  errors = [],
  completedBodies = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${method}`)),
      20000,
    );
    waiting.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const pending = waiting.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    waiting.delete(message.id);
    message.error
      ? pending.reject(new Error(JSON.stringify(message.error)))
      : pending.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails);
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    try {
      const url = new URL(request.url),
        path = url.pathname.replace("/api/v1", "");
      let status = 200,
        value;
      if (path === "/auth/refresh") value = guest;
      else {
        const response = await fetch(base + path + url.search, {
          method: request.method,
          headers,
          ...(!["GET", "HEAD"].includes(request.method)
            ? { body: request.postData }
            : {}),
        });
        status = response.status;
        value = status === 204 ? null : await response.json();
        if (path === "/mcqs/complete") {
          completedBodies.push(JSON.parse(request.postData));
          if (failCompletion) {
            failCompletion = false;
            status = 503;
            value = { detail: "Simulated lost completion response." };
          }
        }
      }
      await send("Fetch.fulfillRequest", {
        requestId,
        responseCode: status,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(value)).toString("base64"),
      });
    } catch (error) {
      errors.push(String(error));
      await send("Fetch.failRequest", { requestId, errorReason: "Failed" });
    }
  }
};
async function evaluate(expression) {
  const value = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (value.exceptionDetails)
    throw new Error(JSON.stringify(value.exceptionDetails));
  return value.result.value;
}
async function until(expression) {
  for (let n = 0; n < 100; n++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Not ready: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
}
async function click(text) {
  const expression = `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(text)} && !b.disabled)`;
  await until(`!!(${expression})`);
  await evaluate(`(${expression}).click()`);
}
async function answer(correct = true) {
  await until(
    "document.querySelectorAll('[aria-label=\"Answer options\"] button:not(:disabled)').length === 4",
  );
  const stem = await evaluate(
    "document.querySelector('article h2').textContent",
  );
  const question = catalog.items.find((q) => q.stem === stem);
  assert.ok(question, stem);
  const index = correct ? keys[question.id] : (keys[question.id] + 1) % 4;
  await evaluate(
    `document.querySelectorAll('[aria-label="Answer options"] button')[${index}].click()`,
  );
  await click("Check answer");
  await until("document.body.innerText.includes('Answer key:')");
}
async function viewport(width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))",
  );
  assert.ok(
    await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"),
    `Overflow at ${width}px`,
  );
}
async function screenshot(name) {
  await evaluate("document.fonts.ready");
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(
    `artifacts/design-review/${name}.png`,
    Buffer.from(result.data, "base64"),
  );
}
mkdirSync("artifacts/design-review", { recursive: true });
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await viewport(1440);
  await send("Page.navigate", { url: "http://localhost:4173/mcqs" });
  await until(
    "document.querySelectorAll('[aria-label=\"Answer options\"] button').length === 4",
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[aria-label=\"Difficulty levels\"] button').length",
    ),
    4,
  );
  await screenshot("mcq-levels-desktop");
  await viewport(390);
  await screenshot("mcq-levels-mobile");
  await viewport(1440);
  await evaluate(
    "const select = [...document.querySelectorAll('select')].find(s=>s.parentElement.textContent.includes('Set size')); select.value='3'; select.dispatchEvent(new Event('change',{bubbles:true}));",
  );
  await until("document.body.innerText.includes('Question 1 of 3')");
  await answer(false);
  await click("Next question");
  await answer();
  await click("Next question");
  await answer();
  await click("Finish session");
  await until(
    "document.body.innerText.includes('Simulated lost completion response')",
  );
  await click("Finish session");
  await until("document.body.innerText.includes('Answer key & explanations')");
  assert.deepEqual(
    completedBodies[0],
    completedBodies[1],
    "Completion retry must reuse saved answer IDs",
  );
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[aria-label=\"Answer key and explanations\"] article').length",
    ),
    3,
  );
  assert.ok(
    await evaluate("document.body.innerText.includes('2 of 3 correct')"),
  );
  await screenshot("mcq-review-desktop");
  await viewport(390);
  await screenshot("mcq-review-mobile");
  await click("Try again · 1 missed");
  await until("document.body.innerText.includes('Question 1 of 1')");
  assert.equal(
    await evaluate(
      "document.querySelectorAll('[aria-label=\"Answer key and explanations\"]').length",
    ),
    0,
  );
  await answer();
  await click("Finish session");
  await until(
    "document.body.innerText.includes('Level up! You reached level 2.')",
  );
  await click("Retry full set");
  await until("document.body.innerText.includes('Question 1 of 3')");
  for (let i = 0; i < 3; i++) {
    await answer();
    await click(i === 2 ? "Finish session" : "Next question");
  }
  await until("document.body.innerText.includes('+0 XP this round')");
  await click("Try Applied");
  await until("document.body.innerText.includes('Question 1 of 3')");
  for (let i = 0; i < 3; i++) {
    await answer();
    await click(i === 2 ? "Finish session" : "Next question");
  }
  await until("document.body.innerText.includes('Set cleared.')");
  await click("Try Challenge");
  await until("document.body.innerText.includes('Question 1 of 2')");
  for (let i = 0; i < 2; i++) {
    await answer();
    await click(i === 1 ? "Finish session" : "Next question");
  }
  await until(
    "document.body.innerText.includes('Level up! You reached level 4.')",
  );
  for (const width of [320, 390, 768, 1440]) await viewport(width);
  await screenshot("mcq-level-up");
  const progress = await fetch(base + "/progress", { headers }).then((r) =>
    r.json(),
  );
  assert.equal(progress.xp, 380);
  assert.equal(progress.mcq_journey.completed_sets, 5);
  assert.ok(progress.mcq_journey.tasks.every((task) => task.done));
  await send("Page.reload");
  await until("document.body.innerText.includes('380 XP')");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    "PASS: three tiers, scoring, answer keys, explanations, failed completion retry, missed-only retry, full replay, no XP farming, level-ups, persistence, and layouts at 320/390/768/1440px.",
  );
} finally {
  await fetch(base + "/auth/me", { method: "DELETE", headers });
  await send("Page.close").catch(() => {});
  socket.close();
}
