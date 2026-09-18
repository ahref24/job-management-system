# Job Management System

A clean, modern, fully responsive Kanban-style job/task board built with **React + Vite** that uses the browser's **Local Storage** as its database — no backend required. Data persists across page refreshes and browser restarts.

## Features

- **Full CRUD** — add, view, edit, and delete jobs.
- **Kanban board** — three columns: **To Do**, **In Progress**, **Complete**.
- **Drag & drop** — drag a job card between columns to change its status instantly.
- **Status in edit form** — change status from the edit modal as well.
- **Assign jobs** to employees (seed list included, stored separately).
- **Due dates & priorities** — set due dates and low/medium/high/urgent priorities with visual badges.
- **Job notes** — add internal notes to every job.
- **Filtering** — filter by status, by assigned employee, and full-text search.
- **Stats strip** — live counts for total / to do / in progress / complete / overdue.
- **Overdue highlighting** — overdue open jobs get a red accent.
- **Form validation** — client-side validation with inline error messages.
- **Delete confirmation** — destructive actions require confirmation.
- **Persistent storage** — every change is saved to Local Storage automatically.
- **Seed data** — ships with a few example jobs on first launch (only until you add your own).

## Tech Stack

- React 18 (function components + hooks)
- Vite 5
- Plain CSS (no UI framework, no external drag-drop library — native HTML5 Drag & Drop API)

## Getting Started

### Prerequisites

- Node.js **18+** (tested with 22.x)
- npm (bundled with Node)

### Install and run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server (opens http://localhost:5173)
npm run dev
```

### Production build

```bash
# 1. Create an optimized production bundle in /dist
npm run build

# 2. Preview the production build locally
npm run preview
```

## Project Structure

```
.
├── index.html                     # Entry HTML
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                   # React root
    ├── App.jsx                    # State, CRUD, filtering, drag-drop wiring
    ├── constants.js               # Statuses, priorities, employee seed list
    ├── styles/
    │   └── index.css              # All styles (dark-striped, responsive)
    ├── hooks/
    │   └── useLocalStorage.js     # Persistence hook (reads/writes Local Storage)
    └── utils/
        └── helpers.js             # IDs, date helpers, overdue logic, seed jobs
    └── components/
        ├── KanbanBoard.jsx        # 3-column grid wrapper
        ├── KanbanColumn.jsx       # Single column with drop handling
        ├── JobCard.jsx            # Job card (drag source, edit/delete buttons)
        ├── JobForm.jsx            # Add/Edit modal with validation
        ├── ConfirmDialog.jsx      # Delete confirmation modal
        ├── FilterBar.jsx          # Search + status/employee filters
        └── StatCards.jsx          # Summary stats
```

## How Data Persists

- Jobs are stored under the Local Storage key `jms.jobs.v1`.
- Employees are stored under `jms.employees.v1`.
- The `useLocalStorage` hook in `src/hooks/useLocalStorage.js` initializes state from storage and writes back on every change.
- **To reset the demo:** clear your browser site data, or run `localStorage.clear()` in the DevTools console.

## Drag & Drop Details

- The native HTML5 Drag & Drop API is used (no dependency).
- Card `dragstart` writes the job id to the data transfer payload.
- Each column listens for `dragover` (with `preventDefault`) and `drop`, then moves the job to that status via `App.handleMoveJob`, which updates Local Storage automatically.

## Notes

- Resetting the app (clearing storage) re-seeds the sample jobs.
- The UI is responsive: 3 columns on desktop, stacked on mobile.
- Overdue jobs (past due date, not "Complete") are highlighted in red on their card.