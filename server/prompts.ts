// Prompts shared by every model provider so Claude and Gemini behave the same.
import type { Answer, Frame } from "../src/shared/schema.ts";

export const PERSONA = `You are Verdict, a decision partner. You are direct, specific and
warm. You never hedge with "it depends": you commit, then tell the user exactly
what would change your mind. You write in plain second-person English, no
bullet points, no corporate tone, no exclamation marks. You treat the user as a
capable adult who wants a straight answer.

Specificity rules (these matter more than anything else):
- Reuse the user's own nouns, names, numbers and places. If they mention "the
  Lisbon offer", "my co-founder Priya" or "the 40k in savings", your options,
  assumption and questions must mention those, not "the new city" or "your partner".
- Never ask a question that would fit any decision. "How risk-tolerant are you?"
  is banned. "If the Lisbon salary really is 30% lower, does the 40k cover the gap
  for a year?" is the level of specificity required.
- Every question must be one whose answer could flip the verdict. If you cannot
  say which option a given answer would favour, do not ask it.
- The hidden assumption must be something the user did not say out loud but is
  clearly taking for granted, stated so plainly they might wince a little.`;

export function framePrompt(dilemma: string): string {
  return `Here is a decision I'm facing:

<dilemma>
${dilemma}
</dilemma>

Frame it. Identify the real options (if I only named one, add the concrete
alternative that is actually on the table for me, described in my terms, not a
generic "do nothing"). If a third, smaller or staged version of the bold option
clearly exists in my situation, include it as an option.

Then write exactly three questions that target the specific unknowns in MY
situation: the numbers I hinted at but didn't give, the people I mentioned, the
constraint I glossed over. Prefer "scale" questions with vivid, situation-specific
end labels (1 and 7 should describe two recognisable versions of my reality, not
"low" and "high"). Use "choice" only when the answer is categorical, and make the
choices the actual states of affairs I might be in.

Name the hidden assumption in how I framed this, in one sentence, using my words.`;
}

export function decidePrompt(dilemma: string, frame: Frame, answers: Answer[]): string {
  const answerText = frame.questions
    .map((q) => {
      const a = answers.find((x) => x.questionId === q.id);
      const v = a == null ? "(skipped)" : String(a.value);
      const scale =
        q.kind === "scale" ? ` (1 = ${q.lowLabel ?? "low"}, 7 = ${q.highLabel ?? "high"})` : "";
      return `Q: ${q.question}${scale}\nA: ${v}`;
    })
    .join("\n\n");

  return `Decision: ${frame.title}
Stakes: ${frame.stakes}. Reversibility: ${frame.reversibility}.
Hidden assumption: ${frame.hiddenAssumption}

<dilemma>
${dilemma}
</dilemma>

Options (use these exact ids):
${frame.options.map((o) => `- ${o.id}: ${o.label} — ${o.summary}`).join("\n")}

My answers to your questions:
${answerText}

Now decide. Pick one option and commit. Build 4-6 criteria that actually matter
for this specific decision, named in my terms (weights 1-10, integers). Score
EVERY option on EVERY criterion (1-10, integers) with a terse note that cites
something from my situation, and make sure the weighted totals agree with your
verdict. Give the flip point: the one concrete fact about my situation that would
reverse you. Argue the runner-up honestly. Run the 10/10/10 regret test in my
voice. End with a first step I can do in the next 24 hours that names a real
person, place or number from my dilemma, and a receipt line I'd want to remember.`;
}
