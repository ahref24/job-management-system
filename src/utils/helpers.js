export function uid(prefix = "job") {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

const pad = (n) => String(n).padStart(2, "0");

export function formatDate(dateString) {
  if (!dateString) return "";
  if (dateString === "TODAY") {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return dateString;
}

export function formatDateDisplay(dateString) {
  if (!dateString) return "No due date";
  const date = new Date(formatDate(dateString) + "T00:00:00");
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(job, reference = new Date()) {
  const today = new Date(formatDate("TODAY") + "T00:00:00");
  if (job.status === "complete" || !job.dueDate) return false;
  const due = new Date(formatDate(job.dueDate) + "T00:00:00");
  return !Number.isNaN(due.getTime()) && due < today;
}

export function daysRemaining(job, reference = new Date()) {
  const today = new Date(formatDate("TODAY") + "T00:00:00");
  if (!job.dueDate) return null;
  const due = new Date(formatDate(job.dueDate) + "T00:00:00");
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

const uidCounter = { employee: 0 };
export function nextEmployeeId() {
  uidCounter.employee += 1;
  return `emp-${Date.now().toString(36)}-${uidCounter.employee}`;
}

function createSeedJobs() {
  return [
    {
      id: uid("job"),
      title: "Onboard new project manager",
      description: "Set up accounts, permissions and kickoff documentation for the new hire.",
      employeeId: "emp-1",
      dueDate: "TODAY",
      priority: "high",
      status: "todo",
      notes: "Prepare laptop handoff checklist.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uid("job"),
      title: "Fix login timeout bug",
      description: "Users are being logged out after a few seconds of inactivity.",
      employeeId: "emp-2",
      dueDate: "TODAY",
      priority: "urgent",
      status: "in_progress",
      notes: "Reproduced in Safari and Chrome. Root cause suspected in token refresh.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uid("job"),
      title: "Q3 marketing campaign assets",
      description: "Deliver social media banners and email templates for the fall launch.",
      employeeId: "emp-3",
      dueDate: "TODAY",
      priority: "medium",
      status: "in_progress",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uid("job"),
      title: "Update customer onboarding guide",
      description: "Refresh the documentation to reflect the new dashboard UI.",
      employeeId: "emp-4",
      dueDate: "TODAY",
      priority: "low",
      status: "complete",
      notes: "Approved by the docs team.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: uid("job"),
      title: "Prepare monthly board report",
      description: "Compile KPIs and OKR progress for the leadership meeting.",
      employeeId: "emp-1",
      dueDate: "TODAY",
      priority: "medium",
      status: "todo",
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

export const SEED_JOBS = createSeedJobs();