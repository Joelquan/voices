# Voices — Church Radio

Prototype platform for church community radio: directory, live listen player, church dashboard, platform admin, and a fixed 24-hour programme grid.

**Live:** https://voices-pi.vercel.app

## Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `index.html` | Station directory + mini player |
| `/listen` | `listen.html` | Full player, now-playing, day programme |
| `/dashboard` | `dashboard.html` | Church admin: schedule, uploads, library |
| `/admin` | `admin.html` | Platform owner: churches, signups, uploads |
| `/plan` | `plan.html` | 7-day launch checklist |

## API (Vercel serverless)

| Endpoint | Role |
|----------|------|
| `GET /api/station/now` | Current slot, sample content, progress % |
| `GET /api/program/today` | Full day grid + current slot id |

Shared schedule lives in `api/_program.js` (8 fixed blocks from Night Watch through Evening Devotional). Sample station: **Grace Community Church · Accra, Ghana**.

## Stack

- Static HTML / CSS / vanilla JS (no build step)
- Vercel routes + Node serverless handlers
- `localStorage` for selected station between index → listen
- Deployed as Vercel project `voices`

## Local

```bash
# Option A: any static server from project root
npx serve .

# Option B: Vercel (API routes work)
npx vercel dev
```

Open `/`, pick a station, or go straight to `/listen`.

## Deploy

Linked to Vercel project `voices` (production alias `voices-pi.vercel.app`).

```bash
npx vercel --prod
```

## Status

Working prototype. Admin/dashboard upload & scheduling UI is largely client-side mock; programme API returns structured sample content with `audioUrl: null` until real media is wired.

## License

Private / all rights reserved unless otherwise noted.
