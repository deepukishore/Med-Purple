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
    requests.push(path + url.search);
    let responseCode = 200;
    let value =
      path === "/auth/refresh"
        ? { access_token: "isolated-design-fixture", user: fixtures.user }
        : fixtures[path];
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
  throw new Error(
    `Page did not become ready: ${expression}; ` +
      JSON.stringify(
        await evaluate(
          `({href: location.href, text: document.body.innerText.slice(0, 500)})`,
        ),
      ),
  );
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
  if (path === "/") {
    await until(
      `document.body.innerText.includes("Continue as a guest") || document.body.innerText.includes(${JSON.stringify(expected)})`,
    );
    if (!(await evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`))) {
      await evaluate(
        `[...document.querySelectorAll('a')].find(a=>a.innerText.includes('Continue as a guest')).click()`,
      );
    }
  }
  await until(`document.body.innerText.includes(${JSON.stringify(expected)})`);
  await evaluate("document.fonts.ready.then(() => true)");
  await until(
    "!document.body.innerText.includes('Warming up the anatomy studio') && !document.body.innerText.includes('Preparing your study space')",
  );
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
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await viewport(320, 800);
  await visit("/", "See the body.");
  await screenshot("study-desk-320");
  await noOverflow("320px desk");
  await viewport(390, 844);
  await visit("/", "See the body.");
  await screenshot("study-desk-mobile");
  await noOverflow("390px desk");
  await viewport(768, 1024);
  await visit("/", "See the body.");
  await screenshot("study-desk-768");
  await noOverflow("768px desk");
  await viewport(1440, 1100);
  await visit("/", "See the body.");
  await screenshot("study-desk-desktop");
  await noOverflow("Desktop desk");
  console.log(
    "PASS 320, 390, 768, and 1440px study desk render without horizontal overflow",
  );
  if (process.argv.includes("--screenshots-only")) {
    await viewport(320, 800);
    await visit("/", "See the body.");
    if (!(await evaluate("document.documentElement.dataset.theme==='light'"))) {
      await evaluate(
        `document.querySelector('button[aria-label="Switch to light mode"]').click()`,
      );
      await until("document.documentElement.dataset.theme==='light'");
    }
    const reviewRoutes = [
      ["mcqs", "/mcqs", "One question closer."],
      ["medbytes", "/medbytes", "Big ideas. Small bytes."],
      ["anatomy", "/anatomy", "Explore anatomy, layer by layer."],
      ["community-stories", "/community", "Your medical community."],
      ["doubts", "/doubts", "Every doubt deserves an answer."],
    ];
    for (const [name, path, ready] of reviewRoutes) {
      for (const width of [320, 390, 768, 1440]) {
        await viewport(width, width < 600 ? 900 : 1000);
        await visit(path, ready);
        await noOverflow(`${path} at ${width}px`);
        if (width === 390 || width === 1440) await screenshot(`${name}-${width}`);
      }
      console.log(`PASS responsive ${path}: 320 / 390 / 768 / 1440px`);
    }
    for (const width of [390, 1440]) {
      await viewport(width, width < 600 ? 900 : 1000);
      await visit("/community", "Your medical community.");
      await evaluate(
        "document.querySelector('[aria-label=\"Study stories\"]').scrollIntoView({behavior:'instant',block:'start'})",
      );
      await screenshot(`stories-${width}`);
      await noOverflow(`Stories at ${width}px`);
    }
    console.log("PASS responsive Stories shelf: 390 / 1440px");
    await viewport(1440, 1000);
    await visit("/", "See the body.");
    if (!(await evaluate("document.documentElement.dataset.theme==='dark'")))
      await evaluate(
        `document.querySelector('button[aria-label="Switch to dark mode"]').click()`,
      );
    await until("document.documentElement.dataset.theme==='dark'");
    assert.equal(await evaluate("localStorage.getItem('mp:theme')"), "dark");
    const darkReviewRoutes = [
      ["study-desk-dark", "/", "See the body."],
      ["mcqs-dark", "/mcqs", "One question closer."],
      ["medbytes-dark", "/medbytes", "Big ideas. Small bytes."],
      ["anatomy-dark", "/anatomy", "Explore anatomy, layer by layer."],
      ["community-dark", "/community", "Your medical community."],
      ["doubts-dark", "/doubts", "Every doubt deserves an answer."],
    ];
    for (const [name, path, ready] of darkReviewRoutes) {
      for (const width of [390, 1440]) {
        await viewport(width, width < 600 ? 900 : 1000);
        await visit(path, ready);
        assert.equal(await evaluate("document.documentElement.dataset.theme"), "dark");
        await noOverflow(`${path} dark at ${width}px`);
        await screenshot(`${name}-${width}`);
      }
    }
    for (const width of [390, 1440]) {
      await viewport(width, width < 600 ? 900 : 1000);
      await visit("/community", "Your medical community.");
      await evaluate(
        "document.querySelector('[aria-label=\"Study stories\"]').scrollIntoView({behavior:'instant',block:'start'})",
      );
      await screenshot(`stories-dark-${width}`);
      await noOverflow(`Stories dark at ${width}px`);
    }
    console.log("PASS dark theme persistence and responsive route screenshots");
    process.exitCode = 0;
  }
  else {
    const correctIndex = fixtures.warmup_answers[0].answer.correct_index;
    await until(
      "document.querySelectorAll('[aria-label=\"Warm-up answer options\"] button').length===4",
    );
    await evaluate(
      `document.querySelectorAll('[aria-label="Warm-up answer options"] button')[${correctIndex}].click()`,
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lock in my answer')).click()`,
    );
    await until(
      "document.body.innerText.includes('Temporary test interruption')",
    );
    assert.equal(
      await evaluate(
        `document.querySelectorAll('[aria-label="Warm-up answer options"] button:disabled').length`,
      ),
      4,
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Lock in my answer')).click()`,
    );
    await until(
      "document.body.innerText.includes('Correct. Review the explanation to lock in the concept.')",
    );
    assert.equal(submissions.length, 2);
    assert.equal(
      submissions[0].request_id,
      submissions[1].request_id,
      "Retry changed the idempotency key",
    );
    await until(
      "document.body.innerText.includes('Saved to your real practice progress.')",
    );
    await evaluate(
      `document.querySelector('[aria-labelledby="quick-recall-title"]').scrollIntoView({behavior:'instant',block:'start'})`,
    );
    await screenshot("warmup-result-mobile");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Another question')).click()`,
    );
    await until(
      "!document.body.innerText.includes('Correct. Review the explanation to lock in the concept.') && document.querySelectorAll('[aria-label=\"Warm-up answer options\"] button:disabled').length===0",
    );
    const subject = fixtures["/mcqs"].subjects[0];
    await send("Page.navigate", {
      url: `${origin}/mcqs?set=3&subject=${encodeURIComponent(subject)}`,
    });
    await until(
      "document.querySelector('main')?.innerText.includes('Question 1')",
    );
    assert.ok(
      requests.some(
        (p) =>
          p.startsWith("/mcqs?") &&
          p.includes("limit=3") &&
          p.includes("shuffle=true") &&
          new URLSearchParams(p.split("?")[1]).get("subject") === subject,
      ),
    );
    await visit("/", "See the body.");
    await until("document.querySelector('[aria-label=\"Study stories\"]')");
    await viewport(1440, 1100);
    await evaluate(
      `document.querySelector('[aria-label="Matcha mood"]').click()`,
    );
    await until("document.documentElement.dataset.roomVibe==='matcha'");
    await visit("/", "See the body.");
    assert.equal(
      await evaluate("document.documentElement.dataset.roomVibe"),
      "matcha",
    );
    await screenshot("study-lounge-matcha");
    await evaluate(
      `document.querySelector('[aria-label="Lilac haze"]').click()`,
    );
    await viewport(390, 844);
    console.log(
      "PASS warm-up scoring/retry, stable submission ID, new question, 3-question subject sprint, buddy interaction, and saved room themes",
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Viva warm-up').click()`,
    );
    await until("document.body.innerText.includes('Now explain it.')");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Brain on low battery').click()`,
    );
    await until("document.body.innerText.includes('Tiny session.')");
    await evaluate(
      `document.querySelector('[aria-label="Find a study tool"]').click()`,
    );
    await until("document.querySelector('dialog').open");
    await evaluate(
      `(()=>{const input=document.querySelector('#tool-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'mistakes');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await until(
      "document.querySelector('dialog').innerText.includes('Review mistakes') && document.querySelectorAll('dialog a').length===1",
    );
    await evaluate("document.querySelector('dialog a').click()");
    await until(
      "location.search.includes('mode=mistakes') && document.querySelector('main').innerText.includes('One question closer.')",
    );
    await until(
      "document.querySelector('main').innerText.includes('Question 1')",
    );
    assert.ok(
      requests.some((p) => p.includes("mode=mistakes")),
      "Mistake shortcut did not request mistake mode",
    );
    await noOverflow("Mobile MCQs");
    await screenshot("mcqs-mobile");
    await visit("/learn", "For the way your brain works.");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Test myself').click()`,
    );
    await until(
      "document.querySelector('main').innerText.includes('Viva & recall cards') && !document.querySelector('main').innerText.includes('Anatomy lab')",
    );
    await visit("/notes", "Messy thoughts. Clearer medicine.");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent.includes('New note')).click()`,
    );
    await until("document.body.innerText.includes('Clinical topic')");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Clinical topic').click()`,
    );
    await until(
      "document.querySelector('textarea').value.includes('Differentials')",
    );
    await noOverflow("Note editor mobile");
    console.log(
      "PASS energy modes, tool search, mistake shortcut, toolkit filters, clinical note starter",
    );
    await visit("/", "See the body.");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='5 min').click()`,
    );
    await until("document.querySelector('[role=timer]').textContent==='05:00'");
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Start focus').click()`,
    );
    await until(
      "document.querySelector('#focus-timer').innerText.includes('Pause')",
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Pause').click()`,
    );
    await evaluate(
      `document.querySelector('[aria-label="Open focus room"]').click()`,
    );
    await until(
      "document.querySelector('[aria-labelledby=\"focus-room-title\"]').open",
    );
    await evaluate(
      `(()=>{const input=document.querySelector('#focus-intention');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Cardiac recall');input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
    );
    await evaluate(
      `[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent==='15 min').click()`,
    );
    await until(
      "document.querySelector('dialog[open] [role=timer]').textContent==='15:00'",
    );
    await noOverflow("Focus room at 390px");
    await screenshot("focus-room-mobile");
    await evaluate(
      `document.querySelector('[aria-label="Close focus room"]').click()`,
    );
    await until(
      "!document.querySelector('[aria-labelledby=\"focus-room-title\"]').open",
    );
    await visit("/", "See the body.");
    assert.equal(
      await evaluate("document.querySelector('#focus-intention').value"),
      "Cardiac recall",
    );
    assert.equal(
      await evaluate("document.querySelector('[role=timer]').textContent"),
      "15:00",
    );
    await evaluate(
      `[...document.querySelectorAll('button')].find(b=>b.textContent==='Viva warm-up').click()`,
    );
    await evaluate(
      `document.querySelector('[aria-label="Choose a study session"] a').click()`,
    );
    await until(
      "location.search==='?review=1' && document.body.innerText.includes('Reveal answer')",
    );
    console.log(
      "PASS focus-room controls, saved intention/duration, and direct viva review",
    );
    const routes = [
      ["/", "See the body."],
      ["/learn", "For the way your brain works."],
      ["/planner", "A little structure. More progress."],
      ["/progress", "Look how far you've come."],
      ["/notes", "Messy thoughts."],
      ["/flashcards", "Your viva voice starts here."],
      ["/community", "Your study circle."],
      ["/tutor", "A little help. A clearer head."],
      ["/resources", "Your curiosity toolkit."],
      ["/lectures", "Short lessons. Lasting connections."],
      ["/medbytes", "Big ideas. Small bytes."],
      ["/anatomy", "Get a feel for anatomy."],
      ["/mcqs", "One question closer."],
      ["/profile", "A space that’s yours."],
    ];
    for (const [path, ready] of routes) {
      await visit(path, ready);
      for (const width of [320, 390, 768, 1440]) {
        await viewport(width, 1000);
        await noOverflow(`${path} at ${width}px`);
      }
      if (["/learn", "/planner", "/progress"].includes(path))
        await screenshot(path.slice(1) + "-desktop");
      console.log(`PASS responsive ${path}: 320 / 390 / 768 / 1440px`);
    }
    await visit("/", "See the body.");
    await viewport(320, 800);
    await evaluate("document.documentElement.dataset.largeText='true'");
    await noOverflow("Large text study desk at 320px");
    assert.equal(errors.length, 0, JSON.stringify(errors));
    console.log("PASS no uncaught browser exceptions; all API data isolated");
  }
} finally {
  await send("Page.close").catch(() => {});
  socket.close();
}
