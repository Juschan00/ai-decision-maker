import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  FrameSchema,
  VerdictSchema,
  type Answer,
  type Frame,
  type Verdict,
} from "../src/shared/schema.ts";
import { PERSONA, decidePrompt, framePrompt } from "./prompts.ts";

const MODEL = process.env.VERDICT_MODEL ?? "claude-opus-5";

export function hasClaudeCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

export async function claudeFrame(dilemma: string): Promise<Frame> {
  const res = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    system: PERSONA,
    messages: [{ role: "user", content: framePrompt(dilemma) }],
    output_config: { effort: "medium", format: zodOutputFormat(FrameSchema) },
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (!res.parsed_output) throw new Error("Could not parse the framing response.");
  return res.parsed_output;
}

export async function claudeDecide(
  dilemma: string,
  frame: Frame,
  answers: Answer[],
): Promise<Verdict> {
  const res = await getClient().messages.parse({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: PERSONA,
    messages: [{ role: "user", content: decidePrompt(dilemma, frame, answers) }],
    output_config: { effort: "high", format: zodOutputFormat(VerdictSchema) },
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (!res.parsed_output) throw new Error("Could not parse the verdict response.");
  return res.parsed_output;
}
