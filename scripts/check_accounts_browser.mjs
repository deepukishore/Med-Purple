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
let currentUser = { ...fixtures.user };
let registeredUser = null;
let registerBody = null;
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
        ? { access_token: "isolated-design-fixture", user: currentUser }
        : fixtures[path];
    if (path === "/auth/register") {
      registerBody = JSON.parse(request.postData);
      registeredUser = {
        ...currentUser,
        ...registerBody.profile,
        name: registerBody.name,
        email: registerBody.email,
        is_guest: false,
      };
      currentUser = registeredUser;
      value = { access_token: "isolated-account-fixture", user: currentUser };
    }
    if (path === "/auth/me" && request.method === "PATCH") {
      currentUser = { ...currentUser, ...JSON.parse(request.postData) };
      registeredUser = currentUser;
      value = currentUser;
    }
    if (path === "/auth/logout") {
      currentUser = { ...fixtures.user };
      value = { ok: true };
    }
    if (path === "/auth/login") {
      const input = JSON.parse(request.postData);
      if (input.password !== "a-long-test-password") {
        responseCode = 401;
        value = { detail: "Email or password is incorrect." };
      } else {
        currentUser = registeredUser;
        value = { access_token: "isolated-account-fixture", user: currentUser };
      }
    }
    if (/^\/medbytes\/[^/]+\/save$/.test(path)) value = { saved: true };
    if (/^\/medbytes\/[^/]+\/complete$/.test(path))
      value = { completed_today: 1 };
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

async function fill(label, value) {
  await evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find(e => e.textContent.startsWith(${JSON.stringify(label)}));
    const input = label.querySelector('input');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)});
    input.dispatchEvent(new Event('input', {bubbles: true}));
  })()`);
}
async function submit() {
  await evaluate("document.querySelector('main form').requestSubmit()");
}
mkdirSync("artifacts/design-review", { recursive: true });
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/v1/*" }] });
  await viewport(1440, 1000);
  await visit("/", "Good to see you again.");
  assert.equal(await evaluate("location.pathname"), "/login");
  await evaluate(
    `[...document.querySelectorAll('a')].find(a => a.textContent.includes('Continue as a guest')).click()`,
  );
  await until(
    "location.pathname === '/' && document.body.innerText.includes('Small steps.')",
  );
  await visit("/", "Good to see you again.");
  assert.equal(await evaluate("location.pathname"), "/login");
  console.log(
    "PASS login-first startup, explicit guest entry, and login again after guest reload",
  );
  await visit("/login", "Good to see you again.");
  await screenshot("account-login-desktop");
  for (const width of [320, 390, 768, 1440]) {
    await viewport(width, 844);
    await noOverflow(`Login ${width}`);
  }
  await visit("/create-account", "Make yourself at home.");
  await fill("Full name", "Asha Rao");
  await fill("Email address", "asha@example.com");
  await fill("Password", "a-long-test-password");
  await fill("Confirm password", "different-password");
  await submit();
  await until(
    "document.body.innerText.includes('Your passwords do not match.')",
  );
  await fill("Confirm password", "a-long-test-password");
  await submit();
  await until(
    "document.body.innerText.includes('Tell us about your journey.')",
  );
  await fill("Medical college", "Example Medical College");
  await fill("University", "Example University");
  await fill("Expected graduation year", "2029");
  await fill("Specialty interests", "Internal medicine");
  await fill("City / country", "Bengaluru");
  await screenshot("account-create-student-desktop");
  for (const width of [320, 390, 768, 1440]) {
    await viewport(width, 844);
    await noOverflow(`Signup ${width}`);
  }
  await viewport(390, 844);
  await screenshot("account-create-student-mobile");
  await submit();
  await until(
    "location.pathname === '/profile' && !!document.querySelector('[aria-label=\"Student profile summary\"]')",
  );
  assert.equal(registerBody.profile.graduation_year, 2029);
  assert.equal(registerBody.profile.specialty, "Internal medicine");
  assert.equal(registerBody.confirm, undefined);
  await fill("Medical college", "Updated Medical College");
  await submit();
  await until(
    "document.querySelector('[aria-label=\"Student profile summary\"]')?.textContent.includes('Updated Medical College')",
  );
  await visit("/profile", "Updated Medical College");
  await viewport(1440, 1000);
  await screenshot("student-profile-desktop");
  for (const width of [320, 390, 768, 1440]) {
    await viewport(width, 844);
    await noOverflow(`Profile ${width}`);
  }
  await evaluate(
    `[...document.querySelectorAll('button')].find(b => b.textContent === 'Sign out').click()`,
  );
  await until(
    "document.body.innerText.includes('Log in to an existing account')",
  );
  await visit("/login", "Good to see you again.");
  await fill("Email address", "asha@example.com");
  await fill("Password", "wrong-password");
  await submit();
  await until(
    "document.body.innerText.includes('Email or password is incorrect.')",
  );
  await fill("Password", "a-long-test-password");
  await submit();
  await until(
    "location.pathname === '/' && document.body.innerText.includes('Asha Rao')",
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(
    "PASS signup validation, profile submission and persistence, sign-out, login failure/success, responsive pages at 320/390/768/1440px; no browser exceptions.",
  );
} finally {
  await send("Page.close").catch(() => {});
  socket.close();
}
