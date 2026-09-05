import type { Frame, Verdict } from "../shared/schema.ts";
import { computeTotals } from "../lib/scoring.ts";

export function Matrix({
  frame,
  verdict,
  weights,
  onWeight,
  onReset,
}: {
  frame: Frame;
  verdict: Verdict;
  weights: Record<string, number>;
  onWeight: (id: string, w: number) => void;
  onReset: () => void;
}) {
  const totals = computeTotals(verdict, weights, frame.options.map((o) => o.id));
  const leader = totals[0]?.optionId;
  const flipped = leader !== verdict.optionId;
  const changed = verdict.criteria.some((c) => (weights[c.id] ?? c.weight) !== c.weight);
  const name = (id: string) => frame.options.find((o) => o.id === id)?.label ?? id;

  return (
    <div className="matrix">
      <div className="matrix-scroll">
        <table>
          <thead>
            <tr>
              <th style={{ width: 260 }}>Criterion · drag the weight</th>
              {frame.options.map((o) => (
                <th key={o.id} className={"opt" + (o.id === leader ? " lead" : "")}>
                  {o.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {verdict.criteria.map((c) => {
              const w = weights[c.id] ?? c.weight;
              return (
                <tr key={c.id}>
                  <td className="crit">
                    <b>
                      {c.name} <span className="weight-val">×{w}</span>
                    </b>
                    <span>{c.why}</span>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={w}
                      aria-label={`Weight for ${c.name}`}
                      onChange={(e) => onWeight(c.id, Number(e.target.value))}
                    />
                  </td>
                  {frame.options.map((o) => {
                    const s = verdict.scores.find((x) => x.optionId === o.id && x.criterionId === c.id);
                    const score = s?.score ?? 0;
                    return (
                      <td key={o.id}>
                        <div className={"score" + (o.id === leader ? " lead" : "")}>
                          <div className="bar">
                            <i style={{ width: `${score * 10}%` }} />
                          </div>
                          <span className="num">{score}</span>
                        </div>
                        {s?.note && <div className="score-note">{s.note}</div>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <span className="eyebrow">Weighted total</span>
                {changed && (
                  <div>
                    <button className="btn link sm" onClick={onReset}>
                      Reset weights
                    </button>
                  </div>
                )}
              </td>
              {frame.options.map((o) => {
                const t = totals.find((x) => x.optionId === o.id);
                return (
                  <td key={o.id}>
                    <div className={"total" + (o.id === leader ? " lead" : "")}>
                      {Math.round((t?.pct ?? 0) * 100)}
                      <small>/ 100</small>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={"flip-banner" + (flipped ? " flipped" : "")} aria-live="polite">
        <span className="eyebrow">{flipped ? "Flipped" : "Holds"}</span>
        <span>
          {flipped
            ? `With these weights, ${name(leader)} overtakes ${name(verdict.optionId)}. If that's how you really weigh things, that's your answer.`
            : changed
              ? `Even with your weights, ${name(verdict.optionId)} still leads.`
              : `Drag any weight to stress-test the verdict. If it takes a wild weighting to flip it, it's solid.`}
        </span>
      </div>
    </div>
  );
}
