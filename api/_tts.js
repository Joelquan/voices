/**
 * Google Cloud Text-to-Speech for Voices (document uploads + DJ).
 *
 * Env (either works):
 *   GOOGLE_TTS_API_KEY  — preferred
 *   GOOGLE_API_KEY      — reused if TTS key not set (enable Cloud Text-to-Speech API)
 *
 * Optional:
 *   GOOGLE_TTS_VOICE    — default voice name, e.g. en-US-Neural2-F
 *   GOOGLE_TTS_LANG     — default languageCode, e.g. en-US
 *
 * Free tier: Google Cloud often includes monthly free Neural2 characters.
 * Enable API: https://console.cloud.google.com/apis/library/texttospeech.googleapis.com
 */

/** Friendly UI names → Google Neural2 voices */
const VOICE_MAP = {
  nova: { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' }, // warm default
  shimmer: { languageCode: 'en-US', name: 'en-US-Neural2-H', ssmlGender: 'FEMALE' },
  alloy: { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' },
  echo: { languageCode: 'en-US', name: 'en-US-Neural2-J', ssmlGender: 'MALE' },
  fable: { languageCode: 'en-GB', name: 'en-GB-Neural2-B', ssmlGender: 'MALE' },
  onyx: { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'MALE' },
  coral: { languageCode: 'en-US', name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' },
  sage: { languageCode: 'en-US', name: 'en-US-Neural2-G', ssmlGender: 'FEMALE' },
  // Ghana/UK-leaning options for church radio
  london: { languageCode: 'en-GB', name: 'en-GB-Neural2-A', ssmlGender: 'FEMALE' },
  daniel: { languageCode: 'en-GB', name: 'en-GB-Neural2-D', ssmlGender: 'MALE' },
};

function getApiKey() {
  return (
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_DRIVE_API_KEY ||
    ''
  );
}

function ttsConfigured() {
  return Boolean(getApiKey());
}

function resolveVoice(voice) {
  const key = String(voice || 'nova').toLowerCase().trim();
  if (VOICE_MAP[key]) return VOICE_MAP[key];

  // Allow full Google voice names: en-US-Neural2-F
  if (/^[a-z]{2}-[A-Z]{2}-/.test(String(voice || ''))) {
    const name = String(voice);
    const languageCode = name.split('-').slice(0, 2).join('-');
    return { languageCode, name, ssmlGender: 'NEUTRAL' };
  }

  // Env default
  const envName = process.env.GOOGLE_TTS_VOICE;
  if (envName) {
    const languageCode = process.env.GOOGLE_TTS_LANG || envName.split('-').slice(0, 2).join('-') || 'en-US';
    return { languageCode, name: envName, ssmlGender: 'NEUTRAL' };
  }

  return VOICE_MAP.nova;
}

function normalizeVoice(voice) {
  const key = String(voice || 'nova').toLowerCase().trim();
  if (VOICE_MAP[key]) return key;
  if (/^[a-z]{2}-[A-Z]{2}-/.test(String(voice || ''))) return String(voice);
  return 'nova';
}

/**
 * Synthesize MP3 via Google Cloud Text-to-Speech REST API.
 * @returns {Promise<Buffer|null>} null if no API key
 */
async function synthesizeMp3(text, voice = 'nova') {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const input = String(text || '').trim().slice(0, 4500);
  if (!input) throw new Error('Empty text for TTS');

  const v = resolveVoice(voice);
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: input },
      voice: {
        languageCode: v.languageCode,
        name: v.name,
        ssmlGender: v.ssmlGender || 'NEUTRAL',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 0.95,
        pitch: 0,
        // Slightly warmer for radio
        effectsProfileId: ['small-bluetooth-speaker-class-device'],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Common: API not enabled, billing, or key restrictions
    throw new Error(`Google TTS ${res.status}: ${err.slice(0, 320)}`);
  }

  const data = await res.json();
  const b64 = data?.audioContent;
  if (!b64) throw new Error('Google TTS response missing audioContent');
  const buf = Buffer.from(b64, 'base64');
  if (buf.length < 100) throw new Error('Google TTS returned empty audio');
  return buf;
}

module.exports = {
  VOICE_MAP,
  getApiKey,
  ttsConfigured,
  resolveVoice,
  normalizeVoice,
  synthesizeMp3,
};
