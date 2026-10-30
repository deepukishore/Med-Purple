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
const interactionCheck = args.includes("--interaction-check");
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
    body = { access_token: "isolated-visual-audit-token", user: fixtures.user };
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
  await send("Page.navigate", { url: `http://127.0.0.1:4173${route}` });
  await send("Page.bringToFront");

  const loaded = await evaluate(`new Promise(resolve => {
    const started = Date.now();
    const check = () => {
      const ready = Boolean(document.body && ${lesson === "library" ? "document.querySelectorAll('main article').length > 0" : "document.querySelector('canvas') && document.body.innerText.includes('SCENE READY')"});
      const failed = Boolean(document.body?.innerText.includes('3D preview unavailable'));
      if (ready || failed || Date.now() - started > ${lesson === "library" ? 12000 : 30000}) resolve({ ready: Boolean(ready), failed, title: document.title, url: location.href });
      else setTimeout(check, 250);
    };
    check();
  })`, true);
  if (loaded?.url.includes("/login")) throw new Error(`Guest bootstrap did not reach ${route}: ${JSON.stringify(loaded)}`);
  await evaluate(`document.activeElement instanceof HTMLElement && document.activeElement.blur()`);
  const initialDiagnostics = lesson === "library" ? null : await evaluate(`(() => { const c=document.querySelector('canvas'); const p=c?.parentElement?.parentElement; const r=p?.getBoundingClientRect(); return {canvasCount:document.querySelectorAll('canvas').length, stageRect:r?{x:r.x,y:r.y,width:r.width,height:r.height}:null, ancestors:c?[c.parentElement,c.parentElement?.parentElement,c.parentElement?.parentElement?.parentElement].map(e=>({tag:e?.tagName,className:e?.className})):[], bodyText:document.body.innerText.slice(0,800)}; })()`);
  await delay(600);
  let pauseState;
  let pausedTime;
  let resumed;
  let interactionState;

  if (interactionCheck && lesson !== "library") {
    await evaluate(`document.querySelector('button[aria-label="Pause lesson"]')?.click()`);
    await evaluate(`([...document.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Explore'))?.click()`);
    const before = await evaluate(`window.__mpAnatomyDebug?.()`);
    const { x, y, width, height } = initialDiagnostics.stageRect;
    const startX = Math.round(x + width * 0.52);
    const startY = Math.round(y + height * 0.55);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: startX, y: startY });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: startX, y: startY, button: "left", buttons: 1, clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: startX + 95, y: startY + 36, button: "left", buttons: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: startX + 95, y: startY + 36, button: "left", buttons: 0, clickCount: 1 });
    await delay(350);
    const after = await evaluate(`window.__mpAnatomyDebug?.()`);
    const delta = before?.camera && after?.camera
      ? Math.hypot(...before.camera.map((value, index) => after.camera[index] - value))
      : 0;
    interactionState = { dragMovedCamera: delta > 0.02, cameraDelta: Number(delta.toFixed(4)) };
    if (!interactionState.dragMovedCamera) throw new Error(`Canvas drag did not change the camera for ${lesson}: ${JSON.stringify(interactionState)}`);
  }

  if (record && lesson !== "library") {
    await fs.mkdir(frameDir, { recursive: true });
    const controlsReady = await evaluate(`new Promise(resolve => { const started=Date.now(); const check=()=> { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); const speed=document.querySelector('select[aria-label="Playback speed"]'); const button=document.querySelector('button[aria-label="Play lesson"],button[aria-label="Resume lesson"],button[aria-label="Replay lesson"]'); if(seek&&speed&&button) resolve({ready:true}); else if(Date.now()-started>20000) resolve({ready:false,url:location.href,body:document.body?.innerText?.slice(0,400),inputs:[...document.querySelectorAll('input,select')].map(e=>({tag:e.tagName,aria:e.getAttribute('aria-label')}))}); else setTimeout(check,200); }; check(); })`, true);
    if (!controlsReady?.ready) throw new Error(`Playback controls did not load: ${JSON.stringify(controlsReady)}`);
    const startPlayback = await evaluate(`(() => { try { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); const speed=document.querySelector('select[aria-label="Playback speed"]'); if(!seek||!speed) return {error:'playback controls not found',seek:Boolean(seek),speed:Boolean(speed)}; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seek,'0'); seek.dispatchEvent(new Event('input',{bubbles:true})); seek.dispatchEvent(new Event('change',{bubbles:true})); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(speed,'2'); speed.dispatchEvent(new Event('change',{bubbles:true})); const button=document.querySelector('button[aria-label="Play lesson"],button[aria-label="Resume lesson"],button[aria-label="Replay lesson"]'); button?.click(); return {started:Boolean(button),speed:speed.value}; } catch(error) { return {error:error.stack}; } })()`);
    if (!startPlayback?.started) throw new Error(`Could not start lesson recording: ${JSON.stringify(startPlayback)}`);
    await delay(900);
    pauseState = await evaluate(`(() => { const before=Number(document.querySelector('input[aria-label="Seek through anatomy lesson"]')?.value); document.querySelector('button[aria-label="Pause lesson"]')?.click(); return before; })()`);
    await delay(550);
    pausedTime = Number(await evaluate(`document.querySelector('input[aria-label="Seek through anatomy lesson"]')?.value`));
    if (pauseState == null || Math.abs(pausedTime - pauseState) > 0.4) throw new Error(`Pause did not hold the lesson time: ${pauseState} -> ${pausedTime}`);
    resumed = await evaluate(`(() => { const button=document.querySelector('button[aria-label="Resume lesson"],button[aria-label="Play lesson"]'); button?.click(); return Boolean(button); })()`);
    if (!resumed) throw new Error("Resume control was not available after pausing.");
    await send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: 1280, maxHeight: 720, everyNthFrame: 5 });
    await delay(18000);
    await send("Page.stopScreencast");
    for (let i = 0; i < frames.length; i += 1)
      await fs.writeFile(path.join(frameDir, `${String(i).padStart(4, "0")}.jpg`), Buffer.from(frames[i].data, "base64"));
    await evaluate(`(() => document.querySelector('button[aria-label="Pause lesson"]')?.click())()`);
  }

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

    const inspectTime = lesson === "heart-anatomy" ? 7.5 : 28.5;
    if (initialDiagnostics.canvasCount > 0 && stage) {
      await evaluate(`(() => { const seek=document.querySelector('input[aria-label="Seek through anatomy lesson"]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(seek,'${inspectTime}'); seek.dispatchEvent(new Event('input',{bubbles:true})); seek.dispatchEvent(new Event('change',{bubbles:true})); })()`);
      await delay(500);
      await evaluate(`window.__mpAnatomyDebug?.()`);
      await evaluate(`document.querySelector('[aria-label="Current anatomical labels"] button')?.click()`);
      await delay(250);
      const chapterImage = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...stage, scale: 1 } });
      await fs.writeFile(path.join(out, `${stem}-chapter.png`), Buffer.from(chapterImage.data, "base64"));
      const modelRect = await evaluate(`(() => { const canvas=document.querySelector('canvas'); const stage=canvas?.parentElement?.parentElement; if(!stage) return null; for(const child of stage.children) if(!child.contains(canvas)) child.style.visibility='hidden'; const r=stage.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height}; })()`);
      if (modelRect) {
        const modelImage = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { ...modelRect, scale: 1 } });
        await fs.writeFile(path.join(out, `${stem}-model.png`), Buffer.from(modelImage.data, "base64"));
        await evaluate(`(() => { const canvas=document.querySelector('canvas'); const stage=canvas?.parentElement?.parentElement; if(stage) for(const child of stage.children) child.style.visibility=''; })()`);
      }
    }

  }

  if (lesson === "library") {
    await evaluate(`new Promise(resolve => { const step=()=>{ const max=document.documentElement.scrollHeight-innerHeight; if(scrollY>=max){window.scrollTo(0,0);setTimeout(resolve,500);return;} window.scrollBy(0,Math.max(300,innerHeight*0.72));setTimeout(step,120);};step(); })`, true);
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
  if (lesson === "library" && viewport.mobile) {
    const viewportImage = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await fs.writeFile(path.join(out, "library-mobile-viewport.png"), Buffer.from(viewportImage.data, "base64"));
    await evaluate(`document.querySelector('main article')?.scrollIntoView({block:'start'})`);
    await delay(250);
    const lessonsImage = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    await fs.writeFile(path.join(out, "library-mobile-lessons-viewport.png"), Buffer.from(lessonsImage.data, "base64"));
    await evaluate(`window.scrollTo(0,0)`);
  }
  const playbackState = lesson === "library" ? null : await evaluate(`(() => ({time:document.querySelector('input[aria-label="Seek through anatomy lesson"]')?.value, speed:document.querySelector('select[aria-label="Playback speed"]')?.value, button:document.querySelector('button[aria-label="Pause lesson"],button[aria-label="Play lesson"],button[aria-label="Resume lesson"],button[aria-label="Replay lesson"]')?.getAttribute('aria-label'), chapter:document.querySelector('[aria-current="step"]')?.innerText, annotations:document.querySelector('[aria-label="Current anatomical labels"]')?.innerText}))()`);
  const selectedStructure = lesson === "library" ? null : await evaluate(`[...document.querySelectorAll('[aria-live="polite"]')].map(node=>node.querySelector('strong')).find(Boolean)?.innerText || null`);
  const sceneDebug = lesson === "library" ? null : await evaluate(`window.__mpAnatomyDebug?.()`);
  console.log(JSON.stringify({ route, viewport, loaded, diagnostics: initialDiagnostics, playbackState, selectedStructure, sceneDebug, interactionCheck: interactionState, page: `${stem}-page.png`, stage: lesson === "library" || initialDiagnostics.canvasCount === 0 ? null : `${stem}-stage.png`, chapterStage: lesson === "library" ? null : `${stem}-chapter.png`, modelOnly: lesson === "library" ? null : `${stem}-model.png`, frameCount: frames.length, pauseCheck: record && lesson !== "library" ? { pausedAt: pauseState, heldAt: pausedTime, resumed } : null, errors: logs, network: network.filter((entry) => entry.failed || (entry.status && entry.status >= 400)) }));
} finally {
  socket.close();
  await fetch(`http://127.0.0.1:9224/json/close/${target.id}`).catch(() => {});
}
