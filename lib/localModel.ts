/**
 * Local reasoning model (no paid APIs). One place that talks to Ollama.
 * Every caller has a deterministic fallback, so the suite works with Ollama off.
 */
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:1.5b";

/** Ask the local model for a JSON object. Returns null if Ollama is unreachable, slow, or returns non-JSON. */
export async function askLocalModelJson<T>(prompt: string, timeoutMs = 20000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: "json", options: { temperature: 0 } }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { response?: string };
    return JSON.parse(data.response ?? "null") as T;
  } catch {
    return null;
  }
}

export const LOCAL_MODEL_NAME = OLLAMA_MODEL;
