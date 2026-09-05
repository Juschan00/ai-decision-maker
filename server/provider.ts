import type { Answer, Engine, Frame, Verdict } from "../src/shared/schema.ts";
import { claudeDecide, claudeFrame, hasClaudeCredentials } from "./claude.ts";
import { geminiDecide, geminiFrame, hasGeminiCredentials, resolveGeminiModel } from "./gemini.ts";

export type Provider = {
  engine: Exclude<Engine, "offline">;
  frame: (dilemma: string) => Promise<Frame>;
  decide: (dilemma: string, frame: Frame, answers: Answer[]) => Promise<Verdict>;
  describe: () => Promise<string>;
};

const gemini: Provider = {
  engine: "gemini",
  frame: geminiFrame,
  decide: geminiDecide,
  describe: resolveGeminiModel,
};
const claude: Provider = {
  engine: "claude",
  frame: claudeFrame,
  decide: claudeDecide,
  describe: async () => process.env.VERDICT_MODEL ?? "claude-opus-5",
};

/**
 * VERDICT_PROVIDER=gemini|claude|offline forces a choice; otherwise the first
 * provider with credentials wins, Gemini first.
 */
export function pickProvider(): Provider | null {
  const forced = process.env.VERDICT_PROVIDER?.toLowerCase();
  if (forced === "offline") return null;
  if (forced === "gemini") return hasGeminiCredentials() ? gemini : null;
  if (forced === "claude") return hasClaudeCredentials() ? claude : null;
  if (hasGeminiCredentials()) return gemini;
  if (hasClaudeCredentials()) return claude;
  return null;
}
