# Spotify-Playlist-Organizer

This project is being implemented step by step following the strict order in `AGENT.md`.

Current status: Step 1 is implemented.

- Created a React + Vite app in `frontend/`
- Implemented Spotify OAuth login with PKCE
- Exchange the callback code for an access token and save it in localStorage
- Added a minimal UI that shows authentication state

Setup:

1. Create `frontend/.env` from `frontend/.env.example`
2. Set `VITE_SPOTIFY_CLIENT_ID`
3. Register `VITE_SPOTIFY_REDIRECT_URI` in your Spotify app settings

Next target: Step 2, "Fetch and display playlists".
