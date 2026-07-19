const { getAudioBuffer, getReading } = require('../_readings');

/** Stream generated MP3 for an uploaded reading. */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const url = new URL(req.url, 'http://x');
  const id = (url.searchParams.get('id') || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const reading = getReading(id);
  if (!reading) {
    res.status(404).json({ error: 'Reading not found (may have expired on cold start — re-upload)' });
    return;
  }

  const buf = getAudioBuffer(id);
  if (!buf) {
    res.status(404).json({
      error: 'No MP3 for this reading',
      hint: 'Set ABACUSAI_API_KEY for neural TTS, or use browser TTS mode on listen',
      speakText: reading.text?.slice(0, 500),
    });
    return;
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('Content-Length', String(buf.length));
  res.status(200).send(buf);
};
