import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import type { Frame } from "../shared/schema.ts";

type Phase = "idle" | "air" | "landed";

/**
 * The coin's outcome is irrelevant on purpose. While it's in the air, the user
 * reveals what they were secretly hoping for; that hope is compared with the verdict.
 */
export function CoinGutCheck({
  frame,
  verdictOptionId,
  gut,
  onGut,
}: {
  frame: Frame;
  verdictOptionId: string;
  gut: string | null;
  onGut: (optionId: string) => void;
}) {
  const [phase, setPhase] = useState<Phase>(gut ? "landed" : "idle");
  const [spins, setSpins] = useState(0);
  const timer = useRef<number | null>(null);
  const [a, b] = frame.options;
  const name = (id: string) => frame.options.find((o) => o.id === id)?.label ?? id;

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const flip = () => {
    setPhase("air");
    setSpins((s) => s + 1);
    timer.current = window.setTimeout(() => setPhase((p) => (p === "air" ? "landed" : p)), 3200);
  };
  const choose = (id: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    onGut(id);
    setPhase("landed");
  };

  const match = gut != null && gut === verdictOptionId;

  return (
    <div className="coin-stage">
      <div className="coin-scene" aria-hidden="true">
        <motion.div
          className="coin"
          animate={
            phase === "air"
              ? { rotateY: 360 * 6 * spins + 180 * spins, y: [0, -110, 0] }
              : { rotateY: 360 * 6 * spins + 180 * spins, y: 0 }
          }
          transition={phase === "air" ? { duration: 4.5, ease: [0.3, 0.7, 0.4, 1] } : { duration: 0.2 }}
        >
          <div className="face heads">{a?.label}</div>
          <div className="face tails">{b?.label ?? "Wait"}</div>
        </motion.div>
      </div>
      <div>
        {phase === "idle" && (
          <>
            <p className="big" style={{ fontFamily: "var(--serif)", fontSize: 24, margin: "0 0 6px" }}>
              The oldest trick for finding out what you actually want.
            </p>
            <p className="small" style={{ margin: "0 0 14px" }}>
              Flip the coin. While it's in the air, notice which side you're hoping for, and tap it
              before it lands. The outcome of the flip doesn't matter. Your hope does.
            </p>
            <button className="btn ghost" onClick={flip}>
              Flip the coin
            </button>
          </>
        )}
        {phase === "air" && (
          <>
            <p className="eyebrow accent">Quick. Which one are you hoping for?</p>
            <div className="hope-btns">
              {frame.options.map((o) => (
                <button key={o.id} className="hope-btn" onClick={() => choose(o.id)}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
        {phase === "landed" && gut == null && (
          <>
            <p className="small">It landed before you chose. That hesitation is information too. Try again?</p>
            <button className="btn ghost sm" onClick={flip}>
              Flip again
            </button>
          </>
        )}
        {phase === "landed" && gut != null && (
          <motion.div className="gut-result" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
            <b>
              {match ? "Your gut and the analysis agree." : "Your gut disagrees with the analysis."}
            </b>
            <p style={{ margin: 0, color: "var(--cream-2)" }}>
              {match
                ? `You were hoping for ${name(gut)} and that's the verdict. When head and gut line up, the remaining doubt is usually just fear of commitment. Go.`
                : `You were hoping for ${name(gut)}; the verdict is ${name(verdictOptionId)}. Don't paper over that. Either you're weighing something the criteria don't capture (add it above), or you already know the answer and want permission to ignore it.`}
            </p>
            <div style={{ marginTop: 10 }}>
              <button className="btn link sm" onClick={flip}>
                Flip again
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
