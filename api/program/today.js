const { programSlots, getCurrentSlot } = require('../_program');

module.exports = function handler(req, res) {
  const current = getCurrentSlot();
  res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
  res.status(200).json({
    station: {
      name: 'Grace Community Church',
      location: 'Accra, Ghana',
      listeners: 247,
    },
    currentSlotId: current.id,
    slots: programSlots.map((slot) => ({
      ...slot,
      isCurrent: slot.id === current.id,
    })),
  });
};
