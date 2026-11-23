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
3. Replace `TOKEN` with a long random string. Generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Leave `SPREADSHEET_ID` empty (the script is bound to this spreadsheet).
5. Save, then run `setup` once from the editor and accept the permission prompt.
   You should see `Jobs` and `Employees` tabs with header rows.

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
VITE_SHEETS_URL=https://script.google.com/macros/s/XXXX/exec
VITE_SHEETS_TOKEN=the-same-long-random-string
```

Restart `npm run dev`. The header shows a sync bar; the first successful read is
cached locally so the board still opens offline.

If `.env.local` is missing, the app keeps using browser local storage exactly as
before.

## 5. Migrating existing local data

If the sheet is empty and the browser already has jobs in local storage, the sync
bar offers **Import N local jobs**. Click it once; the jobs and employees are
written to the sheet.

## Security notes

- The `/exec` URL is public. Anyone who has both the URL **and** the token can
  read and write the sheet.
- `VITE_*` variables are embedded in the JavaScript bundle, so the token is
  visible to anyone who opens the app. It stops accidental writes and casual
  scanning, not a determined attacker.
- For real access control, put a small server in front of the sheet and keep the
  token server-side (the repository layer is designed to allow that swap).
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
- If you rotate `TOKEN`, update `VITE_SHEETS_TOKEN` and restart the dev server /
  rebuild the app.
