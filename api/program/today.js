const { STATION, programSlots, getCurrentSlot } = require('../_program');

module.exports = function handler(req, res) {
  const current = getCurrentSlot();
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
