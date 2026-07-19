/**
 * OpenAI TTS for DJ lines / one-off speech.
 *
 * Env: OPENAI_API_KEY
 * POST { "text": "You're listening to The Church in Tema..." , "voice": "nova" }
 * Returns { audioBase64, format: "mp3", voice, provider: "openai" }
 */

const { synthesizeMp3, ttsConfigured, normalizeVoice } = require('../_tts');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  if (!ttsConfigured()) {
    res.status(503).json({
      error: 'OPENAI_API_KEY not set',
      hint: 'Add OPENAI_API_KEY on Vercel for OpenAI TTS (tts-1-hd). Sample MP3s and browser TTS still work without it.',
    });
    return;
  }

  const body = await readJsonBody(req);
  const text = String(body.text || '').trim().slice(0, 4096);
  const voice = normalizeVoice(body.voice || 'nova');
  if (!text) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  try {
    const buf = await synthesizeMp3(text, voice);
    if (!buf) {
      res.status(503).json({ error: 'TTS unavailable' });
      return;
    }
    res.status(200).json({
      provider: 'openai',
      format: 'mp3',
      voice,
      audioBase64: buf.toString('base64'),
      bytes: buf.length,
    });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
