import { motion } from "motion/react";
import type { Receipt } from "../lib/storage.ts";

export function History({
  items,
  onOpen,
  onDelete,
  onClose,
}: {
  items: Receipt[];
  onOpen: (r: Receipt) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div className="drawer-bg" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} />
      <motion.aside
        className="drawer"
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        aria-label="Past verdicts"
      >
        <div className="drawer-head">
          <h3 className="sub">Past verdicts</h3>
          <button className="btn ghost sm" onClick={onClose}>
            Close
          </button>
        </div>
        {items.length === 0 && <p className="small">Nothing decided yet. Receipts you save land here, in this browser only.</p>}
        {items.map((r) => {
          const winner = r.frame.options.find((o) => o.id === r.verdict.optionId)?.label ?? r.verdict.optionId;
          const days = Math.round((Date.now() - r.createdAt) / 86400000);
          return (
            <div className="hist" key={r.id}>
              <span className="eyebrow">{r.frame.title}</span>
              <b>{winner}</b>
              <div className="meta">
                <span>
                  {new Date(r.createdAt).toLocaleDateString()} · {r.verdict.confidence}% · {r.engine}
                  {days >= 30 ? " · time to revisit" : ""}
                </span>
                <div className="row-actions">
                  <button className="btn ghost sm" onClick={() => onOpen(r)}>
                    Open
                  </button>
                  <button className="btn link sm" onClick={() => onDelete(r.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </motion.aside>
    </>
  );
}
