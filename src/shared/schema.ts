import { z } from "zod";

// ---------- Step 1: framing (options + interrogation questions) ----------

export const OptionSchema = z.object({
  id: z.string().describe("short slug, e.g. 'take-job'"),
  label: z.string().describe("2-5 word name of the option"),
  summary: z.string().describe("one sentence restating the option neutrally"),
});

export const QuestionSchema = z.object({
  id: z.string().describe("short slug"),
  question: z
    .string()
    .describe("a sharp question whose answer could plausibly change the verdict"),
  why: z.string().describe("one short clause: why this matters for THIS decision"),
  kind: z.enum(["scale", "choice"]),
  lowLabel: z.string().nullable().describe("scale only: what 1 means"),
  highLabel: z.string().nullable().describe("scale only: what 7 means"),
  choices: z.array(z.string()).nullable().describe("choice only: 2-4 short choices"),
});

export const FrameSchema = z.object({
  title: z.string().describe("the decision in 3-8 words, as a headline"),
  stakes: z.enum(["low", "medium", "high"]),
  reversibility: z.enum(["reversible", "partly", "one-way-door"]),
  options: z.array(OptionSchema).describe("2-4 options, inferred if not stated"),
  questions: z.array(QuestionSchema).describe("exactly 3 questions"),
  hiddenAssumption: z
    .string()
    .describe("the assumption baked into how the user framed this"),
});
export type Frame = z.infer<typeof FrameSchema>;
export type Option = z.infer<typeof OptionSchema>;
export type Question = z.infer<typeof QuestionSchema>;

// ---------- Step 2: verdict ----------

export const CriterionSchema = z.object({
  id: z.string(),
  name: z.string().describe("2-4 words"),
  weight: z.number().describe("integer 1-10, how much this should matter"),
  why: z.string().describe("one clause on why this weight"),
});

export const ScoreSchema = z.object({
  optionId: z.string(),
  criterionId: z.string(),
  score: z.number().describe("integer 1-10"),
  note: z.string().describe("max 12 words"),
});

export const VerdictSchema = z.object({
  optionId: z.string().describe("id of the recommended option"),
  headline: z
    .string()
    .describe("the verdict as a decisive 4-9 word sentence, second person"),
  confidence: z.number().describe("integer 0-100"),
  rationale: z.string().describe("2-3 plain sentences, no hedging"),
  criteria: z.array(CriterionSchema).describe("4-6 criteria"),
  scores: z
    .array(ScoreSchema)
    .describe("one score for every (option, criterion) pair"),
  flipPoint: z
    .string()
    .describe("the single fact that, if true, would reverse this verdict"),
  devilsAdvocate: z
    .string()
    .describe("the strongest honest case for the runner-up, 2 sentences"),
  regret: z.object({
    tenMinutes: z.string().describe("how you'll feel 10 minutes after choosing"),
    tenMonths: z.string(),
    tenYears: z.string(),
  }),
  firstStep: z.string().describe("a concrete action doable in the next 24 hours"),
  receipt: z.string().describe("one memorable line for the decision receipt, max 14 words"),
});
export type Verdict = z.infer<typeof VerdictSchema>;
export type Criterion = z.infer<typeof CriterionSchema>;
export type Score = z.infer<typeof ScoreSchema>;

// ---------- Request bodies ----------

export type Answer = { questionId: string; value: string | number };

export type FrameRequest = { dilemma: string };
export type DecideRequest = { dilemma: string; frame: Frame; answers: Answer[] };

export type Engine = "gemini" | "claude" | "offline";
export type FrameResponse = { frame: Frame; engine: Engine };
export type DecideResponse = { verdict: Verdict; engine: Engine };
