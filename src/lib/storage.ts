import type { Answer, Engine, Frame, Verdict } from "../shared/schema.ts";

export type Receipt = {
  id: string;
  createdAt: number;
  dilemma: string;
  frame: Frame;
  answers: Answer[];
  verdict: Verdict;
  engine: Engine;
  gut: string | null; // optionId the user hoped for during the coin flip
  weights: Record<string, number>;
};

const KEY = "verdict.receipts.v1";

export function loadReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Receipt[]) : [];
  } catch {
    return [];
  }
}

export function saveReceipt(r: Receipt) {
  try {
    const all = loadReceipts().filter((x) => x.id !== r.id);
    all.unshift(r);
    localStorage.setItem(KEY, JSON.stringify(all.slice(0, 50)));
  } catch {
    /* storage unavailable: receipts are a convenience only */
  }
}

export function deleteReceipt(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(loadReceipts().filter((x) => x.id !== id)));
  } catch {
    /* ignore */
  }
}

export const uid = () =>
  (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).slice(0, 12);
