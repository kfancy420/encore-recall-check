import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Outcome measurement log (OR-11).
 *
 * The business outcome Encore targets is revenue: proof of impact that lets
 * Business Bangerz charge for a "Proof of Banger" tier, defend premium pricing,
 * and win repeat purchase. Proving that six months from now needs these events:
 *
 *  - recall_check_invited / started / completed  → participation funnel per banger
 *  - recall_scored                                → message-level recall per employee
 *  - scorecard_viewed                             → did the client actually look at the proof
 *  - repeat_purchase_attributed (manual today)    → did a scorecard precede the next order
 *
 * Written as JSON lines to data/events.jsonl. In production this is one
 * Supabase table (`recall_events`) keyed by banger_id.
 */

export type RecallEventName =
  | "recall_check_invited"
  | "recall_check_started"
  | "consent_declined"
  | "follow_up_asked"
  | "recall_scored"
  | "recall_check_completed"
  | "scorecard_viewed"
  | "repeat_purchase_attributed";

const EVENTS_FILE = path.join(process.cwd(), "data", "events.jsonl");

export function logRecallEvent(name: RecallEventName, bangerId: string, props: Record<string, unknown> = {}) {
  const event = { at: new Date().toISOString(), name, bangerId, ...props };
  try {
    mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
    appendFileSync(EVENTS_FILE, JSON.stringify(event) + "\n");
  } catch {
    // Logging must never break the recall check itself.
  }
  return event;
}
