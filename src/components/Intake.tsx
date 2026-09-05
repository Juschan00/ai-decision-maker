import { useState } from "react";
import { motion } from "motion/react";
import type { Engine } from "../shared/schema.ts";
import { ForkGraphic, MiniCoin, MiniMatrix, MiniRing, MiniScale } from "./LandingVisuals.tsx";
import { QuickCoin } from "./QuickCoin.tsx";

const EXAMPLES: { icon: string; short: string; full: string }[] = [
  { icon: "💼", short: "Quit for the side project", full: "Should I quit my job to go full-time on my side project?" },
  { icon: "🌍", short: "Lisbon or Toronto", full: "Move to Lisbon for a year, or stay in Toronto and buy a place?" },
  { icon: "📈", short: "Promotion vs evenings", full: "Take the promotion with more travel, or stay put and have my evenings?" },
  { icon: "🎓", short: "Master's or learn on the job", full: "Go back to school for a master's, or keep learning on the job?" },
  { icon: "🐕", short: "Adopt the dog now", full: "Adopt the dog now, or wait until we have a yard?" },
];

const TILES = [
  { eyebrow: "01 · Interrogate", caption: "Three questions built for you", Visual: MiniScale },
  { eyebrow: "02 · Show the work", caption: "Drag a weight, watch it flip", Visual: MiniMatrix },
  { eyebrow: "03 · Commit", caption: "A verdict with confidence", Visual: MiniRing },
  { eyebrow: "04 · Gut check", caption: "Catch what you're hoping for", Visual: MiniCoin },
];

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay },
});

export function Intake({
  engine,
  onSubmit,
  busy,
  error,
}: {
  engine: Engine;
  onSubmit: (dilemma: string) => void;
  busy: boolean;
  error: string | null;
}) {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"describe" | "coin">("describe");
  const ready = text.trim().length > 8 && !busy;

  return (
    <section>
      <div className="hero">
        <motion.div className="hero-copy" {...rise(0)}>
          <div className="eyebrow accent">An AI decision maker that commits</div>
          <h1 className="display">
            Stop deliberating.
            <br />
            Get a <em>verdict.</em>
          </h1>
          <p className="lede short">Three sharp questions. One committed answer. The fact that would flip it.</p>
        </motion.div>
        <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
          <ForkGraphic />
        </motion.div>
      </div>

      <motion.div {...rise(0.2)}>
        <div className="mode-switch" role="tablist" aria-label="How do you want to decide?">
          <button role="tab" aria-selected={mode === "describe"} className={mode === "describe" ? "on" : ""} onClick={() => setMode("describe")}>
            Describe the decision
          </button>
          <button role="tab" aria-selected={mode === "coin"} className={mode === "coin" ? "on" : ""} onClick={() => setMode("coin")}>
            Just flip a coin
          </button>
        </div>
        {mode === "coin" ? (
          <div className="dilemma-box coin-mode">
            <QuickCoin onFullVerdict={(d) => { setText(d); onSubmit(d); }} />
          </div>
        ) : (
        <div className="dilemma-box">
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Should I… or should I…?"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && ready) onSubmit(text.trim());
            }}
            aria-label="Describe your decision"
          />
          <div className="dilemma-foot">
            <span className="small">
              <span className="kbd">⌘</span> + <span className="kbd">↵</span>
            </span>
            <button className="btn primary" disabled={!ready} onClick={() => onSubmit(text.trim())}>
              {busy ? "Framing…" : "Interrogate me"}
              <Arrow />
            </button>
          </div>
        </div>
        )}
        {error && <div className="error">{error}</div>}
        {mode === "describe" && (
        <div className="chips" aria-label="Example decisions">
          {EXAMPLES.map((ex) => (
            <button key={ex.full} className={"chip" + (text === ex.full ? " active" : "")} onClick={() => setText(ex.full)} title={ex.full}>
              <span className="chip-icon">{ex.icon}</span>
              {ex.short}
            </button>
          ))}
        </div>
        )}
        {engine === "offline" && (
          <div className="note-pill" role="status">
            <span className="dot" />
            Offline demo · add <code>GEMINI_API_KEY</code> to <code>.env</code> for questions tailored to you
          </div>
        )}
      </motion.div>

      <div className="tiles">
        {TILES.map(({ eyebrow, caption, Visual }, i) => (
          <motion.div className="tile" key={eyebrow} {...rise(0.35 + i * 0.08)}>
            <div className="tile-visual">
              <Visual />
            </div>
            <div className="tile-text">
              <span className="eyebrow">{eyebrow}</span>
              <b>{caption}</b>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 8h11M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
