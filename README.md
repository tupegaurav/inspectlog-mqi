# Quality Insight Hub

Build a professional production-ready responsive React + TypeScript + Tailwind web app named “MQI — Quality Intelligence Platform” with subtitle “Manufacturing Quality Inspection.” Do not use the word “Maui” anywhere.

Implement the detailed user specification exactly:
- Enterprise manufacturing/QC design: white/light background, teal/green accents, clean typography, rounded cards, accessible responsive desktop/tablet layout, no unnecessary animations.
- Inspection Details form. Required Part Name dropdown with EXACT options:
TVS FRONT CALIPER
K-17 FRONT CALIPER
REJ-C MASTER CYL
ACPD CALIPER
HERO ADHG CALIPER
HONDA UNICORN CALIPER
CANISTER K10
N-TOEQ MASTER CYL
TVS FRONT MASTER CYLINDER
HERO ABSR MASTER CYL
ADJR MASTER CYLINDER
ADHG MASTER CYLINDER
HONDA UNICORN MASTER CYLINDER
H105 M/CYL
PULSER HOLDER BRACKET
- Required numeric Check Qty, OK Qty, Reject Qty. Optional Rework Qty. Basic frontend validation only: required fields and all quantities non-negative whole numbers. Empty Rework must send numeric 0.
- Explicitly NEVER implement quantity balance or arithmetic validation of any kind between checkQty, okQty, and rejQty. Do not calculate or compare quantity differences. Do not add tolerances, math checks, quantity mismatch UI, expected/got UI, or frontend invalidity based on quantity arithmetic, including in any helper/component.
- Quality Snapshot shows Reject % = Reject Qty / Check Qty *100 and Rework %= Rework Qty / Check Qty*100, display-only rounded to exactly 2 decimal places; show 0.00% when Check Qty is 0. Never use percentage for validation.
- Submit Inspection: on click basic validation only; prevent duplicates by disabling button and label “Submitting Inspection...”; POST to exact production webhook https://gauravai.app.n8n.cloud/webhook/mauli-inspection (not webhook-test) with headers Content-Type: application/json and Accept: application/json. Body exact shape/names with numeric values: partName, checkQty, okQty, rejQty, reworkQty, rejPercent, reworkPercent. Parse JSON response and clearly show actual backend response. Do not frontend reinterpret, modify, override, or add validation from backend response. If isValid true, display exactly/clearly “Inspection submitted successfully.” If isValid false, display returned errors. Preserve severity and backend-provided response clearly without generating extra errors.
- On network/server error only display “Unable to submit inspection. Please try again.” No technical detail/stack trace. Re-enable button.
- On successful backend submission, reset all form fields, snapshot to 0.00%, and clear prior errors. Do not clear form on submission failure.
- Test frontend behavior for the specified examples (1000,800,350,250 and 500,300,255,50): accept without a frontend quantity mismatch error and correct display percentages.

Before completing, inspect the ENTIRE frontend codebase and search/remove any frontend logic or terminology that enforces or refers to Check Qty balance, OK Qty + Reject Qty, quantity mismatch/difference, expected quantities, math checks, tolerance, or checkQty !==/!= okQty + rejQty. Ensure production webhook is used. Verify complete submission flow/build.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://quality-track-insight.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a528c430-3a0d-4190-8ef7-c2f7545dd6bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
