import type { Answer, DecideResponse, Engine, Frame, FrameResponse } from "../shared/schema.ts";
import { offlineDecide, offlineFrame } from "./offline.ts";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!res.ok) throw new ApiError(data.message ?? data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}

export type Status = { engine: Engine; model: string | null };

export async function fetchStatus(): Promise<Status> {
  try {
    const r = await fetch("/api/status");
    return (await r.json()) as Status;
  } catch {
    return { engine: "offline", model: null };
  }
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function frame(dilemma: string, engine: Engine): Promise<FrameResponse> {
  if (engine === "offline") {
    await wait(900);
    return { frame: offlineFrame(dilemma), engine: "offline" };
  }
  return post<FrameResponse>("/api/frame", { dilemma });
}

export async function decide(dilemma: string, fr: Frame, answers: Answer[], engine: Engine): Promise<DecideResponse> {
  if (engine === "offline") {
    await wait(2200);
    return { verdict: offlineDecide(dilemma, fr, answers), engine: "offline" };
  }
  return post<DecideResponse>("/api/decide", { dilemma, frame: fr, answers });
}
