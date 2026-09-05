// Offline demo engine. Runs entirely in the browser when the server has no
// ANTHROPIC_API_KEY. It is deliberately generic: it exists so the product can be
// explored end-to-end, not to impersonate real reasoning.
import type { Answer, Frame, Option, Verdict } from "../shared/schema.ts";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "option";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "quit my job" -> "quit your job" */
function yourify(p: string): string {
  return p
    .replace(/^i\s+/i, "")
    .replace(/\bmy\b/gi, "your")
    .replace(/\bme\b/gi, "you")
    .replace(/\bmine\b/gi, "yours")
    .replace(/\bi'm\b/gi, "you're")
    .replace(/\bi\b/g, "you");
}

/** "quit my job" -> "you quit your job" */
function secondPerson(p: string): string {
  const t = yourify(p);
  return /^(you|don't|do not|keep|stay|wait)\b/i.test(t) ? t : `you ${t}`;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
const rnd = (seed: string) => (hash(seed) % 1000) / 1000;

export function extractOptions(dilemma: string): Option[] {
  const text = dilemma.replace(/\s+/g, " ").trim();
  let parts: string[] = [];
  const lines = dilemma.split(/\n/).map((l) => l.replace(/^[\s\-*\d.)]+/, "").trim()).filter(Boolean);
  if (lines.length >= 3) parts = lines.slice(1);
  if (parts.length < 2) {
    const m = text.match(/(?:should i|do i|whether to|between)?\s*(.+?)\s+(?:\bor\b|\bvs\.?\b|\bversus\b)\s+(.+?)(?:[?.]|$)/i);
    if (m) parts = [m[1], m[2]];
  }
  parts = parts.map((p) => p.replace(/^(should i|do i|to)\s+/i, "").replace(/[?.]$/, "").trim()).filter((p) => p.length > 1 && p.length < 80);
  if (parts.length < 2) {
    const core = text.replace(/^(should i|do i|is it worth|whether to)\s+/i, "").replace(/[?.]$/, "").trim();
    parts = [core.length > 3 && core.length < 70 ? core : "Go for it", "Don't — keep things as they are"];
  }
  const seen = new Set<string>();
  return parts.slice(0, 4).flatMap((p) => {
    const id = slug(p);
    if (seen.has(id)) return [];
    seen.add(id);
    const label = yourify(p);
    return [{ id, label: cap(label.length > 48 ? label.slice(0, 46) + "…" : label), summary: cap(secondPerson(p)) + "." }];
  });
}

export function offlineFrame(dilemma: string): Frame {
  const options = extractOptions(dilemma);
  const lower = dilemma.toLowerCase();
  const highStakes = /(job|quit|move|marry|break ?up|house|buy|sell|invest|surgery|kids?|career|startup|company)/.test(lower);
  const oneWay = /(quit|sell|marry|break ?up|surgery|drop ?out|fire)/.test(lower);
  return {
    title: cap(dilemma.replace(/^(should i|do i)\s+/i, "").replace(/[?.]$/, "").trim()).slice(0, 60) || "Your decision",
    stakes: highStakes ? "high" : "medium",
    reversibility: oneWay ? "one-way-door" : highStakes ? "partly" : "reversible",
    hiddenAssumption: `That "${options[0].label}" and "${options[1]?.label ?? "the alternative"}" are the only two moves. There is usually a third: a smaller, cheaper version of the bold one.`,
    options,
    questions: [
      {
        id: "undo",
        question: "If you picked wrong, how hard would it be to undo in six months?",
        why: "Reversible decisions deserve less deliberation and more action.",
        kind: "scale",
        lowLabel: "Trivial to reverse",
        highLabel: "Practically permanent",
        choices: null,
      },
      {
        id: "gut",
        question: `Honestly: when you imagine choosing "${options[0].label}", what does your body do?`,
        why: "Your first reaction is data, even when it isn't the answer.",
        kind: "choice",
        lowLabel: null,
        highLabel: null,
        choices: ["Relief", "Excitement", "Dread", "Nothing much"],
      },
      {
        id: "cost",
        question: "How much would waiting three months actually cost you?",
        why: "Most 'now or never' framings are just impatience wearing a costume.",
        kind: "scale",
        lowLabel: "Nothing, the door stays open",
        highLabel: "The window closes",
        choices: null,
      },
    ],
  };
}

export function offlineDecide(dilemma: string, frame: Frame, answers: Answer[]): Verdict {
  const get = (id: string) => answers.find((a) => a.questionId === id)?.value;
  const undo = Number(get("undo") ?? 4);
  const gut = String(get("gut") ?? "Nothing much");
  const cost = Number(get("cost") ?? 4);
  const [a, b] = frame.options;
  const bold = a;
  const safe = b ?? a;

  const criteria = [
    { id: "upside", name: "Upside if it works", weight: 8, why: "the whole reason you're tempted" },
    { id: "downside", name: "Downside if it fails", weight: undo >= 5 ? 9 : 6, why: undo >= 5 ? "you said this is hard to undo" : "you said you could walk it back" },
    { id: "energy", name: "Energy & pull", weight: 6, why: "motivation is the fuel for the hard middle" },
    { id: "timing", name: "Timing pressure", weight: cost >= 5 ? 7 : 3, why: cost >= 5 ? "you said the window closes" : "you said waiting is cheap" },
    { id: "fit", name: "Fit with your life", weight: 7, why: "decisions live in a context, not a spreadsheet" },
  ];

  const gutBoost = gut === "Excitement" ? 2 : gut === "Relief" ? 1 : gut === "Dread" ? -3 : 0;
  const scoreFor = (opt: Option, crit: string) => {
    const base = 4 + Math.round(rnd(dilemma + opt.id + crit) * 4);
    const isBold = opt.id === bold.id;
    let s = base;
    if (crit === "upside") s = isBold ? 8 + Math.round(rnd(opt.id) * 2) : 4;
    if (crit === "downside") s = isBold ? (undo >= 5 ? 3 : 6) : 8;
    if (crit === "energy") s = isBold ? Math.min(10, 6 + gutBoost) : 5;
    if (crit === "timing") s = isBold ? (cost >= 5 ? 9 : 5) : cost >= 5 ? 3 : 7;
    return Math.max(1, Math.min(10, s));
  };
  const scores = frame.options.flatMap((o) =>
    criteria.map((c) => ({ optionId: o.id, criterionId: c.id, score: scoreFor(o, c.id), note: noteFor(c.id, o.id === bold.id) })),
  );
  const totals = frame.options.map((o) => ({
    o,
    t: criteria.reduce((s, c) => s + c.weight * (scores.find((x) => x.optionId === o.id && x.criterionId === c.id)?.score ?? 0), 0),
  })).sort((x, y) => y.t - x.t);
  const winner = totals[0].o;
  const runner = totals[1]?.o ?? safe;
  const margin = totals.length > 1 ? (totals[0].t - totals[1].t) / totals[0].t : 0.4;
  const confidence = Math.round(52 + Math.min(40, margin * 160));
  const winnerIsBold = winner.id === bold.id;

  return {
    optionId: winner.id,
    headline: winnerIsBold ? `Do it. ${winner.label}.` : `Hold. ${winner.label} wins for now.`,
    confidence,
    rationale: winnerIsBold
      ? `The upside is real and, by your own account, the damage if it fails is ${undo >= 5 ? "serious but survivable" : "recoverable"}. Your reaction was "${gut.toLowerCase()}", which is the kind of signal people talk themselves out of. Waiting ${cost >= 5 ? "costs you the window" : "buys nothing you don't already have"}.`
      : `The bold option's upside doesn't clear its downside given how hard you said it would be to undo. Your reaction was "${gut.toLowerCase()}", and ${cost >= 5 ? "even though the window feels tight," : "since waiting is nearly free,"} the cheaper move is to shrink the bet before you make it.`,
    criteria,
    scores,
    flipPoint: winnerIsBold
      ? `If undoing this in six months is closer to "practically permanent" than you admitted, the downside weight jumps and ${runner.label} takes it.`
      : `If the window really does close in three months, timing pressure alone flips this to ${bold.label}.`,
    devilsAdvocate: winnerIsBold
      ? `${runner.label} is not cowardice; it's optionality. Every month you don't commit, you learn something the committed version of you can't unlearn.`
      : `${bold.label} is the option you'll still be thinking about in a year. Safe choices don't haunt you loudly; they haunt you quietly.`,
    regret: {
      tenMinutes: winnerIsBold ? "A jolt of adrenaline, then a wave of 'what did I just do'. That's normal." : "Calm, and a small itch you'll try to ignore.",
      tenMonths: winnerIsBold ? "You'll be deep in the messy middle. You'll judge the decision by that mess, unfairly." : "You'll have either found a smaller way to test the bold move, or you'll be exactly here again.",
      tenYears: winnerIsBold ? "Whether or not it worked, you will not regret having tried." : "You'll only regret this if you never revisited it. So revisit it.",
    },
    firstStep: winnerIsBold
      ? `Tell one person today that you're choosing ${winner.label}. Saying it out loud is the cheapest commitment device there is.`
      : `Write down the smallest version of "${bold.label}" you could try in two weeks without burning anything. Then do that version.`,
    receipt: winnerIsBold ? "The window was open. You walked through it." : "Shrink the bet, then take it.",
  };
}

function noteFor(c: string, bold: boolean): string {
  const notes: Record<string, [string, string]> = {
    upside: ["the reason you're here", "keeps things steady"],
    downside: ["real exposure if it fails", "little to lose"],
    energy: ["this is what pulls you", "comfortable, not energising"],
    timing: ["depends on the window", "always available later"],
    fit: ["reshapes your week", "fits the life you have"],
  };
  return notes[c]?.[bold ? 0 : 1] ?? "";
}
