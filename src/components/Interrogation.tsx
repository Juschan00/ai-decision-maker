import { useState } from "react";
import { motion } from "motion/react";
import type { Answer, Frame } from "../shared/schema.ts";
import { Arrow } from "./Intake.tsx";

export function Interrogation({
  frame,
  onDone,
  onBack,
}: {
  frame: Frame;
  onDone: (answers: Answer[]) => void;
  onBack: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const q = frame.questions[idx];
  const last = idx === frame.questions.length - 1;
  const answered = answers[q.id] != null;

  const set = (v: string | number) => setAnswers((a) => ({ ...a, [q.id]: v }));
  const next = () => {
    if (last) onDone(Object.entries(answers).map(([questionId, value]) => ({ questionId, value })));
    else setIdx(idx + 1);
  };

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className="frame-head">
        <div>
          <div className="eyebrow accent">The decision, as I understand it</div>
          <h2 className="title">{frame.title}</h2>
        </div>
        <div className="tags">
          <span className={"tag" + (frame.stakes === "high" ? " hot" : "")}>stakes · {frame.stakes}</span>
          <span className={"tag" + (frame.reversibility === "one-way-door" ? " hot" : "")}>{frame.reversibility.replace(/-/g, " ")}</span>
        </div>
      </div>

      <div className="options-row">
        {frame.options.map((o, i) => (
          <div className="option-card" key={o.id}>
            <span className="eyebrow">Option {String.fromCharCode(65 + i)}</span>
            <b>{o.label}</b>
            <span>{o.summary}</span>
          </div>
        ))}
      </div>

      <div className="assumption">
        <span className="eyebrow">Hidden assumption</span>
        <p>{frame.hiddenAssumption}</p>
      </div>

      <div className="progress" aria-hidden="true">
        <div style={{ width: `${((idx + (answered ? 1 : 0)) / frame.questions.length) * 100}%` }} />
      </div>

      <motion.div
        key={q.id}
        className="qcard"
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
          <div className="eyebrow">
            Question {idx + 1} of {frame.questions.length}
          </div>
          <p className="q">{q.question}</p>
          <p className="why">Why I'm asking: {q.why}</p>

          {q.kind === "scale" ? (
            <div className="scale">
              <div className="scale-row" role="radiogroup" aria-label={q.question}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    role="radio"
                    aria-checked={answers[q.id] === n}
                    className={"scale-btn" + (answers[q.id] === n ? " on" : "")}
                    onClick={() => set(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="scale-labels">
                <span>{q.lowLabel ?? "Not at all"}</span>
                <span>{q.highLabel ?? "Completely"}</span>
              </div>
            </div>
          ) : (
            <div className="choices" role="radiogroup" aria-label={q.question}>
              {(q.choices ?? ["Yes", "No"]).map((c) => (
                <button
                  key={c}
                  role="radio"
                  aria-checked={answers[q.id] === c}
                  className={"choice" + (answers[q.id] === c ? " on" : "")}
                  onClick={() => set(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          <div className="qnav">
            <button className="btn link" onClick={() => (idx === 0 ? onBack() : setIdx(idx - 1))}>
              {idx === 0 ? "Rewrite the dilemma" : "Back"}
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn ghost sm"
                onClick={next}
                style={{ visibility: answered ? "hidden" : "visible" }}
                aria-hidden={answered}
                tabIndex={answered ? -1 : 0}
              >
                Skip
              </button>
              <button className="btn primary" disabled={!answered} onClick={next}>
                {last ? "Deliver the verdict" : "Next"}
                <Arrow />
              </button>
            </div>
          </div>
      </motion.div>
    </motion.section>
  );
}
