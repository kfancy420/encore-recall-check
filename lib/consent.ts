import type { VoiceConsent } from "./recallRecord";

/**
 * Voice consent (OR-7). Voice is biometric data in several jurisdictions
 * (BIPA in Illinois, CUBI in Texas, GDPR Art. 9 in the EU), so Encore:
 *  - tells the employee exactly what is captured before the microphone opens
 *  - never stores raw audio — only the transcript, for a fixed retention window
 *  - records the consent itself inside the RecallRecord, with withdrawal instructions
 *  - lets the employee decline and still finish the check by typing instead
 */

export const TRANSCRIPT_RETENTION_DAYS = 30;

export const VOICE_CONSENT_DISCLOSURE =
  "Encore will listen to your spoken answers to three short questions about the song your company released. " +
  "Your audio is transcribed in your browser and is NOT saved or sent anywhere. " +
  `Only the text transcript is kept, for ${TRANSCRIPT_RETENTION_DAYS} days, so your company can see whether the message landed. ` +
  "Your voice is never cloned or reused. You can decline and type your answers instead, and you can withdraw at any time.";

export const WITHDRAWAL_INSTRUCTIONS =
  "Reply WITHDRAW to the Encore link or email the sender; the transcript is deleted within 24 hours.";

/** Record explicit consent (or a decline) before any voice capture happens. */
export function recordVoiceConsent(granted: boolean): VoiceConsent {
  return {
    granted,
    grantedAt: new Date().toISOString(),
    disclosure: VOICE_CONSENT_DISCLOSURE,
    transcriptRetentionDays: TRANSCRIPT_RETENTION_DAYS,
    audioRetained: false,
    withdrawalInstructions: WITHDRAWAL_INSTRUCTIONS,
  };
}
