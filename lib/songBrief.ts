/**
 * Song brief fixture (synthetic client, synthetic banger).
 *
 * This is the structured record of what a banger has to accomplish: objective,
 * audience, required messages, target behavior, tone, pronunciations, constraints.
 * Encore scores employee recall AGAINST THIS BRIEF — not against the lyrics —
 * because the business outcome Business Bangerz sells is "people remember the
 * message and act on it", not "people remember the hook".
 *
 * Entirely fictional. No real client data.
 */

export type RequiredMessage = {
  id: string;
  /** The message leadership needs people to remember, in plain words. */
  message: string;
  /** Phrases that count as evidence of recall in a spoken answer. */
  keyPhrases: string[];
  /** The spoken question the voice agent asks to probe this message. */
  question: string;
  /** Follow-up asked when the first answer is vague or incomplete. */
  followUp: string;
  /** Tap-to-answer options shown alongside the microphone, in case voice fails. Exactly one is the recalled message. */
  choices: string[];
};

export type SongBrief = {
  bangerId: string;
  bangerTitle: string;
  client: string;
  useCase: string;
  genre: string;
  releasedOn: string;
  objective: string;
  audience: string;
  /** The behavior change leadership actually wants — the real objective behind the deck language. */
  targetBehavior: string;
  requiredMessages: RequiredMessage[];
  tone: string;
  /** Company-specific names, acronyms and jargon with how to say them. */
  pronunciations: Record<string, string>;
  constraints: string[];
};

export const EXPENSE_POLICY_BRIEF: SongBrief = {
  bangerId: "acme-expense-it-2026",
  bangerTitle: "Expense It, Don't Stress It",
  client: "Acme Logistics (fictional)",
  useCase: "Policy rollout",
  genre: "Pop",
  releasedOn: "2026-08-26",
  objective:
    "Get 340 warehouse and dispatch employees onto the new expense process without a single missed reimbursement deadline in Q4.",
  audience: "Warehouse leads, drivers and dispatch staff. Mostly on phones, rarely at a desk.",
  targetBehavior:
    "Submit expenses in the Spendly app within 7 days of purchase, with a photo of the receipt, instead of emailing receipts to a manager at month end.",
  requiredMessages: [
    {
      id: "M1",
      message: "Expenses go in the Spendly app, not in email.",
      keyPhrases: ["spendly", "the app", "in the app", "not email", "no more email", "stop emailing"],
      question: "When you buy something for work now, where does the expense go?",
      followUp: "Is there a specific app or place it goes now, instead of what you used to do?",
      choices: ["Into the Spendly app", "Email it to my manager", "Hand the receipt to a supervisor", "Not sure"],
    },
    {
      id: "M2",
      message: "Submit within 7 days of the purchase.",
      keyPhrases: ["seven days", "7 days", "a week", "one week", "within the week"],
      question: "How long do you have to submit it after you buy something?",
      followUp: "Roughly how many days? Take a guess if you're not sure.",
      choices: ["Seven days", "By the end of the month", "30 days", "Not sure"],
    },
    {
      id: "M3",
      message: "Every submission needs a photo of the receipt.",
      keyPhrases: ["photo", "picture", "snap", "receipt", "take a pic", "scan"],
      question: "Last one: what has to be attached for an expense to get approved?",
      followUp: "Anything you need to include with it — a document, an image, anything like that?",
      choices: ["A photo of the receipt", "A manager's signature", "Nothing, just the amount", "Not sure"],
    },
  ],
  tone: "Upbeat, a little cheeky, not corporate. Should sound like a summer pop single, not a training video.",
  pronunciations: {
    Spendly: "SPEND-lee",
    Q4: "cue four",
    Acme: "ACK-mee",
  },
  constraints: [
    "Never say the old process was 'wrong' — leadership wants zero blame.",
    "Do not mention the reimbursement dollar cap in the song.",
  ],
};
