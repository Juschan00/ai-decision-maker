import { useEffect, useState } from "react";

/** Fork in the road: a pulse travels up the trunk and commits to one branch. Pure SVG/SMIL, loops forever. */
export function ForkGraphic() {
  return (
    <svg className="fork" viewBox="0 0 340 360" aria-hidden="true">
      <defs>
        <filter id="fork-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <path id="fork-route" d="M170 350 V215 C170 150 258 132 292 40" />
        <linearGradient id="fork-fade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--cream)" stopOpacity="0" />
          <stop offset="0.4" stopColor="var(--cream)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--cream)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* dotted field */}
      {Array.from({ length: 6 }, (_, r) =>
        Array.from({ length: 6 }, (_, c) => (
          <circle key={`${r}-${c}`} cx={40 + c * 52} cy={40 + r * 56} r="1.4" fill="var(--cream)" opacity="0.16" />
        )),
      )}
      {/* trunk + branches */}
      <path d="M170 350 V215" stroke="url(#fork-fade)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M170 215 C170 150 82 132 48 40" stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 9" />
      <path d="M170 215 C170 150 258 132 292 40" stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 9" />
      {/* chosen branch draws itself in accent, then fades, on a loop */}
      <path className="fork-chosen" d="M170 215 C170 150 258 132 292 40" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round" pathLength={100} />
      {/* fork node */}
      <circle cx="170" cy="215" r="9" fill="var(--ink)" stroke="var(--cream)" strokeOpacity="0.6" strokeWidth="2" />
      <text x="170" y="219.5" textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--cream)" opacity="0.8">?</text>
      {/* branch ends */}
      <circle cx="48" cy="40" r="14" fill="var(--ink-3)" stroke="var(--cream)" strokeOpacity="0.35" strokeWidth="1.5" />
      <text x="48" y="45" textAnchor="middle" fontFamily="var(--serif)" fontSize="17" fill="var(--cream)" opacity="0.7">A</text>
      <circle className="fork-end" cx="292" cy="40" r="14" fill="var(--ink-3)" stroke="var(--accent)" strokeWidth="1.5" />
      <text x="292" y="45" textAnchor="middle" fontFamily="var(--serif)" fontSize="17" fill="var(--accent)">B</text>
      {/* traveling pulse */}
      <circle r="6" fill="var(--accent)" filter="url(#fork-glow)">
        <animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;0.62;1" calcMode="linear">
          <mpath href="#fork-route" />
        </animateMotion>
        <animate attributeName="opacity" values="0;1;1;1;0;0" keyTimes="0;0.08;0.6;0.75;0.85;1" dur="4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

/** Question scale: the selection slides across a 1-7 row. */
export function MiniScale() {
  return (
    <div className="mini mini-scale" aria-hidden="true">
      <div className="mini-q">How hard to undo in six months?</div>
      <div className="mini-cells">
        {[1, 2, 3, 4, 5, 6, 7].map((n) => (
          <span key={n}>{n}</span>
        ))}
        <i className="mini-sel" />
      </div>
      <div className="mini-ends">
        <span>trivial</span>
        <span>permanent</span>
      </div>
    </div>
  );
}

/** Weighted matrix: bars breathe between two weightings and the leader flips. */
export function MiniMatrix() {
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setFlip((f) => !f), 2400);
    return () => clearInterval(t);
  }, []);
  const rows: [string, number, number][] = flip
    ? [["Upside", 52, 88], ["Downside", 90, 40], ["Timing", 70, 58]]
    : [["Upside", 92, 40], ["Downside", 55, 82], ["Timing", 38, 74]];
  const totalA = rows.reduce((s, r) => s + r[1], 0);
  const totalB = rows.reduce((s, r) => s + r[2], 0);
  const lead = totalA >= totalB ? "A" : "B";
  return (
    <div className="mini mini-matrix" aria-hidden="true">
      <div className="mini-head">
        <span />
        <span className={lead === "A" ? "lead" : ""}>A</span>
        <span className={lead === "B" ? "lead" : ""}>B</span>
      </div>
      {rows.map(([name, a, b]) => (
        <div className="mini-row" key={name}>
          <span className="mini-name">{name}</span>
          <span className="mini-bar"><i style={{ width: `${a}%` }} className={lead === "A" ? "lead" : ""} /></span>
          <span className="mini-bar"><i style={{ width: `${b}%` }} className={lead === "B" ? "lead" : ""} /></span>
        </div>
      ))}
      <div className="mini-foot">
        <span className="mini-slider"><i style={{ left: flip ? "78%" : "22%" }} /></span>
        <span className={"mini-flip" + (flip ? " on" : "")}>{flip ? "flipped" : "holds"}</span>
      </div>
    </div>
  );
}

/** Confidence ring that fills, holds, and resets. */
export function MiniRing() {
  return (
    <div className="mini mini-ring" aria-hidden="true">
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle className="mini-arc" cx="50" cy="50" r="42" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" pathLength={100} />
      </svg>
      <div className="mini-ring-n">
        <b>78<small>%</small></b>
        <span>clear call</span>
      </div>
    </div>
  );
}

/** Coin spinning forever, with the two sides labelled. */
export function MiniCoin() {
  return (
    <div className="mini mini-coin" aria-hidden="true">
      <div className="coin-scene">
        <div className="coin spin">
          <div className="face heads">Go</div>
          <div className="face tails">Wait</div>
        </div>
      </div>
      <div className="mini-hope">
        <span>hoping for…</span>
        <b>Go</b>
      </div>
    </div>
  );
}
