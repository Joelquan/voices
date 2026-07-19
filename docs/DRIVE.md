# Google Drive programme library

**The Church in Tema** pulls sermons, worship, and announcements from a Drive folder so airtime uses **real human recordings**, not only TTS.

## Folder (already created)

**https://drive.google.com/drive/folders/17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ**

```
Voices — The Church in Tema/
  Sermons/         ← Sunday messages, series (mp3/m4a)
  Worship/         ← songs, instrumentals (licensed)
  Announcements/   ← weekly church notices (short audio)
  Scripts/         ← optional text for DJ / TTS fallback
  Bible/           ← audio Bible chapters if you have rights
```

Folder ID: `17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ`  
(also set as `STATION.driveFolderId` in `api/_program.js`)

## How to add programmes

1. Open the folder link above (your Google account).
2. Drop **MP3 / M4A** files into the right subfolder.
3. **Share** the root folder: **Anyone with the link → Viewer**  
   (needed for Vercel to list and stream files with an API key).
4. Wait ~1 minute; agents pick files into the hour rundown.

Name files clearly, e.g. `2026-07-13 Sunday Faith.mp3`.

## Vercel env (required for live fetch)

| Variable | Value |
|----------|--------|
| `GOOGLE_DRIVE_FOLDER_ID` | `17G-YzPxBMj41bpxCJoRhz4Rp7vGubrDZ` |
| `GOOGLE_API_KEY` | Google Cloud API key with **Google Drive API** enabled |

### Create API key (once)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs → enable **Google Drive API**
2. Credentials → **API key**
3. Restrict key to Drive API (recommended)
4. Vercel → Project **voices** → Settings → Environment Variables → add both → redeploy

Without `GOOGLE_API_KEY`, the station still runs on **TTS fallback** scripts.

## APIs

| Endpoint | Role |
|----------|------|
| `GET /api/library/list` | List Drive programmes |
| `GET /api/library/stream?id=FILE_ID` | Stream audio for the player |
| Rundown | Uses Drive audio as main/worship segments when available |

## Player behaviour

1. DJ open (TTS short)
2. **Drive sermon / programme** (real audio) when present  
3. Scripture / weather / etc.  
4. Drive worship if present  
5. DJ close  

If a stream fails, the player skips to the next segment.

## Rights

Only upload audio **the church may broadcast**.  
Do not put commercial worship tracks without a license.

## Document upload (text → TTS)

Use **https://voices-pi.vercel.app/upload** (or `/upload` locally):

1. Paste text or upload `.txt` / `.md` / `.pdf` / `.docx`
2. Choose type (sermon, announcement, prayer…)
3. **Upload to station** — reading joins the live loop
4. With `ABACUSAI_API_KEY` on Vercel → neural MP3  
   Without key → browser speaks the text on listen

API: `POST /api/library/readings` with `{ title, text, type }`.
