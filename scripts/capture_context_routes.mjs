import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";

const root = process.cwd();
const fixtures = JSON.parse(await fs.readFile(path.join(root, "scripts/.render-fixtures.json"), "utf8"));
const out = path.join(root, "visual-audit/anatomy-animation");
await fs.mkdir(out, { recursive: true });

function makeClient(socket) {
  let id = 0;
  const pending = new Map();
  const logs = [];
  socket.on("message", (buffer) => {
    const message = JSON.parse(buffer.toString());
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
      return;
    }
    if (message.method === "Fetch.requestPaused") void fulfill(message.params, send);
    if (message.method === "Runtime.exceptionThrown") logs.push(message.params.exceptionDetails?.text || "Runtime exception");
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") logs.push(message.params.entry.text);
  });
  function send(method, params = {}) {
    const commandId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ id: commandId, method, params }));
    });
  }
  async function evaluate(expression, awaitPromise = false) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result?.value;
  }
  return { send, evaluate, logs };
}

async function fulfill(request, send) {
  const url = new URL(request.request.url);
  const endpoint = url.pathname.replace(/^\/api\/v1/, "");
  let body = fixtures[endpoint] ?? [];
  if (endpoint === "/auth/refresh" || endpoint === "/auth/guest") body = { access_token: "isolated-visual-audit-token", user: fixtures.user };
  if (endpoint === "/auth/me") body = fixtures.user;
  await send("Fetch.fulfillRequest", {
    requestId: request.requestId,
    responseCode: 200,
    responseHeaders: [{ name: "content-type", value: "application/json; charset=utf-8" }, { name: "access-control-allow-origin", value: "*" }, { name: "access-control-allow-headers", value: "*" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}

const pages = [{ id: "home", route: "/", ready: "document.querySelector('h1') && document.querySelector('[aria-label*=\"Interactive skeletal reference model\"]')" }, { id: "anatomy", route: "/anatomy", ready: "document.querySelector('[aria-label=\"Anatomy study mode\"]')" }];
const sizes = [{ id: "desktop", width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, { id: "mobile", width: 390, height: 844, deviceScaleFactor: 1, mobile: true }];
const requestedPage = process.argv[2];
const requestedSize = process.argv[3];
const results = [];

for (const page of pages.filter((item) => !requestedPage || item.id === requestedPage)) {
  for (const viewport of sizes.filter((item) => !requestedSize || item.id === requestedSize)) {
    const targetResponse = await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" });
    if (!targetResponse.ok) throw new Error(`Chrome target creation failed: ${targetResponse.status}`);
    const target = await targetResponse.json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    const { send, evaluate, logs } = makeClient(socket);
    try {
      await send("Page.enable");
      await send("Runtime.enable");
      await send("Log.enable");
      await send("Fetch.enable", { patterns: [{ urlPattern: "*://*/api/v1/*", requestStage: "Request" }] });
      await send("Emulation.setDeviceMetricsOverride", viewport);
      await send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });
      await send("Page.navigate", { url: `http://127.0.0.1:4173${page.id === "home" ? "/login" : page.route}` });
      await send("Page.bringToFront");
      if (page.id === "home") {
        const guest = await evaluate(`new Promise(resolve=>{const begin=Date.now();const poll=()=>{const link=[...document.querySelectorAll('a')].find(a=>a.innerText.includes('Continue as a guest')); if(link){link.click();resolve(true)} else if(Date.now()-begin>20000) resolve(false); else setTimeout(poll,250)};poll()})`, true);
        if (!guest) throw new Error("Could not start the isolated guest session for the Home screenshot");
      }
      const loaded = await evaluate(`new Promise(resolve=>{const begin=Date.now();const poll=()=>{if(${page.ready}) resolve(true); else if(Date.now()-begin>45000) resolve(false); else setTimeout(poll,250)};poll()})`, true);
      if (!loaded) {
        const diagnostic = await evaluate(`({title:document.title,url:location.href,text:document.body?.innerText?.slice(0,1200),hasHeading:!!document.querySelector('h1'),hasModel:!!document.querySelector('[aria-label*=\"Interactive skeletal reference model\"]')})`);
        throw new Error(`${page.route} did not reach its ready state: ${JSON.stringify({ ...diagnostic, logs })}`);
      }
      await evaluate(`document.querySelector('[aria-label*=\"Interactive skeletal reference model\"], [aria-label=\"Whole-body anatomy viewer\"]')?.scrollIntoView({block:'center'})`);
      const scene = await evaluate(`new Promise(resolve=>{const begin=Date.now();const poll=()=>{const home=${page.id === "home"};const model=document.querySelector('[aria-label*=\"Interactive skeletal reference model\"] canvas, [aria-label*=\"Human body atlas\"] canvas');const text=document.body.innerText;const status=text.match(/MODEL READY|SCENE READY|STATIC VIEW|Loading the skeleton/)?.[0]||null;const ready=home?(text.includes('MODEL READY')||text.includes('STATIC VIEW')):(!!model&&!text.includes('Loading the skeleton'));if(ready||Date.now()-begin>30000)resolve({canvas:!!model,status,ready});else setTimeout(poll,250)};poll()})`, true);
      await new Promise((resolve) => setTimeout(resolve, 1750));
      await evaluate(`document.activeElement instanceof HTMLElement && document.activeElement.blur()`);
      await evaluate(`document.querySelector('.skip-link')?.style.setProperty('visibility','hidden','important')`);
      await evaluate(`document.documentElement.style.scrollBehavior='auto';window.scrollTo(0,0);new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`, true);
      const metrics = await send("Page.getLayoutMetrics");
      const content = metrics.cssContentSize || metrics.contentSize;
      const full = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: content.width, height: content.height, scale: 1 } });
      const stageRect = await evaluate(`(()=>{const s=document.querySelector('[aria-label*=\"Interactive skeletal reference model\"]')||document.querySelector('[aria-label=\"Whole-body anatomy viewer\"]');const r=s?.getBoundingClientRect();return r?{x:r.x,y:r.y,width:r.width,height:r.height}:null})()`);
      const stem = `${page.id}-${viewport.id}`;
      await fs.writeFile(path.join(out, `${stem}-page.png`), Buffer.from(full.data, "base64"));
      if (viewport.mobile) {
        await evaluate(`window.scrollTo({top:0,left:0,behavior:'instant'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`, true);
        const topImage = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
        await fs.writeFile(path.join(out, `${stem}-viewport.png`), Buffer.from(topImage.data, "base64"));
        const stageSelector = page.id === "home" ? '[aria-label*="Interactive skeletal reference model"]' : '[aria-label="Whole-body anatomy viewer"]';
        await evaluate(`document.querySelector(${JSON.stringify(stageSelector)})?.scrollIntoView({block:'center',behavior:'instant'});new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`, true);
        const sceneImage = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
        await fs.writeFile(path.join(out, `${stem}-scene-viewport.png`), Buffer.from(sceneImage.data, "base64"));
      }
      if (stageRect && stageRect.y >= 0) {
        const stage = await send("Page.captureScreenshot", { format: "png", fromSurface: true, clip: { ...stageRect, scale: 1 } });
        await fs.writeFile(path.join(out, `${stem}-stage.png`), Buffer.from(stage.data, "base64"));
      }
      const overlayState = await evaluate(`({shell:document.querySelector('[data-app-shell]')?.className,overlays:[...document.querySelectorAll('[data-player-overlay]')].map(node=>getComputedStyle(node).display),skipLink:getComputedStyle(document.querySelector('.skip-link')).top})`);
      results.push({ page: page.id, viewport: viewport.id, loaded, scene, width: content.width, height: content.height, overlayState, errors: logs });
    } finally {
      socket.close();
      await fetch(`http://127.0.0.1:9224/json/close/${target.id}`).catch(() => {});
    }
  }
}
console.log(JSON.stringify(results, null, 2));
