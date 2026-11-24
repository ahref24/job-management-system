# Google Sheets backend setup

The app can use a Google Sheet as its shared database through a bound Apps Script
web app. No backend server, API key, or OAuth consent screen is required.

## 1. Create the spreadsheet

1. Go to <https://sheets.new> and name it something like **JobBoard**.
2. You do **not** need to create tabs or headers by hand — the script does it.

## 2. Add the script

1. In the spreadsheet: **Extensions → Apps Script**.
2. Delete the placeholder `myFunction` and paste the contents of
   [`Code.gs`](./Code.gs).

   > This must be a **container-bound** script opened from the spreadsheet. A
   > standalone script at <https://script.google.com> cannot see the sheet
   > unless you set `SPREADSHEET_ID` in `Code.gs`.

3. Replace `TOKEN` with a long random string. Generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Leave `SPREADSHEET_ID` empty (the script is bound to this spreadsheet).
5. Save, then run `setup` once from the editor and accept the permission prompt.
   You should see `Jobs` and `Employees` tabs with header rows.

> Upgrading an existing sheet? You do **not** need to wipe it. On the next run,
> the script appends any new job columns (`completedAt`, `history`) to the right
> of the existing headers. Employee names typed into the job form are written to
> the `Employees` tab automatically.

## 3. Deploy the web app

1. **Deploy → New deployment**.
2. Select type **Web app**.
3. Set:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Deploy and copy the **Web app URL** (it ends in `/exec`).

> `Anyone` is required because the browser is not signed in to your Google
> account. Access is gated by the token, not by Google identity — see the
> security notes below.

## 4. Point the app at it

Create `.env.local` in the project root:

```bash
SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
SHEETS_TOKEN=the-same-long-random-string
```

These are server-side variables. Do **not** prefix them with `VITE_`: the browser
never receives them. The app calls its own `/api/sheets` proxy, which adds the
token and talks to Apps Script from the server.

Restart `npm run dev`. The header shows a sync bar; the first successful read is
cached locally so the board still opens offline.

If `.env.local` is missing, the app keeps using browser local storage exactly as
before.

### Vercel

Add `SHEETS_URL` and `SHEETS_TOKEN` under **Project Settings → Environment
Variables**, then redeploy. `api/sheets.js` becomes the proxy. Remove any old
`VITE_SHEETS_*` variables.

### Why the proxy exists

Google Apps Script does not answer CORS preflight requests, and some deployments
omit `Access-Control-Allow-Origin` entirely. Calling Apps Script from the browser
therefore fails with a CORS error. Routing through `/api/sheets` keeps every
browser request same-origin, so CORS never applies, and keeps the token out of
the bundle.

### Troubleshooting

- `{"ok":false,"error":"The server returned an unexpected response."}` from
  `/api/sheets` means Google returned a sign-in page instead of sheet data. Open
  the Apps Script editor, go to **Deploy → Manage deployments**, edit the active
  deployment, set **Who has access: Anyone**, and deploy again.
- `{"ok":false,"error":"unauthorized"}` means `SHEETS_TOKEN` does not match
  `TOKEN` in `Code.gs`.
- `TypeError: Cannot read properties of null (reading 'getSheetByName')` means
  the script is not bound to a spreadsheet and `SPREADSHEET_ID` is empty. Open
  the sheet and use **Extensions → Apps Script**, or paste the spreadsheet ID
  from the sheet URL into `SPREADSHEET_ID`.

## 5. Migrating existing local data

If the sheet is empty and the browser already has jobs in local storage, the sync
bar offers **Import N local jobs**. Click it once; the jobs and employees are
written to the sheet.

## Security notes

- The `/exec` URL and `SHEETS_TOKEN` live only in server-side environment
  variables (Vercel project settings or `.env.local`).
- The `/api/sheets` endpoint itself is public to anyone who can load the app.
  Treat the sheet as shared data and add authentication/rate limiting in front of
  the proxy if you need stronger control.
- Keep **Who has access: Anyone** on the Apps Script deployment, otherwise the
  server-side proxy receives a Google sign-in page instead of JSON.
- Treat the sheet as shared data: do not store secrets in job titles or notes.

## Limits

- Apps Script and Sheets have quotas (roughly thousands of requests per day and
  short execution limits). Fine for a small team; not for high traffic.
- Writes are serialized with `LockService`, but the client uses last-write-wins
  on `updatedAt`. Two people editing the same job at the same moment can
  overwrite each other.
- The client polls every 20 seconds while the tab is visible, and refreshes on
  focus/online.
- Deleting a job writes a `deletedAt` timestamp instead of removing the row, so
  other open tabs learn about the deletion. Clean up old rows manually if the
  sheet grows.

## Changing the token or redeploying

- After editing `Code.gs`, use **Deploy → Manage deployments → Edit → New
  version**. A new deployment URL is only created if you add a new deployment.
- If you rotate `TOKEN`, update `SHEETS_TOKEN` in `.env.local` / Vercel and
  restart the dev server or redeploy.
