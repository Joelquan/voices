# Voices — Content map

Companion to [AGENTS.md](./AGENTS.md).  
What fills the station so it feels like **normal radio**, not a sermon loop.

---

## Problem

A month of 24/7 airtime is ~**720 hours**.  
No church will upload 720 hours of original sermons.  
**Enrichment + smart scheduling** is required.

**Target mix (guideline):**

| Source | Share of airtime |
|--------|------------------|
| Church original (sermons, announcements, pastor) | ~20–40% |
| Platform enrichment (music, Bible, prayer, weather, news, shorts) | ~60–80% |

Still branded as **that church** (DJ IDs, local weather, their pins).

---

## Content pillars

1. **Church library** — sermons, weekly announcements, pastor notes  
2. **Scripture** — audio Bible / daily plan / Psalms  
3. **Worship music** — open or licensed only  
4. **Prayer & devotion** — structured dayparts  
5. **Utility radio** — weather, short news, time checks  
6. **Community** — shoutouts, moderated messages  
7. **Seasonal packs** — months and church calendar  

---

## Library types (upload taxonomy)

| `type` | Max typical length | Notes |
|--------|-------------------|--------|
| `sermon` | 30–55 min | Core church asset |
| `announcement` | 30–90 sec | Refresh weekly |
| `pastor_note` | 1–5 min | High trust |
| `testimony` | 2–8 min | Needs moderation |
| `music_church` | song length | Only if church has rights |
| `other` | varies | Tagged manually |

---

## Enrichment feeds

| Feed | Refresh | Agent |
|------|---------|--------|
| Audio Bible plan | Daily | `scripture` |
| Weather | Hourly | `weather` |
| News briefs | 2–4×/day | `news` |
| Open worship catalog | Weekly curation | `music` |
| Prayer templates | Stable + seasonal | `programmer` / `dj` |
| Month packs | Monthly | `manager` |

---

## Rights (hard)

- **Music:** CC / public domain / paid catalog with license on file — never “whatever is on YouTube.”  
- **Bible audio:** public-domain text (e.g. KJV) via TTS, or licensed narration.  
- **News:** attributed; short; optional; church can disable.  
- **Church uploads:** church warrants they have rights to air.

---

## Empty-library behavior

If church has **no uploads** yet:

1. Full platform enrichment grid (Bible, prayer, music, weather)  
2. DJ still IDs **their** church name  
3. Dashboard prompt: “Upload this week’s sermon + 3 announcements”

If church has **sermon only**:

1. Place sermon in morning + evening replay caps (see AGENTS daypart rules)  
2. Fill all other hours with enrichment  

---

## First-customer content checklist

- [ ] Church name, city, timezone  
- [ ] 1 welcome / pastor note (even TTS script)  
- [ ] 1 sermon (file or script)  
- [ ] 3 weekly announcements (text OK)  
- [ ] Enable Bible + prayer + weather  
- [ ] Music: start with open catalog or TTS-only bridges  
- [ ] Share `/listen` with 10 members  

---

*See AGENTS.md for who schedules this inventory.*
