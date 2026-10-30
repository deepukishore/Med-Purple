import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import WebSocket from "ws";

const root = process.cwd();
const fixtures = JSON.parse(await fs.readFile(path.join(root, "scripts/.render-fixtures.json"), "utf8"));
const args = process.argv.slice(2);
const lesson = args[0] || "body-systems";
const viewportName = args[1] || "desktop";
const record = args.includes("--record");
const route = lesson === "library" ? "/anatomy-videos" : `/anatomy-videos/${lesson}`;
const viewport = viewportName === "mobile"
  ? { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }
  : { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false };
const stem = `${lesson}-${viewportName}`;
const out = path.join(root, "visual-audit/anatomy-animation");
const frameDir = path.join(root, "artifacts/anatomy-animation", `${stem}-frames`);
await fs.mkdir(out, { recursive: true });

const targetResponse = await fetch("http://127.0.0.1:9224/json/new?about:blank", { method: "PUT" });
if (!targetResponse.ok) throw new Error(`Chrome target creation failed: ${targetResponse.status}`);
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let commandId = 0;
const pending = new Map();
const logs = [];
const network = [];
const frames = [];
socket.on("message", (buffer) => {
  const message = JSON.parse(buffer.toString());
  if (message.id) {
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
    return;
  }
  if (message.method === "Runtime.exceptionThrown")
    logs.push({ type: "exception", text: message.params.exceptionDetails?.text || "JavaScript exception" });
  if (message.method === "Log.entryAdded" && message.params.entry.level === "error")
    logs.push({ type: "browser", text: message.params.entry.text });
  if (message.method === "Fetch.requestPaused") void fulfill(message.params);
  if (message.method === "Network.responseReceived") network.push({ status: message.params.response.status, url: message.params.response.url });
  if (message.method === "Network.loadingFailed") network.push({ failed: message.params.errorText, url: message.params.requestId });
  if (message.method === "Page.screencastFrame") {
    frames.push({ data: message.params.data, timestamp: message.params.metadata.timestamp });
    void send("Page.screencastFrameAck", { sessionId: message.params.sessionId }).catch(() => {});
  }
});

function send(method, params = {}) {
  const id = ++commandId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function fulfill(request) {
  const url = new URL(request.request.url);
  const endpoint = url.pathname.replace(/^\/api\/v1/, "");
  let status = 200;
  let body;
  if (endpoint === "/auth/refresh") {
    status = 401;
    body = { detail: "No saved session" };
  } else if (endpoint === "/auth/guest") {
    body = { access_token: "isolated-visual-audit-token", user: fixtures.user };
  } else if (endpoint === "/auth/me") {
    body = fixtures.user;
  } else {
    body = fixtures[endpoint] ?? [];
  }
  await send("Fetch.fulfillRequest", {
    requestId: request.requestId,
    responseCode: status,
    responseHeaders: [{ name: "Content-Type", value: "application/json; charset=utf-8" }],
    body: Buffer.from(JSON.stringify(body)).toString("base64"),
  });
}

async function evaluate(expression, awaitPromise = false) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
    userGesture: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: "*://*/api/v1/*", requestStage: "Request" }] });
  await send("Emulation.setDeviceMetricsOverride", viewport);
  await send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile, maxTouchPoints: viewport.mobile ? 5 : 1 });
  await send("Page.navigate", { url: "http://127.0.0.1:4173/" });
  await delay(650);
  await evaluate(`(() => { localStorage.removeItem('mp:anatomy-video-progress:v1'); localStorage.removeItem('mp:anatomy-video-recent:v1'); })()`);
  await send("Page.navigate", { url: `http://127.0.0.1:4173${route}` });
  await send("Page.bringToFront");

  const loaded = await evaluate(`new Promise(resolve => {
    const started = Date.now();
    const check = () => {
      const ready = document.querySelector('canvas') && document.body.innerText.includes('SCENE READY');
      const failed = document.body.innerText.includes('3D preview unavailable');
      if (ready || failed || Date.now() - started > 30000) resolve({ ready: Boolean(ready), failed, title: document.title, url: location.href });
      else setTimeout(check, 250);
    };
    check();
  })`, true);
  if (loaded?.url.includes("/login")) throw new Error(`Guest bootstrap did not reach ${route}: ${JSON.stringify(loaded)}`);
  const initialDiagnostics = lesson === "library" ? null : await evaluate(`(() => { const c=document.querySelector('canvas'); const p=c?.parentElement?.parentElement; const r=p?.getBoundingClientRect(); return {canvasCount:document.querySelectorAll('canvas').length, stageRect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null, ancestors:c?[c.parentElement,c.parentElement?.parentElement,c.parentElement?.parentElement?.parentElement].map(e=>({tag:e?.tagName,className:e?.className})):[], bodyText:document.body.innerText.slice(0,800)}; })()`);
  await delay(600);

  if (lesson !== "library") {
    await evaluate(`(() => { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); if(!seek) return false; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seek,'0.35'); seek.dispatchEvent(new Event('input',{bubbles:true})); seek.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await delay(350);
    const stage = initialDiagnostics.stageRect;
    if (initialDiagnostics.canvasCount > 0 && stage) {
      const stageImage = await send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { ...stage, scale: 1 },
      });
      await fs.writeFile(path.join(out, `${stem}-stage.png`), Buffer.from(stageImage.data, "base64"));
    }

    const inspectTime = lesson === "heart-anatomy" ? 7.5 : 4.5;
    if (initialDiagnostics.canvasCount > 0 && stage) {
      await evaluate(`(() => { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seek,'${inspectTime}'); seek.dispatchEvent(new Event('input',{bubbles:true})); seek.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      await delay(500);
      const chapterImage = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...stage, scale: 1 } });
      await fs.writeFile(path.join(out, `${stem}-chapter.png`), Buffer.from(chapterImage.data, "base64"));
    }

    if (record) {
      await fs.mkdir(frameDir, { recursive: true });
      await evaluate(`(() => { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seek,'0'); seek.dispatchEvent(new Event('input',{bubbles:true})); seek.dispatchEvent(new Event('change',{bubbles:true})); const s=document.querySelector('select[aria-label="Playback speed"]'); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'2'); s.dispatchEvent(new Event('change',{bubbles:true})); const b=document.querySelector('button[aria-label="Play lesson"]'); b?.click(); return {started:Boolean(b),speed:s?.value}; })()`);
      await send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 5 });
      await delay(18000);
      await send("Page.stopScreencast");
      for (let i = 0; i < frames.length; i += 1)
        await fs.writeFile(path.join(frameDir, `${String(i).padStart(4, "0")}.jpg`), Buffer.from(frames[i].data, "base64"));
    }
  }

  const metrics = await send("Page.getLayoutMetrics");
  const content = metrics.cssContentSize || metrics.contentSize;
  const pageImage = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    fromSurface: true,
    clip: { x: 0, y: 0, width: content.width, height: content.height, scale: 1 },
  });
  await fs.writeFile(path.join(out, `${stem}-page.png`), Buffer.from(pageImage.data, "base64"));
  const playbackState = lesson === "library" ? null : await evaluate(`(() => ({time:document.querySelector('input[aria-label="Seek through anatomy lesson"]')?.value, speed:document.querySelector('select[aria-label="Playback speed"]')?.value, button:document.querySelector('button[aria-label="Pause lesson"],button[aria-label="Play lesson"],button[aria-label="Resume lesson"],button[aria-label="Replay lesson"]')?.getAttribute('aria-label'), chapter:document.querySelector('[aria-current="step"]')?.innerText, annotations:document.querySelector('[aria-label="Current anatomical labels"]')?.innerText}))()`);
  console.log(JSON.stringify({ route, viewport, loaded, diagnostics: initialDiagnostics, playbackState, page: `${stem}-page.png`, stage: lesson === "library" || initialDiagnostics.canvasCount === 0 ? null : `${stem}-stage.png`, chapterStage: lesson === "library" ? null : `${stem}-chapter.png`, frameCount: frames.length, errors: logs, network: network.filter((entry) => entry.failed || (entry.status && entry.status >= 400)) }));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:9224/json/close/${target.id}`).catch(() => {});
}
