const { STATION } = require('../_program');
const { fetchLibrary, getConfig } = require('../_drive');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const lib = await fetchLibrary(STATION);
  const cfg = getConfig(STATION);

  res.status(200).json({
    station: {
      name: STATION.name,
      location: STATION.location,
      shortCode: STATION.shortCode,
    },
    drive: {
      folderId: cfg.folderId,
      configured: cfg.configured,
      folderUrl: cfg.folderId
        ? `https://drive.google.com/drive/folders/${cfg.folderId}`
        : null,
    },
    ...lib,
    byCategory: groupBy(lib.items || [], 'category'),
  });
};

function groupBy(items, key) {
  const out = {};
  for (const it of items) {
    const k = it[key] || 'other';
    if (!out[k]) out[k] = [];
    out[k].push(it);
  }
  return out;
}
