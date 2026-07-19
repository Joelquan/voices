const { getStationNow } = require('../_broadcast');

/**
 * GET /api/stream/now
 * Faith Radio pattern: current segment + seek offset so all listeners stay in sync.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const payload = await getStationNow(new Date());
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
};
