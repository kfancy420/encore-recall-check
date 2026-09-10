# Banger Loop — Encore, plus four more voice-agent stops on the loop

## 1. What this is

**Encore** is the primary concept: a voice agent that calls the room two weeks after a banger ships, asks each employee three spoken questions about the message the song carried, scores the answers against the original song brief, and rolls everyone up into a **Recall Scorecard** the client's leadership can see. It gives Business Bangerz proof that the message landed — and tells them exactly what to remix when it didn't.

The repository is a suite around the Banger Loop, sharing one audio layer, one local model, and one song: **Revision Room** (`/revision`, CREATE — F2, cost: talk over the banger, get timestamped, prioritized production notes), **Sonic DNA** (`/sonic-dna`, CREATE — F4, revenue: workplace sounds become the drum kit), **Company Choir** (`/choir`, CREATE — F4, revenue: consented employee voices on the chorus), and **Banger Brief** (`/brief`, LISTEN — F1/F6, cost: the intake interview as a conversation). Encore (`/encore` → `/scorecard`, LISTEN AGAIN) is the primary concept and the one to score against the rubric; the others exist because the same brief object and the same song flow through all of them — that is what makes F6 (reusable memory) real rather than claimed.

The song itself — *"Expense It, Don't Stress It"* — is written from the demo brief and performed in the browser: Web Audio band, and a vocal rendered by the macOS speech engine (`scripts/render-vocals.py`, free, local) that is rapped on the downbeat in the verses and pitch-shifted onto a hook melody in the choruses (`lib/vocalPerformer.ts`). Original by construction; no recordings of any person, no copyrighted audio.

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
| **Banger Brief**: 5-question voice/typed interview, vague-answer follow-up, live brief panel, local-model refinement into OR-6 fields incl. pronunciations (OR-5), saved JSON | **Real** (`lib/bangerBrief.ts`, `app/brief`) |
| **Revision Room**: the full ~2-minute banger performed in the browser (drums, bass, pad, lead, rendered rapped/sung vocal with lyric display), continuous listening while it plays with the song's own lyrics filtered out, remarks timestamped to the playhead and mapped to song sections, rule-based + local-model classification into production notes, seek by section, saved JSON | **Real** (`lib/bangerSong.ts`, `lib/demoTrack.ts`, `lib/vocalPerformer.ts`, `lib/revisionNotes.ts`, `app/revision`); "Load last session" loads fixture notes |
| **Sonic DNA**: record three workplace sounds on the device, trimmed and normalized, swapped in as kick/snare/hat, the same song re-performed with them, sonic-signature record + WAVs saved | **Real** (`lib/micRecorder.ts`, `app/sonic-dna`) |
| **Company Choir**: built consent flow (disclosure, three explicit agreements, retention, withdrawal, no cloning), per-person recording of the hook, stacked on the first beat of every chorus over the lead vocal, consent records saved with the clips | **Real** (`app/choir`, `lib/consent.ts`) |
| Brief history and writer-ready brief page | **Real** (`/brief`, `/brief/<id>`) |
| Tap-to-answer choices in Encore (in case the microphone fails) | **Real** |

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

### The other apps, briefly

- **Banger Brief** takes client, topic and audience as typed context, then asks three spoken questions: what people get wrong and what they should do differently on Monday (follow-up: one real example) → must-say phrases, banned words, names and acronyms said the way the team says them → what it should sound like. Each answer lands in the brief immediately (`assembleBriefFromAnswers`); at the end the local model tidies it (`refineBriefWithLocalModel`). Output: `data/briefs/*.json`, browsable at `/brief` and `/brief/<id>`.
- **Sonic DNA** records a kick, a snare and a hat from whatever is in the room (`recordClip` trims the silence before the hit and normalizes), then `performBanger` plays the chorus with those buffers in place of the synthesized drums. Output: a sonic-signature record and WAVs under `data/sounds/`.
- **Company Choir** gates the microphone behind a consent flow, records each person saying the hook, and schedules every voice on the first beat of each chorus as cameos. Output: a choir record with one consent record per person, plus WAVs, under `data/sounds/`.
- **Revision Room** plays a draft and listens continuously (`listenContinuous`). Each final phrase is stamped with the playhead position, mapped to a section (`sectionAt`), and classified (`classifyFeedback`) into `{section, element, verdict, priority, action}`. The client can also click the timeline and type. Output: `data/revisions/*.json`.

## 5. Setup

- Node 22+ (uses built-in `fetch`; tested on Node 25), npm
- macOS `say` only if you want to re-render the vocal (`python3 scripts/render-vocals.py`); the rendered lines are committed under `public/vocals/`
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
# open http://localhost:3000/encore  → consent → answer three questions by voice (or tap) → recall record
# open http://localhost:3000/scorecard → the aggregated Recall Scorecard
# also: /revision (play the banger and talk), /sonic-dna, /choir, /brief
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
- **A better singer.** The vocal is a speech engine pitch-shifted with a granular shifter — on the beat and in key, but audibly synthetic. That is deliberate: music craft belongs to Business Bangerz (RFP §6.3); the point is that the whole pipeline re-renders the same song with a client's sounds and voices.
- **Brief authoring.** The brief is a fixture. In production it is the output of the intake step (Banger Brief) — Encore is the other end of the same loop.
- Multi-client, auth, music generation.
- Wiring Banger Brief's output into Encore's questions automatically. Today Encore reads a fixture brief with the same shape; the join is a file read.

## 8. AI-use disclosure

Built in the event window with Claude (Anthropic) doing most of the typing: scaffolding, the lib modules, the pages, fixture generation, and this README — from a plan I chose and a scope I cut. Recall scoring at runtime uses a local `qwen2.5:1.5b` model via Ollama (Apache-2.0 model license, permits commercial use), falling back to deterministic code. No hosted model APIs are used at runtime.

## 9. Attribution

- Next.js (MIT), React (MIT), Ollama (MIT), Qwen2.5 1.5B (Apache-2.0)
- Speech recognition and synthesis: the browser's Web Speech API (Chrome)
- The only audio files are the lyric lines under `public/vocals/`, rendered by the macOS speech engine ("Samantha") from lyrics written for this prototype. The band is synthesized at runtime with the Web Audio API. Recordings made in Sonic DNA / Company Choir stay on the machine, are consented, and are excluded from the repository. All employee names, the client, and the banger are fictional; no Business Bangerz client material was used.
