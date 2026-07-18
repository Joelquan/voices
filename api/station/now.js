const {
  managerBuildRundown,
  rundownToSpeakText,
  getCurrentSlot,
  getProgress,
  STATION,
} = require('../_agents');

module.exports = async function handler(req, res) {
  const now = new Date();
  const slot = getCurrentSlot(now);
  const rundown = await managerBuildRundown(now);
  const speakText = rundownToSpeakText(rundown);
  const currentSeg = rundown.segments[0] || null;

  res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    station: {
      name: STATION.name,
      location: STATION.location,
      tagline: STATION.tagline,
      listeners: STATION.listeners,
      shortCode: STATION.shortCode,
      driveFolderUrl: STATION.driveFolderUrl,
    },
    content: {
      type: slot.contentType,
      title: slot.sample?.title || slot.name,
      subtitle: slot.sample?.subtitle,
      description: slot.description,
      audioUrl: null,
      playbackMode: 'rundown',
      speakText,
      duration: slot.sample?.duration,
      reference: slot.sample?.subtitle,
      text: slot.sample?.text,
      segmentCount: rundown.segments.length,
    },
    schedule: {
      id: slot.id,
      currentSlot: slot.name,
      timeRange: slot.timeRange,
      description: slot.description,
      progress: getProgress(slot, now),
    },
    library: rundown.library,
    rundown: {
      version: rundown.version,
      theme: rundown.theme,
      producedBy: rundown.producedBy,
      agentsOnline: rundown.agentsOnline,
      totals: rundown.totals,
      segments: rundown.segments,
      currentSegment: currentSeg,
      compliance: rundown.compliance,
    },
  });
};
