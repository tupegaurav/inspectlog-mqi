# InspectLog — Manufacturing Quality Inspection

A lightweight, single-page inspection form for recording part-level quality checks on the shop floor. Plain HTML/CSS/JS, no build step, deployable as-is on GitHub Pages.

Replicates and extends the MQI Lovable prototype (`quality-track-insight.lovable.app`) as a standalone, self-hosted app that can plug directly into the InspectLog n8n automation pipeline.

## Features
- Part picker for the current 15-part catalog (calipers, master cylinders, canister, bracket)
- Check / OK / Reject / Rework quantity entry with inline validation
- Live Reject % and Rework % readout on analog-style dial gauges
- Local submission log (session-only)
- Every submission POSTs automatically to the production n8n webhook (hardcoded in `script.js`)
- **New Entry** — clears the form for the next ticket
- **Download PDF** / **Download JPG** — exports the current Quality Snapshot as a report
- Light/dark theme toggle switch

## Files
- `index.html` — structure
- `style.css` — design system (dark slate + safety-orange, dial gauges)
- `script.js` — calculations, validation, theme toggle, webhook POST

## Run locally
No build tools required — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Deploy to GitHub Pages
1. Create a new repo and push these three files (plus this README) to `main`.
2. Repo → Settings → Pages → Source: `Deploy from a branch` → Branch: `main` / `root`.
3. The app will be live at `https://<username>.github.io/<repo-name>/`.

## Wiring into the automation pipeline
Each submission POSTs to the production webhook `https://gauravai.app.n8n.cloud/webhook/mauli-inspection` (set as `WEBHOOK_URL` in `script.js` — change it there if the endpoint ever moves). Payload shape:

```json
{
  "partName": "TVS FRONT CALIPER",
  "checkQty": 100,
  "okQty": 92,
  "rejectQty": 6,
  "reworkQty": 2,
  "rejectPct": 6.0,
  "reworkPct": 2.0,
  "submittedAt": "2026-08-27T10:15:00.000Z"
}
```

This matches the shape expected by the existing "Mauli Automation Project 01" n8n workflow (webhook → Groq validation agent → Google Sheets append).
