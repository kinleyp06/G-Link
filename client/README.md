# G-Link frontend (React + Vite)

```
npm install
npm run dev     opens on http://localhost:5173 (the backend must be running on port 5000)
npm run build   makes the production files in dist/
```

Calls to `/api` are passed to `http://localhost:5000` by `vite.config.js`. For a deployed backend set `VITE_API_URL` in `.env` (see `.env.example`).

`package.json` pins `rollup` to 4.30.1 under `overrides`: this is the fix for the Windows npm/Rollup install error the team hit before. Keep it.

## Files
| Path | Job |
|---|---|
| `src/main.jsx`, `src/App.jsx` | Start the app; every page route and which roles can open it |
| `src/api.js` | Every call to the backend (adds the login token) |
| `src/context/AuthContext.jsx` | Signed-in user, sign in / sign out, start page per role |
| `src/components/Layout.jsx` | Top bar and menu for each role |
| `src/components/ProtectedRoute.jsx` | Blocks pages for the wrong role |
| `src/components/Footer.jsx`, `src/siteInfo.js` | Footer on every page: contact details and a Google Map. Change the address, phone or map search in `siteInfo.js` |
| `src/components/ProfileFields.jsx` | The profile form shared by Sign up and Profile (aligned grid, RUB member switch) |
| `src/components/ui.jsx` | Shared bits: notices, badges, bill box, bed icons, key tag, form field, payment method dropdown, data loading |
| `src/styles.css` | All styles; colours and fonts at the top in `:root` (Royal Blue #002789, Imperial Gold #A07A43, white / light gray, dark charcoal text) |
| `src/photos.js`, `src/components/Photo.jsx` | Every picture the site shows (rooms, hall, guest house, floor maps) and the "Photo needed" placeholder |
| `public/images/` | Put the pictures here; `public/images/README.md` lists all 21 with their file names |
| `public/logo.png`, `favicon.png` | The CST logo in the top bar and browser tab |
| `src/pages/...` | One file per page (see SETUP_GUIDE.md, "Every page") |
