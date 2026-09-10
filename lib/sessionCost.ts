/**
 * Cost of a single recall-check session (OR-10).
 *
 * Encore is built so one session costs Business Bangerz nothing to operate:
 *  - speech recognition: browser Web Speech API (free)
 *  - agent voice: browser speechSynthesis (free)
 *  - scoring: local Ollama model on the operator's machine, or the phrase matcher (free)
 *
 * The hosted alternative is shown for the business case only — it is what the
 * same session would cost on a typical STT + hosted LLM + TTS pipeline, so the
 * margin on a "Proof of Banger" line item is understood either way.
 */

export type SessionCostEstimate = {
  localPipelineUsd: number;
  hostedPipelineUsd: number;
  assumptions: string[];
};

export function estimateSessionCost(answerCount: number, secondsOfSpeech = 60): SessionCostEstimate {
  const sttPerMinute = 0.006; // typical hosted STT
  const ttsPer1kChars = 0.015; // typical hosted TTS
  const llmPerCall = 0.0004; // small hosted model, ~600 tokens per scoring call
  const hosted =
    (secondsOfSpeech / 60) * sttPerMinute + (answerCount * 120 * ttsPer1kChars) / 1000 + answerCount * llmPerCall;
  return {
    localPipelineUsd: 0,
    hostedPipelineUsd: Number(hosted.toFixed(4)),
    assumptions: [
      `${answerCount} questions, ~${secondsOfSpeech}s of employee speech`,
      "Local: browser speech APIs + local model = $0 per session",
      "Hosted comparison: STT $0.006/min, TTS $0.015/1k chars, LLM $0.0004/call",
    ],
  };
}
