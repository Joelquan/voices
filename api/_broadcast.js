/**
 * Continuous synchronized broadcast timeline (Faith Radio pattern).
 * All listeners share the same clock: elapsed = (now - epoch) mod total.
 */

const { STATION, getCurrentSlot, getProgress } = require('./_program');
const { fetchLibrary } = require('./_drive');
const { readingsAsPlaylistItems } = require('./_readings');

/** Human sample beds shipped in /public/sample-audio (from Faith Radio shared pack). */
const SAMPLE_BEDS = [
  {
    id: 'sample-morning-prayer',
    title: 'Morning Prayer',
    type: 'prayer',
    source: 'sample',
    agent: 'scripture',
    audioUrl: '/sample-audio/morning_prayer_2026-07-19.mp3',
    durationSec: 82.1,
    speakText: 'Morning prayer for The Church in Tema.',
  },
  {
    id: 'sample-evening-prayer',
    title: 'Evening Prayer',
    type: 'prayer',
    source: 'sample',
    agent: 'scripture',
    audioUrl: '/sample-audio/evening_prayer_2026-07-19.mp3',
    durationSec: 87.3,
    speakText: 'Evening prayer for The Church in Tema.',
  },
  {
    id: 'sample-worship',
    title: 'Worship Reflection',
    type: 'worship',
    source: 'sample',
    agent: 'music',
    audioUrl: '/sample-audio/worship_reflection_2026-07-19.mp3',
    durationSec: 136.2,
    speakText: 'A worship reflection for The Church in Tema.',
  },
];

/** Station ID sting — short spoken bed reused as open/close when no custom DJ MP3. */
const STATION_ID_BED = {
  id: 'sample-station-id',
  title: `${STATION.name} · On Air`,
  type: 'station_id',
  source: 'sample',
  agent: 'dj',
  // Reuse morning prayer as temporary ID bed until real DJ MP3 exists
  // Listeners still get continuous human audio. Replace with /sample-audio/dj_id.mp3 later.
  audioUrl: '/sample-audio/morning_prayer_2026-07-19.mp3',
  durationSec: 25,
  speakText: `You're listening to ${STATION.name} on Voices.`,
  trimToSec: 25,
};

function getBroadcastEpoch(date = new Date()) {
  // Midnight local — same for all listeners in a given day
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Build the looping playlist for the station.
 * Drive audio first (human church content), then sample beds so air is never empty.
 */
async function buildPlaylist(date = new Date()) {
  const library = await fetchLibrary(STATION);
  const driveItems = (library.items || []).filter((i) => i.kind === 'audio' && i.audioUrl);

  const items = [];

  // Open sting
  items.push({ ...STATION_ID_BED, orderIndex: 0 });

  let order = 1;

  // Church uploads (documents → TTS) — high priority after open
  const uploads = await readingsAsPlaylistItems();
  for (const u of uploads) {
    items.push({ ...u, orderIndex: order++ });
  }

  if (driveItems.length) {
    for (const d of driveItems) {
      items.push({
        id: `drive-${d.id}`,
        title: d.title || d.name,
        type: d.category || 'sermon',
        source: 'drive',
        agent: 'librarian',
        audioUrl: d.audioUrl,
        durationSec: estimateDriveDuration(d),
        speakText: d.title,
        driveFileId: d.id,
        orderIndex: order++,
      });
    }
  }

  // Always include human sample beds so the loop has continuous real speech
  for (const bed of SAMPLE_BEDS) {
    items.push({ ...bed, orderIndex: order++ });
  }

  // Close sting (short)
  items.push({
    ...STATION_ID_BED,
    id: 'sample-station-close',
    title: `${STATION.name} · Stay with us`,
    orderIndex: order++,
    durationSec: 20,
    trimToSec: 20,
  });

  return {
    items,
    library: {
      configured: Boolean(library.configured),
      ok: Boolean(library.ok),
      count: driveItems.length,
      folderUrl: STATION.driveFolderUrl,
      message: library.message || library.error || null,
    },
  };
}

function estimateDriveDuration(item) {
  // Unknown duration until streamed; default 5 min for timeline math
  if (item.durationSec && item.durationSec > 0) return item.durationSec;
  // rough from size if available (~128kbps)
  if (item.size > 0) return Math.max(30, (item.size * 8) / 128000);
  return 180;
}

/**
 * Where are we in the continuous loop right now?
 */
function resolveNow(items, date = new Date()) {
  // Audio segments OR speakText-only (browser TTS) with estimated duration
  const playable = items.filter(
    (it) => (it.durationSec || 0) > 0 && (it.audioUrl || it.speakText)
  );
  if (!playable.length) {
    return {
      current: null,
      next: null,
      totalDuration: 0,
      itemCount: 0,
      epoch: getBroadcastEpoch(date).toISOString(),
      elapsed: 0,
    };
  }

  const durations = playable.map((it) => Number(it.durationSec) || 0);
  const total = durations.reduce((a, b) => a + b, 0);
  const epoch = getBroadcastEpoch(date);
  const epochSec = epoch.getTime() / 1000;
  const nowSec = date.getTime() / 1000;
  let elapsed = ((nowSec - epochSec) % total + total) % total;

  let idx = 0;
  let acc = 0;
  for (let i = 0; i < playable.length; i++) {
    if (elapsed < acc + durations[i]) {
      idx = i;
      break;
    }
    acc += durations[i];
  }

  const cur = playable[idx];
  const offset = Math.max(0, elapsed - acc);
  const duration = durations[idx];
  const next = playable[(idx + 1) % playable.length];

  return {
    epoch: epoch.toISOString(),
    elapsed,
    totalDuration: total,
    itemCount: playable.length,
    current: {
      id: cur.id,
      title: cur.title,
      type: cur.type,
      source: cur.source,
      agent: cur.agent,
      audioUrl: cur.audioUrl || null,
      speakText: cur.speakText || null,
      offset,
      duration,
      remaining: Math.max(0, duration - offset),
      playbackMode: cur.audioUrl ? 'audio' : 'tts',
    },
    next: next
      ? {
          id: next.id,
          title: next.title,
          type: next.type,
          audioUrl: next.audioUrl || null,
          speakText: next.speakText || null,
          duration: next.durationSec,
          playbackMode: next.audioUrl ? 'audio' : 'tts',
        }
      : null,
    playlist: playable.map((p, i) => ({
      id: p.id,
      title: p.title,
      type: p.type,
      source: p.source,
      durationSec: p.durationSec,
      playbackMode: p.audioUrl ? 'audio' : 'tts',
      isCurrent: i === idx,
    })),
  };
}

async function getStationNow(date = new Date()) {
  const slot = getCurrentSlot(date);
  const { items, library } = await buildPlaylist(date);
  const now = resolveNow(items, date);

  return {
    station: {
      name: STATION.name,
      location: STATION.location,
      tagline: STATION.tagline,
      shortCode: STATION.shortCode,
      listeners: STATION.listeners,
      driveFolderUrl: STATION.driveFolderUrl,
    },
    slot: {
      id: slot.id,
      name: slot.name,
      timeRange: slot.timeRange,
      contentType: slot.contentType,
      progress: getProgress(slot, date),
    },
    library,
    mode: 'continuous-broadcast',
    ...now,
  };
}

module.exports = {
  SAMPLE_BEDS,
  getBroadcastEpoch,
  buildPlaylist,
  resolveNow,
  getStationNow,
};
