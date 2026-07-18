const { getCurrentSlot, getProgress } = require('../_program');

module.exports = function handler(req, res) {
  const slot = getCurrentSlot();
  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  res.status(200).json({
    station: {
      name: 'Grace Community Church',
      location: 'Accra, Ghana',
      listeners: 247,
    },
    content: {
      type: slot.contentType,
      title: slot.sample.title,
      subtitle: slot.sample.subtitle,
      description: slot.description,
      audioUrl: null,
      duration: slot.sample.duration,
      reference: slot.sample.subtitle,
      text: slot.sample.text,
    },
    schedule: {
      id: slot.id,
      currentSlot: slot.name,
      timeRange: slot.timeRange,
      description: slot.description,
      progress: getProgress(slot),
    },
  });
};
