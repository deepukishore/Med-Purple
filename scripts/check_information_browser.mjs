// Smoke-check public information pages with the API deliberately unavailable.
// Requires Vite on 4173 and an isolated Chrome debugging session on 9224.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const policies = JSON.parse(readFileSync("shared/legal.json", "utf8"));
const origin = process.env.DESIGN_CHECK_ORIGIN || "http://127.0.0.1:4173";
const target = await fetch("http://127.0.0.1:9224/json/new?about:blank", {
  method: "PUT",
}).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.onopen = resolve;
  socket.onerror = reject;
});
let id = 0;
const pending = new Map(),
  errors = [];
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const key = ++id;
    const timeout = setTimeout(() => {
      pending.delete(key);
      reject(Error(`Timeout: ${method}`));
    }, 20000);
    pending.set(key, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id: key, method, params }));
  });
}
socket.onmessage = async (event) => {
  const message = JSON.parse(event.data);
  if (message.id) {
    const p = pending.get(message.id);
    if (!p) return;
    clearTimeout(p.timeout);
    pending.delete(message.id);
    message.error
      ? p.reject(Error(JSON.stringify(message.error)))
      : p.resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown")
    errors.push(message.params.exceptionDetails);
  if (message.method === "Fetch.requestPaused")
    await send("Fetch.fulfillRequest", {
      requestId: message.params.requestId,
      responseCode: 503,
      responseHeaders: [{ name: "Content-Type", value: "application/json" }],
      body: Buffer.from(
        JSON.stringify({ detail: "API unavailable for public-page check" }),
      ).toString("base64"),
    });
};
async function evaluate(expression) {
  const r = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (r.exceptionDetails) throw Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
}
async function until(expression) {
  for (let n = 0; n < 150; n++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(`Not ready: ${expression}`);
}
async function visit(path, title) {
  await send("Page.navigate", { url: origin + path });
  await until(
    `document.querySelector('h1')?.textContent===${JSON.stringify(title)}`,
  );
  await evaluate("document.fonts.ready.then(()=>true)");
}
async function screenshot(name) {
  const metrics = await send("Page.getLayoutMetrics");
  const r = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: metrics.cssContentSize.height,
      scale: 1,
    },
  });
  writeFileSync(
    `artifacts/information-review/${name}.png`,
    Buffer.from(r.data, "base64"),
  );
}
try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] });
  mkdirSync("artifacts/information-review", { recursive: true });
  for (const width of [1440, 390, 320]) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    for (const [path, title] of [
      ["/about", policies.about.title],
      ["/legal", "Clarity, in one place."],
      ...policies.pages.map((p) => [p.path, p.title]),
    ]) {
      await visit(path, title);
      assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1);
      assert.ok(
        await evaluate("document.documentElement.scrollWidth <= innerWidth+1"),
        `${path} overflows at ${width}`,
      );
      assert.ok(
        await evaluate(
          "!!document.querySelector('footer a[href=\"/about\"]') && !!document.querySelector('footer a[href=\"/legal\"]')",
        ),
      );
      if (path === "/about")
        for (const name of policies.founders)
          assert.ok(
            await evaluate(
              `document.querySelector('main').innerText.includes(${JSON.stringify(name)})`,
            ),
          );
      if (path === "/legal")
        assert.equal(
          await evaluate(
            "document.querySelectorAll('[aria-label=\"Legal policies\"] a').length",
          ),
          policies.pages.length,
        );
      if (policies.pages.some((p) => p.path === path)) {
        assert.ok(
          await evaluate(
            "document.querySelector('main').innerText.includes('Draft for review')",
          ),
        );
        const page = policies.pages.find((p) => p.path === path);
        assert.equal(
          await evaluate("document.querySelectorAll('article section').length"),
          policies[page.key].length,
        );
        assert.ok(
          await evaluate(
            "[...document.querySelectorAll('[aria-label=\"On this page\"] a')].every(a=>document.querySelector(a.getAttribute('href')))",
          ),
        );
      }
      if (width !== 320 && ["/about", "/legal", "/privacy"].includes(path))
        await screenshot(`${path.slice(1)}-${width}`);
    }
    await visit("/login", "Welcome back.").catch(async () => {
      // Account form requires API; footer must still offer public navigation.
      await until("!!document.querySelector('footer a[href=\"/about\"]')");
    });
    assert.ok(
      await evaluate("document.documentElement.scrollWidth <= innerWidth+1"),
      `Account footer overflows at ${width}`,
    );
    await evaluate(
      "document.querySelector('footer a[href=\"/about\"]').click()",
    );
    await until(
      `document.querySelector('h1')?.textContent===${JSON.stringify(policies.about.title)}`,
    );
    console.log(
      `PASS ${width}px: About, legal centre, ${policies.pages.length} policies, footer navigation, API failure, no overflow`,
    );
  }
  assert.deepEqual(errors, []);
} finally {
  await fetch(`http://127.0.0.1:9224/json/close/${target.id}`);
  socket.close();
}
