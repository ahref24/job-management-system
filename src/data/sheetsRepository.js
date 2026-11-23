import { normalizeEmployees, normalizeJobs } from "./normalize";
import { requestJson } from "./http";
import { readJson, readJsonArray, writeJson } from "./storage";

export const CACHE_KEY = "jms.cache.v1";

const LEGACY_JOBS_KEY = "jms.jobs.v1";
const LEGACY_EMPLOYEES_KEY = "jms.employees.v1";

function readCache() {
  const parsed = readJson(CACHE_KEY);
  if (!parsed || typeof parsed !== "object") return null;
  const jobs = normalizeJobs(parsed.jobs);
  const employees = normalizeEmployees(parsed.employees);
  if (!jobs.length && !employees.length) return null;
  return { jobs, employees, savedAt: parsed.savedAt || null, source: "cache" };
}

function readLegacy() {
  const jobsRaw = readJsonArray(LEGACY_JOBS_KEY);
  const employeesRaw = readJsonArray(LEGACY_EMPLOYEES_KEY);
  if (!jobsRaw && !employeesRaw) return null;
  const jobs = normalizeJobs(jobsRaw);
  const employees = normalizeEmployees(employeesRaw);
  if (!jobs.length && !employees.length) return null;
  return { jobs, employees, savedAt: null, source: "legacy" };
}

/**
 * Google Sheets repository. The browser talks to a same-origin API proxy
 * (`/api/sheets`), which forwards to the Apps Script web app and keeps the
 * token on the server. Successful reads are cached locally so the board still
 * boots when the network (or the script) is unavailable.
 */
export function createSheetsRepository({ url = "/api/sheets", fetchImpl } = {}) {
  if (!url) throw new Error("A Sheets API endpoint is required.");

  const post = (action, payload) =>
    requestJson(url, { method: "POST", body: { action, payload }, fetchImpl });

  return {
    kind: "sheets",
    readCached: () => readCache() || readLegacy(),
    async load() {
      const data = await requestJson(url, { fetchImpl });
      if (!data || data.ok !== true) {
        throw new Error(data && data.error ? data.error : "Google Sheets rejected the request.");
      }
      return {
        jobs: normalizeJobs(data.jobs),
        employees: normalizeEmployees(data.employees),
        serverTime: data.serverTime || null,
      };
    },
    upsertJob(job) {
      return post("upsertJob", job);
    },
    deleteJob(job) {
      return post("deleteJob", { id: job.id, updatedAt: job.updatedAt });
    },
    upsertEmployee(employee) {
      return post("upsertEmployee", employee);
    },
    writeCache(snapshot) {
      try {
        writeJson(CACHE_KEY, {
          jobs: snapshot.jobs,
          employees: snapshot.employees,
          savedAt: new Date().toISOString(),
        });
      } catch {
        // A full quota must not break a successful sync.
      }
    },
  };
}
