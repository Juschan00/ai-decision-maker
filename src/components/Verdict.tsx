import { useMemo, useState } from "react";
import { motion } from "motion/react";
import type { Engine, Frame, Verdict as VerdictT } from "../shared/schema.ts";
import { ConfidenceRing } from "./ConfidenceRing.tsx";
import { Matrix } from "./Matrix.tsx";
import { CoinGutCheck } from "./CoinGutCheck.tsx";
import { computeTotals } from "../lib/scoring.ts";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: 0.25 + i * 0.12 },
});

export function VerdictView({
  dilemma,
  frame,
  verdict,
  engine,
  weights,
  gut,
  saved,
  onWeights,
  onGut,
  onSave,
  onRestart,
}: {
  dilemma: string;
  frame: Frame;
  verdict: VerdictT;
  engine: Engine;
  weights: Record<string, number>;
  gut: string | null;
  saved: boolean;
  onWeights: (w: Record<string, number>) => void;
  onGut: (id: string) => void;
  onSave: () => void;
  onRestart: () => void;
}) {
  const winner = frame.options.find((o) => o.id === verdict.optionId) ?? frame.options[0];
  const runnerUp = useMemo(() => {
    const t = computeTotals(verdict, {}, frame.options.map((o) => o.id)).filter((x) => x.optionId !== winner.id);
    return frame.options.find((o) => o.id === t[0]?.optionId);
  }, [frame, verdict, winner.id]);
  const [copied, setCopied] = useState(false);

  const receiptText = () => {
    const lines = [
      `VERDICT — ${frame.title}`,
      `Decision: ${winner.label} (${verdict.confidence}% confidence)`,
      ``,
      verdict.rationale,
      ``,
      `Flip point: ${verdict.flipPoint}`,
      `First step: ${verdict.firstStep}`,
      ``,
      `"${verdict.receipt}"`,
      `${new Date().toLocaleDateString()} · verdict${engine === "offline" ? " · offline demo" : ""}`,
    ];
    return lines.join("\n");
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; nothing to do */
    }
  };

  return (
    <section>
      <div className="verdict-hero">
        <div>
          <motion.div className="eyebrow accent" {...fade(0)}>
            The verdict · {frame.title}
          </motion.div>
          <motion.h2 className="headline" initial={{ opacity: 0, y: 30, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}>
            {verdict.headline}
          </motion.h2>
          <motion.p className="rationale" {...fade(1)}>
            {verdict.rationale}
          </motion.p>
          <motion.div className="tags" style={{ marginTop: 18 }} {...fade(2)}>
            <span className="tag hot">chosen · {winner.label}</span>
            {runnerUp && <span className="tag">runner-up · {runnerUp.label}</span>}
            <span className="tag">{engine === "offline" ? "offline demo engine" : `reasoned by ${engine}`}</span>
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.3 }}>
          <ConfidenceRing value={verdict.confidence} />
        </motion.div>
      </div>

      <motion.div className="grid2" {...fade(3)}>
        <div className="card accent">
          <div className="eyebrow accent">The flip point</div>
          <div className="big">{verdict.flipPoint}</div>
          <p>If this turns out to be true, ignore everything above and go the other way.</p>
        </div>
        <div className="card">
          <div className="eyebrow">Devil's advocate{runnerUp ? ` · for ${runnerUp.label}` : ""}</div>
          <div className="big">{verdict.devilsAdvocate}</div>
        </div>
      </motion.div>

      <motion.div {...fade(4)}>
        <div className="section">
          <h3 className="sub">Show your work</h3>
          <span className="small">Weights are the verdict's opinion. Sliders make them yours.</span>
        </div>
        <Matrix
          frame={frame}
          verdict={verdict}
          weights={weights}
          onWeight={(id, w) => onWeights({ ...weights, [id]: w })}
          onReset={() => onWeights({})}
        />
      </motion.div>

      <motion.div {...fade(5)}>
        <div className="section">
          <h3 className="sub">Gut check</h3>
        </div>
        <div className="card">
          <CoinGutCheck frame={frame} verdictOptionId={verdict.optionId} gut={gut} onGut={onGut} />
        </div>
      </motion.div>

      <motion.div {...fade(6)}>
        <div className="section">
          <h3 className="sub">The 10 / 10 / 10 test</h3>
          <span className="small">How you'll feel about choosing {winner.label}</span>
        </div>
        <div className="regret">
          {(
            [
              ["10 min", verdict.regret.tenMinutes],
              ["10 mo", verdict.regret.tenMonths],
              ["10 yr", verdict.regret.tenYears],
            ] as const
          ).map(([t, txt]) => (
            <div className="card" key={t}>
              <div className="t">{t}</div>
              <p>{txt}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="grid2" style={{ marginTop: 20, alignItems: "start" }} {...fade(7)}>
        <div>
          <div className="card accent" style={{ marginBottom: 20 }}>
            <div className="eyebrow accent">Next 24 hours</div>
            <div className="big">{verdict.firstStep}</div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={onSave} disabled={saved}>
              {saved ? "Receipt saved" : "Save receipt"}
            </button>
            <button className="btn ghost" onClick={copy}>
              {copied ? "Copied" : "Copy as text"}
            </button>
            <button className="btn link" onClick={onRestart}>
              Decide something else
            </button>
          </div>
        </div>
        <div className="receipt" aria-label="Decision receipt">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>VERDICT</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <div className="rh">{winner.label}</div>
          <div className="row">
            <span>decision</span>
            <span style={{ textAlign: "right" }}>{frame.title}</span>
          </div>
          <div className="row">
            <span>confidence</span>
            <span>{verdict.confidence}%</span>
          </div>
          <div className="row">
            <span>gut</span>
            <span>{gut ? (gut === verdict.optionId ? "agrees" : "disagrees") : "not checked"}</span>
          </div>
          <div className="row">
            <span>stakes</span>
            <span>
              {frame.stakes} · {frame.reversibility.replace(/-/g, " ")}
            </span>
          </div>
          <p className="quote">“{verdict.receipt}”</p>
        </div>
      </motion.div>

      <p className="footer-note">
        Verdict is a thinking tool, not an oracle. Your dilemma was: “{dilemma.length > 140 ? dilemma.slice(0, 140) + "…" : dilemma}”
      </p>
    </section>
  );
}
