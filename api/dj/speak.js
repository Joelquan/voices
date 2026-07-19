/**
 * Optional neural DJ voice (Faith Radio / Abacus pattern).
 *
 * Env: ABACUSAI_API_KEY
 * POST { "text": "You're listening to The Church in Tema..." , "voice": "shimmer" }
 * Returns { audioBase64, format: "mp3", voice } or 503 if not configured.
 *
 * Prefer continuous sample/Drive MP3s for airtime; use this for custom stings later.
 */

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

  const apiKey = process.env.ABACUSAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'ABACUSAI_API_KEY not set',
      hint: 'Add Abacus AI key on Vercel for neural DJ TTS (gpt-audio-mini). Continuous sample MP3s work without this.',
    });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  // Vercel may not parse body automatically for plain node handlers
  if (!body || !Object.keys(body).length) {
    try {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString('utf8');
      body = raw ? JSON.parse(raw) : {};
    } catch {
      body = {};
    }
  }

  const text = String(body.text || '').trim().slice(0, 2000);
  const voice = String(body.voice || 'shimmer').slice(0, 40);
  if (!text) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }

  try {
    const r = await fetch('https://apps.abacus.ai/v1/chat/completions', {
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
              'Repeat back the exact text between the triple backticks as speech. Say nothing else, add nothing, continue nothing.',
          },
          { role: 'user', content: '```' + text + '```' },
        ],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      res.status(r.status).json({ error: 'TTS failed', detail: errText.slice(0, 300) });
      return;
    }

    const data = await r.json();
    const audio = data?.choices?.[0]?.message?.audios?.[0];
    const b64 = audio?.data;
    if (!b64) {
      res.status(502).json({ error: 'No audio in TTS response' });
      return;
    }

    res.status(200).json({
      format: 'mp3',
      voice,
      audioBase64: b64,
      audioId: audio?.id || null,
      transcript: audio?.transcript || null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
