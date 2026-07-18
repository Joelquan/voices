# Voices — Church Radio

**First-customer launch:** one live church station + shareable listen link + browser voice (TTS) playback.

**Live:** https://voices-pi.vercel.app  
**Member link:** https://voices-pi.vercel.app/listen  
**GitHub:** https://github.com/Joelquan/voices

## Goal

Give a church a **24/7 radio station** members can open from anywhere.  
v1 = **one station**, one link, something members can **hear today**.

## What ships in v1

| Piece | Status |
|-------|--------|
| `/listen` player | Live — Web Speech (free TTS) reads the current hour’s programme |
| 24-hour programme grid | Live — `api/_program.js` |
| Share link (WhatsApp / copy) | Live — `origin/listen` |
| Home = pilot station | Live — single-station launch CTA |
| Real MP3 / stream | Next |
| Multi-church directory | Later |
| Auth / billing | Later |

## Customize the first church

Edit **`api/_program.js`** → `STATION` object:

```js
const STATION = {
  name: 'Your Church Name',
  location: 'City, Country',
  tagline: '24/7 church radio for our family',
  listeners: 12,
  shortCode: 'yourchurch',
};
```

Update each slot’s `sample.text` — that text is what members **hear** when they tap play.

Redeploy after changes:

```bash
npx vercel --prod
```

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Launch home — one station + share |
| `/listen` | Member player (send this link) |
| `/dashboard` | Church schedule UI (prototype) |
| `/admin` | Platform admin (prototype) |
| `/plan` | 7-day launch checklist |

## API

| Endpoint | Role |
|----------|------|
| `GET /api/station/now` | Now playing + `speakText` for TTS |
| `GET /api/program/today` | Full day grid |
| `GET /api/station/config` | Public station identity for home |

## Get your first customer (checklist)

1. **Set church name** in `api/_program.js`
2. **Write programme copy** (prayer / worship / sermon text) for each slot
3. **Deploy** to production
4. **Test** on phone: open `/listen` → tap play → hear voice
5. **WhatsApp the link** to 5–10 members of that church
6. **Sit with the pastor** — 10 min demo: “This is your station. Share this link.”
7. **Ask for a pilot yes** — free 30 days, then paid monthly

### Suggested pilot offer

> Free for 30 days for your church. Members get one link. You get a 24/7 programme.  
> After that: **$29–49/month** per station (adjust to market).

## Local dev

```bash
npx vercel dev
# open http://localhost:3000/listen
```

## Stack

Static HTML + Vercel serverless. No build step. No paid TTS for v1 (browser Web Speech API).

## License

Private / all rights reserved unless otherwise noted.
