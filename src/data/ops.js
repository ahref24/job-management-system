function upsertById(list, record) {
  return list.some((item) => item.id === record.id)
    ? list.map((item) => (item.id === record.id ? record : item))
    : [record, ...list];
}

/** Apply a queued write on top of a server snapshot. */
export function applyOp(snapshot, op) {
  const jobs = Array.isArray(snapshot.jobs) ? snapshot.jobs : [];
  const employees = Array.isArray(snapshot.employees) ? snapshot.employees : [];

  switch (op.type) {
    case "upsertJob":
      return { ...snapshot, jobs: upsertById(jobs, op.job) };
    case "deleteJob":
      return { ...snapshot, jobs: jobs.filter((job) => job.id !== op.job.id) };
    case "upsertEmployee":
      return { ...snapshot, employees: upsertById(employees, op.employee) };
    default:
      return snapshot;
  }
}

export function applyOps(snapshot, ops) {
  return ops.reduce(applyOp, snapshot);
}
