# Voices — AI Agent Station Staff

**Product law for how Voices is run.**  
Churches own identity and doctrine. Agents own operations so the station never goes empty.

**Live station (v1):** https://voices-pi.vercel.app/listen  
**Related:** [CONTENT map](./CONTENT.md) (when present), `api/_program.js` (current grid)

---

## One-sentence mission

Voices is a **church radio station staffed by AI agents** (DJ, programmer, librarian, news, weather, music, manager) so the church brings *their* voice and the agents keep it sounding like **real radio** 24/7.

---

## Principles

1. **Church first** — sermons, announcements, and pastor pins always beat generic fill.
2. **No dead air** — every minute of the grid has a planned segment.
3. **Normal radio mix** — not sermon-only; music, Scripture, prayer, weather, short news, community.
4. **Clear rights** — only licensed / open / church-owned audio; never scrape random web music.
5. **Guardrails** — compliance agent can block before air; pastor has kill switch.
6. **Auditable** — every hour has a **rundown** (JSON) explaining what played and why.
7. **Human override** — pin, ban, replace, or lock any hour.

---

## Agent roster

| Agent ID | Name | Job |
|----------|------|-----|
| `manager` | Station Manager | Owns the day; fills holes; applies week/month themes; resolves conflicts |
| `dj` | AI DJ | Host copy + transitions; time checks; station ID; speaks (TTS or voice model) |
| `librarian` | Librarian | Indexes church + platform library; tags type, length, topic, freshness |
| `programmer` | Programmer | Builds day/week/month grids from rules and inventory |
| `news` | News Desk | Short, attributed briefs; radio length; optional by church policy |
| `weather` | Weather | Local conditions for church city |
| `music` | Worship / Music | Open or licensed Christian beds and sets between blocks |
| `scripture` | Scripture | Audio Bible plans, Psalms, night watch readings |
| `announcements` | Announcements | Turns weekly notes/calendar into on-air reads |
| `compliance` | Compliance | Tone, rights, blocked topics, length, doctrine rails |
| `analytics` | Analytics | Later: retention, plays, drop-off by segment type |

### Who members “hear”

Only **`dj`** (and any pre-recorded church audio). Other agents work off-air and feed the rundown.

---

## Content inventory (what agents can schedule)

### Church-owned (`source: church`)

| Type | Examples |
|------|----------|
| `sermon` | Sunday message, series, guest speaker |
| `announcement` | This week’s events, offering, funerals, weddings |
| `pastor_note` | Welcome, pastoral prayer, short exhortation |
| `testimony` | Moderated member stories |
| `custom` | Choir, drama, special service |

### Platform enrichment (`source: platform`)

| Type | Examples |
|------|----------|
| `music` | Open/licensed worship or instrumental |
| `bible` | Chapter / reading-plan audio or TTS |
| `prayer` | Morning/evening prayer sets |
| `news` | Curated short bulletins |
| `weather` | City forecast sting |
| `teaching_short` | 5–15 min enrichment (not full sermon) |
| `kids` / `youth` | Daypart segments |
| `seasonal` | Advent, Easter, revival month packs |

### Fallback (`source: system`)

| Type | Examples |
|------|----------|
| `tts_block` | Spoken script from text when no MP3 (current v1) |
| `station_id` | “You’re listening to {church} on Voices” |
| `silence_guard` | Emergency fill if package fails |

---

## Daypart defaults (programmer rules)

Adjustable per church; defaults for a healthy mix:

| Local time | Priority blocks |
|------------|-----------------|
| 00:00–05:00 | Night watch: scripture, soft music, short prayer |
| 05:00–06:00 | Prayer + soft worship |
| 06:00–09:00 | Worship music + short bible + light announcements |
| 09:00–10:00 | Community / shoutouts / announcements |
| 10:00–12:00 | **Church sermon** (library) when available |
| 12:00–15:00 | Midday prayer + weather + optional news + music |
| 15:00–18:00 | Worship / instrumental + teaching short |
| 18:00–22:00 | Evening devotional + family + optional sermon replay |
| 22:00–24:00 | Quiet scripture + soft music |

### Hard rules (v1 product law)

1. **No more than 2 full sermons in any 6-hour window** unless pastor pins otherwise.
2. **Every hour** must include a `station_id` or DJ open/close at least once.
3. **Announcements** (if any exist for the week) must air at least **3 times/day**.
4. **Weather** once in morning drive (06–09) and once in evening (17–19) when city is set.
5. **Music or bible** must separate long speech blocks (sermon vs teaching).
6. **News** max **2 short briefs/day** unless church enables more; always labeled as news.
7. Prefer **fresh church uploads** (< 14 days) over older for announcement slots.

---

## Hour rundown format

Every hour on air is a **rundown**: ordered segments the player (and later streamer) executes.

```json
{
  "stationId": "tema",
  "churchName": "The Church in Tema",
  "timezone": "Africa/Accra",
  "hourStart": "2026-07-18T18:00:00+00:00",
  "theme": "evening-rest",
  "producedBy": ["manager", "programmer", "dj", "compliance"],
  "segments": [
    {
      "id": "seg_01",
      "type": "station_id",
      "durationSec": 12,
      "source": "system",
      "agent": "dj",
      "speakText": "You’re listening to The Church in Tema on Voices.",
      "audioUrl": null
    },
    {
      "id": "seg_02",
      "type": "weather",
      "durationSec": 25,
      "source": "platform",
      "agent": "weather",
      "speakText": "This evening in Tema: warm, light breeze, about 28 degrees.",
      "audioUrl": null
    },
    {
      "id": "seg_03",
      "type": "bible",
      "durationSec": 180,
      "source": "platform",
      "agent": "scripture",
      "ref": "Psalm 23:1-6",
      "speakText": "…",
      "audioUrl": null
    },
    {
      "id": "seg_04",
      "type": "music",
      "durationSec": 210,
      "source": "platform",
      "agent": "music",
      "title": "Open worship bed A",
      "audioUrl": "https://…",
      "license": "CC-BY-4.0"
    },
    {
      "id": "seg_05",
      "type": "sermon",
      "durationSec": 1680,
      "source": "church",
      "agent": "librarian",
      "title": "Sunday message — Faith in the ordinary",
      "audioUrl": "https://…",
      "libraryId": "ser_2026_06_01"
    }
  ],
  "compliance": {
    "status": "approved",
    "notes": []
  }
}
```

### Segment playback order of preference

1. `audioUrl` if present and valid  
2. Else `speakText` via TTS (AI DJ / system voice)  
3. Else skip segment and log; manager inserts `silence_guard`

---

## Agent contracts (inputs → outputs)

### `manager`

- **In:** clock, theme, incomplete rundowns, failures, pastor pins  
- **Out:** final rundown for next N hours; alerts if library empty  
- **Cadence:** every 5–15 minutes + top of hour  

### `dj`

- **In:** rundown without host lines (or sparse lines)  
- **Out:** `speakText` for opens, bridges, closes; optional TTS audio  
- **Tone:** warm, clear, local church family — not celebrity radio  

### `librarian`

- **In:** uploads, metadata, delete/archive  
- **Out:** searchable inventory `{ id, type, durationSec, tags, createdAt, url }`  

### `programmer`

- **In:** inventory, daypart rules, month pack, pins  
- **Out:** draft grid + per-hour segment skeletons  

### `news` / `weather` / `music` / `scripture` / `announcements`

- **In:** church config (city, language, policies), calendar, catalogs  
- **Out:** candidate segments with duration + text/url + attribution  

### `compliance`

- **In:** draft rundown + church policy  
- **Out:** `approved` | `rejected` + reasons; may strip/replace segments  

---

## Pastor / church controls

| Control | Effect |
|---------|--------|
| **Pin segment** | Force item into a slot (e.g. this Sunday’s sermon at 10:00) |
| **Ban type/source** | e.g. no news; no music with drums; no external teaching |
| **Weekly notes** | Free text → announcements agent |
| **Kill switch** | Freeze auto-scheduling; loop safe worship + prayer only |
| **Approve queue** | Optional: compliance needs human OK for sermons first 7 days |

Platform admin (Voices owner) can onboard church, set city/timezone, enable feeds.

---

## Month & season packs

`programmer` + `manager` load a **pack** that overrides daypart emphasis:

| Pack example | Emphasis |
|--------------|----------|
| Ordinary time | Balanced mix |
| Revival month | Extra prayer + sermons + worship |
| Advent / Easter | Seasonal scripture + music + short teachings |
| Youth month | Evening youth blocks |

Packs never delete church pins.

---

## Implementation phases

| Phase | Ship | Agent surface |
|-------|------|----------------|
| **v1 (shipped)** | Rundown JSON + multi-segment TTS player + agent room in code | `api/_agents.js`, `GET /api/rundown/current`, listen queue |
| **v1.1** | Longer dayparts, better DJ bridges, pastor pin API | expand programmer rules |
| **v1.2** | Church library upload + pin to grid | `librarian` |
| **v1.3** | Weather + Bible plan + news brief segments | `weather`, `scripture`, `news` |
| **v1.4** | Licensed/open music beds | `music` |
| **v2** | Manager loop + compliance + pastor dashboard | full agent room |
| **v2+** | Multi-church, analytics, better voices | `analytics`, scale |

---

## Non-goals (for now)

- Live call-ins without moderation  
- Unfiltered web scrape as “news” or “music”  
- Replacing the pastor as spiritual authority  
- 248 fake directory stations as the product (pilot = **one real station**)

---

## Config touchpoints (code)

| File / area | Role today |
|-------------|------------|
| `api/_program.js` | Single-station identity + 24h slots + TTS text (proto manager/DJ) |
| `api/station/now.js` | “On air now” for player |
| `api/program/today.js` | Day grid for UI |
| `listen.html` | Member player (TTS play) |
| **Future** `api/rundown/current.js` | Full segment list for the hour |
| **Future** `api/agents/*` | Per-agent jobs or one orchestrator |

---

## Definition of done (agent vision)

A church can:

1. Upload sermons + weekly announcements  
2. Set city + simple policies  
3. Share **one listen link**  
4. Hear a **mixed day** (not sermon-only) hosted by an **AI DJ**  
5. Trust that **agents refill** empty hours without the pastor living in a dashboard  

Until then, every feature we build should move toward **rundowns + library + enrichment + DJ**, not random UI.

---

*Last updated: first-customer / AI-agent product law.*
