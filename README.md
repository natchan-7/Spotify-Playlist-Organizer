# Spotify-Playlist-Organizer

This project is being implemented step by step following the strict order in `AGENT.md`.

Current status: Step 2 is implemented.

- Created a React + Vite app in `frontend/`
- Implemented Spotify OAuth login with PKCE
- Exchange the callback code for an access token and save it in localStorage
- Fetch Spotify playlists after authentication
- Display playlist artwork, owner, track count, visibility, and Spotify links

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

Next target: Step 3, "Fetch and display tracks".

## Cloudflare Pages

This frontend is deployable to Cloudflare Pages as a static Vite site.

Recommended deployment flow:

1. Create a Cloudflare Pages project from this GitHub repository
2. Set the Pages root directory to `frontend`
3. Set the build command to `npm run build`
4. Set the build output directory to `dist`
5. In Pages environment variables, set `VITE_SPOTIFY_CLIENT_ID`
6. Do not set `VITE_SPOTIFY_REDIRECT_URI` unless you need a fixed callback URL
7. After the first deploy, register your production URL in Spotify, for example `https://your-project.pages.dev/`
8. Re-deploy and test the full login flow on the deployed URL

Wrangler direct-upload support is also prepared in `frontend/wrangler.toml`.

Important:

- Cloudflare CLI authentication is still required on the machine that deploys
- Spotify redirect URIs must exactly match the deployed URL
- Preview deployments may not work with Spotify OAuth unless that exact preview URL is also registered in Spotify
