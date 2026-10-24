// Run after backend: python -m tests.export_render_fixtures.
// Uses a separate headless Chrome profile with remote debugging on port 9224.
// All API requests are intercepted with isolated database fixtures.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import assert from "node:assert/strict";

const fixtures = JSON.parse(
  readFileSync("scripts/.render-fixtures.json", "utf8"),
);
const origin = process.env.DESIGN_CHECK_ORIGIN || "http://127.0.0.1:4173";
const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0;
let warmupFailure = true;
const submissions = [];
const waiting = new Map(),
  errors = [],
  requests = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => {
      waiting.delete(id);
      reject(new Error(`Timeout: ${method}`));
    }, 20000);
    waiting.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
socket.onmessage = async (e) => {
  const message = JSON.parse(e.data);
  if (message.id) {
    const pending = waiting.get(message.id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    waiting.delete(message.id);
    message.error
      ? pending.reject(new Error(JSON.stringify(message.error)))
      : pending.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails);
  if (message.method === "Fetch.requestPaused") {
    const { requestId, request } = message.params;
    const url = new URL(request.url),
      path = url.pathname.replace("/api/v1", "");
    if (url.pathname.startsWith("/media/")) {
      const filename = url.pathname.split("/").pop();
      const type = filename.endsWith("mp4")
        ? "video/mp4"
        : filename.endsWith("vtt")
          ? "text/vtt"
          : "image/webp";
      await send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: type }],
        body: readFileSync("backend/app/media/" + filename).toString("base64"),
      });
      return;
    }
    requests.push(path + url.search);
    let responseCode = 200;
    let value =
      path === "/auth/refresh"
        ? { access_token: "isolated-design-fixture", user: fixtures.user }
        : fixtures[path];
    if (/^\/medbytes\/[^/]+\/save$/.test(path)) value = { saved: true };
    if (/^\/medbytes\/[^/]+\/complete$/.test(path)) value = { completed_today: 1 };
    if (/^\/mcqs\/[^/]+\/answer$/.test(path)) {
      const body = JSON.parse(request.postData);
      submissions.push(body);
      if (warmupFailure) {
        responseCode = 503;
        value = { detail: "Temporary test interruption. Retry your answer." };
        warmupFailure = false;
      } else {
        const saved = fixtures.warmup_answers[body.selected_index];
        value = saved.answer;
        fixtures["/progress"] = saved.progress;
        fixtures["/dashboard"] = saved.dashboard;
      }
    }
    if (value === undefined) errors.push({ unexpectedRequest: request.url });
    await send("Fetch.fulfillRequest", {
      requestId,
      responseCode: value === undefined ? 404 : responseCode,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(
        JSON.stringify(value ?? { detail: "Missing isolated fixture" }),
      ).toString("base64"),
    });
  }
};
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let n = 0; n < 80; n++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Page did not become ready: ${expression}`);
}
async function viewport(width, height = 1000) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    "new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))",
  );
}
async function visit(path, expected) {
  await send("Page.navigate", { url: origin + path });
  await until(`document.body.innerText.includes(${JSON.stringify(expected)})`);
  await evaluate("document.fonts.ready.then(() => true)");
}
async function screenshot(name) {
  await evaluate(
    "Promise.all(document.getAnimations().filter(a => a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(()=>{}))).then(()=>true)",
  );
  const result = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(
    `artifacts/design-review/${name}.png`,
    Buffer.from(result.data, "base64"),
  );
}
async function noOverflow(label) {
  const result = await evaluate(
    `({width: innerWidth, document: document.documentElement.scrollWidth, overflowing: [...document.querySelectorAll('main *')].filter(e=>{const r=e.getBoundingClientRect();return r.width && r.right > innerWidth+1}).slice(0,5).map(e=>({tag:e.tagName,text:e.textContent.slice(0,60),right:e.getBoundingClientRect().right}))})`,
  );
  assert.ok(
    result.document <= result.width + 1,
    `${label}: ${JSON.stringify(result)}`,
  );
}

mkdirSync("artifacts/design-review", { recursive: true });
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", {
    patterns: [{ urlPattern: "*/api/v1/*" }, { urlPattern: "*/media/*" }],
  });
  await viewport(1440, 1000);
  await visit("/medbytes", "Big ideas. Small bytes.");
  await until("document.querySelectorAll('video').length === 1");
  const first = await evaluate(
    "document.querySelector('video').getAttribute('src')",
  );
  await evaluate(`document.querySelector('[aria-label="Next video"]').click()`);
  await until(
    `document.querySelector('video').getAttribute('src') !== ${JSON.stringify(first)}`,
  );
  assert.equal(await evaluate("document.querySelectorAll('video').length"), 1);
  await evaluate(
    `document.querySelector('[aria-label="Previous video"]').click()`,
  );
  await until(
    `document.querySelector('video').getAttribute('src') === ${JSON.stringify(first)}`,
  );
  await evaluate(
    `document.querySelector('[aria-label^="Video feed"]').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))`,
  );
  await until(
    `document.querySelector('video').getAttribute('src') !== ${JSON.stringify(first)}`,
  );
  await evaluate(
    `document.querySelector('[aria-label^="Video feed"]').dispatchEvent(new WheelEvent('wheel', {deltaY: -100, bubbles: true, cancelable: true}))`,
  );
  await until(
    `document.querySelector('video').getAttribute('src') === ${JSON.stringify(first)}`,
  );
  console.log(
    "PASS one mounted video, previous/next, arrow keys, wheel navigation",
  );
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Add to Notes').click()`);
  await until("document.body.innerText.includes('Added to Notes')");
  await evaluate(`document.querySelector('[aria-label="Next video"]').click()`);
  await until(`document.querySelector('video').getAttribute('src') !== ${JSON.stringify(first)}`);
  await evaluate(`document.querySelector('[aria-label="Previous video"]').click()`);
  await until(`document.querySelector('video').getAttribute('src') === ${JSON.stringify(first)}`);
  assert.ok(await evaluate(`[...document.querySelectorAll('button')].some(b => b.textContent === 'Added to Notes' && b.disabled)`));
  console.log("PASS saved note state survives reel navigation");
  await screenshot("medbytes-reels-desktop");
  for (const width of [320, 390, 768, 1440]) {
    await viewport(width, 844);
    await noOverflow(`MedBytes ${width}`);
    assert.equal(
      await evaluate("document.querySelectorAll('video').length"),
      1,
    );
  }
  await viewport(390, 844);
  await screenshot("medbytes-reels-mobile");
  await evaluate(`document.querySelector('details').open = true`);
  await noOverflow("Transcript open");
  assert.ok(
    await evaluate("document.querySelector('details').scrollHeight > 0"),
  );
  console.log(
    "PASS responsive single reel at 320/390/768/1440px and transcript",
  );
  await viewport(1440, 1000);
  await visit("/", "let's make it click.");
  await screenshot("study-desk-depth");
  await noOverflow("Depth study desk");
  await visit("/learn", "For the way your brain works.");
  await noOverflow("Dimensional toolkit");
  await viewport(320, 844);
  await noOverflow("Dimensional toolkit mobile");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log("PASS no uncaught browser exceptions");
} finally {
  await send("Page.close").catch(() => {});
  socket.close();
}
