/**
 * Google Drive programme library for Voices.
 *
 * Env (Vercel):
 *   GOOGLE_DRIVE_FOLDER_ID  — root library folder for the station
 *   GOOGLE_API_KEY          — API key with Drive API enabled (folder/files "Anyone with the link")
 *
 * Optional overrides in STATION (api/_program.js):
 *   driveFolderId
 *
 * Folder layout (created for Tema):
 *   Voices — The Church in Tema/
 *     Sermons/  Worship/  Announcements/  Scripts/  Bible/
 */

const DEFAULT_FOLDER_ID = '17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ'; // Voices — The Church in Tema

const AUDIO_MIMES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
]);

const TEXT_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'application/json',
]);

const FOLDER_MIME = 'application/vnd.google-apps.folder';

function getConfig(station = {}) {
  const folderId =
    process.env.GOOGLE_DRIVE_FOLDER_ID ||
    station.driveFolderId ||
    DEFAULT_FOLDER_ID;
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY || '';
  return { folderId, apiKey, configured: Boolean(folderId && apiKey) };
}

function categoryFromName(name = '') {
  const n = name.toLowerCase();
  if (n.includes('sermon')) return 'sermon';
  if (n.includes('worship') || n.includes('music') || n.includes('praise')) return 'worship';
  if (n.includes('announce')) return 'announcement';
  if (n.includes('script') || n.includes('scripture') || n.includes('bible')) return 'bible';
  if (n.includes('prayer') || n.includes('devotion')) return 'devotional';
  return 'other';
}

function isAudio(mime, name = '') {
  if (AUDIO_MIMES.has(mime)) return true;
  return /\.(mp3|m4a|wav|ogg|aac|flac|webm)$/i.test(name);
}

function isTextScript(mime, name = '') {
  if (TEXT_MIMES.has(mime)) return true;
  return /\.(txt|md|json)$/i.test(name);
}

function isGoogleDoc(mime) {
  return mime === 'application/vnd.google-apps.document';
}

async function driveList(q, apiKey, pageSize = 100) {
  const params = new URLSearchParams({
    q,
    pageSize: String(pageSize),
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink),nextPageToken',
    orderBy: 'modifiedTime desc',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
    key: apiKey,
  });
  const url = `https://www.googleapis.com/drive/v3/files?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive list failed ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function listChildren(folderId, apiKey) {
  const q = `'${folderId}' in parents and trashed = false`;
  const data = await driveList(q, apiKey);
  return data.files || [];
}

/**
 * Walk root + one level of subfolders; tag by parent folder name.
 */
async function fetchLibrary(station = {}) {
  const { folderId, apiKey, configured } = getConfig(station);
  if (!configured) {
    return {
      ok: false,
      configured: false,
      folderId,
      items: [],
      message:
        'Set GOOGLE_API_KEY and GOOGLE_DRIVE_FOLDER_ID on Vercel. Share the folder “Anyone with the link”.',
    };
  }

  try {
    const rootFiles = await listChildren(folderId, apiKey);
    const items = [];

    for (const f of rootFiles) {
      if (f.mimeType === FOLDER_MIME) {
        const cat = categoryFromName(f.name);
        const children = await listChildren(f.id, apiKey);
        for (const c of children) {
          if (c.mimeType === FOLDER_MIME) continue;
          items.push(normalizeFile(c, cat, f.name));
        }
      } else {
        items.push(normalizeFile(f, categoryFromName(f.name), 'root'));
      }
    }

    return {
      ok: true,
      configured: true,
      folderId,
      count: items.length,
      items,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      folderId,
      items: [],
      error: String(err.message || err),
    };
  }
}

function normalizeFile(file, category, folderName) {
  const audio = isAudio(file.mimeType, file.name);
  const script = isTextScript(file.mimeType, file.name) || isGoogleDoc(file.mimeType);
  return {
    id: file.id,
    name: file.name,
    title: cleanTitle(file.name),
    mimeType: file.mimeType,
    size: Number(file.size || 0),
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink || null,
    category,
    folderName,
    kind: audio ? 'audio' : script ? 'script' : 'file',
    // Play via our proxy (works when file is link-shared + API key)
    streamPath: audio ? `/api/library/stream?id=${encodeURIComponent(file.id)}` : null,
    audioUrl: audio ? `/api/library/stream?id=${encodeURIComponent(file.id)}` : null,
  };
}

function cleanTitle(name = '') {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Pick best Drive item for a programme slot type. */
function pickForSlot(items, contentType, date = new Date()) {
  if (!items?.length) return null;
  const hour = date.getHours();
  const prefer =
    contentType === 'sermon'
      ? ['sermon']
      : contentType === 'worship'
        ? ['worship', 'music']
        : contentType === 'announcement'
          ? ['announcement']
          : contentType === 'prayer' || contentType === 'devotional'
            ? ['devotional', 'bible', 'sermon']
            : ['sermon', 'worship', 'other'];

  let pool = items.filter((i) => i.kind === 'audio' && prefer.includes(i.category));
  if (!pool.length) pool = items.filter((i) => i.kind === 'audio');
  if (!pool.length) return null;

  // Stable rotation by day+hour
  const idx = (date.getDate() * 24 + hour) % pool.length;
  return pool[idx];
}

async function streamFile(fileId, apiKey) {
  if (!apiKey) throw new Error('GOOGLE_API_KEY missing');
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, { redirect: 'follow' });
  return res;
}

async function getFileMeta(fileId, apiKey) {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size',
    key: apiKey,
  });
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params}`
  );
  if (!res.ok) throw new Error(`meta ${res.status}`);
  return res.json();
}

module.exports = {
  DEFAULT_FOLDER_ID,
  getConfig,
  fetchLibrary,
  pickForSlot,
  streamFile,
  getFileMeta,
  categoryFromName,
};
