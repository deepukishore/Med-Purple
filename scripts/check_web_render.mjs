import { readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import assert from "node:assert/strict";

const fixturePath = resolve("scripts/.render-fixtures.json");
const fixtures = JSON.parse(readFileSync(fixturePath, "utf8"));
const server = await createServer({
  configFile: false,
  root: resolve("web"),
  cacheDir: resolve("node_modules/.vite-render-check"),
  optimizeDeps: { noDiscovery: true, include: [] },
  ssr: { noExternal: ["react-router-dom"] },
  server: { middlewareMode: true },
  plugins: [
    {
      name: "render-test-data",
      enforce: "pre",
      resolveId(id) {
        if (id === "react-router-dom") return "\0render-router";
      },
      load(id) {
        if (id === "\0render-router")
          return `import {createRequire} from 'node:module'; const router=createRequire(${JSON.stringify(import.meta.url)})('react-router-dom'); export const {Link,NavLink,Outlet,useLocation,useNavigate,useSearchParams,useParams}=router;`;
        if (id.replaceAll("\\", "/").endsWith("/hooks/useData.js")) {
          return `const fixtures=${JSON.stringify(fixtures)}; export default function useData(path) { const key=path.split('?')[0]; if (!(key in fixtures)) throw new Error('Missing fixture: '+key); return {data:fixtures[key],loading:false,error:'',reload:()=>{}}; }`;
        }
        if (id.replaceAll("\\", "/").endsWith("/context/AppContext.jsx")) {
          return `export const api={}; export const useApp=()=>({user:${JSON.stringify(fixtures.user)},notify:()=>{},changed:()=>{}});`;
        }
      },
    },
    react(),
  ],
});
try {
  for (const name of [
    "Home",
    "Learn",
    "Progress",
    "Notes",
    "Flashcards",
    "Planner",
    "Community",
    "Tutor",
    "Lectures",
    "Resources",
    "MCQs",
    "MedBytes",
    "Anatomy",
    "Legal",
    "NotFound",
  ]) {
    const { default: Page } = await server.ssrLoadModule(
      `/src/pages/${name}.jsx`,
    );
    const html = renderToString(
      React.createElement(MemoryRouter, null, React.createElement(Page)),
    );
    assert.ok(html.length > 100, `${name} did not render`);
    assert.ok(!html.includes("Coming soon"), `${name} still has a placeholder`);
    console.log(`PASS ${name}: populated page renders`);
  }
  const { default: Shell } = await server.ssrLoadModule(
    "/src/components/AppShell.jsx",
  );
  const html = renderToString(
    React.createElement(MemoryRouter, null, React.createElement(Shell)),
  );
  for (const destination of [
    "planner",
    "progress",
    "tutor",
    "community",
    "resources",
  ])
    assert.ok(html.includes(`href="/${destination}"`));
  console.log("PASS navigation: all study tools reachable");
} finally {
  await server.close();
  unlinkSync(fixturePath);
}
