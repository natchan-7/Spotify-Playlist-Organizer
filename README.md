# Spotify-Playlist-Organizer

This project is being implemented step by step following the strict order in `AGENT.md`.

Current status: Step 4 is implemented.

- Created a React + Vite app in `frontend/`
- Implemented Spotify OAuth login with PKCE
- Exchange the callback code for an access token and save it in localStorage
- Fetch Spotify playlists after authentication
- Display playlist artwork, owner, track count, visibility, and Spotify links
- Fetch tracks for a selected playlist and display track metadata
- Fetch artist genres in batches and prepare in-memory `autoTags`
- Preserve existing stored `trackTags.auto` values instead of overwriting them

Setup:

1. Create `frontend/.env` from `frontend/.env.example`
2. Set `VITE_SPOTIFY_CLIENT_ID`
3. Register the login callback URL in your Spotify app settings

Local callback URL:

- `http://127.0.0.1:5173/`

Notes:

- `VITE_SPOTIFY_REDIRECT_URI` is optional
- if it is not set, the app uses the current site URL automatically
- for Cloudflare Pages, leaving it unset is the simplest option

Next target: Step 5, "Persist auto tags in trackTags".

Step 4 notes:

- Playlist items currently come back in the Spotify API `item` field, so the app reads `item` first and only falls back to deprecated `track`
- Playlist tracks are fetched with a user market so Spotify returns playable metadata more reliably
- Some followed playlists may be visible in the list but still reject track-item access unless the user owns or collaborates on them
- Artist genres are fetched from Spotify in chunks of up to 50 artist IDs, with a fallback to per-artist requests if the bulk endpoint is rejected
- Generated auto tags stay in memory for now; Step 5 is where missing `trackTags.auto` entries should be persisted

## Cloudflare

This frontend can be deployed from the Cloudflare dashboard using Worker Builds.

If your dashboard does not show an output directory field, that is expected.
The static asset directory is defined in `frontend/wrangler.toml`.

Recommended Worker Build settings:

1. Root directory: `frontend`
2. Build command: `npm run build`
3. Deploy command: `npm run cf:deploy`
4. Version command: `npm run cf:versions`
5. Variables and secrets: add `VITE_SPOTIFY_CLIENT_ID`
6. Leave `VITE_SPOTIFY_REDIRECT_URI` unset unless you need a fixed callback URL

`frontend/wrangler.toml` serves the built app from `./dist` and uses SPA fallback routing.

After the first successful deploy:

1. Open the deployed Cloudflare URL from the `Visit` button
2. Confirm the redirect URI shown on the login card
3. Register that exact URL in the Spotify app settings
4. Re-deploy if needed and test the login flow again

Important:

- Cloudflare CLI authentication is still required on the machine that deploys
- Spotify redirect URIs must exactly match the deployed URL
- Preview URLs may fail Spotify OAuth unless that exact preview URL is also registered in Spotify
