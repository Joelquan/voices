/**
 * Uploaded readings (documents/text) for TTS → on-air.
 *
 * Speech: free TTS (StreamElements / Translate) → MP3; optional Google Cloud if key works
 * Persistence:
 * 1) Vercel Blob (BLOB_READ_WRITE_TOKEN) — shared across all listeners
 * 2) /tmp + memory — same warm instance only
 *
 * Client also keeps a localStorage copy so the uploader always hears their reading.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { synthesizeMp3, ttsConfigured, normalizeVoice } = require('./_tts');

const STORE_PATH = path.join('/tmp', 'voices-readings.json');
const AUDIO_DIR = path.join('/tmp', 'voices-reading-audio');
const BLOB_STORE_KEY = 'voices/readings-store.json';

function ensureAudioDir() {
  try {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  } catch (_) {}
}

function estimateDurationSec(text) {
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
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

async function blobEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function blobPutJson(pathname, data) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const res = await fetch(
    `https://blob.vercel-storage.com/${pathname}?${new URLSearchParams({
      pathname,
      access: 'public',
      contentType: 'application/json',
    })}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-content-type': 'application/json',
        'x-api-version': '7',
      },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Blob put failed ${res.status}: ${t.slice(0, 180)}`);
  }
  return res.json();
}

async function blobPutMp3(pathname, buffer) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const res = await fetch(
    `https://blob.vercel-storage.com/${pathname}?${new URLSearchParams({
      pathname,
      access: 'public',
      contentType: 'audio/mpeg',
    })}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-content-type': 'audio/mpeg',
        'x-api-version': '7',
      },
      body: buffer,
    }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Blob audio put failed ${res.status}: ${t.slice(0, 180)}`);
  }
  return res.json();
}

async function blobGetJson(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function loadLocalStore() {
  if (globalThis.__voicesReadings?.items) return globalThis.__voicesReadings;
  let items = [];
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      items = Array.isArray(raw.items) ? raw.items : [];
    }
  } catch (_) {}
  globalThis.__voicesReadings = { items, blobUrl: globalThis.__voicesReadingsBlobUrl || null };
  return globalThis.__voicesReadings;
}

function saveLocalStore() {
  const store = loadLocalStore();
  try {
    fs.writeFileSync(
      STORE_PATH,
      JSON.stringify({ items: store.items, blobUrl: store.blobUrl, savedAt: new Date().toISOString() })
    );
  } catch (_) {}
}

async function loadStore() {
  const local = loadLocalStore();
  // Prefer blob as source of truth when configured
  if (await blobEnabled()) {
    // Discover store URL from env or previous put
    let storeUrl = process.env.VOICES_READINGS_BLOB_URL || local.blobUrl || null;
    if (storeUrl) {
      const remote = await blobGetJson(storeUrl);
      if (remote?.items) {
        local.items = remote.items;
        local.blobUrl = storeUrl;
        globalThis.__voicesReadings = local;
        return local;
      }
    }
  }
  return local;
}

async function persistStore(store) {
  globalThis.__voicesReadings = store;
  saveLocalStore();
  if (await blobEnabled()) {
    try {
      const result = await blobPutJson(BLOB_STORE_KEY, {
        items: store.items,
        savedAt: new Date().toISOString(),
      });
      if (result?.url) {
        store.blobUrl = result.url;
        globalThis.__voicesReadingsBlobUrl = result.url;
        saveLocalStore();
      }
    } catch (err) {
      console.warn('Blob store save failed', err.message || err);
    }
  }
}

function listReadingsSync() {
  return (globalThis.__voicesReadings?.items || []).slice();
}

async function listReadings() {
  const store = await loadStore();
  return store.items.slice().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

async function getReading(id) {
  const store = await loadStore();
  return store.items.find((r) => r.id === id) || null;
}

async function deleteReading(id) {
  const store = await loadStore();
  const before = store.items.length;
  store.items = store.items.filter((r) => r.id !== id);
  await persistStore(store);
  try {
    fs.unlinkSync(path.join(AUDIO_DIR, `${id}.mp3`));
  } catch (_) {}
  return store.items.length < before;
}

function saveAudioBuffer(id, buffer) {
  ensureAudioDir();
  const filePath = path.join(AUDIO_DIR, `${id}.mp3`);
  try {
    fs.writeFileSync(filePath, buffer);
  } catch (_) {}
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

async function createReading({ title, text, type = 'devotional', voice = 'shimmer', filename = null }) {
  const cleaned = cleanText(text);
  if (!cleaned || cleaned.length < 20) {
    throw new Error('Text too short (need at least ~20 characters)');
  }

  const id = crypto.randomBytes(8).toString('hex');
  const durationSec = estimateDurationSec(cleaned);
  const chosenVoice = normalizeVoice(voice);
  const record = {
    id,
    title: String(title || 'Untitled reading').slice(0, 120),
    type: String(type || 'devotional').slice(0, 40),
    text: cleaned,
    filename: filename || null,
    voice: chosenVoice,
    durationSec,
    hasAudio: false,
    audioUrl: null,
    ttsMode: 'browser',
    ttsProvider: null,
    createdAt: new Date().toISOString(),
    station: 'tema',
  };

  try {
    const mp3 = await synthesizeMp3(cleaned, chosenVoice);
    if (mp3 && mp3.length > 100) {
      saveAudioBuffer(id, mp3);
      record.hasAudio = true;
      record.ttsMode = 'free';
      record.ttsProvider = 'free';
      record.durationSec = Math.max(15, Math.round((mp3.length * 8) / 64000));
      record.audioUrl = `/api/library/audio?id=${id}`;

      // Prefer public blob URL so every listener can stream
      if (await blobEnabled()) {
        try {
          const blob = await blobPutMp3(`voices/readings/${id}.mp3`, mp3);
          if (blob?.url) {
            record.audioUrl = blob.url;
            record.blobAudioUrl = blob.url;
          }
        } catch (e) {
          console.warn('Blob audio upload failed', e.message || e);
        }
      }
    } else if (!ttsConfigured()) {
      record.ttsMode = 'browser';
    }
  } catch (err) {
    record.ttsError = String(err.message || err).slice(0, 280);
  }

  const store = await loadStore();
  store.items.unshift(record);
  store.items = store.items.slice(0, 40);
  await persistStore(store);
  return record;
}

async function readingsAsPlaylistItems() {
  const items = await listReadings();
  return items
    .filter((r) => r.text || r.hasAudio)
    .map((r, i) => ({
      id: `reading-${r.id}`,
      readingId: r.id,
      title: r.title,
      type: r.type || 'devotional',
      source: 'upload',
      agent: 'librarian',
      audioUrl: r.audioUrl || (r.hasAudio ? `/api/library/audio?id=${r.id}` : null),
      speakText: r.text,
      durationSec: r.durationSec || estimateDurationSec(r.text),
      playbackMode: r.hasAudio || r.audioUrl ? 'audio' : 'tts',
      ttsMode: r.ttsMode,
      orderIndex: 1000 + i,
    }));
}

module.exports = {
  listReadings,
  listReadingsSync,
  getReading,
  deleteReading,
  createReading,
  getAudioBuffer,
  readingsAsPlaylistItems,
  estimateDurationSec,
  cleanText,
  blobEnabled,
};
