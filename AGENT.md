# AGENT.md - Spotify Playlist Organizer

## Goal

Build a frontend-only Spotify playlist organizer deployed on Cloudflare Pages.

The app must:

- authenticate the user with Spotify
- fetch the user's playlists
- fetch tracks for a selected playlist
- generate auto tags from artist genres
- allow manual user tags
- persist tags in localStorage
- create a new Spotify playlist from filtered tracks

This file is the canonical implementation guide for all future steps.
When code and older notes disagree, follow this file and the current codebase.

---

## Current Baseline

Completed:

- Step 1: Spotify OAuth login
- Step 2: Fetch and display playlists
- Step 3: Fetch and display tracks for the selected playlist
- Step 4: Fetch artist genres and prepare auto tags

Already implemented in `frontend/`:

- React 18 + Vite app
- Spotify Authorization Code with PKCE
- access token exchange on callback
- Spotify session persistence in localStorage
- playlist fetch with pagination
- normalized playlist cards with artwork, owner, visibility, track count, and Spotify link
- on-demand playlist track fetch with pagination
- market-aware playlist track requests
- artist genre fetch in 50-ID batches
- in-memory auto-tag preparation that preserves stored `trackTags.auto`

The next implementation target is Step 5.

---

## Locked Technical Decisions

### Stack

- Frontend: React with JavaScript, not TypeScript
- Build tool: Vite
- Hosting: Cloudflare Pages
- API: Spotify Web API
- Persistence: browser storage only
- Routing: single-page flow in the existing app state unless a later step explicitly requires otherwise

### Hard Constraints

- No backend
- No database
- No server-side rendering
- No Cloudflare Functions for app logic
- No refresh token flow
- No storage of Spotify data in any place other than browser memory/localStorage/sessionStorage
- Do not add libraries unless the existing code clearly cannot support the next step without them

### Architecture Principles

- Keep the app frontend-only and static-build compatible
- Extend the existing structure instead of redesigning it
- Preserve already working Step 1 and Step 2 behavior while adding later steps
- Prefer small reusable functions and small presentational components
- Separate API access, storage logic, and UI rendering

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
- keep `App.jsx` as the top-level state coordinator unless there is a strong reason to split it

---

## Environment Configuration

Required:

- `VITE_SPOTIFY_CLIENT_ID`

Optional:

- `VITE_SPOTIFY_REDIRECT_URI`

Behavior:

- if `VITE_SPOTIFY_REDIRECT_URI` is missing, use `window.location.origin + window.location.pathname`
- the redirect URI must be registered in the Spotify app settings
- missing `VITE_SPOTIFY_CLIENT_ID` is a user-facing configuration error, not a silent failure

---

## Authentication Design

Use Spotify Authorization Code with PKCE only.

Do not use:

- Implicit Grant
- backend token exchange
- refresh tokens

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

### Spotify Session Shape

```js
{
  accessToken: string,
  tokenType: string,
  scope: string,
  expiresAt: number
}
```

Rules:

- clear expired sessions before using them
- clear PKCE verifier and state after callback handling
- remove auth query params after processing the callback
- the callback flow must be safe under React StrictMode remount behavior
- if auth state validation fails, treat it as a hard error and clear temporary auth data

---

## Async State Pattern

Continue the existing UI state convention for every async area:

- `idle`
- `loading`
- `success`
- `error`

Each domain should own its own state and error message.

Examples for future steps:

- `tracksStatus`
- `tracksError`
- `genreStatus`
- `playlistCreationStatus`

Do not collapse unrelated async operations into one shared loading flag.

---

## Current Data Contracts

### Normalized Playlist Object

This is already established by the Step 2 implementation.

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
- playlist cards and later track fetch flows should use this normalized object
- if playlist track totals are missing or zero, a lightweight fallback request may be used to recover the total
- `ownerId` is required because Step 3 needs to distinguish user-owned playlists from followed playlists that may reject track access

### Track Tag Storage

This storage contract is locked for later steps:

localStorage key: `trackTags`

```json
{
  "track_id": {
    "auto": ["genre"],
    "user": ["tag1", "tag2"]
  }
}
```

Rules:

- `auto` and `user` must always be arrays
- do not store full track payloads inside `trackTags`
- do not change this key name
- do not change this nested shape

### Normalized Track Object

For Step 3 and Step 4, use a normalized track object that preserves artist IDs.
Do not flatten away the artist identifiers, because Step 4 needs them for genre lookup.

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
- `autoTags` and `userTags` are UI-ready values derived from `trackTags`
- do not persist normalized tracks in localStorage
- track fetch results should remain sourced from Spotify, not from a local cache
- if Spotify omits `track.id`, a fallback ID may be used for rendering, but future tag and playlist-generation logic should prefer the true Spotify track ID or URI when available

---

## Spotify API Rules

Use Spotify Web API directly from the frontend.

Current and planned endpoints:

- `GET /me/playlists`
- `GET /playlists/{id}/tracks`
- `GET /artists?ids=...`
- `POST /users/{user_id}/playlists`
- `POST /playlists/{id}/tracks`

Rules:

- always send the bearer token from `spotifySession.accessToken`
- normalize Spotify responses before rendering
- preserve pagination support for playlist and track endpoints
- fail with clear user-facing errors when Spotify returns an error payload

### Playlist Fetch Rules

- fetch all user playlists with pagination
- use `limit=50` for `/me/playlists`
- normalize each playlist before it reaches UI components
- note that `/me/playlists` can include followed playlists owned by other users

### Track Fetch Rules

To avoid future rework, Step 3 must fetch tracks for one selected playlist at a time.

Do:

- keep the playlist list visible
- add an explicit selected-playlist state
- fetch tracks only after a playlist is selected
- support Spotify pagination for playlist tracks
- request playlist items with the user's market when available
- read playlist items from `item` first, because Spotify's `track` field is deprecated
- ignore local tracks and unsupported non-track items
- show clear messaging when a playlist is visible but its items are not accessible

Do not:

- eagerly fetch tracks for every playlist during Step 3
- couple playlist list rendering to track fetch logic
- assume every playlist visible in `/me/playlists` will allow `/playlists/{id}/tracks`

### Genre Fetch Rules

For Step 4 and Step 5:

- derive artist IDs from the normalized track objects
- fetch artist genres from Spotify in batches of up to 50 IDs
- generate auto tags only when `trackTags[trackId].auto` is missing or empty
- never overwrite existing auto tags that are already stored
- keep generated auto tags in memory during Step 4; persist them in Step 5

---

## UI Rules

### Existing Screen Direction

- keep the current single-page layout
- keep the current visual language unless a change is required for the new feature
- mobile behavior must remain usable

### Playlist Area

- keep playlist cards as the summary view
- use playlist selection as the entry point for Step 3
- do not remove existing artwork, owner, visibility, or Spotify-link information

### Tag Display

Auto tag:

- class: `auto-tag`
- visually distinct from user tags
- not directly editable

User tag:

- class: `user-tag`
- removable
- prevent duplicate user tags per track

### Error UX

- show configuration errors clearly
- show Spotify request errors clearly
- do not fail silently

---

## Implementation Order

Keep the strict order, but follow the clarified scope below.

### Step 1

Implement Spotify OAuth login with PKCE.

Status: complete

### Step 2

Fetch and display the current user's playlists.

Status: complete

### Step 3

Fetch and display tracks for the selected playlist.

Status: complete

Required scope:

- add selected playlist state
- fetch playlist tracks on demand
- normalize track data
- show track loading, empty, and error states

### Step 4

Fetch artist genres and prepare auto tags.

Status: complete

Required scope:

- use artist IDs from normalized tracks
- map genres into `auto` tags

### Step 5

Persist auto tags in `trackTags`.

Status: next

Required scope:

- create missing entries
- never overwrite existing `auto` arrays

### Step 6

Implement user tag input and storage.

Required scope:

- add tags
- remove tags
- prevent duplicates
- save immediately

### Step 7

Display auto tags and user tags together.

Required scope:

- merge Spotify-fetched track data with stored tag data at render time

### Step 8

Create a new playlist from tracks filtered by a selected user tag.

Required scope:

- filter by `userTags`
- create playlist with Spotify API
- add matching track URIs to the new playlist

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
- playlists are displayed
- tracks for a selected playlist are displayed
- auto tags are generated from artist genres
- user tags can be added and removed
- tags persist in localStorage
- a new playlist can be created from filtered tracks
- the app still builds as a static Vite frontend for Cloudflare Pages
