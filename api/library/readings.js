const { listReadings, createReading, deleteReading, getReading } = require('../_readings');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      const all = await listReadings();
      const items = all.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        filename: r.filename,
        durationSec: r.durationSec,
        hasAudio: r.hasAudio,
        audioUrl: r.audioUrl,
        ttsMode: r.ttsMode,
        ttsError: r.ttsError || null,
        createdAt: r.createdAt,
        text: r.text,
        preview: (r.text || '').slice(0, 160),
        wordCount: (r.text || '').split(/\s+/).filter(Boolean).length,
      }));
      const hasBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
      res.status(200).json({
        count: items.length,
        items,
        neuralTts: Boolean(process.env.ABACUSAI_API_KEY),
        durableStore: hasBlob,
        note: process.env.ABACUSAI_API_KEY
          ? (hasBlob
            ? 'Neural TTS + durable Blob storage — uploads stay on air for everyone.'
            : 'Neural TTS on. Add BLOB_READ_WRITE_TOKEN so every listener hears uploads (not only this server instance).')
          : (hasBlob
            ? 'Durable store on. Add ABACUSAI_API_KEY for neural MP3; until then browser TTS.'
            : 'No ABACUSAI_API_KEY / Blob — uploads work with browser TTS; may not share across all servers until Blob is set.'),
      });
      return;
    }

    if (req.method === 'POST') {
      const body = await readJsonBody(req);
      const reading = await createReading({
        title: body.title,
        text: body.text,
        type: body.type || 'devotional',
        voice: body.voice || 'shimmer',
        filename: body.filename || null,
      });
      res.status(201).json({
        ok: true,
        reading: {
          id: reading.id,
          title: reading.title,
          type: reading.type,
          durationSec: reading.durationSec,
          hasAudio: reading.hasAudio,
          audioUrl: reading.audioUrl,
          ttsMode: reading.ttsMode,
          ttsError: reading.ttsError || null,
          createdAt: reading.createdAt,
          preview: reading.text.slice(0, 160),
        },
      });
      return;
    }

    if (req.method === 'DELETE') {
      const body = await readJsonBody(req);
      const url = new URL(req.url, 'http://x');
      const id = body.id || url.searchParams.get('id');
      if (!id) {
        res.status(400).json({ error: 'Missing id' });
        return;
      }
      const ok = await deleteReading(id);
      res.status(ok ? 200 : 404).json({ ok, id });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.status(400).json({ error: String(err.message || err) });
  }
};
