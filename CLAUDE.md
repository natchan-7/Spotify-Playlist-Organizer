# CLAUDE.md - Spotify Playlist Organizer

## Goal

Build a frontend-only Spotify playlist organizer deployed on Cloudflare Pages.

The app must:

- authenticate the user with Spotify
- fetch the user's playlists
- fetch tracks for a selected playlist
- generate auto tags from artist genres
- allow manual user tags
- persist manual tags in localStorage
- create a new Spotify playlist from filtered tracks

This file is the canonical implementation guide for future work.
When code, README, and older notes disagree, follow this file and the current codebase.

---

## Current Baseline

Completed:

- Step 1: Spotify OAuth login with PKCE
- Step 2: Fetch and display playlists
- Step 3: Fetch and display tracks for a selected playlist
- Step 4: Fetch artist genres and prepare auto tags
- Step 5: Keep auto tags ephemeral and persist manual tags only
- Step 6: Implement user tag input and storage
- Step 7: Display auto tags and user tags together
- Step 8: Create a new playlist from filtered tracks
- Step 9: Manage browser-side saved data and legacy cache cleanup

Already implemented in `frontend/`:

- React 18 + Vite app
- Spotify Authorization Code with PKCE
- access token exchange on callback
- refresh-token based session renewal
- playlist fetch with pagination
- playlist item fetch with pagination via `/playlists/{id}/items`
- market-aware playlist item requests
- artist genre fetch in 50-ID batches
- in-memory auto-tag generation from artist genres
- manual tag persistence in localStorage
- playlist creation flow from auto tags or user tags
- browser-data management panel for saved manual tags and legacy cache cleanup

---

## Locked Technical Decisions

### Stack

- Frontend: React with JavaScript
- Build tool: Vite
- Hosting: Cloudflare Pages
- API: Spotify Web API
- Persistence: browser storage only
- Routing: single-page flow in app state

### Hard Constraints

- No backend
- No database
- No server-side rendering
- No Cloudflare Functions for app logic
- No Client Secret in frontend code
- No long-term caching of Spotify metadata such as artist genres or generated auto tags
- Do not add libraries unless the existing code clearly cannot support the next step without them

### Architecture Principles

- Keep the app frontend-only and static-build compatible
- Extend the existing structure instead of redesigning it
- Separate API access, storage logic, and UI rendering
- Prefer small reusable functions and small presentational components
- Keep `App.jsx` as the top-level coordinator unless there is a strong reason to split it

---

## Project Structure

```text
frontend/
  src/
    components/   # reusable UI pieces
    pages/        # page-level composition
    services/     # Spotify API and auth logic
    utils/        # storage, PKCE, data helpers
    styles/       # global CSS
```

Rules:

- UI-only logic belongs in `components/`
- screen composition belongs in `pages/`
- Spotify auth and API calls belong in `services/`
- browser storage and pure helper logic belong in `utils/`
- styling stays in `styles/`

---

## Environment Configuration

Required:

- `VITE_SPOTIFY_CLIENT_ID`

Optional:

- `VITE_SPOTIFY_REDIRECT_URI`

Behavior:

- if `VITE_SPOTIFY_REDIRECT_URI` is missing, use `window.location.origin + window.location.pathname`
- the redirect URI must be registered in the Spotify app settings
- redirect URIs must use HTTPS unless the app is running on a loopback IP such as `http://127.0.0.1`
- do not use `http://localhost`
- missing `VITE_SPOTIFY_CLIENT_ID` is a user-facing configuration error

---

## Authentication Design

Use Spotify Authorization Code with PKCE only.

Do not use:

- Implicit Grant
- backend token exchange in this project
- Client Secret in frontend code

Refresh token rules:

- store the refresh token with the session data
- refresh the access token before expiry when possible
- if refresh fails, clear the session and require the user to log in again

### Spotify Scopes

Keep these scopes unless a future step truly requires more:

- `playlist-read-private`
- `playlist-read-collaborative`
- `playlist-modify-private`
- `playlist-modify-public`
- `user-read-private`

### Storage Rules

Session storage:

- `spotify_pkce_code_verifier`
- `spotify_pkce_state`

Local storage:

- `spotifySession`
- `trackTags`

### Spotify Session Shape

```js
{
  accessToken: string,
  refreshToken: string,
  tokenType: string,
  scope: string,
  expiresAt: number
}
```

Rules:

- refresh expiring sessions before using them when a refresh token is available
- clear PKCE verifier and state after callback handling
- remove auth query params after processing the callback
- if auth state validation fails, treat it as a hard error and clear temporary auth data

---

## Async State Pattern

Continue the existing UI state convention for every async area:

- `idle`
- `loading`
- `success`
- `error`

Each domain should own its own state and error message.

Examples:

- `playlistsStatus`
- `tracksStatus`
- `genreStatus`
- `playlistCreationStatus`

Do not collapse unrelated async operations into one shared loading flag.

---

## Current Data Contracts

### Normalized Playlist Object

```js
{
  id: string,
  name: string,
  description: string,
  imageUrl: string,
  ownerId: string,
  ownerName: string,
  totalTracks: number,
  tracksHref: string,
  isPublic: boolean,
  isCollaborative: boolean,
  spotifyUrl: string
}
```

Rules:

- keep this shape stable
- `tracksHref` keeps its existing property name for compatibility, but should prefer the playlist `items` endpoint URL
- `ownerId` is required because Step 3 needs to distinguish user-owned playlists from followed playlists
- if playlist totals are missing or zero, a lightweight fallback request may be used to recover the total

### Track Tag Storage

localStorage key: `trackTags`

```json
{
  "track_id": {
    "auto": [],
    "user": ["tag1", "tag2"]
  }
}
```

Rules:

- `auto` and `user` must always be arrays
- do not store full track payloads inside `trackTags`
- persist only `user` tags long-term
- keep `auto` empty in browser storage

### Normalized Track Object

```js
{
  id: string,
  uri: string,
  name: string,
  album: string,
  durationMs: number,
  thumbnailUrl: string,
  artists: [
    {
      id: string,
      name: string
    }
  ],
  autoTags: string[],
  userTags: string[]
}
```

Rules:

- `artists` must keep Spotify artist IDs
- `autoTags` are derived in memory from the current Spotify response
- `userTags` come from `trackTags`
- do not persist normalized tracks in localStorage

---

## Spotify API Rules

Use the Spotify Web API directly from the frontend.
Use the official Spotify OpenAPI schema as the source of truth for paths, parameters, and response fields.

Current endpoints:

- `GET /me`
- `GET /me/playlists`
- `GET /playlists/{id}/items`
- `GET /artists?ids=...`
- `GET /artists/{id}`
- `POST /me/playlists`
- `POST /playlists/{id}/items`

Rules:

- always send the bearer token from `spotifySession.accessToken`
- normalize Spotify responses before rendering
- preserve pagination support for playlist and track endpoints
- implement backoff retry for `429` responses and respect the `Retry-After` header when present
- fail with clear user-facing errors when Spotify returns an error payload
- do not use deprecated endpoints

### Playlist Fetch Rules

- fetch all user playlists with pagination
- use `limit=50` for `/me/playlists`
- note that `/me/playlists` can include followed playlists owned by other users

### Track Fetch Rules

- fetch tracks for one selected playlist at a time
- keep the playlist list visible
- request playlist items with the user's market when available
- read playlist items from `item` first because Spotify's `track` field is deprecated
- ignore local tracks and unsupported non-track items
- show clear messaging when a playlist is visible but its items are not accessible

### Genre Fetch Rules

- derive artist IDs from normalized track objects
- fetch artist genres from Spotify in batches of up to 50 IDs
- if Spotify rejects a bulk artist chunk with `403`, treat that chunk as empty genres instead of retrying per artist
- if Spotify returns no usable genres for a track, generate fallback auto tags from normalized artist names
- do not persist Spotify-derived auto tags or artist-genre caches beyond immediate use

---

## UI Rules

- keep the current single-page layout
- preserve playlist artwork, owner, visibility, and Spotify link information
- visually distinguish auto tags from user tags
- user tags must be removable and duplicate-safe
- show configuration errors clearly
- show Spotify request errors clearly
- do not fail silently

---

## Implementation Order

### Step 1

Implement Spotify OAuth login with PKCE.

Status: complete

### Step 2

Fetch and display the current user's playlists.

Status: complete

### Step 3

Fetch and display tracks for the selected playlist.

Status: complete

### Step 4

Fetch artist genres and prepare auto tags.

Status: complete

### Step 5

Keep auto tags ephemeral and persist manual tags only.

Status: complete

### Step 6

Implement user tag input and storage.

Status: complete

### Step 7

Display auto tags and user tags together.

Status: complete

### Step 8

Create a new playlist from tracks filtered by auto tags or user tags.

Status: complete

### Step 9

Manage browser-side saved data and legacy cache cleanup.

Status: complete

---

## Non-Goals

Do not implement these now:

- backend or worker-based data proxy
- database persistence
- playlist sync across accounts
- background refresh jobs
- lyrics
- recommendation engine
- large-scale architecture refactors

---

## Definition of Done

The project is done when:

- login works with Spotify PKCE
- access tokens can be refreshed without exposing a Client Secret
- playlists are displayed
- tracks for a selected playlist are displayed
- auto tags are generated from artist genres in memory
- user tags can be added and removed
- only manual tags persist in localStorage
- a new playlist can be created from filtered tracks
- the app still builds as a static Vite frontend for Cloudflare Pages
