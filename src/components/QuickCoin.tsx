import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Arrow } from "./Intake.tsx";

type Phase = "idle" | "air" | "landed";
const FLIGHT_MS = 4500;

/**
 * Landing-page coin flip: two options, no prompt needed. The landing side is random,
 * but the point is the tap mid-air: which side were you hoping for?
 */
export function QuickCoin({ onFullVerdict }: { onFullVerdict: (dilemma: string) => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [spins, setSpins] = useState(0);
  const [landed, setLanded] = useState<"A" | "B">("A");
  const [hope, setHope] = useState<"A" | "B" | null>(null);
  const timer = useRef<number | null>(null);
  const ready = a.trim().length > 0 && b.trim().length > 0 && phase !== "air";
  const label = (side: "A" | "B") => (side === "A" ? a.trim() : b.trim()) || side;

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const flip = () => {
    if (!ready) return;
    setHope(null);
    setLanded(Math.random() < 0.5 ? "A" : "B");
    setSpins((s) => s + 1);
    setPhase("air");
    timer.current = window.setTimeout(() => setPhase("landed"), FLIGHT_MS);
  };

  // 6 full turns per flip; land face-up on A (0deg) or B (180deg)
  const rotateY = 360 * 6 * spins + (landed === "B" ? 180 : 0);
  const match = hope != null && hope === landed;

  return (
    <div className="quick">
      <div className="quick-inputs">
        <input
          value={a}
          onChange={(e) => setA(e.target.value)}
          placeholder="Option one"
          aria-label="Option one"
          onKeyDown={(e) => e.key === "Enter" && flip()}
          disabled={phase === "air"}
        />
        <span className="quick-or">or</span>
        <input
          value={b}
          onChange={(e) => setB(e.target.value)}
          placeholder="Option two"
          aria-label="Option two"
          onKeyDown={(e) => e.key === "Enter" && flip()}
          disabled={phase === "air"}
        />
      </div>

      <div className="quick-stage">
        <div className="coin-scene quick-coin" aria-hidden="true">
          <motion.div
            className="coin"
            animate={phase === "air" ? { rotateY, y: [0, -140, 0] } : { rotateY, y: 0 }}
            transition={phase === "air" ? { duration: FLIGHT_MS / 1000, ease: [0.3, 0.7, 0.4, 1] } : { duration: 0.2 }}
          >
            <div className="face heads">{a.trim() || "A"}</div>
            <div className="face tails">{b.trim() || "B"}</div>
          </motion.div>
        </div>

        <div className="quick-side">
          {phase === "idle" && (
            <>
              <p className="quick-hint">
                Type two options and flip. While it's in the air, tap the one you catch yourself hoping for.
              </p>
              <button className="btn primary" disabled={!ready} onClick={flip}>
                Flip the coin
              </button>
            </>
          )}
          {phase === "air" && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p className="eyebrow accent" style={{ marginBottom: 10 }}>Quick. Which one are you hoping for?</p>
              <div className="hope-btns">
                {hope == null ? (
                  (["A", "B"] as const).map((side) => (
                    <button key={side} className="hope-btn" onClick={() => setHope(side)}>
                      {label(side)}
                    </button>
                  ))
                ) : (
                  <span className="small">Noted: {label(hope)}. Watch it land.</span>
                )}
              </div>
            </motion.div>
          )}
          {phase === "landed" && (
            <motion.div className="gut-result" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              <span className="eyebrow">It landed on</span>
              <b>{label(landed)}</b>
              <p style={{ margin: "0 0 12px", color: "var(--cream-2)" }}>
                {hope == null
                  ? "You didn't tap in time. If you felt a pang either way as it fell, that pang is the answer. Flip again and catch it."
                  : match
                    ? `You were hoping for ${label(hope)} too. When the coin and your gut agree, the rest is just nerves.`
                    : `You were hoping for ${label(hope)}. Ignore the coin; that little sink when it landed the other way is the real result.`}
              </p>
              <div className="actions" style={{ marginTop: 0 }}>
                <button className="btn primary sm" onClick={() => onFullVerdict(`${a.trim()} or ${b.trim()}?`)}>
                  Get the full verdict on this
                  <Arrow />
                </button>
                <button className="btn ghost sm" onClick={flip}>
                  Flip again
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
