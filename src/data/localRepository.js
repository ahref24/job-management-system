import { DEFAULT_EMPLOYEES } from "../constants";
import { SEED_JOBS } from "../utils/helpers";
import { normalizeEmployees, normalizeJobs } from "./normalize";
import { readJsonArray, writeJson } from "./storage";

export const JOBS_KEY = "jms.jobs.v1";
export const EMPLOYEES_KEY = "jms.employees.v1";

function upsertById(list, record) {
  return list.some((item) => item.id === record.id)
    ? list.map((item) => (item.id === record.id ? record : item))
    : [record, ...list];
}

/**
 * Browser-local repository. Keeps the previous behaviour (seed data on first
 * run, automatic persistence) but validates what it reads so a corrupt entry
 * cannot crash the app.
 */
export function createLocalRepository() {
  const storedJobs = readJsonArray(JOBS_KEY);
  const storedEmployees = readJsonArray(EMPLOYEES_KEY);

  let jobs = storedJobs ? normalizeJobs(storedJobs) : SEED_JOBS;
  let employees = storedEmployees ? normalizeEmployees(storedEmployees) : DEFAULT_EMPLOYEES;

  const persist = () => {
    writeJson(JOBS_KEY, jobs);
    writeJson(EMPLOYEES_KEY, employees);
  };

  return {
    kind: "local",
    readCached: () => ({ jobs, employees }),
    async load() {
      return { jobs, employees };
    },
    async upsertJob(job) {
      jobs = upsertById(jobs, job);
      persist();
    },
    async deleteJob(job) {
      jobs = jobs.filter((item) => item.id !== job.id);
      persist();
    },
    async upsertEmployee(employee) {
      employees = upsertById(employees, employee);
      persist();
    },
    writeCache() {
      // Nothing to do: local storage is the source of truth.
    },
  };
}
