/**
 * Uploaded readings (documents/text) for TTS → on-air.
 * Stored in memory + /tmp so a warm serverless instance keeps them.
 * Optional: ABACUSAI_API_KEY generates real MP3 for /api/library/audio?id=
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STORE_PATH = path.join('/tmp', 'voices-readings.json');
const AUDIO_DIR = path.join('/tmp', 'voices-reading-audio');

function ensureAudioDir() {
  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  } catch (_) {}
}

function loadStore() {
  if (globalThis.__voicesReadings?.items) {
    return globalThis.__voicesReadings;
  }
  let items = [];
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      items = Array.isArray(raw.items) ? raw.items : [];
    }
  } catch (_) {}
  globalThis.__voicesReadings = { items };
  return globalThis.__voicesReadings;
}

function saveStore() {
  const store = loadStore();
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ items: store.items, savedAt: new Date().toISOString() }));
  } catch (_) {}
}

function listReadings() {
  return loadStore().items.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function getReading(id) {
  return loadStore().items.find((r) => r.id === id) || null;
}

function deleteReading(id) {
  const store = loadStore();
  const before = store.items.length;
  store.items = store.items.filter((r) => r.id !== id);
  saveStore();
  try {
    fs.unlinkSync(path.join(AUDIO_DIR, `${id}.mp3`));
  } catch (_) {}
  return store.items.length < before;
}

function estimateDurationSec(text) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  // ~130 wpm spoken radio pace
  return Math.max(15, Math.round((words / 130) * 60));
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[ \u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 12000);
}

async function synthesizeMp3(text, voice = 'shimmer') {
  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-audio-mini',
      modalities: ['text', 'audio'],
      audio: { voice, format: 'mp3' },
      messages: [
        {
          role: 'system',
          content:
            'Repeat back the exact text between the triple backticks as speech. Say nothing else, add nothing, continue nothing. Read in a warm, clear radio voice for a church station.',
        },
        { role: 'user', content: '```' + text.slice(0, 3500) + '```' },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const b64 = data?.choices?.[0]?.message?.audios?.[0]?.data;
  if (!b64) throw new Error('TTS response missing audio');
  return Buffer.from(b64, 'base64');
}

function saveAudioBuffer(id, buffer) {
  ensureAudioDir();
  const filePath = path.join(AUDIO_DIR, `${id}.mp3`);
  fs.writeFileSync(filePath, buffer);
  if (!globalThis.__voicesReadingAudio) globalThis.__voicesReadingAudio = new Map();
  globalThis.__voicesReadingAudio.set(id, buffer);
  return filePath;
}

function getAudioBuffer(id) {
  if (globalThis.__voicesReadingAudio?.has(id)) {
    return globalThis.__voicesReadingAudio.get(id);
  }
  const filePath = path.join(AUDIO_DIR, `${id}.mp3`);
  try {
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      if (!globalThis.__voicesReadingAudio) globalThis.__voicesReadingAudio = new Map();
      globalThis.__voicesReadingAudio.set(id, buf);
      return buf;
    }
  } catch (_) {}
  return null;
}

/**
 * Create a reading from title + text. Tries neural TTS when key is set.
 */
async function createReading({ title, text, type = 'devotional', voice = 'shimmer', filename = null }) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 20) {
    throw new Error('Text too short (need at least ~20 characters)');
  }

  const id = crypto.randomBytes(8).toString('hex');
  const durationSec = estimateDurationSec(cleaned);
  const record = {
    id,
    title: String(title || 'Untitled reading').slice(0, 120),
    type: String(type || 'devotional').slice(0, 40),
    text: cleaned,
    filename: filename || null,
    voice,
    durationSec,
    hasAudio: false,
    audioUrl: null,
    ttsMode: 'browser',
    createdAt: new Date().toISOString(),
    station: 'tema',
  };

  try {
    const mp3 = await synthesizeMp3(cleaned, voice);
    if (mp3 && mp3.length > 100) {
      saveAudioBuffer(id, mp3);
      record.hasAudio = true;
      record.audioUrl = `/api/library/audio?id=${id}`;
      record.ttsMode = 'neural';
      // better duration from 64kbps estimate
      record.durationSec = Math.max(15, Math.round((mp3.length * 8) / 64000));
    }
  } catch (err) {
    record.ttsError = String(err.message || err).slice(0, 200);
    // keep browser TTS fallback
  }

  const store = loadStore();
  store.items.unshift(record);
  // keep last 40
  store.items = store.items.slice(0, 40);
  saveStore();
  return record;
}

/** Public playlist items for broadcast (no full text dump). */
function readingsAsPlaylistItems() {
  return listReadings()
    .filter((r) => r.text || r.hasAudio)
    .map((r, i) => ({
      id: `reading-${r.id}`,
      readingId: r.id,
      title: r.title,
      type: r.type || 'devotional',
      source: 'upload',
      agent: 'librarian',
      audioUrl: r.hasAudio ? `/api/library/audio?id=${r.id}` : null,
      speakText: r.text,
      durationSec: r.durationSec || estimateDurationSec(r.text),
      playbackMode: r.hasAudio ? 'audio' : 'tts',
      ttsMode: r.ttsMode,
      orderIndex: 1000 + i,
    }));
}

module.exports = {
  listReadings,
  getReading,
  deleteReading,
  createReading,
  getAudioBuffer,
  readingsAsPlaylistItems,
  estimateDurationSec,
  cleanText,
};
