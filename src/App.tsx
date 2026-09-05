import { useEffect, useState } from "react";
import type { Answer, Engine, Frame, Verdict } from "./shared/schema.ts";
import { ApiError, decide, fetchStatus, frame as frameApi } from "./lib/api.ts";
import { deleteReceipt, loadReceipts, saveReceipt, uid, type Receipt } from "./lib/storage.ts";
import { Intake } from "./components/Intake.tsx";
import { Interrogation } from "./components/Interrogation.tsx";
import { Deliberating } from "./components/Deliberating.tsx";
import { VerdictView } from "./components/Verdict.tsx";
import { History } from "./components/History.tsx";
import { Logo } from "./components/Logo.tsx";

type Step = "intake" | "framing" | "interrogation" | "deliberating" | "verdict";

const ENGINE_LABEL: Record<Engine, string> = { gemini: "Gemini", claude: "Claude", offline: "Offline demo" };

export default function App() {
  const [engine, setEngine] = useState<Engine>("offline");
  const [model, setModel] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("intake");
  const [dilemma, setDilemma] = useState("");
  const [frame, setFrame] = useState<Frame | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictEngine, setVerdictEngine] = useState<Engine>("offline");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [gut, setGut] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Receipt[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchStatus().then((s) => {
      setEngine(s.engine);
      setModel(s.model);
    });
    setHistory(loadReceipts());
  }, []);

  const fail = (e: unknown) => {
    setError(e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong.");
  };

  const startFraming = async (text: string) => {
    setError(null);
    setDilemma(text);
    setStep("framing");
    try {
      const r = await frameApi(text, engine);
      setFrame(r.frame);
      setAnswers([]);
      setStep("interrogation");
    } catch (e) {
      fail(e);
      setStep("intake");
    }
  };

  const deliver = async (a: Answer[]) => {
    if (!frame) return;
    setAnswers(a);
    setStep("deliberating");
    setError(null);
    try {
      const r = await decide(dilemma, frame, a, engine);
      setVerdict(r.verdict);
      setVerdictEngine(r.engine);
      setWeights({});
      setGut(null);
      setSaved(false);
      setReceiptId(uid());
      setStep("verdict");
      window.scrollTo({ top: 0 });
    } catch (e) {
      fail(e);
      setStep("interrogation");
    }
  };

  const persist = (patch: Partial<Receipt> = {}) => {
    if (!frame || !verdict || !receiptId) return;
    const r: Receipt = {
      id: receiptId,
      createdAt: history.find((h) => h.id === receiptId)?.createdAt ?? Date.now(),
      dilemma,
      frame,
      answers,
      verdict,
      engine: verdictEngine,
      gut,
      weights,
      ...patch,
    };
    saveReceipt(r);
    setHistory(loadReceipts());
    setSaved(true);
  };

  const open = (r: Receipt) => {
    setDilemma(r.dilemma);
    setFrame(r.frame);
    setAnswers(r.answers);
    setVerdict(r.verdict);
    setVerdictEngine(r.engine);
    setWeights(r.weights ?? {});
    setGut(r.gut);
    setReceiptId(r.id);
    setSaved(true);
    setShowHistory(false);
    setStep("verdict");
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setStep("intake");
    setFrame(null);
    setVerdict(null);
    setError(null);
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={restart} aria-label="Verdict home">
          <Logo /> Verdict
        </button>
        <div className="topbar-right">
          <span
            className={"pill " + (engine === "offline" ? "offline" : "live")}
            title={engine === "offline" ? "No API key on the server; using the built-in demo engine" : `Reasoning by ${model ?? engine} via your server`}
          >
            <span className="dot" /> {engine === "offline" ? "Offline demo" : ENGINE_LABEL[engine]}
          </span>
          <button className="pill button" onClick={() => setShowHistory(true)}>
            History {history.length > 0 && `· ${history.length}`}
          </button>
        </div>
      </header>

      {step === "intake" || step === "framing" ? (
        <Intake engine={engine} onSubmit={startFraming} busy={step === "framing"} error={error} />
      ) : null}

      {step === "interrogation" && frame && (
        <>
          {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}
          <Interrogation key={frame.title} frame={frame} onDone={deliver} onBack={() => setStep("intake")} />
        </>
      )}

      {step === "deliberating" && frame && <Deliberating frame={frame} />}

      {step === "verdict" && frame && verdict && (
        <VerdictView
          key={receiptId}
          dilemma={dilemma}
          frame={frame}
          verdict={verdict}
          engine={verdictEngine}
          weights={weights}
          gut={gut}
          saved={saved}
          onWeights={(w) => {
            setWeights(w);
            if (saved) persist({ weights: w });
          }}
          onGut={(id) => {
            setGut(id);
            if (saved) persist({ gut: id });
          }}
          onSave={() => persist()}
          onRestart={restart}
        />
      )}

      {showHistory && (
          <History
            items={history}
            onOpen={open}
            onDelete={(id) => {
              deleteReceipt(id);
              setHistory(loadReceipts());
            }}
            onClose={() => setShowHistory(false)}
          />
        )}
    </div>
  );
}
