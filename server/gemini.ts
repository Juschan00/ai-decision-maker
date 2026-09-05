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

/** Newest-first preference list. The first one the key can actually see wins. */
const PREFERRED = [
  "gemini-3.5-pro",
  "gemini-3.5-flash",
  "gemini-3-pro",
  "gemini-3-flash",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
];
const FALLBACK_MODEL = "gemini-2.5-flash";

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

let resolvedModel: Promise<string> | null = null;
let resolvedForKey: string | undefined;
let retryAfter = 0;
/** Pick the best generateContent-capable model this key can see; cached per process and key. */
export function resolveGeminiModel(): Promise<string> {
  if (process.env.VERDICT_GEMINI_MODEL) return Promise.resolve(process.env.VERDICT_GEMINI_MODEL);
  const key = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (key !== resolvedForKey) {
    resolvedModel = null;
    resolvedForKey = key;
    client = null;
    retryAfter = 0;
  }
  if (!resolvedModel && Date.now() < retryAfter) return Promise.resolve(FALLBACK_MODEL);
  if (!resolvedModel) {
    resolvedModel = (async () => {
      try {
        const available = new Set<string>();
        const pager = await getClient().models.list({ config: { pageSize: 200 } });
        for await (const m of pager) {
          const name = (m.name ?? "").replace(/^models\//, "");
          if (!m.supportedActions || m.supportedActions.includes("generateContent")) available.add(name);
        }
        const pick = PREFERRED.find((p) => available.has(p));
        if (pick) return pick;
        // Any gemini-3 or newer text model we didn't anticipate.
        const newer = [...available]
          .filter((n) => /^gemini-\d/.test(n) && !/image|tts|audio|embedding|live|robotics|computer-use/.test(n))
          .sort()
          .reverse();
        return newer[0] ?? FALLBACK_MODEL;
      } catch (e) {
        resolvedModel = null; // retry discovery, but not more than once a minute
        retryAfter = Date.now() + 60_000;
        console.warn("[verdict gemini] model discovery failed, using", FALLBACK_MODEL, e instanceof Error ? e.message : e);
        return FALLBACK_MODEL;
      }
    })();
  }
  return resolvedModel;
}

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
  const model = await resolveGeminiModel();
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
