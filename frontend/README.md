# embeddedcosine · frontend

React + Vite app for [embeddedcosine](../README.md): the landing page with the live demo map,
the full map explorer (2D with Plotly, 3D with Three.js), dataset management, and sign-in through Supabase.

## Run it

```bash
cp .env.example .env    # then fill in your Supabase URL + public key
npm install
npm run dev             # http://localhost:5173
```

The backend must be running for the map, search, and datasets (see the [root README](../README.md)).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |

## Layout

```
src/
  api/          client.js (calls the backend), errors.js (friendly error messages)
  components/   Navbar, Footer, XPWindow (page windows), MapWindow (floating map windows),
                MapView (2D/3D renderer), ResultsPanel, ClickPanel, SetupView (upload wizard), …
  pages/        LandingPage, MapApp, ProjectsPage, SupportPage, ResetPasswordPage
  index.css     design tokens + shared styles (one dark palette, XP window chrome)
```

`vercel.json` rewrites every path to `index.html` so client-side routes work on Vercel.
