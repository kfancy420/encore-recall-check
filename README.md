# Encore — the 60-second voice recall check

## 1. What this is

**Encore** is a voice agent that calls the room two weeks after a banger ships: it asks each employee three spoken questions about the message the song carried, scores the answers against the original song brief, and rolls everyone up into a **Recall Scorecard** the client's leadership can see. It gives Business Bangerz proof that the message landed — and tells them exactly what to remix when it didn't.

## 2. The outcome it targets

**Outcome: revenue.** Friction points **F5 (no proof of impact)** and **F6 (no reusable memory)**.

Today a banger's effect on behavior is a matter of taste, which makes repeat purchase and premium pricing hard to defend. A scorecard that says *"81% of your warehouse can state the new expense policy; 36% know the deadline"* turns every delivery into (a) a billable **"Proof of Banger"** line item, (b) evidence that justifies a higher price per project, (c) an upsell *after* delivery — the messages that did not land become the brief for a remix or a follow-up banger — and (d) a recurring recall check instead of a one-off song order. It also seeds the next project with structured client language and results instead of starting from zero.

Small-team constraint: the operator does nothing per employee. They send one link; employees self-serve a one-minute voice check; the scorecard builds itself. Cost per session is $0 (browser speech APIs + a local model).

## 3. What actually works

| Part | Status |
|---|---|
| Consent flow — plain-language disclosure, decline-and-type alternative, retention window recorded in the record | **Real** |
| Agent speaks each question (browser `speechSynthesis`) | **Real** |
| Employee answers by voice, transcribed in-browser (Web Speech API, Chrome) | **Real** |
| Silence / didn't-catch-that retry | **Real** |
| One follow-up question when an answer is vague or misses the message | **Real** |
| Recall scoring against the song brief — local Ollama model (`qwen2.5:1.5b`) | **Real when Ollama is running**; falls back automatically |
| Recall scoring — deterministic key-phrase matcher against the brief | **Real** (always available) |
| Structured `RecallRecord` JSON per employee, saved to disk | **Real** |
| Recall Scorecard — per message, per department, "next banger seed", cost per check | **Real**, computed live from records |
| The other 11 employees on the scorecard | **Fixtures** — synthetic employees of a fictional client (`data/fixtures/recall-records.json`) |
| Event log for outcome measurement | **Real** (`data/events.jsonl`), but nobody reads it yet |
| Song brief for the demo banger | **Fixture** (`lib/songBrief.ts`), fictional client "Acme Logistics" |
| Sending the link to employees, Supabase storage, the actual song | **Not built** — see section 7 |

Everything in the demo that is a fixture is labeled as such on screen (● marks the live session on the scorecard).

## 4. How it works

1. **Consent.** Before the microphone opens, the employee is told what is captured (a transcript), what is not (audio — never stored), how long it is kept (30 days), and how to withdraw. They can decline and type instead. The consent is stored inside their recall record. (`lib/consent.ts`)
2. **The voice agent asks three questions** drawn from the song brief's *required messages* — not the lyrics. Each question probes one thing leadership needed people to remember: where expenses go now, the deadline, what to attach. (`app/encore/page.tsx`, `lib/songBrief.ts`)
3. **The employee answers out loud.** Speech is transcribed in the browser. If nothing is caught, the agent says so and listens again.
4. **Vague answers get one follow-up.** "Um, not sure" or an answer that misses the message triggers the brief's follow-up question for that message, then the agent moves on — it never nags. (`lib/scoreRecall.ts: isAnswerVague`, `app/api/score/route.ts`)
5. **Recall scoring.** Each answer is judged against the required message: a local Ollama model reads the answer and the brief's target behavior and returns `{recalled, confidence, evidence}`; if Ollama is unreachable, a phrase matcher using the brief's key phrases decides. (`lib/scoreRecall.ts`)
6. **One structured record per employee.** The primary workflow turns the answers into a `RecallRecord`: per-message recall with evidence, message recall rate, whether the *full behavior* was recalled (not just the hook), the consent, the scorer used, and the session cost. (`lib/runRecallCheck.ts`, `lib/recallRecord.ts`)
7. **The scorecard aggregates everyone.** Recall by required message, by department, the share who can state the full behavior, cost per check, and a **next banger seed**: any message under 60% recall, with a suggestion to make it the hook of the remix. (`lib/aggregateScorecard.ts`, `app/scorecard/page.tsx`)
8. **Measurement events** are logged at each step so the revenue outcome can be proven later: invited → started → scored → completed → scorecard viewed → repeat purchase attributed. (`lib/recallEventLog.ts`)

## 5. Setup

- Node 22+ (uses built-in `fetch`; tested on Node 25), npm
- Google Chrome for the voice agent (Web Speech API speech recognition is Chrome-only; other browsers get the typed mode)
- **No paid API keys.** Optional: [Ollama](https://ollama.com) with `ollama pull qwen2.5:1.5b` for semantic scoring. Without it, the phrase matcher scores.

```bash
npm install
cp .env.example .env.local   # optional — only Ollama settings, both have defaults
npm run dev
```

## 6. The primary path

```bash
npm run dev
# open http://localhost:3000/encore  → consent → answer three questions by voice → recall record
# open http://localhost:3000/scorecard → the aggregated Recall Scorecard
```

Offline / no-microphone demonstration of the same workflow (OR-13), with the dev server running:

```bash
npm run demo   # POSTs a recorded transcript through the workflow and prints the RecallRecord
```

## 7. What you did not build, and why

Deliberately cut, in order of how much I wanted to build it:

- **Outbound delivery** (SMS/email link, or an actual phone call via telephony). The interesting part is the conversation and the scorecard, not the transport. With two more hours: a phone-call version via a telephony layer, because warehouse staff answer phones and do not open links.
- **Supabase persistence.** Records are JSON on disk. The path into the existing Next.js/Supabase surface is one `recall_records` table with a foreign key to the song record, one RLS policy, and the scorecard as a view — roughly half a day. See `lib/recallStore.ts`.
- **Reading the event log.** Events are written, not charted. Two more hours: a per-banger funnel and a "scorecard viewed → repeat order" attribution view.
- **A realtime speech-to-speech agent.** The assembled pipeline (browser STT → scorer → browser TTS) was the only way to hit $0 per session, which matters for a cost-free proof product. Interruption handling is limited to silence retry.
- **Brief authoring.** The brief is a fixture. In production it is the output of the intake step (Banger Brief) — Encore is the other end of the same loop.
- Multi-client, auth, music generation, any visual polish.

## 8. AI-use disclosure

Built in a 90-minute window with Claude (Anthropic) doing most of the typing: scaffolding, the lib modules, the pages, fixture generation, and this README — from a plan I chose and a scope I cut. Recall scoring at runtime uses a local `qwen2.5:1.5b` model via Ollama (Apache-2.0 model license, permits commercial use), falling back to deterministic code. No hosted model APIs are used at runtime.

## 9. Attribution

- Next.js (MIT), React (MIT), Ollama (MIT), Qwen2.5 1.5B (Apache-2.0)
- Speech recognition and synthesis: the browser's Web Speech API (Chrome)
- No audio files are included. No recordings of any person are stored. All employee names, the client, and the banger are fictional; no Business Bangerz client material was used.
