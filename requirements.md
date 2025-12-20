# Product Requirements — X Reply Helper (Chrome Extension + Web Manager)

## Goals
- Help users reply faster on **X** with high-quality, reusable responses.
- Make replies feel **personal**, not spammy, using **nicknames** and lightweight variables.
- Provide a **web-based management page** for saved responses (net-new feature).
- Focus on **credibility and user growth first**; monetization later.

## Non-Goals (MVP)
- No AI / LLM backend.
- No auto-posting, auto-liking, auto-following, or bulk automation.
- No multi-platform support beyond X.

---

## Core User Stories

### A) Reply Faster on X (EzReply-like)
1. As a user, when a reply box is open on X, I can insert a saved response with one click.
2. I can browse responses by category (Uplift, Question, Boost, CTA, etc.).
3. I can search responses by keyword.
4. Inserted replies are fully editable before posting.

### B) Web Page to Manage Responses (Net New)
5. I can manage responses from a dedicated web page:
   - create / edit / delete
   - organize by tags or folders
   - favorite / pin responses
6. I can import and export responses as JSON.
7. Changes sync automatically with the Chrome extension.

### C) Nicknames for Known X Handles
8. I can save nicknames for X handles (e.g., `@rjchicago → RJ`).
9. Templates can reference nicknames using placeholders:
   - `This is beautiful, {{nickname}}!! 😍❤️`
10. If no nickname exists, I can configure fallback behavior:
    - use display name
    - use handle
    - omit name

---

## Functional Requirements

### 1) X Integration (Chrome Extension)
- Detect pages under `x.com/*`.
- Detect reply / compose editors reliably.
- Insert text at cursor position and dispatch required input events.
- Optional floating toolbar near the composer.

**Acceptance Criteria**
- Works in timeline replies, thread replies, and modal composer.
- Inserted text persists and is recognized by X.

---

### 2) Response Templates
Each response includes:
- `id`
- `title`
- `body`
- `tags[]`
- `favorite` (boolean)
- `createdAt`, `updatedAt`

**Supported Placeholders (MVP)**
- `{{nickname}}`
- `{{handle}}`
- `{{displayName}}`
- `{{hashtag}}` (user-configurable default)

**Acceptance Criteria**
- Templates render correctly based on reply context.
- Fallback rules apply consistently.

---

### 3) Nickname Directory
- Map normalized X handles → nicknames.
- CRUD operations (add/edit/remove).
- Search by handle or nickname.
- Optional inline “Set nickname” action from reply UI.

**Acceptance Criteria**
- Nicknames sync across extension and web manager.
- Handle-based lookup remains stable if display name changes.

---

### 4) Web Manager Page
Accessible via:
- Extension menu (“Manage responses”)
- Direct URL

**Features**
- Response list with search, tags, favorites.
- Full editor for responses.
- Nickname directory editor.
- Import/export JSON.

**Sync**
- Use `chrome.storage.sync` (fallback to local if needed).

**Acceptance Criteria**
- Changes propagate to extension quickly.
- Export includes responses + nicknames.

---

## UX Requirements
- Extension popup:
  - search bar
  - favorites section
  - tag filters
  - insert button
  - link to web manager
- Clear success/error feedback.
- Graceful handling if no composer is detected.

---

## Data Storage
- `chrome.storage.sync`:
  - responses
  - nicknames
  - user settings (fallback rules, default hashtag, toolbar toggle)
- Efficient storage to respect Chrome sync quotas.
- Text-only content.

---

## Security & Privacy
- No credential collection.
- No DM access.
- No off-device data transmission in MVP.
- Clear privacy policy in extension listing and web page.

---

## Performance & Reliability
- Lightweight content scripts.
- Avoid heavy DOM polling.
- Resilient selectors and fallback insertion behavior.

---

## Telemetry (Optional / Later)
- Default: none.
- Optional opt-in, anonymous usage metrics:
  - insert actions
  - feature usage
  - error detection

---

## Roadmap

### v1.1
- Response packs and pack sharing
- Keyboard shortcuts (favorites 1–9)
- Prompted variables (e.g., `{{highlight}}`)

### v1.2
- LinkedIn / Reddit support
- Shared team libraries
- Cloud sync beyond Chrome

### Monetization (Later)
- Freemium model
- Community pack marketplace
- Optional AI-assisted tier

---

## Definition of Done (MVP)
- Chrome extension functional on X.
- Web manager page live and synced.
- Nickname support working end-to-end.
- Import/export supported.
- Starter response pack included.
- Privacy policy published.
