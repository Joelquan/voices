# Continuous broadcast (from Faith Radio)

Voices now uses the same **live radio clock** pattern as Faith Radio 24/7.

## How it works

1. Build a **looping playlist** of real audio:
   - Google Drive sermons/worship (when configured)
   - Shipped human sample beds in `/sample-audio/`
2. Anchor the loop at **midnight** (`broadcastEpoch`).
3. Every listener calls `GET /api/stream/now` and seeks to the same `offset`.
4. Player polls ~30s to correct drift; on `ended`, refetches next position.

```
elapsed = (now - midnight) mod totalDuration
→ current item + offset seconds
```

## APIs

| Endpoint | Role |
|----------|------|
| `GET /api/stream/now` | Current item, offset, next, playlist |
| `GET /api/station/now` | Includes `stream` snapshot + agents |
| `POST /api/dj/speak` | OpenAI TTS (needs `OPENAI_API_KEY`) |

## Sample audio (human)

| File | Use |
|------|-----|
| `sample-audio/morning_prayer_2026-07-19.mp3` | Prayer bed |
| `sample-audio/evening_prayer_2026-07-19.mp3` | Prayer bed |
| `sample-audio/worship_reflection_2026-07-19.mp3` | Worship bed |

Replace these with church recordings or Drive files anytime.

## Google Cloud speech (uploads + DJ)

- `POST https://texttospeech.googleapis.com/v1/text:synthesize?key=…`
- Voices: Neural2 (e.g. `en-US-Neural2-F`) via friendly names `nova`, `alloy`, …
- Env: `GOOGLE_TTS_API_KEY` or reuse `GOOGLE_API_KEY`
- Enable API: Cloud Text-to-Speech in Google Cloud Console

Until that key is set, uploads fall back to **browser TTS**; sample MP3s still play.

## Player

`/listen` → tap play → joins the live loop at the correct seek position.
