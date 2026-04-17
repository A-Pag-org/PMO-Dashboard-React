# Impact Dashboard (React)

A plain **React (Vite + TypeScript + React Router)** port of the [PMO-Dashboard](https://github.com/A-Pag-org/PMO-Dashboard) Next.js app.

This is the **Delhi Air Pollution Mitigation Impact Dashboard** — it tracks KPI progress across 8 pollution-mitigation initiatives across 9 cities in the Delhi-NCR region.

## What changed in the port

The source repository was a Next.js 16 (App Router) project. This version keeps the same UI, data, components, and design tokens but replaces all Next-specific infrastructure with framework-neutral React:

| Next.js (source) | React (this project) |
| --- | --- |
| `app/` App Router pages | `src/pages/*` rendered via `react-router-dom` |
| `next/link` | `<Link>` from `react-router-dom` |
| `useRouter()`, `redirect()` | `useNavigate()`, `<Navigate>` |
| `middleware.ts` (auth gate) | `<RequireAuth>` wrapper component using a demo cookie |
| `app/auth/login/route.ts` (server) | `signIn()` helper that sets the demo cookie client-side |
| `app/logout/route.ts` (server) | `signOut()` helper that clears the demo cookie |
| `next/font/google` Inter | `<link>` to Google Fonts in `index.html` |
| Tailwind v4 via `@tailwindcss/postcss` | Tailwind v4 via `@tailwindcss/vite` |

Everything else — Tailwind theme tokens, framer-motion transitions, lucide-react icons, mock data (`lib/constants.ts`), types (`lib/types.ts`), utility helpers (`lib/utils.ts`), and all presentational components — is preserved as in the original.

## Project structure

```
src/
├── main.tsx                    Bootstraps React + BrowserRouter
├── App.tsx                     Route table with auth guards
├── index.css                   Tailwind v4 import + design-token theme
├── lib/
│   ├── auth.ts                 Demo cookie auth helpers
│   ├── constants.ts            Mock data, initiatives, cities
│   ├── types.ts                Shared TypeScript interfaces
│   └── utils.ts                cn(), number formatter, colour thresholds
├── components/
│   ├── layout/
│   │   ├── TopBar.tsx          Persistent header with tab nav
│   │   ├── BottomBar.tsx       Footer action bar
│   │   └── DashboardSwitcher.tsx
│   ├── maps/
│   │   ├── DelhiNCRMap.tsx     SVG choropleth map
│   │   └── CityBubble.tsx      SVG city/state bubble
│   └── ui/
│       ├── AverageOval.tsx
│       ├── Badge.tsx
│       ├── CompletionBar.tsx
│       ├── DashboardCard.tsx
│       ├── DataTable.tsx
│       ├── EditableDataTable.tsx
│       ├── ExcelTemplatePreview.tsx
│       ├── FilterPill.tsx
│       ├── InitiativeCard.tsx
│       ├── MetricCard.tsx
│       ├── ProgressMetricRow.tsx
│       └── ViewToggle.tsx
└── pages/
    ├── LoginPage.tsx           `/login`
    ├── HomePage.tsx            `/home` — dashboard chooser
    ├── SummaryPage.tsx         `/dashboard/summary`
    ├── DetailPage.tsx          `/dashboard/detail`
    ├── AllDataPage.tsx         `/dashboard/all-data`
    └── UploadPage.tsx          `/dashboard/upload`
```

## Routes & auth

Route access rules are enforced client-side by the `RequireAuth` and `RedirectIfAuthed` wrappers in `App.tsx`, mirroring the behaviour of the original `middleware.ts`:

- `/` redirects to `/login`
- `/login` — redirects to `/home` if already authenticated
- `/home`, `/dashboard/*` — redirect to `/login` if unauthenticated

Authentication is a demo only: submitting the login form sets a short-lived `auth=demo` cookie via `document.cookie`. Replace `src/lib/auth.ts` with a real auth client when a backend is available.

## Development

```bash
npm install
npm run dev            # Vite dev server on http://localhost:5173
npm run build          # Type-check + production bundle in dist/
npm run preview        # Serve the built bundle
npm run typecheck      # tsc -b --noEmit
```

## Tech stack

- React 19 + TypeScript 5
- Vite 7 with `@vitejs/plugin-react` and `@tailwindcss/vite`
- Tailwind CSS 4 (theme tokens defined inline in `src/index.css`)
- React Router 7
- framer-motion 12
- lucide-react icons
- recharts (available for future chart work)
- clsx + tailwind-merge (the `cn()` helper)

## Credits

Original Next.js app: [A-Pag-org/PMO-Dashboard](https://github.com/A-Pag-org/PMO-Dashboard).
This repo ([PMO-Dashboard-React](https://github.com/A-Pag-org/PMO-Dashboard-React)) is the React port.
