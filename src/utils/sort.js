import { STATUS } from "../constants";
import { normalizeDueDate } from "./helpers";

const timestamp = (job) => {
  const parsed = new Date(job.updatedAt || job.createdAt || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const dueTimestamp = (job) => {
  const iso = normalizeDueDate(job.dueDate);
  if (!iso) return Infinity;
  const parsed = new Date(iso + "T00:00:00").getTime();
  return Number.isNaN(parsed) ? Infinity : parsed;
};

/**
 * Sort a single column. Completed work is ordered by most recent activity;
 * everything else is ordered by due date (undated last), then activity.
 */
export function sortJobsForColumn(jobs, status) {
  const list = [...jobs];
  if (status === STATUS.COMPLETE) {
    return list.sort((a, b) => timestamp(b) - timestamp(a));
  }
  return list.sort((a, b) => {
    const dueA = dueTimestamp(a);
    const dueB = dueTimestamp(b);
    if (dueA !== dueB) return dueA - dueB;
    return timestamp(b) - timestamp(a);
  });
}

/**
 * Group jobs by status and sort each column independently. Sorting per column
 * keeps the comparator consistent — mixing statuses in one sort is not a valid
 * total order and produced wrong due-date ordering.
 */
export function groupJobsByStatus(jobs, statuses = Object.values(STATUS)) {
  const grouped = {};
  statuses.forEach((status) => {
    grouped[status] = [];
  });
  jobs.forEach((job) => {
    if (grouped[job.status]) grouped[job.status].push(job);
  });
  statuses.forEach((status) => {
    grouped[status] = sortJobsForColumn(grouped[status], status);
  });
  return grouped;
}
