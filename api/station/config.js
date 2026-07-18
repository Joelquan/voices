const { STATION, programSlots, getCurrentSlot } = require('../_program');

/** Public station identity for home + share pages. */
module.exports = function handler(req, res) {
  const current = getCurrentSlot();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    launchMode: 'single-station',
    station: STATION,
    now: {
      id: current.id,
      name: current.name,
      title: current.sample.title,
      timeRange: current.timeRange,
    },
    sharePath: '/listen',
    slotCount: programSlots.length,
  });
};
