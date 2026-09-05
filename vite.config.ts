import { existsSync, readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Mounts the same /api handler the production server uses into Vite's dev server. */
function verdictApi(): Plugin {
  return {
    name: "verdict-api",
    async configureServer(server) {
      const { handleApi } = await import("./server/handler.ts");
      server.middlewares.use((req, res, next) => {
        handleApi(req, res).then((handled) => {
          if (!handled) next();
        }, next);
      });
    },
  };
}

const SERVER_KEYS = ["GEMINI_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "VERDICT_PROVIDER", "VERDICT_MODEL", "VERDICT_GEMINI_MODEL"];

/**
 * Make .env available to the server-side handler (never exposed to the client bundle).
 * Parsed by hand rather than with loadEnv so that, when Vite restarts on a .env edit,
 * the file always wins over whatever this long-lived process was started with.
 */
function applyServerEnv() {
  const file = `${process.cwd()}/.env`;
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    if (!SERVER_KEYS.includes(key)) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[key] = value;
  }
}

export default defineConfig(() => {
  applyServerEnv();
  return {
    plugins: [react(), verdictApi()],
    server: { port: 5173 },
  };
});
