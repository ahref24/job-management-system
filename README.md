# Job Management System

A responsive Kanban-style job board built with **React + Vite**. It works fully
offline with browser storage by default, and can optionally use a **Google
Sheet** as a shared database through a bound Apps Script web app — no backend
server required.

## Features

- **Full job CRUD** — add, view, edit, and delete jobs.
- **Kanban board** — To Do, In Progress, Complete.
- **Drag & drop** on desktop, plus a **status picker on every card** so touch
  and keyboard users can move work without dragging.
- **Assignments** — jobs are assigned to employees from a shared list.
- **Due dates & priorities** — low/medium/high/urgent badges, "due today" and
  "overdue by N days" hints.
- **Filtering** — by status, employee, and full-text search across titles,
  descriptions, notes, and assignee names.
- **Stats strip** — total, to do, in progress, complete, overdue.
- **Validation and confirmation** — inline form errors and a delete dialog.
- **Optional Google Sheets sync** — shared data, offline cache, queued writes
  and automatic retry.
- **Accessible dialogs** — focus trap, Escape to close, focus restoration, and
  labelled form fields.

## Tech stack

- React 18 (function components and hooks)
- Vite 5
- Plain CSS (no UI or drag-and-drop libraries)
- Vitest + ESLint for tests and static checks
- Google Apps Script + Google Sheets (optional backend)

## Getting started

Requires Node.js 20.19 or newer.

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

Other scripts:

```bash
npm test         # unit tests (Vitest)
npm run lint     # ESLint
```

## Using Google Sheets as the database

By default the app stores everything in `localStorage`. To share data through a
spreadsheet:

1. Follow [`apps-script/README.md`](./apps-script/README.md) to create the sheet,
   paste [`apps-script/Code.gs`](./apps-script/Code.gs), run `setup`, and deploy
   it as a web app with access set to **Anyone**.
2. Copy `.env.example` to `.env.local` and fill in:

   ```bash
   SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
   SHEETS_TOKEN=the-same-long-random-string
   ```

   These are **server-side** variables. Do not add a `VITE_` prefix — the
   browser never needs them.

3. Restart the dev server (or rebuild). The sync bar appears above the stats.

If `SHEETS_URL` is missing, the app silently falls back to local storage.

### How the proxy works

The browser calls `/api/sheets` on its own origin, never Google directly:

- In production on Vercel, [`api/sheets.js`](./api/sheets.js) handles the request.
- During `npm run dev` and `npm run preview`, a Vite middleware runs the same
  handler from [`server/sheets.js`](./server/sheets.js).
- The handler appends `SHEETS_TOKEN` and calls the Apps Script URL
  server-to-server, so the browser's CORS rules do not apply.
- The token is never included in the JavaScript bundle.

This means the Apps Script deployment only needs to be reachable by the server;
keep **Who has access: Anyone** so the proxy can read it without a Google login.

### Deploying to Vercel

1. Import the repository into Vercel (framework preset: **Vite**).
2. Open **Project Settings → Environment Variables** and add:
   - `SHEETS_URL`
   - `SHEETS_TOKEN`
3. Apply them to Production (and Preview/Development if you use those).
4. Redeploy. Vercel builds the client with Sheets mode enabled and deploys
   `api/sheets.js` as a serverless function.
5. Remove any old `VITE_SHEETS_*` variables — they are no longer read.

If you add or change the variables later, trigger a new deployment so the
build-time Sheets flag is refreshed.

### What sync looks like

- Reads happen on load, every 20 seconds while the tab is visible, and on
  focus/online events.
- Writes are optimistic: the board updates immediately, then the change is
  queued. Failed writes retry with backoff and survive a page reload through the
  persisted outbox.
- The last successful read is cached, so the board still opens offline.
- Deletions are soft (`deletedAt`) so other open tabs learn about them.
- If the sheet is empty and the browser has existing local jobs, the sync bar
  offers a one-time **Import N local jobs** action.
- If the `Employees` sheet is empty, the default employee list is seeded on the
  first successful connection.

**Security note:** `/api/sheets` is publicly callable by anyone who can load the
app, so treat the sheet as shared data. The token itself stays server-side. Add
authentication or rate limiting in front of the endpoint if you need stronger
access control.

## Architecture

```
src/
├── main.jsx
├── App.jsx                    # Layout, filters, modals
├── constants.js               # Statuses, priorities, default employees
├── components/
│   ├── KanbanBoard.jsx
│   ├── KanbanColumn.jsx       # Drop target
│   ├── JobCard.jsx            # Drag source + status picker
│   ├── JobForm.jsx            # Add/edit dialog
│   ├── ConfirmDialog.jsx
│   ├── FilterBar.jsx
│   ├── StatCards.jsx
│   └── SyncStatus.jsx         # Google Sheets state/queue banner
├── hooks/
│   ├── useJobs.js             # State, optimistic writes, outbox, polling
│   └── useFocusTrap.js        # Dialog focus management
├── data/
│   ├── repository.js          # Chooses local vs Sheets at build time
│   ├── localRepository.js     # localStorage adapter (validated)
│   ├── sheetsRepository.js    # Same-origin proxy adapter + cache
│   ├── http.js                # JSON/text requests, retry/backoff, timeout
│   ├── normalize.js           # Shape/date/enum coercion
│   ├── ops.js                 # Replays queued writes over snapshots
│   ├── outbox.js              # Persists the write queue across reloads
│   └── storage.js             # Safe JSON storage helpers
├── utils/
│   ├── helpers.js             # Dates, overdue logic, ids, seed data
│   └── sort.js                # Per-column sorting
└── styles/index.css
api/
└── sheets.js                  # Vercel serverless proxy
server/
└── sheets.js                  # Shared proxy logic (holds the token)
apps-script/
├── Code.gs                    # Web app: GET snapshot, POST mutations
└── README.md                  # Deployment walkthrough
```

The UI only talks to `useJobs()`. Persistence lives behind a small repository
contract (`load`, `upsertJob`, `deleteJob`, `upsertEmployee`, `readCached`,
`writeCache`), so switching between local storage, the Sheets proxy, or a future
backend is an adapter change.

### Data model

`Job`:

| Field | Notes |
| --- | --- |
| `id` | `job-<uuid>` |
| `title` | required, 3–120 chars |
| `description` | optional, ≤500 chars |
| `employeeId` | required |
| `dueDate` | `YYYY-MM-DD` or empty |
| `priority` | `low` / `medium` / `high` / `urgent` |
| `status` | `todo` / `in_progress` / `complete` |
| `notes` | optional, ≤1000 chars |
| `createdAt`, `updatedAt` | ISO timestamps |

`Employee`: `id`, `name`, `active`.

## Limitations

- Google Sheets is not a transactional database. Writes are serialized with
  `LockService`, but concurrent edits use last-write-wins.
- Apps Script quotas make this suitable for a small team, not high traffic.
- Without a configured sheet, data lives only in the current browser profile and
  is not shared between devices.
- Deleting a job writes a `deletedAt` marker; prune old rows manually if the
  sheet grows.
- If `/api/sheets` returns `The server returned an unexpected response.`, the
  Apps Script deployment is not public. Set **Who has access: Anyone** and
  redeploy it.

## Resetting demo data

- Local mode: clear the site's storage or run `localStorage.clear()` in DevTools.
- Sheets mode: delete the rows in the `Jobs` tab (keep the header row), then
  reload. To re-seed the demo jobs locally, also clear the `jms.cache.v1` key.
