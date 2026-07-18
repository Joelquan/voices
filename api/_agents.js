/**
 * Voices v1 — lightweight agent room.
 * Builds hour rundowns: Manager + Programmer + DJ + Compliance.
 * See docs/AGENTS.md
 */

const {
  STATION,
  programSlots,
  getCurrentSlot,
  getProgress,
} = require('./_program');
const { fetchLibrary, pickForSlot } = require('./_drive');

// ── Church week notes (v1: edit here; later from dashboard) ───────
const WEEKLY_ANNOUNCEMENTS = [
  'Join us this Sunday at The Church in Tema — come early and bring someone from your street.',
  'Midweek prayer continues in Tema. Check with your fellowship leader for the meeting point and time.',
  'If you are new in Tema or visiting the harbour city, you are welcome here. Stay after service and greet the family.',
];

const BIBLE_SNIPPETS = [
  {
    ref: 'Psalm 23:1-3',
    text:
      'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters. He restoreth my soul.',
  },
  {
    ref: 'Philippians 4:6-7',
    text:
      'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God. And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
  },
  {
    ref: 'Isaiah 40:31',
    text:
      'But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
  },
  {
    ref: 'John 14:27',
    text:
      'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.',
  },
  {
    ref: 'Psalm 46:1',
    text: 'God is our refuge and strength, a very present help in trouble.',
  },
  {
    ref: 'Matthew 11:28',
    text: 'Come unto me, all ye that labour and are heavy laden, and I will give you rest.',
  },
  {
    ref: 'Psalm 121:1-2',
    text:
      'I will lift up mine eyes unto the hills, from whence cometh my help. My help cometh from the Lord, which made heaven and earth.',
  },
];

// ── Helpers ───────────────────────────────────────────────────────

function dayOfYear(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

function pickBible(date = new Date()) {
  return BIBLE_SNIPPETS[dayOfYear(date) % BIBLE_SNIPPETS.length];
}

function pickAnnouncement(date = new Date()) {
  if (!WEEKLY_ANNOUNCEMENTS.length) return null;
  const i = Math.floor(date.getHours() / 8) % WEEKLY_ANNOUNCEMENTS.length;
  return WEEKLY_ANNOUNCEMENTS[i];
}

function estimateDurationSec(text) {
  // ~2.5 words/sec for warm radio pace
  const words = String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(8, Math.round(words / 2.5));
}

function weatherLine(date = new Date()) {
  const hour = date.getHours();
  const city = (STATION.location || 'our city').split(',')[0].trim();
  if (hour >= 5 && hour < 12) {
    return `This morning in ${city}: a good day to rise with prayer. Wherever you are, the Lord goes with you.`;
  }
  if (hour >= 12 && hour < 17) {
    return `This afternoon in ${city}: stay hydrated, stay kind, and keep the Lord before you in every task.`;
  }
  if (hour >= 17 && hour < 22) {
    return `This evening in ${city}: as the day settles, may peace find every home tuned in with us.`;
  }
  return `Overnight in ${city}: rest well. The Lord watches over His people through the night.`;
}

// ── DJ agent ──────────────────────────────────────────────────────

function djOpen(slot, date = new Date()) {
  const hour = date.getHours();
  let greeting = 'Hello church family';
  if (hour < 12) greeting = 'Good morning, church family';
  else if (hour < 17) greeting = 'Good afternoon, church family';
  else if (hour < 22) greeting = 'Good evening, church family';
  else greeting = 'Still with us in the night';

  return `${greeting}. You’re listening to ${STATION.name} on Voices. ${STATION.tagline}. Coming up: ${slot.name}.`;
}

function djBridge(fromLabel, toLabel) {
  return `Stay with us. Next on ${STATION.name}: ${toLabel}.`;
}

function djClose(slot) {
  return `That’s this part of ${slot.name}. You’re still on ${STATION.name} — church radio for our family. Share this station with someone who needs encouragement today.`;
}

// ── Programmer agent ──────────────────────────────────────────────

/**
 * Build a multi-segment hour from the current programme slot + enrichment.
 * Prefers Google Drive audio (real human recordings) when library has files.
 */
function programmerBuildHour(slot, date = new Date(), libraryItems = []) {
  const segments = [];
  const bible = pickBible(date);
  const announcement = pickAnnouncement(date);
  const hour = date.getHours();
  const contentType = slot.contentType || 'devotional';
  const driveMain = pickForSlot(libraryItems, contentType, date);
  const driveWorship = pickForSlot(libraryItems, 'worship', date);
  const driveAnnounce = pickForSlot(libraryItems, 'announcement', date);

  const push = (seg) => {
    const speakText = seg.speakText || '';
    const audioUrl = seg.audioUrl || null;
    segments.push({
      id: `seg_${String(segments.length + 1).padStart(2, '0')}`,
      source: seg.source || 'system',
      agent: seg.agent || 'programmer',
      ...seg,
      speakText,
      audioUrl,
      playbackMode: audioUrl ? 'audio' : 'tts',
      durationSec: seg.durationSec || (audioUrl ? 300 : estimateDurationSec(speakText)),
    });
  };

  // 1) Station ID + DJ open
  push({
    type: 'station_id',
    agent: 'dj',
    source: 'system',
    title: 'Station ID',
    speakText: djOpen(slot, date),
  });

  // 2) Weather in morning drive & evening (AGENTS daypart rules)
  if ((hour >= 6 && hour < 9) || (hour >= 17 && hour < 19)) {
    push({
      type: 'weather',
      agent: 'weather',
      source: 'platform',
      title: 'Local note',
      speakText: weatherLine(date),
    });
  }

  // 3) Announcements — Drive audio if present, else text
  if (hour >= 7 && hour < 21) {
    if (driveAnnounce?.audioUrl) {
      push({
        type: 'announcement',
        agent: 'announcements',
        source: 'drive',
        title: driveAnnounce.title,
        speakText: `Next, a message from ${STATION.name}.`,
        audioUrl: driveAnnounce.audioUrl,
        driveFileId: driveAnnounce.id,
      });
    } else if (announcement) {
      push({
        type: 'announcement',
        agent: 'announcements',
        source: 'church',
        title: 'This week at church',
        speakText: `Church announcements. ${announcement}`,
      });
    }
  }

  // 4) Scripture often — always for prayer/devotional; often otherwise
  if (
    contentType === 'prayer' ||
    contentType === 'devotional' ||
    contentType === 'worship' ||
    hour % 2 === 0
  ) {
    push({
      type: 'bible',
      agent: 'scripture',
      source: 'platform',
      title: bible.ref,
      ref: bible.ref,
      speakText: `From the Scriptures, ${bible.ref}. ${bible.text}`,
    });
  }

  // 5) Main block — prefer Google Drive recording (human voice)
  if (driveMain?.audioUrl) {
    push({
      type: contentType === 'sermon' ? 'sermon' : contentType,
      agent: 'librarian',
      source: 'drive',
      title: driveMain.title,
      subtitle: `From Drive · ${driveMain.folderName || driveMain.category}`,
      speakText: `Now airing from our library: ${driveMain.title}.`,
      audioUrl: driveMain.audioUrl,
      driveFileId: driveMain.id,
      durationSec: 600,
    });
  } else {
    const mainText = slot.sample?.text || slot.description || '';
    push({
      type: contentType === 'sermon' ? 'sermon' : contentType === 'worship' ? 'teaching_short' : contentType,
      agent: 'librarian',
      source: 'church',
      title: slot.sample?.title || slot.name,
      subtitle: slot.sample?.subtitle,
      speakText: mainText,
      libraryId: slot.id,
    });
  }

  // 6) Optional short news-style community note midday (not political news v1)
  if (hour >= 12 && hour < 14) {
    push({
      type: 'news',
      agent: 'news',
      source: 'platform',
      title: 'Community brief',
      speakText: `Community brief for ${STATION.name}. Keep lifting one another in prayer. If you know someone who has not joined our station yet, send them the listen link and invite them into this family rhythm.`,
    });
  }

  // 7) Worship — Drive audio preferred over spoken bed
  if (contentType === 'worship' || contentType === 'prayer' || hour % 3 === 0) {
    if (driveWorship?.audioUrl && driveWorship.id !== driveMain?.id) {
      push({
        type: 'music',
        agent: 'music',
        source: 'drive',
        title: driveWorship.title,
        speakText: `Worship from our library: ${driveWorship.title}.`,
        audioUrl: driveWorship.audioUrl,
        driveFileId: driveWorship.id,
        durationSec: 240,
      });
    } else {
      push({
        type: 'music',
        agent: 'music',
        source: 'platform',
        title: 'Worship moment',
        speakText: `A short worship moment with ${STATION.name}. Take a breath. Great is the Lord, and greatly to be praised. Let thanksgiving rise where you are — in the car, at work, or at home.`,
        license: 'original-script-v1',
      });
    }
  }

  // 8) DJ close
  push({
    type: 'station_id',
    agent: 'dj',
    source: 'system',
    title: 'Station close',
    speakText: djClose(slot),
  });

  // Label bridges between content segments (for UI)
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i];
    const b = segments[i + 1];
    if (a.agent === 'dj' || b.agent === 'dj') continue;
    a.bridgeTo = b.title || b.type;
  }

  return segments;
}

// ── Compliance agent ──────────────────────────────────────────────

function complianceCheck(segments) {
  const notes = [];
  const cleaned = segments
    .map((s) => {
      const text = String(s.speakText || '').trim();
      if (!text && !s.audioUrl) {
        notes.push(`Dropped empty segment ${s.id}`);
        return null;
      }
      if (text.length > 4000) {
        notes.push(`Trimmed long segment ${s.id}`);
        return { ...s, speakText: text.slice(0, 4000) };
      }
      return s;
    })
    .filter(Boolean);

  return {
    status: 'approved',
    notes,
    segments: cleaned,
  };
}

// ── Manager agent ─────────────────────────────────────────────────

async function managerBuildRundown(date = new Date()) {
  const slot = getCurrentSlot(date);
  const library = await fetchLibrary(STATION);
  const libraryItems = library.items || [];
  const draft = programmerBuildHour(slot, date, libraryItems);
  const { status, notes, segments } = complianceCheck(draft);

  const totalSec = segments.reduce((n, s) => n + (s.durationSec || 0), 0);
  const driveSegments = segments.filter((s) => s.source === 'drive').length;

  return {
    version: 'v1',
    stationId: STATION.shortCode,
    churchName: STATION.name,
    location: STATION.location,
    tagline: STATION.tagline,
    timezone: STATION.timezone || 'local',
    hourStart: new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      0,
      0,
      0
    ).toISOString(),
    generatedAt: date.toISOString(),
    theme: slot.id,
    slot: {
      id: slot.id,
      name: slot.name,
      timeRange: slot.timeRange,
      contentType: slot.contentType,
      description: slot.description,
      progress: getProgress(slot, date),
    },
    producedBy: ['manager', 'programmer', 'dj', 'librarian', 'weather', 'scripture', 'announcements', 'music', 'news', 'compliance'],
    agentsOnline: [
      'manager',
      'dj',
      'programmer',
      'librarian',
      'scripture',
      'weather',
      'announcements',
      'music',
      'news',
      'compliance',
    ],
    library: {
      source: 'google-drive',
      configured: Boolean(library.configured),
      ok: Boolean(library.ok),
      count: libraryItems.length,
      driveSegments,
      folderId: library.folderId || STATION.driveFolderId,
      folderUrl: STATION.driveFolderUrl,
      message: library.message || library.error || null,
    },
    segments,
    totals: {
      segmentCount: segments.length,
      estimatedDurationSec: totalSec,
    },
    compliance: { status, notes },
    station: {
      name: STATION.name,
      location: STATION.location,
      tagline: STATION.tagline,
      listeners: STATION.listeners,
      shortCode: STATION.shortCode,
      driveFolderId: STATION.driveFolderId,
      driveFolderUrl: STATION.driveFolderUrl,
    },
  };
}

/** Flat speak script (legacy single-block players). */
function rundownToSpeakText(rundown) {
  return (rundown.segments || [])
    .map((s) => s.speakText)
    .filter(Boolean)
    .join(' ');
}

module.exports = {
  STATION,
  programSlots,
  getCurrentSlot,
  getProgress,
  managerBuildRundown,
  rundownToSpeakText,
  WEEKLY_ANNOUNCEMENTS,
  djOpen,
  djBridge,
  djClose,
};
