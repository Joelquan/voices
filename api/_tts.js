/**
 * OpenAI Text-to-Speech for Voices (document uploads + DJ stings).
 *
 * Env:
 *   OPENAI_API_KEY   — required for neural speech
 *   OPENAI_TTS_MODEL — optional, default "tts-1-hd" (or "tts-1" for cheaper/faster)
 *
 * Voices: alloy | ash | ballad | coral | echo | fable | nova | onyx | sage | shimmer
 * https://platform.openai.com/docs/guides/text-to-speech
 */

const OPENAI_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'fable',
  'nova',
  'onyx',
  'sage',
  'shimmer',
]);

function normalizeVoice(voice) {
  const v = String(voice || 'nova').toLowerCase().trim();
  return OPENAI_VOICES.has(v) ? v : 'nova';
}

function ttsConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Synthesize MP3 from text via OpenAI.
 * @returns {Promise<Buffer|null>} null if no API key
 */
async function synthesizeMp3(text, voice = 'nova') {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const input = String(text || '').trim().slice(0, 4096);
  if (!input) throw new Error('Empty text for TTS');

  const model = process.env.OPENAI_TTS_MODEL || 'tts-1-hd';
  const chosen = normalizeVoice(voice);

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input,
      voice: chosen,
      response_format: 'mp3',
      // Slightly calmer for church radio
      speed: 0.95,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI TTS ${res.status}: ${err.slice(0, 280)}`);
  }

  const ab = await res.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length < 100) throw new Error('OpenAI TTS returned empty audio');
  return buf;
}

module.exports = {
  OPENAI_VOICES,
  normalizeVoice,
  ttsConfigured,
  synthesizeMp3,
};
