# Verdict — an AI decision maker that commits

A web app (React 19 + Vite + TypeScript) that takes a dilemma, interrogates you with
three questions built for your situation, scores the options in the open, and then
picks one. Reasoning runs on **Google Gemini** (or Claude) through a tiny server-side
handler so your API key never reaches the browser.

## Run it

```bash
npm install
cp .env.example .env      # add your GEMINI_API_KEY (https://aistudio.google.com/apikey)
npm run dev               # http://localhost:5173  (Vite + the /api handler)
```

Provider selection: `GEMINI_API_KEY` wins, then `ANTHROPIC_API_KEY`; force one with
`VERDICT_PROVIDER=gemini|claude|offline`. The Gemini model is auto-discovered from the
models your key can see (newest Gemini first); pin one with `VERDICT_GEMINI_MODEL`.

Without a key the app still runs end to end in **offline demo mode**, using a small
heuristic engine in `src/lib/offline.ts`. The status pill in the top-right tells you
which engine and model are live.

Production:

```bash
npm run build
npm start                 # serves dist/ and /api on http://localhost:8787
```

## What makes it stand out

| Feature | Why it matters |
|---|---|
| **Interrogation before verdict** | Three questions chosen for *this* decision, each capable of flipping the answer. Not generic pros and cons. |
| **Hidden assumption** | The framing itself is challenged before any scoring happens. |
| **Show-your-work matrix** | Criteria, weights and scores are all visible. Drag a weight and watch the verdict hold or flip in real time. |
| **The flip point** | One concrete fact that would reverse the verdict. |
| **Devil's advocate** | The honest case for the runner-up. |
| **Gut check by coin** | While the coin is in the air you tap the side you're hoping for. The app compares that hope with the analysis and names the gap. |
| **10 / 10 / 10 regret test** | How you'll feel in ten minutes, ten months, ten years. |
| **Decision receipt** | A saveable, copyable summary. History lives in localStorage; entries older than 30 days are flagged "time to revisit". |

## Architecture

```
index.html, src/           React client (Vite)
  App.tsx                  step machine: intake -> framing -> interrogation -> deliberating -> verdict
  components/              Intake, Interrogation, Deliberating, Verdict, Matrix, CoinGutCheck, ConfidenceRing, History
  lib/api.ts               fetch wrapper; falls back to the offline engine
  lib/offline.ts           heuristic demo engine (no network)
  lib/scoring.ts           weighted totals (client-side, so sliders are instant)
  lib/storage.ts           receipts in localStorage
  shared/schema.ts         zod schemas shared by client and server = the API contract
server/
  prompts.ts               persona + the two prompts, shared by every provider
  gemini.ts                Gemini provider: model discovery, JSON-schema structured output, zod validation
  claude.ts                Claude provider: messages.parse with zodOutputFormat
  provider.ts              picks the provider from env
  handler.ts               /api/status, /api/frame, /api/decide (used by Vite dev and prod)
  index.ts                 production static + API server (Node 22.6+/24 runs the .ts directly)
vite.config.ts             mounts the handler into the dev server; loads .env for the server side only
```

### The two model calls

1. `POST /api/frame` — the model restates the decision, extracts 2-4 options in your own
   words, names the hidden assumption and writes exactly three questions targeted at the
   specific unknowns in your situation. Low thinking effort (fast).
2. `POST /api/decide` — with the answers, the model commits to one option, builds 4-6 weighted
   criteria, scores every option on every criterion, and writes the flip point, devil's
   advocate, regret test, first step and receipt line. High thinking effort.

Both providers return JSON constrained by the zod schemas in `src/shared/schema.ts`
(Gemini via `responseJsonSchema`, Claude via `zodOutputFormat`) and every response is
validated with zod before it reaches the UI. The persona in `server/prompts.ts` bans
generic questions and requires the model to reuse your nouns, names and numbers.
