/**
 * JobBoard <-> Google Sheets bridge.
 *
 * This script is bound to a spreadsheet and exposed as a web app. The React
 * client reads with GET and writes with POST (text/plain, so no CORS preflight).
 *
 * Setup:
 *   1. Open the spreadsheet you want to use.
 *   2. Extensions > Apps Script, paste this file as Code.gs.
 *      (If you use a standalone script instead, set SPREADSHEET_ID below.)
 *   3. Replace TOKEN with a long random string.
 *   4. Run setup() once and accept the permission prompt.
 *   5. Deploy > New deployment > Web app.
 *        Execute as: Me
 *        Who has access: Anyone
 *   6. Copy the /exec URL into SHEETS_URL and the token into SHEETS_TOKEN
 *      (in .env.local locally, or Vercel project env vars in production).
 *
 * See apps-script/README.md for the full walkthrough.
 */

const TOKEN = "replace-with-a-long-random-string";

// Leave blank when the script is bound to the sheet (Extensions > Apps Script).
// For a standalone script, paste the ID from the sheet URL:
// https://docs.google.com/spreadsheets/d/THIS_PART/edit
const SPREADSHEET_ID = "";

const SHEETS = {
  jobs: {
    name: "Jobs",
    headers: [
      "id",
      "title",
      "description",
      "employeeId",
      "dueDate",
      "priority",
      "status",
      "notes",
      "createdAt",
      "updatedAt",
      "deletedAt",
      "completedAt",
      "history",
    ],
    textColumns: ["dueDate", "createdAt", "updatedAt", "deletedAt", "completedAt"],
  },
  employees: {
    name: "Employees",
    headers: ["id", "name", "active"],
    textColumns: [],
  },
};

/** Run once from the Apps Script editor to create sheets, headers and formats. */
function setup() {
  Object.keys(SHEETS).forEach(function (key) {
    sheetFor_(key);
  });
  return "JobBoard sheets are ready.";
}

/** Apply plain-text number formats to date/id columns. */
function formatTextColumns_(sheet, config, headers, startColumn) {
  headers.forEach(function (header, offset) {
    if (config.textColumns.indexOf(header) === -1) return;
    sheet.getRange(1, startColumn + offset, sheet.getMaxRows(), 1).setNumberFormat("@");
  });
}

function book_() {
  if (SPREADSHEET_ID) return SpreadsheetApp.openById(SPREADSHEET_ID);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      "No spreadsheet found. Open the spreadsheet, choose Extensions > Apps Script, " +
        "and run setup() there. For a standalone script, set SPREADSHEET_ID at the " +
        "top of Code.gs to the ID from the sheet URL."
    );
  }
  return active;
}

function sheetFor_(key) {
  const config = SHEETS[key];
  const spreadsheet = book_();
  let sheet = spreadsheet.getSheetByName(config.name);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(config.name);
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    sheet.setFrozenRows(1);
    formatTextColumns_(sheet, config, config.headers, 1);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, config.headers.length).setValues([config.headers]);
    sheet.setFrozenRows(1);
    formatTextColumns_(sheet, config, config.headers, 1);
    return sheet;
  }

  // Upgrade sheets created by older versions: append any headers that are
  // missing (e.g. completedAt/history) without touching existing columns.
  const lastColumn = sheet.getLastColumn();
  const existing =
    lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(String) : [];
  const missing = config.headers.filter(function (header) {
    return existing.indexOf(header) === -1;
  });
  if (missing.length > 0) {
    const startColumn = lastColumn + 1;
    sheet.getRange(1, startColumn, 1, missing.length).setValues([missing]);
    formatTextColumns_(sheet, config, missing, startColumn);
  }

  return sheet;
}

function readAll_(key) {
  const sheet = sheetFor_(key);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map(String);
  const records = [];

  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    if (!row.some(function (cell) { return cell !== "" && cell !== null; })) continue;

    const record = {};
    headers.forEach(function (header, columnIndex) {
      let value = row[columnIndex];
      if (value instanceof Date) {
        value =
          header === "dueDate"
            ? Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd")
            : value.toISOString();
      }
      record[header] = value;
    });
    records.push(record);
  }

  return records;
}

function findRow_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i += 1) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

/**
 * Insert or patch a row. Patching matters for deletes: the client only sends
 * { id, deletedAt }, so untouched fields must survive.
 */
function upsert_(key, patch) {
  if (!patch || !patch.id) throw new Error("A record id is required.");

  const sheet = sheetFor_(key);
  const headers = SHEETS[key].headers;
  const rowIndex = findRow_(sheet, patch.id);
  const record = {};

  if (rowIndex === -1) {
    headers.forEach(function (header) {
      record[header] = patch[header] === undefined || patch[header] === null ? "" : patch[header];
    });
  } else {
    const existing = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    headers.forEach(function (header, index) {
      record[header] = existing[index];
    });
    headers.forEach(function (header) {
      if (patch[header] !== undefined) {
        record[header] = patch[header] === null ? "" : patch[header];
      }
    });
  }

  const row = headers.map(function (header) {
    const value = record[header];
    return value === null || value === undefined ? "" : value;
  });

  if (rowIndex === -1) sheet.appendRow(row);
  else sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);

  return record;
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function tokenMatches_(candidate) {
  return String(candidate || "") === TOKEN;
}

function doGet(e) {
  try {
    if (!tokenMatches_(e && e.parameter ? e.parameter.token : "")) {
      return json_({ ok: false, error: "unauthorized" });
    }

    const jobs = readAll_("jobs").filter(function (job) {
      return !job.deletedAt;
    });

    return json_({
      ok: true,
      jobs: jobs,
      employees: readAll_("employees"),
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);

    const body =
      e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};

    if (!tokenMatches_(body.token)) {
      return json_({ ok: false, error: "unauthorized" });
    }

    const action = body.action;
    const payload = body.payload || {};
    const now = new Date().toISOString();

    if (action === "upsertJob") {
      upsert_("jobs", payload);
    } else if (action === "deleteJob") {
      upsert_("jobs", { id: payload.id, updatedAt: now, deletedAt: now });
    } else if (action === "upsertEmployee") {
      upsert_("employees", payload);
    } else {
      return json_({ ok: false, error: "Unknown action: " + action });
    }

    return json_({ ok: true, serverTime: now });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message ? error.message : error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {
      // Lock was never acquired.
    }
  }
}
