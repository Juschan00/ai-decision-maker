import type { Verdict } from "../shared/schema.ts";

export type Totals = { optionId: string; total: number; max: number; pct: number }[];

/** Weighted totals for each option, using (possibly user-adjusted) weights. */
export function computeTotals(
  verdict: Verdict,
  weights: Record<string, number>,
  optionIds: string[],
): Totals {
  const max = verdict.criteria.reduce((s, c) => s + (weights[c.id] ?? c.weight) * 10, 0) || 1;
  return optionIds
    .map((optionId) => {
      const total = verdict.criteria.reduce((sum, c) => {
        const s = verdict.scores.find((x) => x.optionId === optionId && x.criterionId === c.id);
        return sum + (weights[c.id] ?? c.weight) * (s?.score ?? 0);
      }, 0);
      return { optionId, total, max, pct: total / max };
    })
    .sort((a, b) => b.total - a.total);
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
