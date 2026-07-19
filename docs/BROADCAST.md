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

## Free speech (uploads + DJ) — no payment

1. **StreamElements** free speech API (primary) — no key  
2. **Google Translate TTS** free chunks (fallback) — no key  
3. Browser Web Speech (last resort on the listen page)  
4. Optional later: Google Cloud TTS if you enable GCP billing  

Friendly voices: `nova`, `alloy`, `london`, `daniel`, …

## Player

`/listen` → tap play → joins the live loop at the correct seek position.
