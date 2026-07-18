const { STATION, programSlots, getCurrentSlot, managerBuildRundown } = require('../_agents');

module.exports = function handler(req, res) {
  const now = new Date();
  const current = getCurrentSlot(now);
  const rundown = managerBuildRundown(now);

  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    station: {
      name: STATION.name,
      location: STATION.location,
      tagline: STATION.tagline,
      listeners: STATION.listeners,
    },
    currentSlotId: current.id,
    agentsOnline: rundown.agentsOnline,
    nowRundown: {
      segmentCount: rundown.segments.length,
      segments: rundown.segments.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
        agent: s.agent,
        durationSec: s.durationSec,
      })),
    },
    slots: programSlots.map((slot) => ({
      id: slot.id,
      name: slot.name,
      timeRange: slot.timeRange,
      contentType: slot.contentType,
      description: slot.description,
      startHour: slot.startHour,
      endHour: slot.endHour,
      isCurrent: slot.id === current.id,
      sample: {
        title: slot.sample.title,
        subtitle: slot.sample.subtitle,
        text: slot.sample.text,
      },
    })),
  });
};
