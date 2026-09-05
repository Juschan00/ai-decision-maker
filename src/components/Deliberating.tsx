import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { Frame } from "../shared/schema.ts";

export function Deliberating({ frame }: { frame: Frame }) {
  const lines = [
    `Weighing ${frame.options.map((o) => o.label).join(" against ")}…`,
    "Building the criteria that actually matter here…",
    "Scoring every option on every criterion…",
    "Looking for the fact that would flip this…",
    "Arguing the other side, honestly…",
    "Running the 10 / 10 / 10 regret test…",
    "Committing.",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(x + 1, lines.length - 1)), 1900);
    return () => clearInterval(t);
  }, [lines.length]);

  return (
    <motion.section className="deliberating" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div>
        <motion.div
          className="orb"
          animate={{ scale: [1, 1.06, 1], rotate: [0, 8, -6, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="eyebrow accent" style={{ marginBottom: 10 }}>
          Deliberating
        </div>
        <motion.div
          key={i}
          className="thinking-line"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {lines[i]}
        </motion.div>
        <p className="small" style={{ marginTop: 18 }}>
          This usually takes a little while. Good verdicts do.
        </p>
      </div>
    </motion.section>
  );
}
