import { GoogleGenAI, ThinkingLevel, ApiError as GeminiApiError, type ThinkingConfig } from "@google/genai";
import { z } from "zod";
import {
  FrameSchema,
  VerdictSchema,
  type Answer,
  type Frame,
  type Verdict,
} from "../src/shared/schema.ts";
import { PERSONA, decidePrompt, framePrompt } from "./prompts.ts";

export { GeminiApiError };

const FALLBACK_MODEL = "gemini-2.5-flash";

/**
 * Rank a model name for this app: newest version first, then pro > flash > flash-lite,
 * with previews/experimental builds behind stable ones. Returns null for models that
 * are not general text models (image, tts, transcribe, live, ...).
 */
function rankModel(name: string): number | null {
  const m = /^gemini-(\d+(?:\.\d+)?)-(pro|flash-lite|flash)(?:-(.*))?$/.exec(name);
  if (!m) return null;
  const [, ver, tier, suffix = ""] = m;
  if (/image|tts|audio|transcribe|embedding|live|robotics|computer|customtools|thinking/.test(suffix)) return null;
  const tierScore = tier === "pro" ? 2 : tier === "flash" ? 1 : 0;
  const stable = suffix === "" ? 1 : 0;
  // version dominates, then stability, then tier
  return Number(ver) * 100 + stable * 10 + tierScore;
}

export function hasGeminiCredentials(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY });
  }
  return client;
}

let candidates: Promise<string[]> | null = null;
let resolvedForKey: string | undefined;
let retryAfter = 0;

/**
 * Ordered list of models to try: the pinned one, or the preferred list filtered to what
 * this key can see, followed by any newer text models we didn't anticipate. Cached per key.
 */
export function resolveGeminiCandidates(): Promise<string[]> {
  if (process.env.VERDICT_GEMINI_MODEL) return Promise.resolve([process.env.VERDICT_GEMINI_MODEL, FALLBACK_MODEL]);
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (key !== resolvedForKey) {
    candidates = null;
    resolvedForKey = key;
    client = null;
    retryAfter = 0;
  }
  if (!candidates && Date.now() < retryAfter) return Promise.resolve([FALLBACK_MODEL]);
  if (!candidates) {
    candidates = (async () => {
      try {
        const available = new Set<string>();
        const pager = await getClient().models.list({ config: { pageSize: 200 } });
        for await (const m of pager) {
          const name = (m.name ?? "").replace(/^models\//, "");
          if (!m.supportedActions || m.supportedActions.includes("generateContent")) available.add(name);
        }
        const list = [...available]
          .map((n) => ({ n, r: rankModel(n) }))
          .filter((x): x is { n: string; r: number } => x.r !== null)
          .sort((a, b) => b.r - a.r)
          .map((x) => x.n);
        console.log("[verdict gemini] model order:", list.slice(0, 5).join(" > "));
        return list.length ? list : [FALLBACK_MODEL];
      } catch (e) {
        candidates = null; // retry discovery, but not more than once a minute
        retryAfter = Date.now() + 60_000;
        console.warn("[verdict gemini] model discovery failed, using", FALLBACK_MODEL, e instanceof Error ? e.message : e);
        return [FALLBACK_MODEL];
      }
    })();
  }
  return candidates;
}

export async function resolveGeminiModel(): Promise<string> {
  return (await resolveGeminiCandidates())[0];
}

const isTransient = (e: unknown) => e instanceof GeminiApiError && (e.status === 503 || e.status === 429 || e.status >= 500);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Gemini accepts standard JSON Schema but not every keyword; strip the noisy ones. */
function toGeminiSchema(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "$schema" || k === "additionalProperties") continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(z.toJSONSchema(schema));
}

/** Gemini 3+ takes a thinking level; 2.5 takes a token budget (-1 = automatic). */
function thinkingConfigFor(model: string, level: "low" | "high"): ThinkingConfig {
  if (/^gemini-2\./.test(model)) return { thinkingBudget: -1 };
  return { thinkingLevel: level === "high" ? ThinkingLevel.HIGH : ThinkingLevel.LOW };
}

async function generateJson<T>(schema: z.ZodType<T>, prompt: string, thinking: "low" | "high"): Promise<T> {
  const models = await resolveGeminiCandidates();
  let lastError: unknown;
  for (const [i, model] of models.slice(0, 4).entries()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const out = await generateWith(model, schema, prompt, thinking);
        console.log(`[verdict gemini] served by ${model}`);
        return out;
      } catch (e) {
        lastError = e;
        if (!isTransient(e)) throw e;
        console.warn(`[verdict gemini] ${model} transient error (${(e as GeminiApiError).status}), ${attempt === 0 ? "retrying" : i < models.length - 1 ? "falling back" : "giving up"}`);
        if (attempt === 0) await sleep(1500);
      }
    }
  }
  throw lastError;
}

async function generateWith<T>(model: string, schema: z.ZodType<T>, prompt: string, thinking: "low" | "high"): Promise<T> {
  const res = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: PERSONA,
      responseMimeType: "application/json",
      responseJsonSchema: toGeminiSchema(schema),
      thinkingConfig: thinkingConfigFor(model, thinking),
      temperature: 0.7,
      maxOutputTokens: 16000,
    },
  });
  const candidate = res.candidates?.[0];
  if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) {
    throw new Error(`Gemini stopped early (${candidate.finishReason}).`);
  }
  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned malformed JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new Error(`Gemini response failed validation: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  return parsed.data;
}

export async function geminiFrame(dilemma: string): Promise<Frame> {
  const frame = await generateJson(FrameSchema, framePrompt(dilemma), "low");
  return { ...frame, questions: frame.questions.slice(0, 3), options: frame.options.slice(0, 4) };
}

export async function geminiDecide(dilemma: string, frame: Frame, answers: Answer[]): Promise<Verdict> {
  return generateJson(VerdictSchema, decidePrompt(dilemma, frame, answers), "high");
}
