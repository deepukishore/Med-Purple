// Uses the isolated SQLite API (scripts/run_mcq_test_api.py), Vite 4173, Chrome debug 9224.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const base = "http://127.0.0.1:8002/api/v1";
async function request(actor, path, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${actor.access_token}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = response.status === 204 ? null : await response.json();
  assert.ok(response.ok, `${path}: ${JSON.stringify(data)}`);
  return data;
}
async function actor(name) {
  const session = await fetch(base + "/auth/guest", {
    method: "POST",
    headers: { "X-Client": "native" },
  }).then((r) => r.json());
  const { id, email, is_guest, ...profile } = session.user;
  session.user = await request(session, "/auth/me", "PATCH", {
    ...profile,
    name,
  });
  return session;
}
const asker = await actor("Maya Learning"),
  helper = await actor("Arjun Helper");
let current = asker;
const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let sequence = 0;
const waiting = new Map(),
  errors = [];
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
  const m = JSON.parse(event.data);
  if (m.id) {
    const pending = waiting.get(m.id);
    if (!pending) return;
    clearTimeout(pending.timer);
    waiting.delete(m.id);
    m.error
      ? pending.reject(new Error(JSON.stringify(m.error)))
      : pending.resolve(m.result);
  }
  if (m.method === "Runtime.exceptionThrown")
    errors.push(m.params.exceptionDetails);
  if (m.method === "Fetch.requestPaused") {
    const { requestId, request: r } = m.params;
    const active = current;
    try {
      const url = new URL(r.url),
        path = url.pathname.replace("/api/v1", "");
      let status = 200,
        value;
      if (path === "/auth/refresh") value = active;
      else {
        const response = await fetch(base + path + url.search, {
          method: r.method,
          headers: {
            Authorization: `Bearer ${active.access_token}`,
            "Content-Type": "application/json",
          },
          ...(!["GET", "HEAD"].includes(r.method) ? { body: r.postData } : {}),
        });
        status = response.status;
        value = status === 204 ? null : await response.json();
        if (status >= 500) errors.push({ path, status, value });
      }
      await send("Fetch.fulfillRequest", {
        requestId,
        responseCode: status,
        responseHeaders: [{ name: "Content-Type", value: "application/json" }],
        body: Buffer.from(JSON.stringify(value)).toString("base64"),
      });
    } catch (e) {
      errors.push(String(e));
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
  for (let n = 0; n < 120; n++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `Not ready: ${expression}\n${await evaluate("document.body.innerText")}`,
  );
}
async function click(text) {
  const expr = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`;
  await until(`!!(${expr})`);
  await evaluate(`(${expr}).click()`);
}
async function fill(selector, value) {
  await evaluate(
    `(()=>{const element=document.querySelector(${JSON.stringify(selector)});const proto=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));})()`,
  );
}
async function visit(path, text) {
  await send("Page.navigate", { url: "http://localhost:4173" + path });
  await until(`document.body.innerText.includes(${JSON.stringify(text)})`);
  await evaluate("document.fonts.ready");
}
async function viewport(width) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(
    "new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))",
  );
  const dimensions = await evaluate(
    "({width:innerWidth,actual:document.documentElement.scrollWidth,items:[...document.querySelectorAll('main *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,5).map(e=>e.textContent.slice(0,50))})",
  );
  assert.ok(dimensions.actual <= width + 1, JSON.stringify(dimensions));
}
async function screenshot(name) {
  await evaluate("window.scrollTo(0,0)");
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
  await visit("/community", "Your medical community.");
  await click("Create a post");
  await fill("main form input", "A useful medical study resource");
  await fill(
    "main form textarea",
    "Sharing a textbook chapter and study approach with our medical community.",
  );
  await click("Publish post");
  await until(
    "document.body.innerText.includes('A useful medical study resource') && !document.querySelector('main form input')",
  );
  const postId = new URL(await evaluate("location.href")).searchParams.get(
    "post",
  );
  assert.ok(postId);
  await until(
    "document.querySelector('[aria-label=\"App-wide XP level\"]').textContent.includes('20 XP')",
  );
  current = helper;
  await visit(`/community?post=${postId}`, "Join the conversation");
  await until("document.body.innerText.includes('Maya Learning')");
  await click("0 appreciations");
  await fill(
    "main form textarea",
    "Thanks — this makes a useful starting point for revision.",
  );
  await click("Post reply");
  await until("document.body.innerText.includes('1 reply')");
  await request(helper, "/saved", "POST", {
    kind: "note",
    title: "Study note",
    subject: "Physiology",
    content: "Revision notes from this session.",
  });
  await request(helper, "/medbytes/conduction/complete", "POST");
  await request(helper, "/anatomy/lv/studied", "PUT");
  await request(helper, "/mcqs/q01/answer", "POST", {
    selected_index: 3,
    request_id: crypto.randomUUID(),
  });
  const card = await request(helper, "/saved", "POST", {
    kind: "flashcard",
    title: "Recall card",
    subject: "Physiology",
    content: "My recall answer.",
  });
  await request(helper, `/flashcards/${card.id}/review`, "POST", {
    rating: "good",
  });
  assert.equal((await request(helper, "/progress")).xp, 97);
  current = asker;
  await visit("/doubts", "Every doubt deserves an answer.");
  await click("Ask a doubt");
  await fill(
    "main form input",
    "How should I approach this physiology concept?",
  );
  await fill(
    "main form textarea",
    "I have read the chapter, but I am unsure how the ideas connect. Could someone explain their reasoning?",
  );
  await click("Post doubt");
  await until(
    "document.body.innerText.includes('Open doubt') && !document.querySelector('main form input')",
  );
  const doubtId = new URL(await evaluate("location.href")).searchParams.get(
    "post",
  );
  assert.ok(doubtId);
  current = helper;
  await visit(`/doubts?post=${doubtId}`, "Share an answer with your reasoning");
  await fill(
    "main form textarea",
    "Start by separating the definitions, then connect them with the worked example in your textbook. Here is the reasoning I used.",
  );
  await click("Post answer");
  await until("document.body.innerText.includes('1 answer')");
  assert.equal(
    await evaluate(
      "[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Mark as solved'))",
    ),
    false,
  );
  current = asker;
  await visit(`/doubts?post=${doubtId}`, "Mark as solved");
  await click("Mark as solved");
  await until("document.body.innerText.includes('Accepted solution')");
  const helperProfile = await request(asker, `/profiles/${helper.user.id}`);
  assert.equal(helperProfile.xp, 132);
  assert.equal(helperProfile.level, 2);
  assert.equal(helperProfile.solutions, 1);
  await until("document.body.innerText.includes('Level 2 · 132 XP')");
  await screenshot("doubts-solution-desktop");
  for (const width of [320, 390, 768, 1440]) await viewport(width);
  await evaluate(
    `document.querySelector('a[href="/students/${helper.user.id}"]').click()`,
  );
  await until("document.body.innerText.includes('Accepted solutions')");
  assert.ok(
    await evaluate("document.body.innerText.includes('Level 2 · 132 XP')"),
  );
  assert.equal(
    await evaluate("document.querySelectorAll('input[type=email]').length"),
    0,
  );
  await screenshot("student-profile-desktop");
  await viewport(390);
  await screenshot("student-profile-mobile");
  await visit("/students", "Meet the students.");
  await fill("main input[type=search]", "Arjun");
  await until(
    "document.body.innerText.includes('Arjun Helper') && !document.querySelector('main').innerText.includes('Maya Learning')",
  );
  await visit("/community", "A useful medical study resource");
  await screenshot("community-mobile");
  await viewport(1440);
  await screenshot("community-desktop");
  current = helper;
  await visit("/profile", "Your study profile");
  await until(
    "document.querySelector('[aria-label=\"App-wide XP level\"]').textContent.includes('132 XP')",
  );
  await visit("/progress", "Ways to earn XP");
  await until(
    "document.body.innerText.includes('Have your answer accepted as a solution')",
  );
  for (const width of [320, 390, 768, 1440]) await viewport(width);
  await screenshot("app-xp-progress");
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    "PASS: two-student community posting/replies/appreciation, doubts/accepted solution, ownership controls, cross-app XP, public/private profiles, student search, persistence, and 320/390/768/1440px layouts.",
  );
} finally {
  await request(asker, "/auth/me", "DELETE");
  await request(helper, "/auth/me", "DELETE");
  await send("Page.close").catch(() => {});
  socket.close();
}
