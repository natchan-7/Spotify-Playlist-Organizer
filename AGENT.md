# 🤖 AGENTS.md - Spotify Playlist Organizer (Cloudflare Pages)

## 🎯 Goal

Build a frontend-only web application deployed on Cloudflare Pages that:

* Fetches Spotify playlists
* Displays tracks with metadata
* Applies auto + manual tags
* Stores tags in localStorage
* Generates new playlists via Spotify API

---

## 🧱 Tech Stack

* Frontend: React (JavaScript)
* Build Tool: Vite
* Hosting: Cloudflare Pages
* API: Spotify Web API
* Storage: localStorage
* Auth: OAuth 2.0 (Client-side)

---

## 📁 Project Structure

```id="c9l3xg"
frontend/
  src/
    components/
    pages/
    services/
    utils/
    styles/
```

### Rules

* UI → `components/`
* Page-level components → `pages/`
* API calls → `services/`
* Logic & storage → `utils/`
* CSS → `styles/`

---

## 📊 Data Structure

### localStorage key: `trackTags`

```json id="xv4f3t"
{
  "track_id": {
    "auto": ["genre"],
    "user": ["tag1", "tag2"]
  }
}
```

---

### Track Object

```js id="nqf8dp"
{
  id: string,
  name: string,
  artist: string,
  album: string,
  duration_ms: number,
  thumbnail_url: string,
  autoTags: string[],
  userTags: string[]
}
```

---

## 🔐 Authentication

* Use Spotify OAuth (Implicit Grant or PKCE)
* Access token stored in memory or localStorage
* DO NOT use backend

---

## 🔌 API Usage

Use Spotify Web API directly from frontend:

* GET /me/playlists
* GET /playlists/{id}/tracks
* GET /artists/{id}
* POST /users/{user_id}/playlists
* POST /playlists/{id}/tracks

---

## 🧠 Core Logic

### 1. Fetch Flow

1. Fetch playlists
2. Fetch tracks
3. Extract artist IDs
4. Fetch genres from artist API
5. Assign genres as autoTags

---

### 2. Auto Tag Logic

* Generate ONLY if not in localStorage
* Save to localStorage
* DO NOT overwrite existing auto tags

---

### 3. User Tag Logic

#### Add

* Prevent duplicates
* Save immediately

#### Remove

* Remove tag from array
* Save immediately

---

### 4. Tag Retrieval

```js id="qz1w0y"
function getTags(track_id) {
  const data = JSON.parse(localStorage.getItem("trackTags") || "{}");
  return data[track_id] || { auto: [], user: [] };
}
```

---

## 🎨 UI Rules

### Tag Display

* Auto Tag:

  * class: `auto-tag`
  * color: gray
  * NOT editable

* User Tag:

  * class: `user-tag`
  * color: blue or green
  * removable

---

## 📂 Playlist Generation

### Input

* Selected user tag

### Process

1. Filter tracks by userTags
2. Create playlist via API
3. Add tracks

---

## ⚠️ Constraints (IMPORTANT)

* NO backend allowed
* NO database allowed
* Store everything in localStorage
* Keep architecture simple
* Do NOT implement future features

---

## 🔄 Future Features (Do NOT implement)

* Playlist sync
* Refresh feature
* Lyrics integration
* Backend migration

---

## ⚙️ Implementation Steps (STRICT ORDER)

### Step 1

Implement Spotify OAuth login (PKCE recommended)

### Step 2

Fetch and display playlists

### Step 3

Fetch and display tracks

### Step 4

Fetch genres and generate auto tags

### Step 5

Store auto tags in localStorage

### Step 6

Implement user tag input + storage

### Step 7

Display tags (auto + user)

### Step 8

Implement playlist creation

---

## 🧪 Agent Rules

### ALWAYS

* Follow folder structure
* Keep components small
* Separate UI and logic
* Use reusable functions

---

### NEVER

* Add backend
* Use database
* Overcomplicate architecture
* Change data structure

---

## 📝 Output Requirements

When generating code:

* Specify file path
* Provide full code
* Keep naming consistent
* Avoid unnecessary abstraction

---

## 📌 Cloudflare Pages Notes

* This project must build with Vite
* Output must be static (dist folder)
* No server-side rendering

---

## ✅ Definition of Done

* Login works
* Playlists are displayed
* Tracks are displayed
* Tags can be added
* Tags persist in localStorage
* Playlist can be created
