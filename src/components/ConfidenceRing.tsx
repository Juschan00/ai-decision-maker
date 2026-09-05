import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

export function ConfidenceRing({ value }: { value: number }) {
  const r = 96;
  const c = 2 * Math.PI * r;
  const mv = useMotionValue(0);
  const dash = useTransform(mv, (v) => c - (c * v) / 100);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 1.6, ease: [0.2, 0.8, 0.2, 1], delay: 0.5 });
    const unsub = mv.on("change", (v) => setShown(Math.round(v)));
    return () => {
      ctrl.stop();
      unsub();
    };
  }, [value, mv]);
  const label = value >= 80 ? "Clear call" : value >= 62 ? "Leaning" : "Close call";
  return (
    <div className="ring-wrap" role="img" aria-label={`Confidence ${value} percent, ${label}`}>
      <svg viewBox="0 0 220 220">
        <circle cx="110" cy="110" r={r} fill="none" stroke="rgba(243,238,227,.1)" strokeWidth="10" />
        <motion.circle
          cx="110"
          cy="110"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: dash }}
        />
      </svg>
      <div className="ring-center">
        <div>
          <div className="n">
            {shown}
            <small>%</small>
          </div>
          <div className="l">{label}</div>
        </div>
      </div>
    </div>
  );
}
