const { STATION, programSlots, getCurrentSlot, managerBuildRundown } = require('../_agents');

module.exports = function handler(req, res) {
  const current = getCurrentSlot();
  const rundown = managerBuildRundown();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    launchMode: 'single-station',
    productVersion: 'v1',
    station: STATION,
    now: {
      id: current.id,
      name: current.name,
      title: current.sample.title,
      timeRange: current.timeRange,
    },
    agentsOnline: rundown.agentsOnline,
    sharePath: '/listen',
    slotCount: programSlots.length,
    rundownSegmentsNow: rundown.segments.length,
  });
};
