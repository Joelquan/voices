const { STATION, getCurrentSlot, getProgress, getSpeakScript } = require('../_program');

module.exports = function handler(req, res) {
  const slot = getCurrentSlot();
  const speakText = getSpeakScript(slot);

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    station: {
      name: STATION.name,
      location: STATION.location,
      tagline: STATION.tagline,
      listeners: STATION.listeners,
      shortCode: STATION.shortCode,
    },
    content: {
      type: slot.contentType,
      title: slot.sample.title,
      subtitle: slot.sample.subtitle,
      description: slot.description,
      // TTS launch: no MP3 yet — client speaks speakText via Web Speech
      audioUrl: null,
      playbackMode: 'tts',
      speakText,
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
