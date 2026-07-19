/**
 * Free TTS for Voices (no paid API required).
 *
 * Priority:
 * 1) StreamElements free speech API (neural-quality voices, no key)
 * 2) Google Translate free TTS endpoint (short chunks, no key)
 * 3) Caller falls back to browser Web Speech if both fail
 *
 * Optional paid upgrade later: GOOGLE_TTS_API_KEY / OPENAI_API_KEY (not required).
 *
 * Voices (StreamElements / Polly-style names):
 *   Brian, Amy, Emma, Joanna, Matthew, Ivy, Justin, Kendra, Kimberly, Salli, Joey, ...
 */

const FREE_VOICES = {
  nova: 'Amy', // warm female default
  shimmer: 'Joanna',
  coral: 'Salli',
  sage: 'Kimberly',
  london: 'Emma',
  alloy: 'Brian',
  echo: 'Matthew',
  onyx: 'Joey',
  daniel: 'Brian',
  fable: 'Brian',
  // direct SE names also allowed
  amy: 'Amy',
  brian: 'Brian',
  emma: 'Emma',
  joanna: 'Joanna',
  matthew: 'Matthew',
};

function normalizeVoice(voice) {
  const key = String(voice || 'nova').toLowerCase().trim();
  if (FREE_VOICES[key]) return key;
  // Allow raw StreamElements voice names
  if (/^[A-Za-z]+$/.test(String(voice || ''))) return String(voice);
  return 'nova';
}

function resolveSeVoice(voice) {
  const key = String(voice || 'nova').toLowerCase().trim();
  if (FREE_VOICES[key]) return FREE_VOICES[key];
  // Capitalize raw name
  const raw = String(voice || 'Amy');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Always "configured" for free path — no API key needed. */
function ttsConfigured() {
  return true;
}

function splitChunks(text, maxLen = 220) {
  const clean = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const parts = [];
  let rest = clean;
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf('. ', maxLen);
    if (cut < maxLen * 0.4) cut = rest.lastIndexOf(' ', maxLen);
    if (cut < maxLen * 0.3) cut = maxLen;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts.filter(Boolean);
}

async function fetchStreamElementsMp3(text, voiceName) {
  const url =
    'https://api.streamelements.com/kappa/v2/speech?' +
    new URLSearchParams({
      voice: voiceName,
      text: text.slice(0, 3000),
    });
  const res = await fetch(url, {
    headers: {
      Accept: 'audio/mpeg,*/*',
      'User-Agent': 'VoicesChurchRadio/1.0',
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`StreamElements TTS ${res.status}: ${err.slice(0, 160)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) throw new Error('StreamElements returned empty audio');
  return buf;
}

async function fetchGoogleTranslateMp3(text, lang = 'en') {
  // Unofficial free endpoint — short chunks only
  const q = text.slice(0, 180);
  const url =
    'https://translate.google.com/translate_tts?' +
    new URLSearchParams({
      ie: 'UTF-8',
      q,
      tl: lang,
      client: 'tw-ob',
    });
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://translate.google.com/',
      Accept: 'audio/mpeg,*/*',
    },
  });
  if (!res.ok) throw new Error(`Google Translate TTS ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 100) throw new Error('Translate TTS empty');
  return buf;
}

/** Naive MP3 concatenation (works for sequential simple streams). */
function concatMp3(buffers) {
  return Buffer.concat(buffers.filter((b) => b && b.length));
}

/**
 * Free synthesize MP3 — no API key.
 * @returns {Promise<Buffer|null>}
 */
async function synthesizeMp3(text, voice = 'nova') {
  const input = String(text || '').trim().slice(0, 4500);
  if (!input) throw new Error('Empty text for TTS');

  const seVoice = resolveSeVoice(voice);
  const chunks = splitChunks(input, 280);

  // 1) StreamElements (best free quality)
  try {
    const parts = [];
    for (const chunk of chunks) {
      parts.push(await fetchStreamElementsMp3(chunk, seVoice));
      // be polite to free endpoint
      if (chunks.length > 1) await new Promise((r) => setTimeout(r, 120));
    }
    return concatMp3(parts);
  } catch (seErr) {
    console.warn('StreamElements TTS failed, trying Translate TTS:', seErr.message || seErr);
  }

  // 2) Google Translate TTS free chunks
  try {
    const parts = [];
    const small = splitChunks(input, 160);
    for (const chunk of small) {
      parts.push(await fetchGoogleTranslateMp3(chunk, 'en'));
      await new Promise((r) => setTimeout(r, 80));
    }
    return concatMp3(parts);
  } catch (gtErr) {
    console.warn('Translate TTS failed:', gtErr.message || gtErr);
  }

  // 3) Optional Google Cloud if user already enabled paid free-tier later
  const gKey =
    process.env.GOOGLE_TTS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_DRIVE_API_KEY ||
    '';
  if (gKey) {
    try {
      return await synthesizeGoogleCloudMp3(input, gKey, voice);
    } catch (e) {
      console.warn('Google Cloud TTS failed:', e.message || e);
    }
  }

  // null → caller uses browser Web Speech
  return null;
}

async function synthesizeGoogleCloudMp3(text, apiKey, voice) {
  const map = {
    nova: 'en-US-Neural2-F',
    shimmer: 'en-US-Neural2-H',
    alloy: 'en-US-Neural2-D',
    echo: 'en-US-Neural2-J',
    fable: 'en-GB-Neural2-B',
    onyx: 'en-US-Neural2-A',
    coral: 'en-US-Neural2-C',
    sage: 'en-US-Neural2-G',
    london: 'en-GB-Neural2-A',
    daniel: 'en-GB-Neural2-D',
  };
  const name = map[String(voice || 'nova').toLowerCase()] || 'en-US-Neural2-F';
  const languageCode = name.split('-').slice(0, 2).join('-');
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: text.slice(0, 4500) },
      voice: { languageCode, name },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95 },
    }),
  });
  if (!res.ok) throw new Error(`Google Cloud TTS ${res.status}`);
  const data = await res.json();
  if (!data.audioContent) throw new Error('missing audioContent');
  return Buffer.from(data.audioContent, 'base64');
}

module.exports = {
  FREE_VOICES,
  normalizeVoice,
  resolveSeVoice,
  ttsConfigured,
  synthesizeMp3,
};
