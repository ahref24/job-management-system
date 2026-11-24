import { PRIORITY_OPTIONS, STATUS } from "../constants";
import { normalizeDueDate, uid } from "../utils/helpers";
import { parseHistory, serializeHistory } from "../utils/history";

const STATUS_VALUES = new Set(Object.values(STATUS));
const PRIORITY_VALUES = new Set(PRIORITY_OPTIONS.map((option) => option.value));

const text = (value) => (value === null || value === undefined ? "" : String(value));

const stamp = (value, fallback) => {
  const candidate = text(value).trim();
  return candidate || fallback;
};

export function normalizeJob(raw, now = new Date().toISOString()) {
  if (!raw || typeof raw !== "object") return null;
  const title = text(raw.title).trim();
  if (!title) return null;
  const createdAt = stamp(raw.createdAt, now);
  const updatedAt = stamp(raw.updatedAt, createdAt);
  const status = STATUS_VALUES.has(raw.status) ? raw.status : STATUS.TODO;
  const completedAt = stamp(
    raw.completedAt,
    status === STATUS.COMPLETE ? updatedAt : ""
  );
  return {
    id: text(raw.id).trim() || uid("job"),
    title,
    description: text(raw.description),
    employeeId: text(raw.employeeId),
    dueDate: normalizeDueDate(raw.dueDate),
    priority: PRIORITY_VALUES.has(raw.priority) ? raw.priority : "medium",
    status,
    notes: text(raw.notes),
    createdAt,
    updatedAt,
    completedAt,
    history: serializeHistory(parseHistory(raw.history)),
  };
}

export function normalizeJobs(list, now) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const jobs = [];
  for (const raw of list) {
    const job = normalizeJob(raw, now);
    if (!job || seen.has(job.id)) continue;
    seen.add(job.id);
    jobs.push(job);
  }
  return jobs;
}

export function normalizeEmployee(raw) {
  if (!raw || typeof raw !== "object") return null;
  const name = text(raw.name).trim();
  if (!name) return null;
  const activeRaw = raw.active;
  const inactive =
    activeRaw === false || activeRaw === "false" || activeRaw === 0 || activeRaw === "0";
  return {
    id: text(raw.id).trim() || uid("emp"),
    name,
    active: !inactive,
  };
}

export function normalizeEmployees(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const employees = [];
  for (const raw of list) {
    const employee = normalizeEmployee(raw);
    if (!employee || seen.has(employee.id)) continue;
    seen.add(employee.id);
    employees.push(employee);
  }
  return employees;
}
