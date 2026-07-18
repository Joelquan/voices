const { getConfig, streamFile, getFileMeta } = require('../_drive');

/**
 * Proxy audio from Google Drive so the browser can play it.
 * Requires GOOGLE_API_KEY and file shared “Anyone with the link”.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const id = (req.query?.id || new URL(req.url, 'http://x').searchParams.get('id') || '').trim();
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const { apiKey, configured } = getConfig();
  if (!configured) {
    res.status(503).json({
      error: 'Drive not configured',
      hint: 'Set GOOGLE_API_KEY and GOOGLE_DRIVE_FOLDER_ID on Vercel',
    });
    return;
  }

  try {
    let mime = 'audio/mpeg';
    try {
      const meta = await getFileMeta(id, apiKey);
      if (meta.mimeType) mime = meta.mimeType;
    } catch (_) {}

    const upstream = await streamFile(id, apiKey);
    if (!upstream.ok) {
      const text = await upstream.text();
      res.status(upstream.status).json({
        error: 'Drive stream failed',
        detail: text.slice(0, 300),
        hint: 'Share the file (or parent folder) as “Anyone with the link”.',
      });
      return;
    }

    res.setHeader('Content-Type', mime || 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.setHeader('Accept-Ranges', 'bytes');

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Length', String(buf.length));
    res.status(200).send(buf);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
