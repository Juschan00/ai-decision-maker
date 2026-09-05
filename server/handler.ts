import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import { GeminiApiError } from "./gemini.ts";
import { pickProvider } from "./provider.ts";
import type { DecideRequest, FrameRequest } from "../src/shared/schema.ts";

function readJson<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}") as T);
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(data));
}

function errorMessage(e: unknown): { status: number; message: string } {
  if (e instanceof GeminiApiError) {
    if (e.status === 400 && /API key/i.test(e.message)) return { status: 401, message: "Gemini rejected the API key. Check GEMINI_API_KEY in .env." };
    if (e.status === 401 || e.status === 403) return { status: 401, message: "Gemini rejected the API key. Check GEMINI_API_KEY in .env." };
    if (e.status === 429) return { status: 429, message: "Gemini rate limit or quota hit. Try again in a moment." };
    if (e.status === 404) return { status: 502, message: `Gemini model not found. Set VERDICT_GEMINI_MODEL in .env. (${e.message})` };
    return { status: 502, message: `Gemini API error ${e.status}: ${e.message}` };
  }
  if (e instanceof Anthropic.AuthenticationError)
    return { status: 401, message: "Anthropic rejected the API key. Check ANTHROPIC_API_KEY in .env." };
  if (e instanceof Anthropic.RateLimitError)
    return { status: 429, message: "Rate limited by Anthropic. Try again in a moment." };
  if (e instanceof Anthropic.BadRequestError)
    return { status: 400, message: `Bad request to Anthropic: ${e.message}` };
  if (e instanceof Anthropic.APIError)
    return { status: 502, message: `Anthropic API error ${e.status}: ${e.message}` };
  if (e instanceof Anthropic.APIConnectionError)
    return { status: 502, message: "Could not reach the Anthropic API." };
  return { status: 500, message: e instanceof Error ? e.message : "Unknown error" };
}

/** Returns true if the request was handled (so callers can fall through otherwise). */
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url ?? "";
  if (!url.startsWith("/api/")) return false;
  const provider = pickProvider();

  if (url === "/api/status") {
    if (!provider) return send(res, 200, { engine: "offline", model: null }), true;
    const model = await provider.describe().catch(() => null);
    send(res, 200, { engine: provider.engine, model });
    return true;
  }
  if (req.method !== "POST") {
    send(res, 405, { error: "POST only" });
    return true;
  }
  if (!provider) {
    send(res, 503, { error: "no-credentials", message: "No GEMINI_API_KEY or ANTHROPIC_API_KEY is set on the server." });
    return true;
  }

  try {
    if (url === "/api/frame") {
      const { dilemma } = await readJson<FrameRequest>(req);
      if (!dilemma?.trim()) return send(res, 400, { error: "dilemma required" }), true;
      const frame = await provider.frame(dilemma.trim());
      send(res, 200, { frame, engine: provider.engine });
      return true;
    }
    if (url === "/api/decide") {
      const { dilemma, frame, answers } = await readJson<DecideRequest>(req);
      if (!dilemma || !frame) return send(res, 400, { error: "dilemma and frame required" }), true;
      const verdict = await provider.decide(dilemma, frame, answers ?? []);
      send(res, 200, { verdict, engine: provider.engine });
      return true;
    }
    send(res, 404, { error: "not found" });
  } catch (e) {
    const { status, message } = errorMessage(e);
    console.error(`[verdict api] ${provider.engine}:`, message);
    send(res, status, { error: "api", message });
  }
  return true;
}
