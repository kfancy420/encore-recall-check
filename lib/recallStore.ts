import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { RecallRecord } from "./recallRecord";

/**
 * Recall record storage. Prototype: JSON files on disk.
 *
 * Production path (Business Bangerz already runs Next.js + Supabase): this
 * module becomes two inserts into a `recall_records` table with a foreign key
 * to the existing song record, and the scorecard becomes a Supabase view.
 * Estimated adoption effort: one table, one RLS policy, half a day.
 */

const RECORDS_DIR = path.join(process.cwd(), "data", "records");
const FIXTURES_FILE = path.join(process.cwd(), "data", "fixtures", "recall-records.json");

export function saveRecallRecord(record: RecallRecord) {
  mkdirSync(RECORDS_DIR, { recursive: true });
  writeFileSync(path.join(RECORDS_DIR, `${record.recordId}.json`), JSON.stringify(record, null, 2));
}

/** Live records from real sessions plus offline fixtures (OR-13) for the other employees. */
export function loadRecallRecords(bangerId: string): RecallRecord[] {
  const fixtures = JSON.parse(readFileSync(FIXTURES_FILE, "utf8")) as RecallRecord[];
  let live: RecallRecord[] = [];
  try {
    live = readdirSync(RECORDS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => JSON.parse(readFileSync(path.join(RECORDS_DIR, f), "utf8")) as RecallRecord);
  } catch {
    live = [];
  }
  return [...fixtures, ...live].filter((r) => r.bangerId === bangerId);
}
