import { STATUS } from "../constants";

export function uid(prefix = "job") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const pad = (n) => String(n).padStart(2, "0");

/** Local calendar date as YYYY-MM-DD. */
export function todayISO(reference = new Date()) {
  return `${reference.getFullYear()}-${pad(reference.getMonth() + 1)}-${pad(reference.getDate())}`;
}

/**
 * Coerce anything we may have stored historically ("TODAY", ISO datetimes,
 * locale strings, Date objects) into a YYYY-MM-DD string.
 * Returns "" when the value cannot be understood.
 */
export function normalizeDueDate(value, reference = new Date()) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : todayISO(value);
  }
  const raw = String(value).trim();
  if (!raw) return "";
  if (raw === "TODAY") return todayISO(reference);

  // Take the date part of an ISO datetime before any timezone conversion can
  // shift it to the previous/next day.
  const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    const candidate = new Date(isoMatch[1] + "T00:00:00");
    return Number.isNaN(candidate.getTime()) ? "" : isoMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return todayISO(parsed);
}

export function formatDateDisplay(dateString) {
  const iso = normalizeDueDate(dateString);
  if (!iso) return "No due date";
  const date = new Date(iso + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "No due date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startOfDay(reference) {
  return new Date(todayISO(reference) + "T00:00:00");
}

export function isOverdue(job, reference = new Date()) {
  if (!job || job.status === STATUS.COMPLETE) return false;
  const iso = normalizeDueDate(job.dueDate, reference);
  if (!iso) return false;
  return new Date(iso + "T00:00:00") < startOfDay(reference);
}

export function daysRemaining(job, reference = new Date()) {
  const iso = normalizeDueDate(job?.dueDate, reference);
  if (!iso) return null;
  const due = new Date(iso + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - startOfDay(reference)) / (1000 * 60 * 60 * 24));
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return todayISO(date);
}

function createSeedJobs() {
  const now = new Date().toISOString();
  return [
    {
      id: uid("job"),
      title: "Onboard new project manager",
      description: "Set up accounts, permissions and kickoff documentation for the new hire.",
      employeeId: "emp-1",
      dueDate: addDays(1),
      priority: "high",
      status: STATUS.TODO,
      notes: "Prepare laptop handoff checklist.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid("job"),
      title: "Fix login timeout bug",
      description: "Users are being logged out after a few seconds of inactivity.",
      employeeId: "emp-2",
      dueDate: addDays(0),
      priority: "urgent",
      status: STATUS.IN_PROGRESS,
      notes: "Reproduced in Safari and Chrome. Root cause suspected in token refresh.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid("job"),
      title: "Q3 marketing campaign assets",
      description: "Deliver social media banners and email templates for the fall launch.",
      employeeId: "emp-3",
      dueDate: addDays(3),
      priority: "medium",
      status: STATUS.IN_PROGRESS,
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid("job"),
      title: "Update customer onboarding guide",
      description: "Refresh the documentation to reflect the new dashboard UI.",
      employeeId: "emp-4",
      dueDate: addDays(-2),
      priority: "low",
      status: STATUS.COMPLETE,
      notes: "Approved by the docs team.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uid("job"),
      title: "Prepare monthly board report",
      description: "Compile KPIs and OKR progress for the leadership meeting.",
      employeeId: "emp-1",
      dueDate: addDays(5),
      priority: "medium",
      status: STATUS.TODO,
      notes: "",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export const SEED_JOBS = createSeedJobs();
