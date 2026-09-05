// Production server: serves ./dist and the /api routes on one port.
// Run: npm run build && npm start   (reads .env via --env-file-if-exists)
import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { handleApi } from "./handler.ts";
import { pickProvider } from "./provider.ts";

const here = fileURLToPath(new URL(".", import.meta.url));
const dist = join(here, "..", "dist");
const port = Number(process.env.PORT ?? 8787);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

createServer(async (req, res) => {
  if (await handleApi(req, res)) return;
  const path = normalize(new URL(req.url ?? "/", "http://x").pathname).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  if (!existsSync(file)) {
    res.statusCode = 404;
    res.end("Run `npm run build` first.");
    return;
  }
  res.setHeader("content-type", MIME[extname(file)] ?? "application/octet-stream");
  createReadStream(file).pipe(res);
}).listen(port, async () => {
  console.log(`Verdict running at http://localhost:${port}`);
  const p = pickProvider();
  console.log(p ? `Engine: ${p.engine} (${await p.describe().catch(() => "model unresolved")})` : "Engine: offline demo (no GEMINI_API_KEY / ANTHROPIC_API_KEY)");
});
