/**
 * Free TTS for DJ lines / one-off speech (no paid API required).
 *
 * POST { "text": "...", "voice": "nova" }
 * Returns { audioBase64, format: "mp3", voice, provider: "free" }
 */

const { synthesizeMp3, normalizeVoice } = require('../_tts');

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

  const body = await readJsonBody(req);
  const text = String(body.text || '').trim().slice(0, 4500);
  const voice = normalizeVoice(body.voice || 'nova');
  if (!text) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  try {
    const buf = await synthesizeMp3(text, voice);
    if (!buf) {
      res.status(503).json({
        error: 'Free TTS providers unavailable right now',
        hint: 'Try again, or the listen page will use browser speech.',
      });
      return;
    }
    res.status(200).json({
      provider: 'free',
      format: 'mp3',
      voice,
      audioBase64: buf.toString('base64'),
      bytes: buf.length,
    });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
