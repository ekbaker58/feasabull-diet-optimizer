# Feasabull Calories

A free calorie, macro and micronutrient calculator for the USF community, using
the Institute of Medicine Dietary Reference Intakes — the same basis as the USDA
DRI calculator.

Recreated locally from the deployed Base44 app at
`https://feasabull-fuel-stats.base44.app/`, following the conventions in
`AGENTS.md`.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>.

```bash
npm run build    # emits dist/client and dist/server
```

## Stack

TanStack Start (SSR) · React 19 · plain JavaScript/JSX · Tailwind CSS 3 ·
shadcn/ui primitives · sonner for toasts.

Matches the `AGENTS.md` layout: no `index.html`, the document lives in
`src/routes/__root.jsx`, one page per file under `src/routes/`, design tokens in
`src/index.css` + `tailwind.config.js`.

## Layout

```
src/
├── routes/
│   ├── __root.jsx        document, <head> metadata, fonts, Toaster
│   └── index.jsx         the single page
├── components/
│   ├── Header.jsx  Hero.jsx  Method.jsx  Footer.jsx
│   ├── Calculator.jsx    form + report state, goal retargeting
│   ├── CalculatorForm.jsx
│   ├── Report.jsx        target card, macro bars, nutrient checklist
│   ├── Mascot.jsx        rotate + float wrapper for the artwork
│   └── ui/               shadcn primitives (input, label)
├── lib/
│   ├── dri.js            every equation and the DRI table
│   └── utils.js          cn()
├── assets/mascots/       artwork, pulled from the deployed app
├── index.css             design tokens
└── router.jsx
```

## The maths

All of it lives in `src/lib/dri.js`:

- **Calories** — the IOM Estimated Energy Requirement. Adults use the 19+
  equations; under-19s use the youth equations, which carry their own activity
  coefficients plus a growth allowance. Rounded to the nearest 10 kcal.
- **Goals** — maintain, −500 kcal (lose) or +350 kcal (build), floored at
  1500 kcal for males and 1200 for females.
- **Macros** — protein anchored at 1.6 g/kg but clamped into its 10–35% AMDR,
  fat at 30% of calories, carbohydrate taking the remainder.
- **Micronutrients** — 17 vitamins and minerals across five age bands by sex,
  plus fiber at 14 g per 1000 kcal and sodium's 1500 mg adequate intake:
  19 rows in all.
- **Also** — BMI with category, and water (3.7 L male / 2.7 L female).

Source: Dietary Reference Intakes for Energy, Macronutrients, Vitamins and
Minerals (National Academies of Sciences, Engineering, and Medicine).

## Fidelity to the deployed app

The server-rendered HTML was diffed against the live site:

- **Visible text:** all 80 blocks identical.
- **CSS classes:** 161 of 169 attributes identical and in the same order. The
  only difference is the mascot images — Base44's platform `<Image>` component
  wraps each one in two extra `<span>`s, while this build uses a plain `<img>`
  against a local asset. Renders the same.

A 404 route was added, which the original did not have.

## Base44 platform files

This app makes **no** Base44 backend calls — no entities, no auth, no server
functions, no AI. Every calculation runs in the browser. So the platform-managed
pieces `AGENTS.md` describes are deliberately absent, since nothing here uses
them and their packages are not publicly installable:

| Omitted | What it did |
| --- | --- |
| `base44()` Vite plugin, `base44:document`, `base44:runtime` | sandbox/builder wiring, `<Base44Scripts />`, secrets |
| `cloudflare()` plugin, `wrangler.jsonc`, `src/server.js` | Workers build target and entry |
| `src/lib/error-capture*.js` | error reporting to the Base44 dashboard |
| `src/lib/auth-middleware.js`, `src/api/base44Client.js`, `src/lib/AuthContext.jsx`, `src/components/auth/` | the SDK clients and auth boilerplate |
| `src/lib/server-fns.js`, `src/start.js` | the server-function data layer |

`data-react-root` is still on `<body>`, so the builder's preview bridge keeps
working if this is ever moved back.

To restore any of it, pull the Base44 GitHub export and drop these files in —
the paths here are unchanged, so they line up.

## Disclaimer

Unofficial student project. Not affiliated with, sponsored by, or endorsed by the
University of South Florida. Educational estimates only — not medical advice.
