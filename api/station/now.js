const {
  managerBuildRundown,
  rundownToSpeakText,
  getCurrentSlot,
  getProgress,
  STATION,
} = require('../_agents');
const { getStationNow } = require('../_broadcast');

module.exports = async function handler(req, res) {
  const now = new Date();
  const slot = getCurrentSlot(now);
  const [rundown, stream] = await Promise.all([
    managerBuildRundown(now),
    getStationNow(now),
  ]);
  const speakText = rundownToSpeakText(rundown);
  const live = stream.current;

  res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');
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
      type: live?.type || slot.contentType,
      title: live?.title || slot.sample?.title || slot.name,
      subtitle: slot.sample?.subtitle,
      description: slot.description,
      audioUrl: live?.audioUrl || null,
      playbackMode: live ? 'continuous-broadcast' : 'rundown',
      speakText,
      duration: live?.duration || slot.sample?.duration,
      offset: live?.offset,
      reference: slot.sample?.subtitle,
      text: slot.sample?.text,
      segmentCount: stream.itemCount || rundown.segments.length,
    },
    schedule: {
      id: slot.id,
      currentSlot: slot.name,
      timeRange: slot.timeRange,
      description: slot.description,
      progress: getProgress(slot, now),
    },
    stream,
    library: stream.library || rundown.library,
    rundown: {
      version: rundown.version,
      theme: rundown.theme,
      producedBy: rundown.producedBy,
      agentsOnline: rundown.agentsOnline,
      totals: rundown.totals,
      segments: rundown.segments,
      currentSegment: live,
      compliance: rundown.compliance,
    },
  });
};
